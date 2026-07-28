import bcrypt from "bcryptjs";
import { getSession } from "../../../lib/session";
import { getDeviceIdFromReq, setDeviceIdCookie } from "../../../lib/deviceCookie";
import {
  getDevice, createDevice, setPin, newDeviceId,
  detectPlatform, friendlyDeviceName, listBackupCodes, generateAndStoreBackupCodes,
} from "../../../lib/deviceStore";
import { generateSecret, generateBackupCodes } from "../../../lib/totp";

// This is where a device is actually provisioned: the first time a PIN is
// set on a device, we create its device row (with its own independent TOTP
// secret, per the original design) right here. There's no separate QR-scan
// step for the primary flow — see the conversation history for why.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await getSession(req, res);
  if (!session.user) return res.status(401).json({ error: "not_logged_in" });

  const { pin } = req.body || {};
  if (!pin || !/^\d{4,6}$/.test(pin)) {
    return res.status(400).json({ error: "pin_must_be_4_to_6_digits" });
  }

  let deviceId = getDeviceIdFromReq(req);
  if (!deviceId) {
    deviceId = newDeviceId();
    setDeviceIdCookie(res, deviceId);
  }

  let device = await getDevice(session.user.email, deviceId);
  if (!device) {
    const ua = req.headers["user-agent"] || "";
    const platform = detectPlatform(ua);
    device = await createDevice({
      userEmail: session.user.email,
      deviceId,
      name: friendlyDeviceName(ua, platform),
      platform,
      secret: generateSecret(),
    });

    const existingCodes = await listBackupCodes(session.user.email);
    if (existingCodes.length === 0) {
      await generateAndStoreBackupCodes(
        session.user.email,
        generateBackupCodes(10).map((c) => c.code)
      );
    }
  }

  await setPin(deviceId, bcrypt.hashSync(pin, 10));

  session.unlocked = true;
  await session.save();

  res.status(200).json({ ok: true });
}
