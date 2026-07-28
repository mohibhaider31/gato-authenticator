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
//   mfa: { secret, enrolled, backupCodes: [{code, used}], createdAt } | undefined
//   pinHash: string | undefined
//   webauthnCredentialId: string | undefined
//   webauthnChallenge: string | undefined     -> transient, cleared after use
//   unlocked: boolean                          -> gates access to codes/home after app-lock
//   rememberDays: number
// }

export async function getSession(req, res) {
  return getIronSession(req, res, sessionOptions);
}
