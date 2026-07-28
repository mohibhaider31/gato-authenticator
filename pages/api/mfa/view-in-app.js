import QRCode from "qrcode";
import { getAuthContext } from "../../../lib/authContext";
import { getDevice } from "../../../lib/deviceStore";
import { otpauthUrl } from "../../../lib/totp";

export default async function handler(req, res) {
  const ctx = await getAuthContext(req, res);
  if (!ctx.user) return res.status(401).json({ error: "not_logged_in" });

  const device = ctx.deviceId ? await getDevice(ctx.user.email, ctx.deviceId) : null;
  if (!device) return res.status(400).json({ error: "not_enrolled" });
  if (!ctx.unlocked) return res.status(403).json({ error: "locked" });

  const url = otpauthUrl({ secret: device.secret, accountName: ctx.user.email, issuer: "GATO Systems" });
  const qrDataUrl = await QRCode.toDataURL(url, {
    margin: 1,
    color: { dark: "#0C0B20", light: "#00000000" },
    width: 320,
  });

  res.status(200).json({ manualKey: device.secret, qrDataUrl });
}
