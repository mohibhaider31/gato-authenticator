import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api } from "../lib/client";
import Screen, { Logo, Toast } from "../components/Screen";

export default function ViewInApp() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [qr, setQr] = useState(null);
  const [manualKey, setManualKey] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    (async () => {
      const me = await api("/api/auth/me");
      if (!me.data.loggedIn) return router.replace("/");
      if (!me.data.enrolled) return router.replace("/setup");
      if (!me.data.unlocked) return router.replace("/lock");

      const res = await fetch("/api/mfa/view-in-app");
      if (!res.ok) return router.replace("/settings");
      const data = await res.json();
      setQr(data.qrDataUrl);
      setManualKey(data.manualKey);
      setReady(true);
    })();
  }, [router]);

  function copyKey() {
    navigator.clipboard?.writeText(manualKey);
    setToast("Key copied");
    setTimeout(() => setToast(""), 1600);
  }

  if (!ready) return null;

  return (
    <Screen>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <button onClick={() => router.push("/settings")} style={backLinkStyle}>← Back to settings</button>
        <Logo size={40} />
        <div>
          <h1 style={{ font: "800 20px 'Source Sans 3'", margin: 0 }}>View in another app</h1>
          <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 14, lineHeight: 1.5 }}>
            Handy for demos — scan this into Microsoft or Google Authenticator on any phone and
            it'll show the exact same code as your GATO Authenticator home screen, in step.
          </p>
        </div>

        {!showManual ? (
          <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            {qr && (
              <img
                src={qr}
                alt="QR code for this account, to scan into another authenticator app"
                style={{ width: 220, height: 220, borderRadius: 12, background: "#EEF0FF" }}
              />
            )}
            <button className="btn btn-secondary" onClick={() => setShowManual(true)}>
              Show the key instead
            </button>
          </div>
        ) : (
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label className="label-eyebrow">Setup key</label>
            <div className="mono" style={{ fontSize: 15, letterSpacing: 1, wordBreak: "break-all" }}>
              {manualKey}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={copyKey}>Copy key</button>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowManual(false)}>
                Show QR instead
              </button>
            </div>
          </div>
        )}

        <p style={{ color: "var(--faint)", fontSize: 12, lineHeight: 1.5 }}>
          This is your real, live secret — anyone who scans it can generate valid codes for your
          account, so only show it to people you trust (e.g. during an internal walkthrough).
        </p>
      </div>
      <Toast message={toast} />
    </Screen>
  );
}

const backLinkStyle = {
  background: "none", border: "none", color: "var(--faint)", font: "600 13px 'Source Sans 3'",
  cursor: "pointer", padding: 0, textAlign: "left", width: "fit-content",
};
