import { verifyChallengeToken } from "../../../lib/challengeToken";
import { verifyBiometricSignature } from "../../../lib/biometricCrypto";
import { verifyMobileToken, createMobileToken, getBearerToken } from "../../../lib/mobileToken";
import { getDeviceByDeviceIdOnly, touchLastUsed, setUnlockedAt } from "../../../lib/deviceStore";

// Stands in for calling CIS's real OAuth token introspection endpoint
// (RFC 7662) once that integration exists. What's real here: the biometric
// signature verification against the device's enrolled public key, and the
// active/inactive decision logic itself. What's a stand-in: "the token"
// being introspected is our own mobile session token rather than a CIS
// OAuth access token, since there's no real CIS OAuth server to call yet.
//
// Flow:
//   1. Verify the signature proves this request came from the enrolled
//      device's biometric-gated private key, just now (nonce + challenge
//      token, single use, short-lived).
//   2. If the device itself isn't enrolled/trusted (revoked, or never
//      enrolled) -> deviceTrusted:false. Full re-login required, no
//      shortcuts.
//   3. Otherwise check whether the presented token is still active:
//        - active token -> let straight in, no friction.
//        - inactive/missing/expired token, but device+biometric verified
//          -> silently issue a fresh session token. Still no login screen.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { deviceId, nonce, challengeToken, signature } = req.body || {};

  if (!deviceId || !nonce || !challengeToken || !signature) {
    return res.status(400).json({ active: false, error: "missing_fields" });
  }
  if (!verifyChallengeToken(challengeToken, nonce)) {
    return res.status(400).json({ active: false, error: "invalid_or_expired_challenge" });
  }

  const device = await getDeviceByDeviceIdOnly(deviceId);
  if (!device || !device.biometric_public_key) {
    return res.status(200).json({ active: false, deviceTrusted: false });
  }

  const proven = verifyBiometricSignature({
    publicKeyBase64: device.biometric_public_key,
    payload: nonce,
    signatureBase64: signature,
  });
  if (!proven) {
    return res.status(401).json({ active: false, deviceTrusted: false, error: "signature_invalid" });
  }

  // Device + biometric verified. Now check whether the token this client
  // is currently holding is still genuinely active.
  const presentedToken = getBearerToken(req) || req.body.token;
  const tokenData = presentedToken ? verifyMobileToken(presentedToken) : null;
  const tokenIsActive = !!(tokenData && tokenData.user?.email === device.user_email && tokenData.unlocked);

  await touchLastUsed(deviceId);
  await setUnlockedAt(deviceId, new Date());

  if (tokenIsActive) {
    return res.status(200).json({ active: true, deviceTrusted: true, sessionToken: presentedToken });
  }

  // Token was missing, expired, or otherwise inactive — but the device and
  // biometric are proven, so we refresh silently rather than bouncing the
  // person to a login screen.
  const freshToken = createMobileToken({
    user: { email: device.user_email, name: device.user_name },
    unlocked: true,
  });
  res.status(200).json({ active: false, deviceTrusted: true, refreshed: true, sessionToken: freshToken });
}
