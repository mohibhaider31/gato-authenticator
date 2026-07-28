-- Devices: each enrolled device gets its OWN independent TOTP secret, PIN,
-- and optional WebAuthn credential — matching the original design spec
-- ("each with its own independent secret"), not a secret shared across
-- devices. Any one of a user's active devices can produce a valid login code.
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  device_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'web',
  secret TEXT NOT NULL,
  pin_hash TEXT,
  webauthn_credential_id TEXT,
  webauthn_public_key TEXT,
  webauthn_counter INT NOT NULL DEFAULT 0,
  remember_days INT NOT NULL DEFAULT 14,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_devices_user_email ON devices(user_email) WHERE revoked_at IS NULL;

-- Added after initial migration — IF NOT EXISTS makes this safe to re-run
-- against a database that already has the original devices table.
ALTER TABLE devices ADD COLUMN IF NOT EXISTS hide_codes BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS appearance TEXT NOT NULL DEFAULT 'dark';
ALTER TABLE devices ADD COLUMN IF NOT EXISTS unlocked_at TIMESTAMPTZ;

-- Backup codes are account-level recovery, not per-device — they exist to
-- recover the account when every enrolled device is lost, per the original
-- PRD (7.4).
CREATE TABLE IF NOT EXISTS backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  code TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_backup_codes_user_email ON backup_codes(user_email);
