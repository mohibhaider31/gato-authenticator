import crypto from "crypto";
import { query } from "./db";

// A readable "fingerprint" of a public key — same convention as SSH/TLS
// certificate fingerprints (SHA-256 over the raw key bytes, shown as
// colon-separated hex). Two devices enrolling different keys will always
// show different fingerprints; the same device's fingerprint will always
// match between what you see enrolled and what verifies successfully.
export function publicKeyFingerprint(publicKeyBase64) {
  if (!publicKeyBase64) return null;
  const hash = crypto.createHash("sha256").update(Buffer.from(publicKeyBase64, "base64")).digest("hex");
  return hash.match(/.{1,4}/g).join(":");
}

export async function logAuthEvent(userEmail, deviceId, eventType, detail = {}) {
  try {
    await query(
      `INSERT INTO auth_events (user_email, device_id, event_type, detail) VALUES ($1, $2, $3, $4)`,
      [userEmail, deviceId, eventType, JSON.stringify(detail)]
    );
  } catch {
    // Logging must never break the actual auth flow it's observing.
  }
}

export async function listAuthEvents(userEmail, limit = 50) {
  const { rows } = await query(
    `SELECT device_id, event_type, detail, created_at FROM auth_events
     WHERE user_email = $1 ORDER BY created_at DESC LIMIT $2`,
    [userEmail, limit]
  );
  return rows;
}
