import { getSession } from "../../../lib/session";
import { currentCode, secondsRemaining } from "../../../lib/totp";

// TESTING ONLY. This exists so the web app can be tested end to end before
// the native GATO mobile app exists to scan the QR code with. It reveals the
// code for a NOT-YET-CONFIRMED enrollment only (never for an already-enrolled,
// live account) and only when ALLOW_TEST_PEEK=true is set in the environment.
// Remove this route entirely — or leave the env var unset — before any real
// rollout. Showing a user their own code defeats the point of MFA.
export default async function handler(req, res) {
  if (process.env.ALLOW_TEST_PEEK !== "true") {
    return res.status(404).json({ error: "not_available" });
  }

  const session = await getSession(req, res);
  if (!session.user) return res.status(401).json({ error: "not_logged_in" });
  if (!session.mfa?.secret || session.mfa.enrolled) {
    return res.status(400).json({ error: "no_pending_enrollment" });
  }

  res.status(200).json({
    code: currentCode(session.mfa.secret),
    secondsRemaining: secondsRemaining(),
  });
}
