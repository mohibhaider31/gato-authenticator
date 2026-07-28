import { getSession } from "../../../lib/session";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await getSession(req, res);
  if (!session.user) return res.status(401).json({ error: "not_logged_in" });

  session.unlocked = false;
  await session.save();

  res.status(200).json({ ok: true });
}
