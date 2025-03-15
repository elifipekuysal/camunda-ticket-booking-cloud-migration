#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ZeebeStack } from '../lib/zeebe-stack';

const account = process.env.CDK_DEFAULT_ACCOUNT || '515966493420';
const region = process.env.CDK_DEFAULT_REGION || 'eu-central-1';

const app = new cdk.App();
new ZeebeStack(app, 'ZeebeStack', { env: { account, region } });
