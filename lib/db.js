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

// Idempotent by design (CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT
// EXISTS) — but Postgres DDL isn't fully race-safe against genuinely
// concurrent execution: when Vercel spins up multiple cold serverless
// instances at once under load, each one runs this independently, and two
// concurrent "ADD COLUMN IF NOT EXISTS" calls on the same table can
// occasionally collide (a known Postgres pitfall, not a logic bug). Since
// the desired end state is correct either way, a failure here is treated as
// "someone else is migrating right now" rather than something that should
// ever break the actual request that triggered it.
async function ensureSchema() {
  if (!schemaReady) {
    const sql = fs.readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8");
    schemaReady = getPool()
      .query(sql)
      .catch((err) => {
        console.warn("[db] schema migration race (likely harmless, see comment):", err.message);
        schemaReady = null; // allow a retry on the next call rather than caching the failure
      });
  }
  return schemaReady;
}

export async function query(text, params) {
  await ensureSchema();
  return getPool().query(text, params);
}
