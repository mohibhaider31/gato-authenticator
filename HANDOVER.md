# Handover checklist

This app was built and is currently running under **personal** accounts
(GitHub, Vercel, Neon) while being prototyped and demoed internally. Before
this touches anything resembling production, or is handed to the engineering
team, the following needs to move to company-owned infrastructure.

## What needs to move

| Piece | Currently | Move to |
|---|---|---|
| Source code | Personal GitHub (`mohibhaider31/gato-authenticator`) | A new repo under the company's GitHub org |
| Hosting | Personal Vercel account | A new project under the company's Vercel team |
| Database | Personal Neon Postgres (via Vercel Storage) | A new Neon (or other Postgres) instance under the company's account |
| Secrets | `SESSION_SECRET`, `ALLOW_TEST_PEEK` set on the personal Vercel project | Regenerate fresh values on the new project — do not copy the old ones over |

## Why this matters, not just "nice to have"

- The current setup has no organizational access control — if the one
  personal account is unavailable, so is the app.
- Several real credentials (GitHub PAT, Vercel token, database connection
  string) were pasted into a chat conversation during setup. These should be
  rotated regardless of the infra move, and definitely rotated as part of it.
- There's no offboarding story tied to a personal account the way there would
  be for an org-owned one.

## Steps to migrate (roughly a half-day of work, not a rewrite)

1. **New GitHub repo** under the company org. Push this codebase fresh
   (`git remote add company-origin <new-url> && git push company-origin main`)
   rather than transferring the personal repo, to avoid carrying over
   permissions/fork quirks.
2. **New Vercel project** under the company's Vercel team, connected to the
   new repo.
3. **New Neon database**, created via that Vercel project's Storage tab
   (same flow used originally — see conversation history). Do NOT point the
   new project at the old personal Neon instance.
4. **Apply the schema** — this happens automatically on first request (see
   `lib/db.js` — `ensureSchema()` runs `db/schema.sql` idempotently), so no
   manual migration step is needed beyond having `DATABASE_URL` set.
5. **Set environment variables** on the new project:
   - `SESSION_SECRET` — generate fresh: `openssl rand -base64 32`
   - `ALLOW_TEST_PEEK` — only set this if you still want the (now largely
     unused) testing shortcuts; safe to leave unset in a real deployment.
   - `DATABASE_URL` and friends — auto-populated by connecting the new Neon
     database via the Storage tab.
6. **Replace the mock SSO** (`pages/api/auth/login.js`) with a real redirect
   to CIS's SSO endpoint, and turn that route into the OAuth callback that
   receives the authenticated identity — see the code comment in that file
   for exactly what to replace.
7. **Revoke the old personal credentials** — GitHub PAT, Vercel token — once
   the new deployment is confirmed working.
8. **Decommission the personal Vercel project and Neon database** once
   everyone's confirmed the new one is live, so there isn't a second copy of
   real device/backup-code data sitting around unmonitored.

## What does NOT need to change

Everything else in the README's "what's real vs. stand-in" section is
independent of which accounts host it — the TOTP crypto, WebAuthn biometric
flow, PIN hashing, and database schema all move over as-is. This is a
hosting/ownership change, not an architecture change.
