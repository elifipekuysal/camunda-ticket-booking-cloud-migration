exports.handler = async (event) => {
    if (httpMethod !== "GET") {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Method Not Allowed" }),
        };
    }

    console.log("Successul :-)");
    return {
        statusCode: 200,
        body: JSON.stringify({ reservationId: "1234" }),
    };
  };
