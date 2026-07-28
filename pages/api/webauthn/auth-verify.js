import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { getAuthContext } from "../../../lib/authContext";
import { getRpConfig } from "../../../lib/webauthn";
import { verifyChallengeToken } from "../../../lib/challengeToken";
import { getDevice, updateWebauthnCounter, touchLastUsed, setUnlockedAt } from "../../../lib/deviceStore";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const ctx = await getAuthContext(req, res);
  if (!ctx.user) return res.status(401).json({ error: "not_logged_in" });

  const device = ctx.deviceId ? await getDevice(ctx.user.email, ctx.deviceId) : null;
  if (!device?.webauthn_credential_id) return res.status(400).json({ error: "no_credential" });

  const { response, challengeToken } = req.body || {};
  const expectedChallenge = response?.response?.clientDataJSON
    ? JSON.parse(Buffer.from(response.response.clientDataJSON, "base64").toString()).challenge
    : null;

  if (!verifyChallengeToken(challengeToken, expectedChallenge)) {
    return res.status(400).json({ verified: false, error: "invalid_or_expired_challenge" });
  }

  const { rpID, rpOrigin } = getRpConfig(req);

  try {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: rpOrigin,
      expectedRPID: rpID,
      credential: {
        id: device.webauthn_credential_id,
        publicKey: Buffer.from(device.webauthn_public_key, "base64url"),
        counter: device.webauthn_counter || 0,
      },
    });

    if (verification.verified) {
      await updateWebauthnCounter(ctx.deviceId, verification.authenticationInfo.newCounter);
      await touchLastUsed(ctx.deviceId);
      await setUnlockedAt(ctx.deviceId, new Date());
      const sessionToken = await ctx.persist({ unlocked: true });
      return res.status(200).json({ verified: true, sessionToken });
    }

    res.status(200).json({ verified: false });
  } catch (err) {
    res.status(400).json({ verified: false, error: err.message });
  }
}
