import bcrypt from "bcryptjs";
import { getSession } from "../../../lib/session";
import { getDeviceIdFromReq } from "../../../lib/deviceCookie";
import { getDevice, touchLastUsed } from "../../../lib/deviceStore";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await getSession(req, res);
  if (!session.user) return res.status(401).json({ error: "not_logged_in" });

  const deviceId = getDeviceIdFromReq(req);
  const device = deviceId ? await getDevice(session.user.email, deviceId) : null;
  if (!device?.pin_hash) return res.status(400).json({ error: "no_pin_set" });

  const { pin } = req.body || {};
  const ok = !!pin && bcrypt.compareSync(pin, device.pin_hash);

  if (ok) {
    session.unlocked = true;
    await session.save();
    await touchLastUsed(deviceId);
  }

  res.status(200).json({ ok });
}
