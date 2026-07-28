import { getSession } from "../../../lib/session";
import { generateSecret, generateBackupCodes } from "../../../lib/totp";

// Replaces the old QR-scan-and-confirm enrollment step. That pattern exists
// so a *separate, untrusted* authenticator app can prove it transcribed a
// secret correctly. Here, the browser and server are already talking over an
// authenticated SSO session (post PIN/biometric setup) — there's no separate
// hand-off to verify, so the secret is issued directly, silently.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await getSession(req, res);
  if (!session.user) return res.status(401).json({ error: "not_logged_in" });
  if (!session.pinHash && !session.webauthnCredentialId) {
    return res.status(400).json({ error: "pin_or_biometric_required_first" });
  }

  if (!session.mfa?.enrolled) {
    session.mfa = {
      secret: generateSecret(),
      enrolled: true,
      createdAt: Date.now(),
      backupCodes: generateBackupCodes(10),
    };
    await session.save();
  }

  res.status(200).json({ enrolled: true, backupCodes: session.mfa.backupCodes });
}
