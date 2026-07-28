import { getSession } from "../../../lib/session";
import { getDeviceIdFromReq } from "../../../lib/deviceCookie";
import { getDevice, touchLastUsed } from "../../../lib/deviceStore";
import { currentCode, secondsRemaining } from "../../../lib/totp";

export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session.user) return res.status(401).json({ error: "not_logged_in" });

  const deviceId = getDeviceIdFromReq(req);
  const device = deviceId ? await getDevice(session.user.email, deviceId) : null;
  if (!device) return res.status(400).json({ error: "not_enrolled" });
  if (!session.unlocked) return res.status(403).json({ error: "locked" });

  const code = currentCode(device.secret);
  await touchLastUsed(deviceId);

  res.status(200).json({
    code: code.match(/.{1,3}/g).join(" "),
    raw: code,
    secondsRemaining: secondsRemaining(),
  });
}
