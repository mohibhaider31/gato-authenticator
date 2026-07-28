import QRCode from "qrcode";
import { createQrLoginToken } from "../../../lib/qrToken";

// Stands in for the GATO Systems website. In production, this same shape of
// endpoint lives on that site, called only after it's confirmed the browser
// viewing the QR already has a valid CIS session — it mints a short-lived
// token proving that, so scanning it elsewhere logs the scanning device in
// without re-entering credentials there.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const user = { email: "m.kazmi@gato.systems", name: "Mohib Kazmi" };
  const token = createQrLoginToken(user);
  const qrDataUrl = await QRCode.toDataURL(token, {
    margin: 1,
    color: { dark: "#0C0B20", light: "#00000000" },
    width: 320,
  });

  res.status(200).json({ token, qrDataUrl, expiresInMs: 2 * 60 * 1000 });
}
