const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
const crypto = require("crypto");

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
        var paymentRequest = JSON.parse(message.body);

        console.log("\n\n [x] Received payment request %s", paymentRequest.paymentRequestId);

        const paymentConfirmationResponse = {
            paymentRequestId: paymentRequest.paymentRequestId,
            paymentConfirmationId: crypto.randomUUID()
        }

        await sqsClient.send(
            new SendMessageCommand(
              {
                MessageBody: JSON.stringify(paymentConfirmationResponse),
                QueueUrl: paymentResponseQueueUrl
              }
            )
          );

        console.log(" [x] Sent payment response %s", JSON.stringify(paymentConfirmationResponse));
    } catch (err) {
        console.error("An error occurred");
        throw err;
    }
}
