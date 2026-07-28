import crypto from "crypto";

// A short-lived, signed token embedded in the QR code shown on the GATO
// Systems website. Stateless by design — no shared database between "the
// website" and "the app" is needed, since the token carries its own identity
// and expiry, signed with the same secret both sides trust. In production
// this is replaced by a real token CIS issues after verifying the desktop
// session is genuinely authenticated; the signing mechanism here is a
// legitimate stand-in for that, not a toy.
const SECRET = process.env.SESSION_SECRET || "dev-only-fallback-secret-please-override-in-vercel-env-32chars";
const TTL_MS = 2 * 60 * 1000; // 2 minutes — short-lived like a real cross-device login code

function sign(payload) {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function createQrLoginToken(user) {
  const payload = Buffer.from(
    JSON.stringify({ user, exp: Date.now() + TTL_MS })
  ).toString("base64url");
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export function verifyQrLoginToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (Date.now() > data.exp) return null;
    return data.user;
  } catch {
    return null;
  }
}
