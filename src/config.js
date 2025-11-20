import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega variáveis de ambiente do arquivo .env localizado na raiz do relay
dotenv.config({ path: path.resolve(__dirname, "../.env") });

export const config = {
  // Define porta padrão e permite sobrescrever via PORT
  port: Number(process.env.PORT || 8081),
  // Define segredo para JWT e alerta quando usa valor inseguro
  jwtSecret: process.env.JWT_SECRET || "dev-secret",
  // Configura URI do MongoDB com fallback local
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/dumbmirror",
  // Determina nome do banco de dados
  mongoDbName: process.env.MONGODB_DB || "dumbmirror"
};

if (config.jwtSecret === "dev-secret") {
  console.warn("[config] Using fallback JWT secret. Please set JWT_SECRET in .env for production.");
}

if (process.env.MONGODB_URI === undefined) {
  console.warn("[config] Using fallback MongoDB URI. Please set MONGODB_URI in .env for production.");
}
