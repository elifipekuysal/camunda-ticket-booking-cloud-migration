import { Construct } from 'constructs';
import {
  aws_lambda as lambda,
  aws_ec2 as ec2,
  aws_iam as iam,
  aws_apigateway as apigw,
  Stack,
  StackProps,
  Duration,
  CfnDeletionPolicy,
  CfnOutput,
} from 'aws-cdk-lib'
import * as path from 'path';

export class SeatReservationLambdaStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'ImportedVPC', {
      isDefault: true
    });

    const securityGroup = new ec2.SecurityGroup(this, 'SeatReservationLambdaSg', {
      vpc,
      securityGroupName: 'seat-reservation-lambda-sg',
      allowAllOutbound: true,
    });

    const vpcEndpoint = new ec2.InterfaceVpcEndpoint(this, 'ApiGatewayVpcEndpoint', {
      vpc,
      service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
      privateDnsEnabled: true,
    });

    const fn = new lambda.Function(this, 'SeatReservationLambda', {
      functionName: 'seat-reservation-lambda',
      runtime: lambda.Runtime.NODEJS_18_X,
      architecture: lambda.Architecture.ARM_64,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        onePerAz: true,
        availabilityZones: ['eu-central-1a'],
      },
      securityGroups: [securityGroup],
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, 'handler')),
      memorySize: 128,
      timeout: Duration.millis(60*1000),
    });

    const lambdaVersion = new lambda.Version(this, 'LambdaVersion', {
      lambda: fn,
    })
    ;(lambdaVersion.node.tryFindChild('Resource') as lambda.CfnVersion).cfnOptions.deletionPolicy =
      CfnDeletionPolicy.RETAIN
    ;(lambdaVersion.node.tryFindChild('Resource') as lambda.CfnVersion).cfnOptions.updateReplacePolicy =
      CfnDeletionPolicy.RETAIN

    const api = new apigw.RestApi(this, 'SeatReservationApi', {
      restApiName: 'SeatReservationApi',
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
            effect: iam.Effect.DENY,
            principals: [new iam.AnyPrincipal()],
            actions: ['execute-api:Invoke'],
            resources: ['*'],
            conditions: {
              'StringNotEquals': {
                'aws:SourceVpc': vpc.vpcId,
              },
            },
          }),
        ],
      }),
    });

    const reservationResource = api.root.addResource('seat-reservation');
    reservationResource.addMethod('POST', new apigw.LambdaIntegration(fn));

    new CfnOutput(this, 'ApiGatewayUrlOutput', {
      value: api.url,
      description: 'The endpoint for the API Gateway triggering the seat-reservation-lambda function (only accessible within VPC)',
      exportName: 'SeatReservationRestApiUrl'
    });
  }
}
