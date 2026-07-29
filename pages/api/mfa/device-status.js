import { getDeviceByDeviceIdOnly } from "../../../lib/deviceStore";

// Deliberately callable with nothing but a device_id — no token required.
// This is what lets the lock screen decide "should I even try biometric"
// without depending on the very token whose absence is the whole scenario
// being handled.
export default async function handler(req, res) {
  const deviceId = req.headers["x-device-id"];
  if (!deviceId) return res.status(400).json({ found: false });

  const device = await getDeviceByDeviceIdOnly(deviceId);
  if (!device) return res.status(200).json({ found: false });

  res.status(200).json({
    found: true,
    hasPin: !!device.pin_hash,
    hasBiometricKey: !!device.biometric_public_key,
  });
}
