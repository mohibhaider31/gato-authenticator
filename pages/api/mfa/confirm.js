import { getSession } from "../../../lib/session";
import { verifyCode, generateBackupCodes } from "../../../lib/totp";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await getSession(req, res);
  if (!session.user) return res.status(401).json({ error: "not_logged_in" });
  if (!session.mfa?.secret) return res.status(400).json({ error: "no_pending_enrollment" });

  const { code } = req.body || {};
  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "missing_code" });
  }

  const valid = verifyCode(session.mfa.secret, code.replace(/\s+/g, ""));
  if (!valid) {
    return res.status(200).json({ valid: false });
  }

  session.mfa.enrolled = true;
  session.mfa.createdAt = Date.now();
  session.mfa.backupCodes = generateBackupCodes(10);
  await session.save();

  res.status(200).json({ valid: true, backupCodes: session.mfa.backupCodes });
}
