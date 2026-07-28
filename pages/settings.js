import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api } from "../lib/client";
import Screen, { Toast } from "../components/Screen";
import TabBar from "../components/TabBar";

export default function Settings() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasWebauthn, setHasWebauthn] = useState(false);
  const [rememberDays, setRememberDaysState] = useState(14);
  const [toast, setToast] = useState("");

  useEffect(() => {
    (async () => {
      const me = await api("/api/auth/me");
      if (!me.data.loggedIn) return router.replace("/");
      if (!me.data.enrolled) return router.replace("/setup");
      if (!me.data.unlocked) return router.replace("/lock");
      setHasWebauthn(me.data.hasWebauthn);
      setRememberDaysState(me.data.rememberDays);
      setReady(true);
    })();
  }, [router]);

  function show(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 1600);
  }

  async function setDays(n) {
    setRememberDaysState(n);
    await api("/api/mfa/remember-days", { body: { days: n } });
    show(`Trusted device window set to ${n} days`);
  }

  async function lockNow() {
    await api("/api/mfa/lock", { body: {} });
    router.replace("/lock");
  }

  async function signOut() {
    await api("/api/auth/logout", { body: {} });
    router.replace("/");
  }

  if (!ready) return null;

  return (
    <Screen>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <button onClick={() => router.push("/home")} style={backLinkStyle}>← Back to code</button>

        <h1 style={{ font: "800 22px 'Source Sans 3'", margin: 0 }}>Settings</h1>

        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="label-eyebrow">Security</div>
          <Row label="App lock" value="Required — PIN always on" />
          <Row label="Biometric unlock" value={hasWebauthn ? "Enabled" : "Not set up"} />
          <NavRow label="Backup codes" onClick={() => router.push("/backup")} />
          <NavRow label="View code in another app (for demos)" onClick={() => router.push("/view-in-app")} />
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="label-eyebrow">Trusted device</div>
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              Skip re-entering your code on this device for:
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[7, 14, 30].map((n) => (
                <button
                  key={n}
                  onClick={() => setDays(n)}
                  style={{
                    flex: 1, border: "none", borderRadius: 9, padding: "9px 0", cursor: "pointer",
                    font: "600 13px 'Source Sans 3'",
                    background: rememberDays === n ? "var(--accent)" : "transparent",
                    color: rememberDays === n ? "var(--chip-ink)" : "var(--muted)",
                    outline: rememberDays === n ? "none" : "1px solid var(--line-2)",
                  }}
                >
                  {n} days
                </button>
              ))}
            </div>
          </div>
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="btn btn-secondary" onClick={lockNow}>Lock now</button>
          <button className="btn btn-danger" onClick={signOut}>Sign out</button>
        </section>
      </div>
      <TabBar active="settings" />
      <Toast message={toast} />
    </Screen>
  );
}

function Row({ label, value }) {
  return (
    <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px" }}>
      <span style={{ font: "600 14px 'Source Sans 3'" }}>{label}</span>
      <span style={{ color: "var(--faint)", fontSize: 13 }}>{value}</span>
    </div>
  );
}

function NavRow({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="card"
      style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "var(--fill)", border: "1px solid var(--line)", cursor: "pointer",
        color: "var(--ink)", font: "600 14px 'Source Sans 3'", padding: "14px 16px",
      }}
    >
      {label} <span style={{ color: "var(--faint)" }}>›</span>
    </button>
  );
}

const backLinkStyle = {
  background: "none", border: "none", color: "var(--faint)", font: "600 13px 'Source Sans 3'",
  cursor: "pointer", padding: 0, textAlign: "left", width: "fit-content",
};
