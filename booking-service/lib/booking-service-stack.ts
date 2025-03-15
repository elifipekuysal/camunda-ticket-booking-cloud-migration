import { Construct } from 'constructs';
import {
  aws_ec2 as ec2,
  aws_ecs as ecs,
  aws_logs as logs,
  aws_elasticloadbalancingv2 as elbv2,
  aws_sqs as sqs,
  aws_iam as iam,
  Stack,
  StackProps,
  Fn,
  CfnOutput,
  RemovalPolicy,
} from 'aws-cdk-lib';
import * as path from 'path';

export class BookingServiceStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'ImportedVPC', {
      isDefault: true
    });

    const privateSubnetIds = ['subnet-099a8c1d572ae32f5', 'subnet-04c850fcdb00caf2c'];
    const publicSubnetIds = ['subnet-02f74f86f368a3d9c', 'subnet-0d69807077cc14965'];

    const ticketBookingCluster = ecs.Cluster.fromClusterAttributes(this, 'TicketBookingEcsCluster', {
      clusterName: Fn.importValue('TicketBookingEcsClusterName'),
      clusterArn: Fn.importValue('TicketBookingEcsClusterArn'),
      vpc
    });

    const securityGroup = new ec2.SecurityGroup(this, 'BookingServiceSg', {
      vpc,
      securityGroupName: 'booking-service-sg',
      allowAllOutbound: true,
    });
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(8080), 'Allow HTTP traffic');

    const albSecurityGroup = new ec2.SecurityGroup(this, 'BookingServiceAlbSecurityGroup', {
      vpc,
      securityGroupName: 'booking-service-alb-sg',
      allowAllOutbound: true,
    });
    albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP traffic');

    const alb = new elbv2.ApplicationLoadBalancer(this, 'JavaAppALB', {
      vpc,
      internetFacing: true,
      securityGroup: albSecurityGroup,
      vpcSubnets: { subnets: publicSubnetIds.map(id => ec2.Subnet.fromSubnetId(this, `Subnet${id}`, id)) },
    });
    const listener = alb.addListener('HttpListener', {
      port: 80,
      open: true,
    });

    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'BookingServiceTargetGroup', {
      vpc,
      protocol: elbv2.ApplicationProtocol.HTTP,
      port: 8080,
      targetType: elbv2.TargetType.IP,
      healthCheck: { path: '/' },
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'BookingServiceTaskDef', {
      cpu: 512,
      memoryLimitMiB: 1024,
    });

    const containerImage = ecs.ContainerImage.fromAsset(path.join(__dirname, 'api'));

    taskDefinition.addContainer('booking-service', {
      image: containerImage,
      portMappings: [{ containerPort: 8080 }],
      environment: {
        'ZEEBE_CLIENT_BROKER_GATEWAY_ADDRESS': Fn.importValue('ZeebeGatewayAddress'),
        'TICKETBOOKING_SEATRESERVATION_LAMBDA_ENDPOINT': Fn.importValue('SeatReservationRestApiUrl'),
        'AWS_SQS_PAYMENT_REQUEST_QUEUE_URL': Fn.importValue('PaymentRequestQueueUrl'),
        'AWS_SQS_PAYMENT_RESPONSE_QUEUE_URL': Fn.importValue('PaymentResponseQueueUrl'),
        'TICKETBOOKING_TICKETGENERATOR_LAMBDA_ENDPOINT': Fn.importValue('TicketGenerationRestApiUrl'),
        'AWS_REGION': props?.env?.region || 'eu-central-1',
      },
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: 'ticket-booking-service',
        logGroup: new logs.LogGroup(this, 'TicketBookingServiceLogGroup', {
          logGroupName: '/ecs/ticket-booking-service',
          removalPolicy: RemovalPolicy.DESTROY,
        }),
      }),
    });

    const ecsService = new ecs.FargateService(this, 'BookingService', {
      serviceName: 'booking-service',
      cluster: ticketBookingCluster,
      taskDefinition,
      desiredCount: 1,
      securityGroups: [securityGroup],
      vpcSubnets: { subnets: privateSubnetIds.map(id => ec2.Subnet.fromSubnetId(this, `Subnet${id}`, id)) },
      assignPublicIp: false,
    });
    ecsService.attachToApplicationTargetGroup(targetGroup);

    listener.addTargetGroups('TargetGroup', {
      targetGroups: [targetGroup],
    });

    const scalableTarget = ecsService.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 6,
    });

    scalableTarget.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70, // Scale when CPU usage exceeds 570%
    });

    scalableTarget.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 70, // Scale when Memory usage exceeds 70%
    });

    const paymentRequestQueue = sqs.Queue.fromQueueArn(this, 'PaymentRequestQueue', Fn.importValue('PaymentRequestQueueArn'));
    
    ecsService.taskDefinition.taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['sqs:SendMessage'],
        resources: [paymentRequestQueue.queueArn],
      })
    );

    const paymentResponseQueue = sqs.Queue.fromQueueArn(this, 'PaymentResponseQueue', Fn.importValue('PaymentResponseQueueArn')); 

    ecsService.taskDefinition.taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['sqs:ReceiveMessage', 'sqs:DeleteMessage', 'sqs:GetQueueAttributes'],
        resources: [paymentResponseQueue.queueArn],
      })
    );

    new CfnOutput(this, 'BookingServiceName', {
      value: taskDefinition.taskDefinitionArn,
      exportName: 'BookingServiceName',
    });

    new CfnOutput(this, 'BookingServiceAlbDnsName', {
      value: alb.loadBalancerDnsName,
      exportName: 'BookingServiceAlbDnsName',
    });
  }
}
