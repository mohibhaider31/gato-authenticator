import { getAuthContext } from "../../../lib/authContext";
import { getDevice, touchLastUsed } from "../../../lib/deviceStore";

// For native clients only: unlocks the session after a LOCAL biometric/OS
// passcode check has already happened on-device (see the mobile app's
// LockScreen). Unlike /api/mfa/unlock-pin, this doesn't re-verify a secret —
// the trust boundary here is "did the OS unlock the app," same as how
// Google/Microsoft Authenticator handle app-lock. It only requires that a
// device row already exists (i.e. this device completed setup at some point).
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const ctx = await getAuthContext(req, res);
  if (!ctx.user) return res.status(401).json({ error: "not_logged_in" });
  if (!ctx.isMobile) return res.status(403).json({ error: "native_clients_only" });

  const device = ctx.deviceId ? await getDevice(ctx.user.email, ctx.deviceId) : null;
  if (!device) return res.status(400).json({ error: "not_enrolled" });

  await touchLastUsed(ctx.deviceId);
  const sessionToken = await ctx.persist({ unlocked: true });
  res.status(200).json({ ok: true, sessionToken });
}
