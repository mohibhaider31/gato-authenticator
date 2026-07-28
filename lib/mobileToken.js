import crypto from "crypto";

// A portable, signed session token for clients without a cookie jar (React
// Native, or any future native client). It carries the same information the
// web session cookie holds — who's logged in, and whether this device is
// currently unlocked — sealed with the same secret so it can't be forged or
// tampered with. Re-issued whenever its contents change (e.g. on unlock),
// same as the cookie is re-saved on the web.
const SECRET = process.env.SESSION_SECRET || "dev-only-fallback-secret-please-override-in-vercel-env-32chars";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days, matching the web cookie's lifetime

function sign(payload) {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function createMobileToken(data) {
  const payload = Buffer.from(JSON.stringify({ ...data, exp: Date.now() + TTL_MS })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyMobileToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

// Reads a bearer token from the Authorization header, if present.
export function getBearerToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}
