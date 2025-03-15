const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
import { v4 as uuidv4 } from "uuid";

const paymentResponseQueueUrl = process.env.PAYMENT_RESPONSE_QUEUE_URL;
const paymentResponseQueueRegion = process.env.PAYMENT_RESPONSE_QUEUE_REGION;

const sqsClient = new SQSClient({ paymentResponseQueueRegion });

exports.handler = async (event) => {
    for (const message of event.Records) {
        await processMessageAsync(message);
    }
};

async function processMessageAsync(message) {
    try {
        console.log(`Processed message ${message.body}`);
        var paymentRequestId = message.body.toString();
        var paymentConfirmationId = uuidv4();

        console.log("\n\n [x] Received payment request %s", paymentRequestId);

        var outputMessage = '{"paymentRequestId": "' + paymentRequestId + '", "paymentConfirmationId": "' + paymentConfirmationId + '"}';

        const params = {
            QueueUrl: paymentResponseQueueUrl,
            MessageBody: JSON.stringify({
                message: outputMessage,
                timestamp: new Date().toISOString()
            }),
        };

        await sqsClient.send(new SendMessageCommand(params));

        console.log(" [x] Sent payment response %s", outputMessage);
    } catch (err) {
        console.error("An error occurred");
        throw err;
    }
}
