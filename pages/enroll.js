import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { api } from "../lib/client";
import Screen, { Logo } from "../components/Screen";

export default function Enroll() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [qr, setQr] = useState(null);
  const [manualKey, setManualKey] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    (async () => {
      const me = await api("/api/auth/me");
      if (!me.data.loggedIn) return router.replace("/");
      if (!me.data.hasPin && !me.data.hasWebauthn) return router.replace("/setup");
      if (me.data.enrolled) return router.replace(me.data.unlocked ? "/home" : "/lock");

      const { data } = await api("/api/mfa/init", { body: {} });
      setQr(data.qrDataUrl);
      setManualKey(data.manualKey);
      setReady(true);
    })();
  }, [router]);

  async function confirm(e) {
    e.preventDefault();
    if (code.replace(/\s/g, "").length !== 6) return;
    setSubmitting(true);
    setError("");
    const { data } = await api("/api/mfa/confirm", { body: { code } });
    if (!data.valid) {
      setError("That code doesn't match. Check the time on your device and try again.");
      setShake(true);
      setCode("");
      setSubmitting(false);
      setTimeout(() => setShake(false), 400);
      inputRef.current?.focus();
      return;
    }
    router.replace({ pathname: "/backup", query: { firstRun: "1" } });
  }

  if (!ready) return null;

  return (
    <Screen>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Logo size={44} />
        <div>
          <h1 style={{ font: "800 22px 'Source Sans 3'", margin: 0 }}>Set up GATO Authenticator</h1>
          <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 14, lineHeight: 1.5 }}>
            Scan this with your phone's authenticator app (or this one, on another device), then
            enter the 6-digit code it shows to confirm.
          </p>
        </div>

        {!showManual ? (
          <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            {qr && (
              <img
                src={qr}
                alt="QR code to scan with your authenticator app"
                style={{ width: 220, height: 220, borderRadius: 12, background: "#EEF0FF" }}
              />
            )}
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => setShowManual(true)}
              style={{ marginTop: 4 }}
            >
              Enter the key manually instead
            </button>
          </div>
        ) : (
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label className="label-eyebrow">Setup key</label>
            <div className="mono" style={{ fontSize: 15, letterSpacing: 1, wordBreak: "break-all" }}>
              {manualKey}
            </div>
            <p style={{ color: "var(--faint)", fontSize: 12, margin: 0 }}>
              Type it exactly as shown. Spaces don't matter.
            </p>
            <button className="btn btn-secondary" type="button" onClick={() => setShowManual(false)}>
              Show QR code instead
            </button>
          </div>
        )}

        <form onSubmit={confirm} className={shake ? "shake" : ""} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label className="label-eyebrow">Confirm with the 6-digit code</label>
          <input
            ref={inputRef}
            className="input mono"
            style={{ fontSize: 22, letterSpacing: 6, textAlign: "center" }}
            inputMode="numeric"
            maxLength={7}
            placeholder="000 000"
            value={code}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
              setCode(digits.length > 3 ? digits.slice(0, 3) + " " + digits.slice(3) : digits);
            }}
            autoFocus
          />
          {error && <div style={{ color: "var(--danger)", fontSize: 13 }}>{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={submitting || code.replace(/\s/g, "").length !== 6}>
            {submitting ? "Checking…" : "Confirm and continue"}
          </button>
        </form>
      </div>
    </Screen>
  );
}
