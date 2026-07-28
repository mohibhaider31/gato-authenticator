import { getSession } from "../../../lib/session";
import { listBackupCodes, generateAndStoreBackupCodes } from "../../../lib/deviceStore";
import { generateBackupCodes } from "../../../lib/totp";

// Backup codes are account-level (per the original PRD), not per-device —
// they exist to recover the account if every enrolled device is lost.
export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session.user) return res.status(401).json({ error: "not_logged_in" });
  if (!session.unlocked) return res.status(403).json({ error: "locked" });

  if (req.method === "GET") {
    const codes = await listBackupCodes(session.user.email);
    return res.status(200).json({ codes });
  }

  if (req.method === "POST") {
    const fresh = generateBackupCodes(10).map((c) => c.code);
    await generateAndStoreBackupCodes(session.user.email, fresh);
    const codes = await listBackupCodes(session.user.email);
    return res.status(200).json({ codes });
  }

  res.status(405).end();
}
