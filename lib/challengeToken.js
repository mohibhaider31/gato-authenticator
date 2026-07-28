import crypto from "crypto";

// The WebAuthn challenge used to be stashed in the session between the
// "options" and "verify" calls. That only works for clients with a session
// store (the web cookie). Instead, the challenge is signed and handed back
// to the client, which must echo it back on the verify call — works
// identically for a browser or a native client, and avoids needing any
// server-side state for it at all.
const SECRET = process.env.SESSION_SECRET || "dev-only-fallback-secret-please-override-in-vercel-env-32chars";
const TTL_MS = 5 * 60 * 1000; // 5 minutes to complete a WebAuthn ceremony

function sign(payload) {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function signChallenge(challenge) {
  const payload = Buffer.from(JSON.stringify({ challenge, exp: Date.now() + TTL_MS })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyChallengeToken(token, expectedChallenge) {
  if (!token || typeof token !== "string" || !token.includes(".")) return false;
  const [payload, sig] = token.split(".");
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (Date.now() > data.exp) return false;
    return data.challenge === expectedChallenge;
  } catch {
    return false;
  }
}
