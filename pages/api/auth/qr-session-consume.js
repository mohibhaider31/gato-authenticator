import { getSession } from "../../../lib/session";
import { verifyQrLoginToken } from "../../../lib/qrToken";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { token } = req.body || {};

  const user = verifyQrLoginToken(token);
  if (!user) return res.status(400).json({ ok: false, error: "invalid_or_expired" });

  const session = await getSession(req, res);
  session.user = user;
  await session.save();

  res.status(200).json({ ok: true, user });
}
