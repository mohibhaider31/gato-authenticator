import { getSession } from "../../../lib/session";
import { generateBackupCodes } from "../../../lib/totp";

export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session.user) return res.status(401).json({ error: "not_logged_in" });
  if (!session.mfa?.enrolled) return res.status(400).json({ error: "not_enrolled" });
  if (!session.unlocked) return res.status(403).json({ error: "locked" });

  if (req.method === "GET") {
    return res.status(200).json({ codes: session.mfa.backupCodes });
  }

  if (req.method === "POST") {
    session.mfa.backupCodes = generateBackupCodes(10);
    await session.save();
    return res.status(200).json({ codes: session.mfa.backupCodes });
  }

  res.status(405).end();
}
