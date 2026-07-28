import { getAuthContext } from "../../../lib/authContext";
import { setRememberDays } from "../../../lib/deviceStore";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const ctx = await getAuthContext(req, res);
  if (!ctx.user) return res.status(401).json({ error: "not_logged_in" });
  if (!ctx.deviceId) return res.status(400).json({ error: "no_device" });

  const { days } = req.body || {};
  if (![7, 14, 30].includes(days)) return res.status(400).json({ error: "days_must_be_7_14_or_30" });

  await setRememberDays(ctx.deviceId, days);
  res.status(200).json({ ok: true });
}
