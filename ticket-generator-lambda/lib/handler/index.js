const mongo = require("mongodb");
const crypto = require("crypto");
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

const DOCUMENTDB_SECRET_ARN = process.env.DOCUMENTDB_SECRET_ARN;
const DOCUMENTDB_ENDPOINT = process.env.DOCUMENTDB_ENDPOINT;
const DOCUMENTDB_PORT = process.env.DOCUMENTDB_PORT;
const DOCUMENTDB_CA_FILE = process.env.DOCUMENTDB_CA_FILE;

const DATABASE_NAME = "ticket-booking";
const COLLECTION_NAME = "tickets";

let mongoClient;
let cachedSecret;

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const ticketId = crypto.randomUUID();

    const client = await getMongoClient();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);

    await collection.insertOne({ ticketId, createdAt: new Date() });

    return {
      statusCode: 200,
      body: JSON.stringify({ ticketId }),
    };
  } catch (error) {
    console.error("Error processing request:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};

async function getMongoClient() {
  if (mongoClient && mongoClient.topology && mongoClient.topology.isConnected()) {
    return mongoClient;
  }

  const connectionString = await getDocumentDBConnectionString();

  mongoClient = new mongo.MongoClient(connectionString, {
    tls: true,
    tlsCAFile: DOCUMENTDB_CA_FILE,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
  });

  await mongoClient.connect();

  return mongoClient;
}

async function getDocumentDbSecrets() {
  if (cachedSecret) {
    return cachedSecret;
  }

  try {
    const client = new SecretsManagerClient();
    const secretData = await client.send(new GetSecretValueCommand({ SecretId: DOCUMENTDB_SECRET_ARN }));

    if (!secretData || !secretData.SecretString) {
      throw new Error("No secret data found");
    }

    cachedSecret = JSON.parse(secretData.SecretString);
    return cachedSecret;
  } catch (error) {
    console.error("Error fetching secret:", error);
    throw error;
  }
}

async function getDocumentDBConnectionString() {
  try {
    const credentials = await getDocumentDbSecrets();
    return `mongodb://${credentials.username}:${credentials.password}@${DOCUMENTDB_ENDPOINT}:${DOCUMENTDB_PORT}/?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false`;
  } catch (error) {
    console.error("Failed to create connection string:", error);
    throw error;
  }
}
