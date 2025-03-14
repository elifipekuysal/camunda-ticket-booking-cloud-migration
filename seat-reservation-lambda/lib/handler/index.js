exports.handler = async (event) => {
    const { httpMethod, body } = event;
    console.log("Reserve seats now...");
    console.log(`httpMethod: ${httpMethod}`);
    console.log(`body: ${JSON.stringify(body)}`);

    if (httpMethod !== "POST") {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Method Not Allowed" }),
        };
    }

    try {
        const requestData = JSON.parse(body);
        console.log(`Received Data:`, requestData);

        if (requestData.job && requestData.job.variables && requestData.job.variables.simulateBookingFailure === "seats") {
            console.log("ERROR: Seats could not be reserved!");
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "ErrorSeatsNotAvailable" }),
            };
        }

        console.log("Successul :-)");
        return {
            statusCode: 200,
            body: JSON.stringify({ reservationId: "1234" }),
        };
    } catch (error) {
        console.error("Error processing request:", error);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Invalid request format" }),
        };
    }
  };
