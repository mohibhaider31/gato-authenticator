import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { api } from "../lib/client";
import Screen, { Logo, Toast } from "../components/Screen";
import TabBar from "../components/TabBar";

const CIRC = 2 * Math.PI * 26;

export default function Home() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [code, setCode] = useState("— — —");
  const [remaining, setRemaining] = useState(30);
  const [toast, setToast] = useState("");
  const [user, setUser] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    (async () => {
      const me = await api("/api/auth/me");
      if (!me.data.loggedIn) return router.replace("/");
      if (!me.data.enrolled) return router.replace("/setup");
      if (!me.data.unlocked) return router.replace("/lock");
      setUser(me.data.user);
      setReady(true);
    })();
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    async function tick() {
      const { ok, status, data } = await api("/api/mfa/code");
      if (!ok) {
        if (status === 403) router.replace("/lock");
        return;
      }
      setCode(data.code);
      setRemaining(data.secondsRemaining);
    }
    tick();
    timer.current = setInterval(tick, 1000);
    return () => clearInterval(timer.current);
  }, [ready, router]);

  function copyCode() {
    navigator.clipboard?.writeText(code.replace(/\s/g, ""));
    setToast("Code copied");
    setTimeout(() => setToast(""), 1600);
  }

  async function lockNow() {
    await api("/api/mfa/lock", { body: {} });
    router.replace("/lock");
  }

  if (!ready) return null;

  const pct = remaining / 30;
  const dash = CIRC * pct;
  const urgent = remaining <= 5;

  return (
    <Screen>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Logo size={34} />
            <div>
              <div className="label-eyebrow">GATO Authenticator</div>
              <div style={{ font: "700 16px 'Source Sans 3'" }}>Your code</div>
            </div>
          </div>
          <button onClick={lockNow} style={iconBtnStyle} aria-label="Lock now" title="Lock now">
            ⏻
          </button>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "32px 20px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ font: "700 15px 'Source Sans 3'" }}>GATO Systems</div>
            <div style={{ color: "var(--faint)", fontSize: 12.5, marginTop: 2 }}>{user?.email}</div>
          </div>

          <div style={{ position: "relative", width: 64, height: 64 }}>
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="26" fill="none" stroke="var(--line-2)" strokeWidth="4" />
              <circle
                cx="32" cy="32" r="26" fill="none"
                stroke={urgent ? "var(--danger)" : "var(--accent)"}
                strokeWidth="4"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC - dash}
                strokeLinecap="round"
                transform="rotate(-90 32 32)"
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <div style={{
              position: "absolute", inset: 0, display: "flex", alignItems: "center",
              justifyContent: "center", font: "700 16px 'Source Code Pro'",
              color: urgent ? "var(--danger)" : "var(--ink)",
            }}>
              {remaining}
            </div>
          </div>

          <button
            className="mono"
            onClick={copyCode}
            style={{
              background: "none", border: "none", cursor: "pointer",
              font: "700 40px 'Source Code Pro'", color: "var(--ink)", letterSpacing: 3,
            }}
            aria-label="Tap to copy code"
          >
            {code}
          </button>

          <button className="btn btn-primary" onClick={copyCode} style={{ maxWidth: 200 }}>
            Copy code
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <NavRow label="Backup codes" onClick={() => router.push("/backup")} />
          <NavRow label="Settings" onClick={() => router.push("/settings")} />
        </div>
        <TabBar active="home" />
      </div>
      <Toast message={toast} />
    </Screen>
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

const iconBtnStyle = {
  width: 34, height: 34, borderRadius: 10, border: "1px solid var(--line-2)",
  background: "var(--fill)", color: "var(--muted)", cursor: "pointer", fontSize: 15,
};
