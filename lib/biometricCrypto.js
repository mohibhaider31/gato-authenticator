import crypto from "crypto";

// react-native-biometrics generates a 2048-bit RSA keypair in the device's
// secure hardware (Secure Enclave on iOS, Keystore/StrongBox on Android).
// The private key never leaves that hardware and is gated by biometric —
// only a successful Face/fingerprint check lets the OS use it to sign
// something. The public key it hands back is base64-encoded DER SPKI, and
// signatures are RSA PKCS#1 v1.5 over SHA-256 — this verifies both exactly
// as the library produces them.
export function verifyBiometricSignature({ publicKeyBase64, payload, signatureBase64 }) {
  try {
    const publicKey = crypto.createPublicKey({
      key: Buffer.from(publicKeyBase64, "base64"),
      format: "der",
      type: "spki",
    });
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(payload);
    verifier.end();
    return verifier.verify(publicKey, Buffer.from(signatureBase64, "base64"));
  } catch {
    return false;
  }
}
