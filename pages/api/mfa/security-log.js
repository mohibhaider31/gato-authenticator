import { getAuthContext } from "../../../lib/authContext";
import { listDevices } from "../../../lib/deviceStore";
import { listAuthEvents, publicKeyFingerprint } from "../../../lib/authEvents";
import { query } from "../../../lib/db";

export default async function handler(req, res) {
  const ctx = await getAuthContext(req, res);
  if (!ctx.user) return res.status(401).json({ error: "not_logged_in" });
  if (!ctx.unlocked) return res.status(403).json({ error: "locked" });

  const deviceRows = await listDevices(ctx.user.email);
  const { rows: fullRows } = await query(
    `SELECT device_id, biometric_public_key FROM devices WHERE user_email = $1 AND revoked_at IS NULL`,
    [ctx.user.email]
  );
  const keyByDevice = Object.fromEntries(fullRows.map((r) => [r.device_id, r.biometric_public_key]));
  const nameByDevice = Object.fromEntries(deviceRows.map((d) => [d.device_id, d.name]));

  const devices = deviceRows.map((d) => ({
    id: d.id,
    deviceId: d.device_id,
    name: d.name,
    platform: d.platform,
    createdAt: d.created_at,
    lastUsedAt: d.last_used_at,
    current: d.device_id === ctx.deviceId,
    biometricFingerprint: publicKeyFingerprint(keyByDevice[d.device_id]),
  }));

  const rawEvents = await listAuthEvents(ctx.user.email, 50);
  const events = rawEvents.map((e) => ({
    deviceName: nameByDevice[e.device_id] || (e.device_id ? `${e.device_id.slice(0, 8)}…` : "unknown"),
    eventType: e.event_type,
    detail: e.detail,
    createdAt: e.created_at,
  }));

  res.status(200).json({ devices, events });
}
