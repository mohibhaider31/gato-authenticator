import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api } from "../lib/client";
import Screen, { Logo } from "../components/Screen";
import QrScanner from "../components/QrScanner";

export default function Onboarding() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await api("/api/auth/me");
      if (!data.loggedIn) {
        setChecking(false);
        return;
      }
      if (!data.hasPin && !data.hasWebauthn) return router.replace("/setup");
      if (!data.enrolled) return router.replace("/setup");
      if (!data.unlocked) return router.replace("/lock");
      router.replace("/home");
    })();
  }, [router]);

  async function continueWithSso() {
    setLoading(true);
    // In production this becomes a redirect to CIS's real SSO endpoint.
    await api("/api/auth/login", { body: {} });
    router.replace("/setup");
  }

  async function afterLogin() {
    const { data } = await api("/api/auth/me");
    if (!data.hasPin && !data.hasWebauthn) return router.replace("/setup");
    if (!data.enrolled) return router.replace("/setup");
    router.replace(data.unlocked ? "/home" : "/lock");
  }

  async function handleScanResult(text) {
    setScanning(false);
    setScanError("");
    const res = await fetch("/api/auth/qr-session-consume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: text }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setScanError("That code didn't work — it may have expired. Try refreshing the QR and scanning again.");
      return;
    }
    afterLogin();
  }

  if (checking) return null;

  return (
    <Screen center>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 24 }}>
        <Logo size={56} />
        <div>
          <h1 style={{ font: "800 28px 'Source Sans 3'", margin: 0 }}>GATO Authenticator</h1>
          <p style={{ color: "var(--muted)", marginTop: 10, maxWidth: 300, lineHeight: 1.5 }}>
            Fast, offline second-factor codes for GATO Systems — generated on this device, never
            over email.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
          <Feature
            title="Instant, offline codes"
            desc="Generated on your device — no waiting on email delivery."
          />
          <Feature
            title="One login for GATO Systems"
            desc="A single enrollment covers your whole GATO session."
          />
          <Feature
            title="Your secret stays put"
            desc="Keys are stored on this device and never leave it."
          />
        </div>

        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
          <button className="btn btn-primary" onClick={continueWithSso} disabled={loading}>
            {loading ? "Connecting…" : "Continue with GATO SSO"}
          </button>
          <button className="btn btn-secondary" onClick={() => setScanning(true)}>
            Scan QR to sign in
          </button>
          {scanError && <div style={{ color: "var(--danger)", fontSize: 13 }}>{scanError}</div>}
          <p style={{ color: "var(--dim)", fontSize: 12, textAlign: "center", margin: 0 }}>
            Already signed in on a computer? Scan the code from your GATO Systems sign-in page.
          </p>
        </div>
      </div>
      {scanning && <QrScanner onResult={handleScanResult} onClose={() => setScanning(false)} />}
    </Screen>
  );
}

function Feature({ title, desc }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div
        style={{
          width: 6, height: 6, borderRadius: 3, background: "var(--accent)",
          marginTop: 7, flex: "none",
        }}
      />
      <div>
        <div style={{ font: "600 14px 'Source Sans 3'" }}>{title}</div>
        <div style={{ color: "var(--faint)", fontSize: 12.5, marginTop: 2, lineHeight: 1.4 }}>{desc}</div>
      </div>
    </div>
  );
}
