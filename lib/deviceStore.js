import crypto from "crypto";
import { query } from "./db";

export function newDeviceId() {
  return crypto.randomUUID();
}

export function detectPlatform(userAgent = "") {
  const ua = userAgent.toLowerCase();
  if (ua.includes("iphone") || ua.includes("ipad")) return "ios";
  if (ua.includes("android")) return "android";
  return "web";
}

export function friendlyDeviceName(userAgent = "", platform = "web") {
  if (platform === "ios") return userAgent.includes("iPad") ? "iPad" : "iPhone";
  if (platform === "android") return "Android device";
  if (userAgent.includes("Macintosh")) return "Mac — browser";
  if (userAgent.includes("Windows")) return "Windows PC — browser";
  return "Browser";
}

export async function getDevice(userEmail, deviceId) {
  const { rows } = await query(
    `SELECT * FROM devices WHERE user_email = $1 AND device_id = $2 AND revoked_at IS NULL`,
    [userEmail, deviceId]
  );
  return rows[0] || null;
}

export async function createDevice({ userEmail, deviceId, name, platform, secret }) {
  const { rows } = await query(
    `INSERT INTO devices (user_email, device_id, name, platform, secret)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [userEmail, deviceId, name, platform, secret]
  );
  return rows[0];
}

export async function setPin(deviceId, pinHash) {
  await query(`UPDATE devices SET pin_hash = $2 WHERE device_id = $1`, [deviceId, pinHash]);
}

export async function setWebauthn(deviceId, { credentialId, publicKey, counter }) {
  await query(
    `UPDATE devices SET webauthn_credential_id = $2, webauthn_public_key = $3, webauthn_counter = $4 WHERE device_id = $1`,
    [deviceId, credentialId, publicKey, counter]
  );
}

export async function updateWebauthnCounter(deviceId, counter) {
  await query(`UPDATE devices SET webauthn_counter = $2 WHERE device_id = $1`, [deviceId, counter]);
}

export async function touchLastUsed(deviceId) {
  await query(`UPDATE devices SET last_used_at = now() WHERE device_id = $1`, [deviceId]);
}

export async function setRememberDays(deviceId, days) {
  await query(`UPDATE devices SET remember_days = $2 WHERE device_id = $1`, [deviceId, days]);
}

export async function setHideCodes(deviceId, hide) {
  await query(`UPDATE devices SET hide_codes = $2 WHERE device_id = $1`, [deviceId, hide]);
}

export async function setUnlockedAt(deviceId, date) {
  await query(`UPDATE devices SET unlocked_at = $2 WHERE device_id = $1`, [deviceId, date]);
}

export async function setAppearance(deviceId, appearance) {
  await query(`UPDATE devices SET appearance = $2 WHERE device_id = $1`, [deviceId, appearance]);
}

export async function listDevices(userEmail) {
  const { rows } = await query(
    `SELECT id, device_id, name, platform, created_at, last_used_at
     FROM devices WHERE user_email = $1 AND revoked_at IS NULL
     ORDER BY last_used_at DESC`,
    [userEmail]
  );
  return rows;
}

export async function revokeDevice(userEmail, id) {
  await query(
    `UPDATE devices SET revoked_at = now() WHERE id = $1 AND user_email = $2`,
    [id, userEmail]
  );
}

export async function revokeAllExcept(userEmail, keepDeviceId) {
  await query(
    `UPDATE devices SET revoked_at = now()
     WHERE user_email = $1 AND device_id != $2 AND revoked_at IS NULL`,
    [userEmail, keepDeviceId]
  );
}

// --- Account-level backup codes ---

export async function generateAndStoreBackupCodes(userEmail, codes) {
  await query(`DELETE FROM backup_codes WHERE user_email = $1`, [userEmail]);
  for (const code of codes) {
    await query(`INSERT INTO backup_codes (user_email, code) VALUES ($1, $2)`, [userEmail, code]);
  }
}

export async function listBackupCodes(userEmail) {
  const { rows } = await query(
    `SELECT code, used_at FROM backup_codes WHERE user_email = $1 ORDER BY created_at`,
    [userEmail]
  );
  return rows.map((r) => ({ code: r.code, used: !!r.used_at }));
}

export async function redeemBackupCode(userEmail, code) {
  const { rows } = await query(
    `UPDATE backup_codes SET used_at = now()
     WHERE user_email = $1 AND code = $2 AND used_at IS NULL
     RETURNING id`,
    [userEmail, code]
  );
  return rows.length > 0;
}
