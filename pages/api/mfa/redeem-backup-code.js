import { getAuthContext } from "../../../lib/authContext";
import { redeemBackupCode, setUnlockedAt, getDeviceByDeviceIdOnly } from "../../../lib/deviceStore";
import { createMobileToken } from "../../../lib/mobileToken";

// Same token-independence as unlock-pin.js — a correct backup code should
// work to recover the account even if the current token is gone, not just
// when you happen to already have a valid one.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const ctx = await getAuthContext(req, res);
  if (!ctx.deviceId && !ctx.user) return res.status(400).json({ error: "no_device_or_user" });

  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: "missing_code" });

  let userEmail = ctx.user?.email;
  let userName = ctx.user?.name;
  if (!userEmail && ctx.deviceId) {
    const device = await getDeviceByDeviceIdOnly(ctx.deviceId);
    if (!device) return res.status(400).json({ error: "device_not_found" });
    userEmail = device.user_email;
    userName = device.user_name;
  }

  const ok = await redeemBackupCode(userEmail, code.trim().toUpperCase());
  let sessionToken = null;
  if (ok) {
    if (ctx.deviceId) await setUnlockedAt(ctx.deviceId, new Date());
    sessionToken = ctx.user
      ? await ctx.persist({ unlocked: true })
      : createMobileToken({ user: { email: userEmail, name: userName }, unlocked: true });
  }

  res.status(200).json({ ok, sessionToken });
}
