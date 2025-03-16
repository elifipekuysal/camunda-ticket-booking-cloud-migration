import { Construct } from 'constructs';
import {
  aws_ec2 as ec2,
  aws_ecs as ecs,
  aws_logs as logs,
  aws_servicediscovery as service_discovery,
  Stack,
  StackProps,
  Fn,
  CfnOutput,
  RemovalPolicy,
  Duration
} from 'aws-cdk-lib';

export class ZeebeStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'ImportedVPC', {
      isDefault: true
    });

    const ticketBookingCluster = ecs.Cluster.fromClusterAttributes(this, 'TicketBookingEcsCluster', {
      clusterName: Fn.importValue('TicketBookingEcsClusterName'),
      clusterArn: Fn.importValue('TicketBookingEcsClusterArn'),
      vpc
    });

    const securityGroup = new ec2.SecurityGroup(this, 'ZeebeSg', {
      vpc,
      securityGroupName: 'zeebe-sg',
      allowAllOutbound: true,
    });

    securityGroup.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(26500), 'Allow Zeebe clients');
    securityGroup.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(26502), 'Allow Zeebe command API');

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'ZeebeTaskDef', {
      cpu: 1024,
      memoryLimitMiB: 2048,
    });

    taskDefinition.addContainer('zeebe', {
      image: ecs.ContainerImage.fromRegistry('camunda/zeebe:8.4.17'),
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: 'zeebe',
        logGroup: new logs.LogGroup(this, 'ZeebeLogGroup', {
          logGroupName: '/ecs/zeebe-engine',
          removalPolicy: RemovalPolicy.DESTROY,
        }),
      }),
      portMappings: [
        { containerPort: 26500 },
        { containerPort: 26501 },
        { containerPort: 26502 },
      ],
      environment: {
        'ZEEBE_BROKER_NETWORK_HOST': '0.0.0.0',
        'ZEEBE_GATEWAY_CLUSTER_HOST': 'broker-gateway.zeebe.local',
      },
    });

    const namespace = new service_discovery.PrivateDnsNamespace(this, 'ZeebeNamespace', {
      name: 'ticket-booking.local',
      vpc,
    });

    const ecsService = new ecs.FargateService(this, 'ZeebeService', {
      serviceName: 'zeebe-engine',
      cluster: ticketBookingCluster,
      taskDefinition,
      desiredCount: 1,
      securityGroups: [securityGroup],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      cloudMapOptions: {
        cloudMapNamespace: namespace,
        name: 'zeebe',
        dnsRecordType: service_discovery.DnsRecordType.A,
        dnsTtl: Duration.seconds(10),
      },
    });

    const scalableTarget = ecsService.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 6,
    });

    scalableTarget.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
    });

    scalableTarget.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 70, 
    });

    new CfnOutput(this, 'ZeebeGatewayAddress', {
      value: 'zeebe.ticket-booking.local:26500',
      exportName: 'ZeebeGatewayAddress',
    });
  }
}
