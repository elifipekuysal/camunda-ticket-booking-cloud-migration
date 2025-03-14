exports.handler = async (event) => {
    const { httpMethod, body } = event;
    console.log("Generate tickets now...");

    console.log(`httpMethod: ${httpMethod}`);
    console.log(`body: ${JSON.stringify(body)}`);

    if (httpMethod !== "GET") {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Method Not Allowed" }),
        };
    }

    try {
        var ticketId = uuidv4();
        console.log("\n\n [x] Create Ticket %s", ticketId);
        return {
            statusCode: 200,
            body: JSON.stringify({ ticketId }),
        };
    } catch (error) {
        console.error("Error processing request:", error);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Invalid request format" }),
        };
    }
  };
