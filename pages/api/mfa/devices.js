import { getSession } from "../../../lib/session";
import { getDeviceIdFromReq } from "../../../lib/deviceCookie";
import { listDevices, revokeDevice, revokeAllExcept } from "../../../lib/deviceStore";

export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session.user) return res.status(401).json({ error: "not_logged_in" });
  if (!session.unlocked) return res.status(403).json({ error: "locked" });

  const thisDeviceId = getDeviceIdFromReq(req);

  if (req.method === "GET") {
    const rows = await listDevices(session.user.email);
    const devices = rows.map((d) => ({
      id: d.id,
      name: d.name,
      platform: d.platform,
      createdAt: d.created_at,
      lastUsedAt: d.last_used_at,
      current: d.device_id === thisDeviceId,
    }));
    return res.status(200).json({ devices });
  }

  if (req.method === "POST") {
    const { action, deviceRowId } = req.body || {};
    if (action === "revoke" && deviceRowId) {
      await revokeDevice(session.user.email, deviceRowId);
      return res.status(200).json({ ok: true });
    }
    if (action === "revokeAllOthers") {
      await revokeAllExcept(session.user.email, thisDeviceId);
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ error: "unknown_action" });
  }

  res.status(405).end();
}
