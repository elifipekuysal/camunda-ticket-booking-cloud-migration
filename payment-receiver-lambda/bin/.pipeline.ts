#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { PaymentReceiverLambdaStack } from '../lib/.pipeline-stack';

const account = process.env.CDK_DEFAULT_ACCOUNT || '515966493420';
const region = process.env.CDK_DEFAULT_REGION || 'eu-central-1';

const app = new cdk.App();
new PaymentReceiverLambdaStack(app, 'PaymentReceiverLambdaStack', { env: { account, region } });
