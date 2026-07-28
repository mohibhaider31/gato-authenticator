import { getAuthContext } from "../../../lib/authContext";
import { getDevice, touchLastUsed } from "../../../lib/deviceStore";
import { currentCode, secondsRemaining } from "../../../lib/totp";

export default async function handler(req, res) {
  const ctx = await getAuthContext(req, res);
  if (!ctx.user) return res.status(401).json({ error: "not_logged_in" });

  const device = ctx.deviceId ? await getDevice(ctx.user.email, ctx.deviceId) : null;
  if (!device) return res.status(400).json({ error: "not_enrolled" });
  if (!ctx.unlocked) return res.status(403).json({ error: "locked" });

  const code = currentCode(device.secret);
  await touchLastUsed(ctx.deviceId);

  res.status(200).json({
    code: code.match(/.{1,3}/g).join(" "),
    raw: code,
    secondsRemaining: secondsRemaining(),
  });
}
