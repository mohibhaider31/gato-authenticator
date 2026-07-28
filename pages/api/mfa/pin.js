import bcrypt from "bcryptjs";
import { getSession } from "../../../lib/session";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await getSession(req, res);
  if (!session.user) return res.status(401).json({ error: "not_logged_in" });

  const { pin } = req.body || {};
  if (!pin || !/^\d{4,6}$/.test(pin)) {
    return res.status(400).json({ error: "pin_must_be_4_to_6_digits" });
  }

  session.pinHash = bcrypt.hashSync(pin, 10);
  session.unlocked = true; // setting a PIN also unlocks the current session
  await session.save();

  res.status(200).json({ ok: true });
}
