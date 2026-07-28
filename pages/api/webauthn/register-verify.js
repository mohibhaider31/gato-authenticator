import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { getAuthContext } from "../../../lib/authContext";
import { getRpConfig } from "../../../lib/webauthn";
import { verifyChallengeToken } from "../../../lib/challengeToken";
import { setWebauthn, setUnlockedAt } from "../../../lib/deviceStore";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const ctx = await getAuthContext(req, res);
  if (!ctx.user) return res.status(401).json({ error: "not_logged_in" });
  if (!ctx.deviceId) return res.status(400).json({ error: "no_device" });

  const { response, challengeToken } = req.body || {};
  const expectedChallenge = response?.response?.clientDataJSON
    ? JSON.parse(Buffer.from(response.response.clientDataJSON, "base64").toString()).challenge
    : null;

  if (!verifyChallengeToken(challengeToken, expectedChallenge)) {
    return res.status(400).json({ verified: false, error: "invalid_or_expired_challenge" });
  }

  const { rpID, rpOrigin } = getRpConfig(req);

  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: rpOrigin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(200).json({ verified: false });
    }

    const { credential } = verification.registrationInfo;
    await setWebauthn(ctx.deviceId, {
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
    });

    await setUnlockedAt(ctx.deviceId, new Date());
    const sessionToken = await ctx.persist({ unlocked: true });
    res.status(200).json({ verified: true, sessionToken });
  } catch (err) {
    res.status(400).json({ verified: false, error: err.message });
  }
}
