#!/usr/bin/env node
// Script legado que assumia storage SQLite; reescrever antes de usar em produção
import fs from "node:fs";
import { config } from "../src/config.js";

const dbPath = config.databasePath;

if (fs.existsSync(dbPath)) {
  fs.rmSync(dbPath, { force: true });
  console.log(`[db:reset] Deleted ${dbPath}`);
} else {
  console.log(`[db:reset] Database file not found at ${dbPath} (already reset).`);
}
console.log("On next server start, a fresh database will be created automatically.");
