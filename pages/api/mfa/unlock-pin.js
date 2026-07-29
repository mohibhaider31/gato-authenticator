import bcrypt from "bcryptjs";
import { getAuthContext } from "../../../lib/authContext";
import { getDevice, getDeviceByDeviceIdOnly, touchLastUsed, setUnlockedAt } from "../../../lib/deviceStore";
import { createMobileToken } from "../../../lib/mobileToken";

// Works even if the current token is missing/expired — same principle as
// biometric token-introspection. The device row (looked up by device_id
// alone) is the durable source of truth for "who this is"; the token is
// just an ephemeral convenience credential that shouldn't gate whether a
// correct PIN is honored.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const ctx = await getAuthContext(req, res);
  if (!ctx.deviceId) return res.status(400).json({ error: "no_device_id" });

  const device = ctx.user
    ? await getDevice(ctx.user.email, ctx.deviceId)
    : await getDeviceByDeviceIdOnly(ctx.deviceId);

  if (!device?.pin_hash) return res.status(400).json({ error: "no_pin_set" });

  const { pin } = req.body || {};
  const ok = !!pin && bcrypt.compareSync(pin, device.pin_hash);

  let sessionToken = null;
  if (ok) {
    await touchLastUsed(ctx.deviceId);
    await setUnlockedAt(ctx.deviceId, new Date());
    sessionToken = ctx.user
      ? await ctx.persist({ unlocked: true })
      : createMobileToken({ user: { email: device.user_email, name: device.user_name }, unlocked: true });
  }

  res.status(200).json({ ok, sessionToken });
}
