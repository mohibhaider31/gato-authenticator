import bcrypt from "bcryptjs";
import { getSession } from "../../../lib/session";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await getSession(req, res);
  if (!session.user) return res.status(401).json({ error: "not_logged_in" });
  if (!session.pinHash) return res.status(400).json({ error: "no_pin_set" });

  const { pin } = req.body || {};
  const ok = !!pin && bcrypt.compareSync(pin, session.pinHash);

  if (ok) {
    session.unlocked = true;
    await session.save();
  }

  res.status(200).json({ ok });
}
