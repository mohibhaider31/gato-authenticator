import QRCode from "qrcode";
import { getSession } from "../../../lib/session";
import { generateSecret, otpauthUrl } from "../../../lib/totp";

export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session.user) return res.status(401).json({ error: "not_logged_in" });

  // Reuse the existing secret if enrollment was started but not confirmed yet,
  // so refreshing this screen doesn't invalidate an in-progress QR scan.
  if (!session.mfa || session.mfa.enrolled) {
    session.mfa = { secret: generateSecret(), enrolled: false, backupCodes: [] };
    await session.save();
  }

  const url = otpauthUrl({
    secret: session.mfa.secret,
    accountName: session.user.email,
    issuer: "GATO Systems",
  });

  const qrDataUrl = await QRCode.toDataURL(url, {
    margin: 1,
    color: { dark: "#0C0B20", light: "#00000000" },
    width: 320,
  });

  res.status(200).json({
    manualKey: session.mfa.secret,
    otpauthUrl: url,
    qrDataUrl,
  });
}
