import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { startAuthentication } from "@simplewebauthn/browser";
import { api } from "../lib/client";
import Screen, { Logo } from "../components/Screen";

export default function Lock() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasWebauthn, setHasWebauthn] = useState(false);
  const [usePin, setUsePin] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await api("/api/auth/me");
      if (!me.data.loggedIn) return router.replace("/");
      if (!me.data.enrolled) return router.replace("/setup");
      if (me.data.unlocked) return router.replace("/home");
      setHasWebauthn(me.data.hasWebauthn);
      setUsePin(!me.data.hasWebauthn);
      setReady(true);
      if (me.data.hasWebauthn) tryBiometric();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function tryBiometric() {
    setBusy(true);
    setError("");
    try {
      const { data: options } = await api("/api/webauthn/auth-options", { body: {} });
      const assertion = await startAuthentication({ optionsJSON: options });
      const { data } = await api("/api/webauthn/auth-verify", { body: assertion });
      if (data.verified) return router.replace("/home");
      setError("Couldn't verify. Try again or use your PIN.");
    } catch {
      setError("Biometric check cancelled.");
    }
    setBusy(false);
  }

  async function submitPin(e) {
    e.preventDefault();
    if (pin.length < 4) return;
    setBusy(true);
    const { data } = await api("/api/mfa/unlock-pin", { body: { pin } });
    if (data.ok) return router.replace("/home");
    setError("Wrong PIN.");
    setShake(true);
    setPin("");
    setBusy(false);
    setTimeout(() => setShake(false), 400);
  }

  async function signOut() {
    await api("/api/auth/logout", { body: {} });
    router.replace("/");
  }

  if (!ready) return null;

  return (
    <Screen center>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, width: "100%" }}>
        <Logo size={48} />
        <div style={{ textAlign: "center" }}>
          <div style={{ font: "700 18px 'Source Sans 3'" }}>GATO Authenticator</div>
          <div style={{ color: "var(--faint)", fontSize: 13, marginTop: 4 }}>Locked</div>
        </div>

        {error && <div style={{ color: "var(--danger)", fontSize: 13 }}>{error}</div>}

        {!usePin ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: "100%" }}>
            <button className="btn btn-primary" onClick={tryBiometric} disabled={busy}>
              {busy ? "Waiting…" : "Unlock with Face ID / Touch ID"}
            </button>
            <button
              onClick={() => setUsePin(true)}
              style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 13, cursor: "pointer" }}
            >
              Use PIN instead
            </button>
          </div>
        ) : (
          <form onSubmit={submitPin} className={shake ? "shake" : ""} style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
            <input
              className="input mono"
              style={{ fontSize: 22, letterSpacing: 8, textAlign: "center" }}
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              autoFocus
            />
            <button className="btn btn-primary" type="submit" disabled={busy || pin.length < 4}>
              Unlock
            </button>
            {hasWebauthn && (
              <button
                type="button"
                onClick={() => setUsePin(false)}
                style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 13, cursor: "pointer" }}
              >
                Use biometrics instead
              </button>
            )}
          </form>
        )}

        <button
          onClick={signOut}
          style={{ background: "none", border: "none", color: "var(--faint)", fontSize: 12.5, cursor: "pointer", marginTop: 4 }}
        >
          Not you, or forgot your PIN? Sign out
        </button>
      </div>
    </Screen>
  );
}
