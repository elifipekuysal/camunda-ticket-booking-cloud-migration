const crypto = require("crypto");

exports.handler = async (event) => {
    console.log("Receive payments now...");

    const { httpMethod, queryStringParameters } = event;

    if (httpMethod !== "GET") {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Method Not Allowed" }),
        };
    }

    try {
        console.log(`\n\n [x] queryStringParameters: ${JSON.stringify(queryStringParameters)}`);
        console.log(`\n\n [x] Received payment request ${queryStringParameters.paymentRequestId}`);

        const paymentConfirmationResponse = {
            paymentRequestId: paymentRequest.paymentRequestId,
            paymentConfirmationId: crypto.randomUUID()
        }

        console.log(" [x] Sent payment response %s", JSON.stringify(paymentConfirmationResponse));
        return {
            statusCode: 200,
            body: JSON.stringify(paymentConfirmationResponse),
        };
    } catch (error) {
        console.error("Error processing request:", error);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Invalid request format" }),
        };
    }
};
