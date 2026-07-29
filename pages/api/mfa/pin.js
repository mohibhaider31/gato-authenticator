import bcrypt from "bcryptjs";
import { getAuthContext } from "../../../lib/authContext";
import {
  getDevice, createDevice, setPin, setUnlockedAt, detectPlatform, friendlyDeviceName,
  listBackupCodes, generateAndStoreBackupCodes,
} from "../../../lib/deviceStore";
import { generateSecret, generateBackupCodes } from "../../../lib/totp";

// This is where a device is actually provisioned: the first time a PIN is
// set on a device, we create its device row (with its own independent TOTP
// secret, per the original design) right here.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const ctx = await getAuthContext(req, res);
  if (!ctx.user) return res.status(401).json({ error: "not_logged_in" });
  if (!ctx.deviceId) return res.status(400).json({ error: "no_device_id" });

  const { pin } = req.body || {};
  if (!pin || !/^\d{4,6}$/.test(pin)) {
    return res.status(400).json({ error: "pin_must_be_4_to_6_digits" });
  }

  let device = await getDevice(ctx.user.email, ctx.deviceId);
  if (!device) {
    const ua = req.headers["user-agent"] || "";
    const platform = ctx.isMobile ? (req.headers["x-platform"] || "ios") : detectPlatform(ua);
    const name = ctx.isMobile ? (req.headers["x-device-name"] || friendlyDeviceName(ua, platform)) : friendlyDeviceName(ua, platform);
    device = await createDevice({
      userEmail: ctx.user.email,
      userName: ctx.user.name,
      deviceId: ctx.deviceId,
      name,
      platform,
      secret: generateSecret(),
    });

    const existingCodes = await listBackupCodes(ctx.user.email);
    if (existingCodes.length === 0) {
      await generateAndStoreBackupCodes(
        ctx.user.email,
        generateBackupCodes(10).map((c) => c.code)
      );
    }
  }

  await setPin(ctx.deviceId, bcrypt.hashSync(pin, 10));
  await setUnlockedAt(ctx.deviceId, new Date());
  const sessionToken = await ctx.persist({ unlocked: true });

  res.status(200).json({ ok: true, sessionToken });
}
