import { getSession } from "../../../lib/session";

export default async function handler(req, res) {
  const session = await getSession(req, res);

  res.status(200).json({
    loggedIn: !!session.user,
    user: session.user || null,
    hasPin: !!session.pinHash,
    hasWebauthn: !!session.webauthnCredentialId,
    enrolled: !!session.mfa?.enrolled,
    unlocked: !!session.unlocked,
    rememberDays: session.rememberDays || 14,
  });
}
