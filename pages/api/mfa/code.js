import { getSession } from "../../../lib/session";
import { currentCode, secondsRemaining } from "../../../lib/totp";

export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session.user) return res.status(401).json({ error: "not_logged_in" });
  if (!session.mfa?.enrolled) return res.status(400).json({ error: "not_enrolled" });
  if (!session.unlocked) return res.status(403).json({ error: "locked" });

  const code = currentCode(session.mfa.secret);
  res.status(200).json({
    code: code.match(/.{1,3}/g).join(" "), // "482 913" for readability
    raw: code,
    secondsRemaining: secondsRemaining(),
  });
}
