import { getAuthContext } from "../../../lib/authContext";
import { setHideCodes } from "../../../lib/deviceStore";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const ctx = await getAuthContext(req, res);
  if (!ctx.user) return res.status(401).json({ error: "not_logged_in" });
  if (!ctx.deviceId) return res.status(400).json({ error: "no_device" });

  const { hide } = req.body || {};
  await setHideCodes(ctx.deviceId, !!hide);
  res.status(200).json({ ok: true });
}
