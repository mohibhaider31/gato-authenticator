import { Pool } from "pg";
import fs from "fs";
import path from "path";

let pool;
let schemaReady;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3, // small pool — Neon's pooled endpoint already handles fan-out
    });
  }
  return pool;
}

// Idempotent — safe to call on every cold start. CREATE TABLE IF NOT EXISTS
// means this never conflicts with an already-migrated database.
async function ensureSchema() {
  if (!schemaReady) {
    const sql = fs.readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8");
    schemaReady = getPool().query(sql);
  }
  return schemaReady;
}

export async function query(text, params) {
  await ensureSchema();
  return getPool().query(text, params);
}
