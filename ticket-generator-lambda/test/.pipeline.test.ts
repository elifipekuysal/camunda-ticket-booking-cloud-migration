import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as Pipeline from '../lib/.pipeline-stack';

const account = process.env.CDK_DEFAULT_ACCOUNT || '515966493420';
const region = process.env.CDK_DEFAULT_REGION || 'eu-central-1';

test('Ticket Generator Lambda Created', () => {
  const app = new cdk.App();

  // WHEN
  const stack = new Pipeline.TicketGeneratorLambdaStack(app, 'TicketGeneratorLambdaTestStack', { env: { account, region }});

  // THEN
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::Lambda::Function', {
    FunctionName: 'ticket-generator-lambda',
    Runtime: 'nodejs18.x',
    MemorySize: 128,
  });

  template.hasResource('AWS::ApiGateway::RestApi', {});

  template.hasOutput('ApiGatewayUrlOutput', {
    Export: { Name: 'TicketGenerationRestApiUrl' },
  });
});
