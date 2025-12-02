import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { config } from "./config.js";

let client;
let database;
const databaseConfig = {
  mongoUri: config.mongoUri,
  mongoDbName: config.mongoDbName
};

// Ajusta a configuração padrão do banco antes de inicializar o cliente
export function configureDatabase({ mongoUri, mongoDbName }) {
  if (mongoUri) {
    databaseConfig.mongoUri = mongoUri;
  }
  if (mongoDbName) {
    databaseConfig.mongoDbName = mongoDbName;
  }
  if (client) {
    throw new Error("Cannot reconfigure database after the client has been initialized");
  }
}

async function getClient() {
  if (client) {
    return client;
  }
  // Cria um cliente Mongo com pool limitado para controlar consumo de conexões
  client = new MongoClient(databaseConfig.mongoUri, {
    maxPoolSize: 10
  });
  await client.connect();
  database = client.db(databaseConfig.mongoDbName);
  await ensureIndexes(database);
  return client;
}

async function ensureIndexes(db) {
  // Garante índices críticos para evitar duplicidade e acelerar buscas
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("mirrors").createIndex({ ownerId: 1 }),
    db.collection("mirrors").createIndex({ secretHash: 1 })
  ]);
}

export async function disconnectDatabase() {
  if (client) {
    await client.close();
    client = undefined;
    database = undefined;
  }
}

async function getDb() {
  if (!database) {
    await getClient();
  }
  return database;
}

export async function createUser({ email, password }) {
  const db = await getDb();
  // Gera o hash de senha antes de persistir o usuário
  const passwordHash = await bcrypt.hash(password, 10);
  const createdAt = Date.now();
  const { insertedId } = await db.collection("users").insertOne({
    email,
    passwordHash,
    createdAt
  });
  return { id: insertedId.toHexString(), email, createdAt };
}

export async function findUserByEmail(email) {
  const db = await getDb();
  // Busca pelo email e normaliza o documento para o formato usado na API
  const user = await db.collection("users").findOne({ email });
  return normalizeUser(user);
}

export async function getUserById(id) {
  const db = await getDb();
  const user = await db.collection("users").findOne({ _id: new ObjectId(id) });
  return normalizeUser(user);
}

function normalizeUser(doc) {
  if (!doc) return null;
  return {
    id: doc._id.toHexString(),
    email: doc.email,
    passwordHash: doc.passwordHash,
    createdAt: doc.createdAt
  };
}

export async function createMirror({ ownerId, name, secretRaw }) {
  const db = await getDb();
  // Protege o segredo original com hash antes de armazenar
  const secretHash = await bcrypt.hash(secretRaw, 10);
  const createdAt = Date.now();
  const { insertedId } = await db.collection("mirrors").insertOne({
    ownerId,
    name,
    secretHash,
    createdAt
  });
  return { id: insertedId.toHexString(), name, createdAt };
}

export async function getMirrorById(id) {
  const db = await getDb();
  const mirror = await db.collection("mirrors").findOne({ _id: new ObjectId(id) });
  return normalizeMirror(mirror);
}

export async function listMirrorsByOwner(ownerId) {
  const db = await getDb();
  // Ordena por criação mais recente para priorizar cadastros novos na UI
  const mirrors = await db.collection("mirrors")
    .find({ ownerId })
    .sort({ createdAt: -1 })
    .toArray();
  return mirrors.map((mirror) => normalizeMirror(mirror));
}

export async function verifyMirrorSecret(mirrorId, secret) {
  const db = await getDb();
  const mirror = await db.collection("mirrors").findOne({ _id: new ObjectId(mirrorId) });
  if (!mirror) return false;
  // Compara o segredo informado com o hash persistido
  return bcrypt.compare(secret, mirror.secretHash);
}

function normalizeMirror(doc) {
  if (!doc) return null;
  return {
    id: doc._id.toHexString(),
    ownerId: doc.ownerId,
    name: doc.name,
    createdAt: doc.createdAt
  };
}
