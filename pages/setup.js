import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { startRegistration } from "@simplewebauthn/browser";
import { api } from "../lib/client";
import Screen, { Logo } from "../components/Screen";

export default function Setup() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [stage, setStage] = useState("pin"); // pin -> biometric
  const [error, setError] = useState("");
  const [bioSupported, setBioSupported] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await api("/api/auth/me");
      if (!data.loggedIn) return router.replace("/");
      if (data.hasPin || data.hasWebauthn) {
        if (!data.enrolled) {
          await api("/api/mfa/auto-enroll", { body: {} });
          return router.replace({ pathname: "/backup", query: { firstRun: "1" } });
        }
        return router.replace(data.unlocked ? "/home" : "/lock");
      }
      setReady(true);
    })();

    if (typeof window !== "undefined" && window.PublicKeyCredential) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.().then(setBioSupported);
    }
  }, [router]);

  async function savePin(e) {
    e.preventDefault();
    setError("");
    if (!/^\d{4,6}$/.test(pin)) return setError("PIN must be 4–6 digits.");
    if (pin !== confirmPin) return setError("PINs don't match.");

    const { ok } = await api("/api/mfa/pin", { body: { pin } });
    if (!ok) return setError("Something went wrong — try again.");
    setStage("biometric");
  }

  async function finishSetup() {
    await api("/api/mfa/auto-enroll", { body: {} });
    router.replace({ pathname: "/backup", query: { firstRun: "1" } });
  }

  async function setupBiometric() {
    setBioBusy(true);
    setError("");
    try {
      const { data: options } = await api("/api/webauthn/register-options", { body: {} });
      const attResp = await startRegistration({ optionsJSON: options });
      const { data } = await api("/api/webauthn/register-verify", { body: attResp });
      if (!data.verified) {
        setError("Couldn't verify that. Your PIN still works as usual.");
        setBioBusy(false);
        return;
      }
      await finishSetup();
    } catch (err) {
      setError("Biometric setup was cancelled or isn't available on this browser.");
      setBioBusy(false);
    }
  }

  if (!ready) return null;

  return (
    <Screen center>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%" }}>
        <Logo size={44} />

        {stage === "pin" && (
          <>
            <div>
              <h1 style={{ font: "800 22px 'Source Sans 3'", margin: 0 }}>Set an app PIN</h1>
              <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 14, lineHeight: 1.5 }}>
                This protects your codes if someone else picks up this device. You can add Face
                ID or fingerprint next.
              </p>
            </div>
            <form onSubmit={savePin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="label-eyebrow">PIN (4–6 digits)</label>
                <input
                  className="input mono"
                  style={{ marginTop: 6, letterSpacing: 4 }}
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  autoFocus
                />
              </div>
              <div>
                <label className="label-eyebrow">Confirm PIN</label>
                <input
                  className="input mono"
                  style={{ marginTop: 6, letterSpacing: 4 }}
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              {error && <div style={{ color: "var(--danger)", fontSize: 13 }}>{error}</div>}
              <button className="btn btn-primary" type="submit" style={{ marginTop: 6 }}>
                Continue
              </button>
            </form>
          </>
        )}

        {stage === "biometric" && (
          <>
            <div>
              <h1 style={{ font: "800 22px 'Source Sans 3'", margin: 0 }}>Add biometric unlock</h1>
              <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 14, lineHeight: 1.5 }}>
                {bioSupported
                  ? "Use Face ID, Touch ID, or Windows Hello to unlock instead of typing your PIN every time."
                  : "This browser or device doesn't support platform biometrics — your PIN will be used instead."}
              </p>
            </div>
            {error && <div style={{ color: "var(--danger)", fontSize: 13 }}>{error}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {bioSupported && (
                <button className="btn btn-primary" onClick={setupBiometric} disabled={bioBusy}>
                  {bioBusy ? "Waiting for confirmation…" : "Set up biometric unlock"}
                </button>
              )}
              <button className="btn btn-secondary" onClick={finishSetup}>
                Skip for now — use PIN only
              </button>
            </div>
          </>
        )}
      </div>
    </Screen>
  );
}
