import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { getSession } from "../../../lib/session";
import { getRpConfig } from "../../../lib/webauthn";
import { getDeviceIdFromReq } from "../../../lib/deviceCookie";
import { setWebauthn } from "../../../lib/deviceStore";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await getSession(req, res);
  if (!session.user) return res.status(401).json({ error: "not_logged_in" });
  if (!session.webauthnChallenge) return res.status(400).json({ error: "no_pending_challenge" });

  const deviceId = getDeviceIdFromReq(req);
  if (!deviceId) return res.status(400).json({ error: "no_device" });

  const { rpID, rpOrigin } = getRpConfig(req);

  try {
    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: session.webauthnChallenge,
      expectedOrigin: rpOrigin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(200).json({ verified: false });
    }

    const { credential } = verification.registrationInfo;
    await setWebauthn(deviceId, {
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
    });

    session.webauthnChallenge = undefined;
    session.unlocked = true;
    await session.save();

    res.status(200).json({ verified: true });
  } catch (err) {
    res.status(400).json({ verified: false, error: err.message });
  }
}
