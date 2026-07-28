import { getIronSession } from "iron-session";

// In production this comes from process.env.SESSION_SECRET (set it in Vercel's
// project env vars). A fallback is provided ONLY so local `npm run dev` works
// out of the box for testing — always set a real secret before real use.
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  "dev-only-fallback-secret-please-override-in-vercel-env-32chars";

export const sessionOptions = {
  password: SESSION_SECRET,
  cookieName: "gato_authenticator_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
};

// session shape (all stored server-side-encrypted, never exposed raw to the client):
// {
//   user: { email, name } | undefined        -> set after mock SSO login
//   unlocked: boolean                          -> gates access to codes/home after app-lock
// }
//
// Device identity (secret, PIN hash, WebAuthn credential, remember-days) now
// lives in Postgres (see lib/deviceStore.js), keyed by a separate persistent
// cookie (lib/deviceCookie.js) — NOT in this session — because device
// identity must survive sign-out, while login state shouldn't.
//
// WebAuthn challenges are signed and handed to the client rather than stored
// here (see lib/challengeToken.js) — this keeps auth stateless enough to work
// identically for both cookie (web) and bearer-token (mobile) clients.

export async function getSession(req, res) {
  return getIronSession(req, res, sessionOptions);
}
