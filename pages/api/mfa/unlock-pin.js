import bcrypt from "bcryptjs";
import { getAuthContext } from "../../../lib/authContext";
import { getDevice, touchLastUsed, setUnlockedAt } from "../../../lib/deviceStore";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const ctx = await getAuthContext(req, res);
  if (!ctx.user) return res.status(401).json({ error: "not_logged_in" });

  const device = ctx.deviceId ? await getDevice(ctx.user.email, ctx.deviceId) : null;
  if (!device?.pin_hash) return res.status(400).json({ error: "no_pin_set" });

  const { pin } = req.body || {};
  const ok = !!pin && bcrypt.compareSync(pin, device.pin_hash);

  let sessionToken = null;
  if (ok) {
    sessionToken = await ctx.persist({ unlocked: true });
    await touchLastUsed(ctx.deviceId);
    await setUnlockedAt(ctx.deviceId, new Date());
  }

  res.status(200).json({ ok, sessionToken });
}
