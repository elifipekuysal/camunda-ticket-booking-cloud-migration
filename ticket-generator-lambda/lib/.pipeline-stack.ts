import { Construct } from 'constructs';
import * as apigw from "aws-cdk-lib/aws-apigateway";
import {
  aws_lambda as lambda,
  aws_ec2 as ec2,
  aws_iam as iam,
  Stack,
  StackProps,
  Fn,
  Duration,
  CfnDeletionPolicy,
  CfnOutput,
} from 'aws-cdk-lib';
import * as path from 'path';

export class TicketGeneratorLambdaStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'ImportedVPC', {
      isDefault: true
    });

    const securityGroup = new ec2.SecurityGroup(this, 'TicketGeneratorLambdaSg', {
      vpc,
      securityGroupName: 'ticket-generator-lambda-sg',
      allowAllOutbound: true,
    });

    const vpcEndpoint = ec2.InterfaceVpcEndpoint.fromInterfaceVpcEndpointAttributes(
      this,
      'ImportedApiGatewayVpcEndpoint',
      {
        vpcEndpointId: Fn.importValue('TicketBookingApiGatewayVpcEndpointId'),
        port: 443
      }
    );

    const documentDbSg = ec2.SecurityGroup.fromSecurityGroupId(this, 'TicketBookingDocumentDbSg', Fn.importValue(`TicketBookingDocumentDbSg`))
    documentDbSg.addIngressRule(
      securityGroup,
      ec2.Port.tcp(27017),
      `allow access from ticket generator lambda for db cluster access`,
    );

    const documentDbEndpoint = Fn.importValue('TicketBookingDocumentDbEndpoint');
    const documentDbPort = Fn.importValue('TicketBookingDocumentDbPort');
    const documentDbSecretArn = Fn.importValue('TicketBookingDocumentDbSecretArn');

    const fn = new lambda.Function(this, 'TicketGeneratorLambda', {
      functionName: 'ticket-generator-lambda',
      runtime: lambda.Runtime.NODEJS_18_X,
      architecture: lambda.Architecture.ARM_64,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [securityGroup],
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, 'dist')),
      memorySize: 128,
      timeout: Duration.millis(60 * 1000),
      environment: {
        DOCUMENTDB_ENDPOINT: documentDbEndpoint,
        DOCUMENTDB_PORT: documentDbPort,
        DOCUMENTDB_SECRET_ARN: documentDbSecretArn,
        DOCUMENTDB_CA_FILE: "/var/task/global-bundle.pem"
      },
    });

    fn.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'secretsmanager:GetSecretValue',
        'secretsmanager:DescribeSecret'
      ],
      resources: [documentDbSecretArn],
    }));

    const lambdaVersion = new lambda.Version(this, 'LambdaVersion', {
      lambda: fn,
    })
      ; (lambdaVersion.node.tryFindChild('Resource') as lambda.CfnVersion).cfnOptions.deletionPolicy =
        CfnDeletionPolicy.RETAIN
      ; (lambdaVersion.node.tryFindChild('Resource') as lambda.CfnVersion).cfnOptions.updateReplacePolicy =
        CfnDeletionPolicy.RETAIN

    const api = new apigw.RestApi(this, 'TicketGeneratorApi', {
      restApiName: 'TicketGeneratorApi',
      deployOptions: {
        stageName: 'v1',
      },
      endpointConfiguration: {
        types: [apigw.EndpointType.PRIVATE],
        vpcEndpoints: [vpcEndpoint],
      },
      policy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            principals: [new iam.AnyPrincipal()],
            actions: ['execute-api:Invoke'],
            resources: ['execute-api:/*/GET/ticket'],
          }),
        ],
      }),
    });

    const reservationResource = api.root.addResource('ticket');
    reservationResource.addMethod('GET', new apigw.LambdaIntegration(fn), { authorizationType: apigw.AuthorizationType.NONE, });

    new CfnOutput(this, 'ApiGatewayUrlOutput', {
      value: `${api.url}ticket`,
      description: 'The endpoint for the API Gateway triggering the ticket-generator-lambda function (only accessible within VPC)',
      exportName: 'TicketGenerationRestApiUrl'
    });
  }
}
