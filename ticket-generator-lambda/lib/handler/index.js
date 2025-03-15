import { MongoClient } from "mongodb";
const crypto = require("crypto");

const DOCUMENTDB_SECRET_ARN = process.env.DOCUMENTDB_SECRET_ARN;
const DOCUMENTDB_ENDPOINT = process.env.DOCUMENTDB_ENDPOINT;
const DOCUMENTDB_PORT = process.env.DOCUMENTDB_PORT;
const DOCUMENTDB_CA_FILE = process.env.DOCUMENTDB_CA_FILE;

const DATABASE_NAME = "TicketBooking";
const COLLECTION_NAME = "tickets";

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
    var ticketId = crypto.randomUUID();
    console.log("\n\n [x] Create Ticket %s", ticketId);

    const connectionString = await getDocumentDBConnectionString();
    const client = new MongoClient(connectionString, {
      tls: true,
      tlsCAFile: DOCUMENTDB_CA_FILE,
    });

    await client.connect();

    const db = client.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);

    await collection.insertOne({ ticketId, createdAt: new Date() });
    
    console.log("Successul :-)");

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

async function getSecret() {
  try {
    const secretData = await secretsManager.getSecretValue({ SecretId: DOCUMENTDB_SECRET_ARN }).promise();
    if (!secretData || !secretData.SecretString) {
      throw new Error("No secret data found");
    }
    return JSON.parse(secretData.SecretString);
  } catch (error) {
    console.error("Error fetching secret:", error);
    throw error;
  }
}

async function getDocumentDBConnectionString() {
  try {
    const credentials = await getSecret();
    const username = credentials.username;
    const password = credentials.password;

    return `mongodb://${username}:${password}@${DOCUMENTDB_ENDPOINT}:${DOCUMENTDB_PORT}/?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false`;
  } catch (error) {
    console.log(JSON.stringify({ error: "Failed to create connection string", details: error.message }));
    throw error;
  }
}
