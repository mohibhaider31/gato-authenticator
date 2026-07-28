import { getSession } from "../../../lib/session";
import { getDeviceIdFromReq } from "../../../lib/deviceCookie";
import { setRememberDays } from "../../../lib/deviceStore";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await getSession(req, res);
  if (!session.user) return res.status(401).json({ error: "not_logged_in" });

  const deviceId = getDeviceIdFromReq(req);
  if (!deviceId) return res.status(400).json({ error: "no_device" });

  const { days } = req.body || {};
  if (![7, 14, 30].includes(days)) {
    return res.status(400).json({ error: "days_must_be_7_14_or_30" });
  }

  await setRememberDays(deviceId, days);
  res.status(200).json({ ok: true });
}
