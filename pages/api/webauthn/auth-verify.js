import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { getSession } from "../../../lib/session";
import { getRpConfig } from "../../../lib/webauthn";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await getSession(req, res);
  if (!session.user) return res.status(401).json({ error: "not_logged_in" });
  if (!session.webauthnChallenge || !session.webauthnCredentialId) {
    return res.status(400).json({ error: "no_pending_challenge" });
  }

  const { rpID, rpOrigin } = getRpConfig(req);

  try {
    const verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge: session.webauthnChallenge,
      expectedOrigin: rpOrigin,
      expectedRPID: rpID,
      credential: {
        id: session.webauthnCredentialId,
        publicKey: Buffer.from(session.webauthnPublicKey, "base64url"),
        counter: session.webauthnCounter || 0,
      },
    });

    session.webauthnChallenge = undefined;

    if (verification.verified) {
      session.webauthnCounter = verification.authenticationInfo.newCounter;
      session.unlocked = true;
      await session.save();
      return res.status(200).json({ verified: true });
    }

    await session.save();
    res.status(200).json({ verified: false });
  } catch (err) {
    res.status(400).json({ verified: false, error: err.message });
  }
}
