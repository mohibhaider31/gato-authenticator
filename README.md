# GATO Authenticator — Web App

A working TOTP (RFC 6238) authenticator for GATO Systems: real code generation,
real verification, real WebAuthn biometric unlock (Face ID / Touch ID / Windows
Hello where supported). Built with Next.js so it deploys on Vercel the same
way as your other product-ops app.

## What's real vs. what's a stand-in

**Real, and safe to test with any actual authenticator app:**
- TOTP secret generation, QR code, and code verification (`otplib`) — a secret
  enrolled here is genuinely interoperable with Google/Microsoft Authenticator.
  You can scan the QR with either and compare codes.
- WebAuthn biometric registration and unlock (`@simplewebauthn/*`) — this uses
  your browser's real platform authenticator (Face ID, Touch ID, Windows
  Hello), not a mock.
- PIN hashing (bcrypt) and app-lock gating.
- Backup code generation.

**Stand-in, to be replaced when this connects to CIS:**
- `/api/auth/login` — currently a one-click mock login that just sets a
  session user. In production this route is replaced by a redirect to CIS's
  real SSO endpoint, and a callback route receives the authenticated identity
  from CIS instead.
- Where the TOTP secret and backup codes are stored — currently in an
  encrypted, httpOnly session cookie (`iron-session`) so the whole app works
  with zero database setup for testing. Before real rollout, this should move
  to whatever the MFA service's proper secret store ends up being (see the
  PRD's data model in `CIS_Authenticator_App_PRD.docx`), so secrets survive
  cookie clearing and can be managed/audited server-side.
- "Devices" management screen from the design isn't wired up in this build —
  this version is scoped to one browser session at a time. Worth a follow-up
  once there's a real multi-device data model.

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Biometric unlock requires HTTPS or localhost —
localhost works fine for local testing.

## Deploying to Vercel

Same flow as your other product-ops app:

1. Push this folder to a GitHub repo (or `vercel` CLI directly from here:
   `npx vercel` and follow the prompts).
2. In the Vercel project settings, add one environment variable:
   - `SESSION_SECRET` — any random 32+ character string (e.g. generate with
     `openssl rand -base64 32`). This encrypts the session cookie. Don't skip
     this — the fallback in `lib/session.js` is for local dev only.
3. Deploy. Vercel handles the rest (serverless functions for every file under
   `pages/api/`).

### A note on WebAuthn and your deployed domain

WebAuthn ties a biometric credential to the exact domain it was registered
on. If you deploy to something like `gato-authenticator.vercel.app` and later
move to a custom domain, users will need to re-register biometrics (their PIN
still works in the meantime). No action needed now — just don't be surprised
if that happens once during a domain change.

## Testing the real TOTP flow

1. Open the app, click "Continue with GATO SSO" (mock login).
2. Set a PIN, optionally add biometric unlock.
3. On the enrollment screen, scan the QR code with an actual Google
   Authenticator or Microsoft Authenticator app on your phone — or open this
   same web app in an incognito window to get a fresh secret and compare.
4. Type the 6-digit code your phone's app shows into the confirm field. It
   will only accept a code that's actually valid for that secret right now —
   there's no bypass.
5. You'll land on the backup codes screen once, then the home screen showing
   your live code with a 30-second countdown ring.

## Folder guide

```
pages/
  index.js          onboarding / mock SSO login
  setup.js           PIN + biometric (WebAuthn) setup
  enroll.js          QR/manual key + live code confirmation
  backup.js           backup codes (view, copy/download/print, regenerate)
  home.js             live code display
  lock.js             biometric/PIN unlock screen
  settings.js          trusted-device window, sign out, lock now
  api/
    auth/              login (mock SSO), logout, me (session status)
    mfa/                init, confirm, code, pin, unlock-pin, lock,
                         backup-codes, remember-days
    webauthn/           register-options/verify, auth-options/verify
lib/
  totp.js              RFC 6238 TOTP generation/verification (otplib)
  session.js           encrypted session cookie config (iron-session)
  webauthn.js          relying-party ID/origin resolution
  client.js            tiny fetch wrapper used by pages
```
