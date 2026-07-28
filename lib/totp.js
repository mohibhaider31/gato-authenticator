import { authenticator } from "otplib";
import crypto from "crypto";

// Standard RFC 6238 params — 30s step, 6 digits, SHA-1 — matches Microsoft/Google
// Authenticator so a secret enrolled here is genuinely interoperable with them.
authenticator.options = { step: 30, digits: 6, window: 1 };

export function generateSecret() {
  return authenticator.generateSecret(); // base32, cryptographically random
}

export function otpauthUrl({ secret, accountName, issuer }) {
  return authenticator.keyuri(accountName, issuer, secret);
}

export function currentCode(secret) {
  return authenticator.generate(secret);
}

export function verifyCode(secret, token) {
  // window:1 tolerates ±1 time-step (±30s) of clock drift, per PRD 8.2
  return authenticator.check(token, secret);
}

export function secondsRemaining() {
  const step = 30;
  const epoch = Math.floor(Date.now() / 1000);
  return step - (epoch % step);
}

export function generateBackupCodes(count = 10) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  const group = () =>
    Array.from({ length: 4 }, () => alphabet[crypto.randomInt(alphabet.length)]).join("");
  return Array.from({ length: count }, () => ({
    code: `${group()}-${group()}`,
    used: false,
  }));
}
