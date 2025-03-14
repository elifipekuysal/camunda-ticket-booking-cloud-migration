#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { TicketGeneratorLambdaStack } from '../lib/.pipeline-stack';

const account = process.env.CDK_DEFAULT_ACCOUNT || '515966493420';
const region = process.env.CDK_DEFAULT_REGION || 'eu-central-1';

const app = new cdk.App();
new TicketGeneratorLambdaStack(app, 'TicketGeneratorLambdaStack', { env: { account, region } });
