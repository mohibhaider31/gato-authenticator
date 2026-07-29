import { getAuthContext } from "../../../lib/authContext";
import { verifyChallengeToken } from "../../../lib/challengeToken";
import { verifyBiometricSignature } from "../../../lib/biometricCrypto";
import {
  getOrCreateDevice, setBiometricPublicKey, detectPlatform, friendlyDeviceName,
  listBackupCodes, generateAndStoreBackupCodes,
} from "../../../lib/deviceStore";
import { generateSecret, generateBackupCodes } from "../../../lib/totp";
import { logAuthEvent, publicKeyFingerprint } from "../../../lib/authEvents";

// Enrollment (first time): device generated a keypair in its secure
// enclave/keystore, then signed the nonce we handed out to prove it holds
// the matching private key. If that checks out, we store the public key
// against this device — the private key itself never leaves the device and
// we never see it.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const ctx = await getAuthContext(req, res);
  if (!ctx.user) return res.status(401).json({ error: "not_logged_in" });
  if (!ctx.deviceId) return res.status(400).json({ error: "no_device_id" });

  const { publicKey, nonce, challengeToken, signature } = req.body || {};
  if (!publicKey || !nonce || !challengeToken || !signature) {
    return res.status(400).json({ error: "missing_fields" });
  }
  if (!verifyChallengeToken(challengeToken, nonce)) {
    return res.status(400).json({ error: "invalid_or_expired_challenge" });
  }

  const proven = verifyBiometricSignature({ publicKeyBase64: publicKey, payload: nonce, signatureBase64: signature });
  if (!proven) return res.status(400).json({ error: "signature_does_not_match_public_key" });

  // Device row may not exist yet — biometric can be the first (or only)
  // enrollment step, not just something layered on top of a PIN.
  const ua = req.headers["user-agent"] || "";
  const platform = ctx.isMobile ? (req.headers["x-platform"] || "ios") : detectPlatform(ua);
  const name = ctx.isMobile ? (req.headers["x-device-name"] || friendlyDeviceName(ua, platform)) : friendlyDeviceName(ua, platform);

  const device = await getOrCreateDevice({
    userEmail: ctx.user.email,
    userName: ctx.user.name,
    deviceId: ctx.deviceId,
    name,
    platform,
    secret: generateSecret(),
  });

  await setBiometricPublicKey(ctx.deviceId, publicKey);
  await logAuthEvent(ctx.user.email, ctx.deviceId, "biometric_enroll", {
    fingerprint: publicKeyFingerprint(publicKey),
    deviceName: name,
    platform,
  });

  const existingCodes = await listBackupCodes(ctx.user.email);
  if (existingCodes.length === 0) {
    await generateAndStoreBackupCodes(ctx.user.email, generateBackupCodes(10).map((c) => c.code));
  }

  const sessionToken = await ctx.persist({ unlocked: true });
  res.status(200).json({ ok: true, sessionToken });
}
