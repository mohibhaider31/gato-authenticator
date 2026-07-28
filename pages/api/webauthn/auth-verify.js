import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { getSession } from "../../../lib/session";
import { getRpConfig } from "../../../lib/webauthn";
import { getDeviceIdFromReq } from "../../../lib/deviceCookie";
import { getDevice, updateWebauthnCounter, touchLastUsed } from "../../../lib/deviceStore";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await getSession(req, res);
  if (!session.user) return res.status(401).json({ error: "not_logged_in" });
  if (!session.webauthnChallenge) return res.status(400).json({ error: "no_pending_challenge" });

  const deviceId = getDeviceIdFromReq(req);
  const device = deviceId ? await getDevice(session.user.email, deviceId) : null;
  if (!device?.webauthn_credential_id) return res.status(400).json({ error: "no_credential" });

  const { rpID, rpOrigin } = getRpConfig(req);

  try {
    const verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge: session.webauthnChallenge,
      expectedOrigin: rpOrigin,
      expectedRPID: rpID,
      credential: {
        id: device.webauthn_credential_id,
        publicKey: Buffer.from(device.webauthn_public_key, "base64url"),
        counter: device.webauthn_counter || 0,
      },
    });

    session.webauthnChallenge = undefined;

    if (verification.verified) {
      await updateWebauthnCounter(deviceId, verification.authenticationInfo.newCounter);
      await touchLastUsed(deviceId);
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
