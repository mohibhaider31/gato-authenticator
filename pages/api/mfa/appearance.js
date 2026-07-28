import { getAuthContext } from "../../../lib/authContext";
import { setAppearance } from "../../../lib/deviceStore";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const ctx = await getAuthContext(req, res);
  if (!ctx.user) return res.status(401).json({ error: "not_logged_in" });
  if (!ctx.deviceId) return res.status(400).json({ error: "no_device" });

  const { appearance } = req.body || {};
  if (!["dark", "light"].includes(appearance)) return res.status(400).json({ error: "appearance_must_be_dark_or_light" });

  await setAppearance(ctx.deviceId, appearance);
  res.status(200).json({ ok: true });
}
