import QRCode from "qrcode";
import { getSession } from "../../../lib/session";
import { getDeviceIdFromReq } from "../../../lib/deviceCookie";
import { getDevice } from "../../../lib/deviceStore";
import { otpauthUrl } from "../../../lib/totp";

// Re-exposes the ALREADY-enrolled secret's QR/manual key so it can be shown
// to someone else (e.g. scanned into Microsoft/Google Authenticator during a
// demo) to prove both places generate the same code. Gated behind an unlocked
// session, same trust level as viewing the live code itself on /home.
export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session.user) return res.status(401).json({ error: "not_logged_in" });

  const deviceId = getDeviceIdFromReq(req);
  const device = deviceId ? await getDevice(session.user.email, deviceId) : null;
  if (!device) return res.status(400).json({ error: "not_enrolled" });
  if (!session.unlocked) return res.status(403).json({ error: "locked" });

  const url = otpauthUrl({
    secret: device.secret,
    accountName: session.user.email,
    issuer: "GATO Systems",
  });

  const qrDataUrl = await QRCode.toDataURL(url, {
    margin: 1,
    color: { dark: "#0C0B20", light: "#00000000" },
    width: 320,
  });

  res.status(200).json({ manualKey: device.secret, qrDataUrl });
}
