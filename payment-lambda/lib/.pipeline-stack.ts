import { Construct } from 'constructs';
import {
  aws_ec2 as ec2,
  aws_sqs as sqs,
  aws_lambda as lambda,
  aws_iam as iam,
  aws_cloudwatch as cloudwatch,
  Stack,
  StackProps,
  Duration,
  CfnOutput
} from 'aws-cdk-lib';
import * as path from 'path';

export class PaymentLambdaStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'ImportedVPC', {
      isDefault: true
    });

    const securityGroup = new ec2.SecurityGroup(this, 'PaymentLambdaSg', {
      vpc,
      securityGroupName: 'payment-lambda-sg',
      allowAllOutbound: true,
    });

    const deadLetterQueue = new sqs.Queue(this, 'PaymentDLQ', {
      queueName: 'payment-dead-letter-queue',
      retentionPeriod: Duration.days(1),
    });

    // const deadLetterQueueAlarm = new cloudwatch.Alarm(this, 'PaymentRequestDLQAlarm', {
    //   alarmName: 'payment-request-dlq-alarm',
    //   threshold: 1,
    //   evaluationPeriods: 1,
    //   comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    //   treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    //   metric: deadLetterQueue.metricApproximateNumberOfMessagesVisible({
    //     statistic: 'Max',
    //     period: Duration.minutes(5),
    //   } as cloudwatch.MetricOptions),
    // });

    const paymentRequestQueue = new sqs.Queue(this, 'PaymentRequestQueue', {
      queueName: 'payment-request-queue',
      visibilityTimeout: Duration.seconds(120),
      deliveryDelay: Duration.seconds(0),
      retentionPeriod: Duration.hours(1),
      receiveMessageWaitTime: Duration.seconds(0),
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: deadLetterQueue
      }
    });

    const paymentResponseQueue = new sqs.Queue(this, 'PaymentResponseQueue', {
      queueName: 'payment-response-queue',
      visibilityTimeout: Duration.seconds(120),
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: deadLetterQueue
      }
    });

    const fn = new lambda.Function(this, 'PaymentLambda', {
      functionName: 'payment-lambda',
      runtime: lambda.Runtime.NODEJS_18_X,
      architecture: lambda.Architecture.ARM_64,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
        onePerAz: true,
        availabilityZones: ['eu-central-1a'],
      },
      securityGroups: [securityGroup],
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, 'handler')),
      memorySize: 128,
      environment: {
        PAYMENT_RESPONSE_QUEUE_URL: paymentResponseQueue.queueUrl,
        PAYMENT_RESPONSE_QUEUE_REGION: process.env.CDK_DEFAULT_REGION || "eu-central-1",
      },
    });

    fn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [ 'sqs:ReceiveMessage', 'sqs:DeleteMessage', 'sqs:GetQueueAttributes' ],
        resources: [ paymentRequestQueue.queueArn ],
      }),
    );

    fn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['sqs:SendMessage'],
        resources: [ paymentResponseQueue.queueArn ],
      }),
    );

    new lambda.CfnEventSourceMapping(this, 'PaymentLambdaEventSourceMap', {
      enabled: true,
      eventSourceArn: paymentRequestQueue.queueArn,
      functionName: fn.functionName,
      batchSize: 10,
      maximumBatchingWindowInSeconds: 2,
      scalingConfig: {
        maximumConcurrency: 25,
      },
      functionResponseTypes: ['ReportBatchItemFailures'],
    })

    new CfnOutput(this, 'PaymentRequestQueueArn', {
      value: paymentRequestQueue.queueArn,
      exportName: 'PaymentRequestQueueArn',
      description: 'PaymentRequestQueueArn'
    });

    new CfnOutput(this, 'PaymentRequestQueueName', {
      value: paymentRequestQueue.queueName,
      exportName: 'PaymentRequestQueueName',
      description: 'PaymentRequestQueueName',
    });

    new CfnOutput(this, 'PaymentRequestQueueUrl', {
      value: paymentRequestQueue.queueUrl,
      exportName: 'PaymentRequestQueueUrl',
      description: 'PaymentRequestQueueUrl',
    });

    new CfnOutput(this, 'PaymentResponseQueueArn', {
      value: paymentResponseQueue.queueArn,
      exportName: 'PaymentResponseQueueArn',
      description: 'PaymentResponseQueueArn'
    });

    new CfnOutput(this, 'PaymentResponseQueueName', {
      value: paymentResponseQueue.queueName,
      exportName: 'PaymentResponseQueueName',
      description: 'PaymentResponseQueueName',
    });

    new CfnOutput(this, 'PaymentResponseQueueUrl', {
      value: paymentResponseQueue.queueUrl,
      exportName: 'PaymentResponseQueueUrl',
      description: 'PaymentResponseQueueUrl',
    });
  }
}
