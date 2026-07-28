import { getAuthContext } from "../../../lib/authContext";
import { setUnlockedAt } from "../../../lib/deviceStore";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const ctx = await getAuthContext(req, res);
  if (!ctx.user) return res.status(401).json({ error: "not_logged_in" });

  // Explicit "Lock now" is an override — it clears the trusted-device
  // window too, so the next open genuinely asks again, rather than silently
  // re-unlocking because the remember-days window hasn't expired yet.
  if (ctx.deviceId) await setUnlockedAt(ctx.deviceId, null);

  const sessionToken = await ctx.persist({ unlocked: false });
  res.status(200).json({ ok: true, sessionToken });
}
