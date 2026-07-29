import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { api } from "../lib/client";
import Screen, { Logo } from "../components/Screen";

const EVENT_LABELS = {
  biometric_enroll: { label: "Biometric enrolled", color: "var(--accent)" },
  token_introspect_active: { label: "Unlocked — active session", color: "var(--accent)" },
  token_introspect_refreshed: { label: "Unlocked — session silently refreshed", color: "#4EA1FF" },
  token_introspect_rejected: { label: "Rejected", color: "var(--danger)" },
};

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return new Date(iso).toLocaleTimeString();
}

export default function SecurityLog() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [devices, setDevices] = useState([]);
  const [events, setEvents] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const timer = useRef(null);

  async function load() {
    const res = await fetch("/api/mfa/security-log");
    if (!res.ok) return;
    const data = await res.json();
    setDevices(data.devices);
    setEvents(data.events);
  }

  useEffect(() => {
    (async () => {
      const me = await api("/api/auth/me");
      if (!me.data.loggedIn) return router.replace("/");
      if (!me.data.enrolled) return router.replace("/setup");
      if (!me.data.unlocked) return router.replace("/lock");
      await load();
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    if (autoRefresh) {
      timer.current = setInterval(load, 3000);
      return () => clearInterval(timer.current);
    }
  }, [ready, autoRefresh]);

  if (!ready) return null;

  return (
    <Screen>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <button onClick={() => router.push("/settings")} style={backLinkStyle}>← Back to settings</button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <Logo size={36} />
            <h1 style={{ font: "800 22px 'Source Sans 3'", margin: "10px 0 0" }}>Security log</h1>
            <p style={{ color: "var(--muted)", marginTop: 6, fontSize: 13, maxWidth: 340 }}>
              Live view of biometric enrollment and unlock attempts — trigger something on your
              phone and watch it show up here.
            </p>
          </div>
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            style={{
              fontSize: 11, fontWeight: 700, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line-2)",
              background: autoRefresh ? "var(--accent-weak)" : "transparent", color: autoRefresh ? "var(--accent)" : "var(--faint)",
              cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            {autoRefresh ? "● Live (3s)" : "Paused"}
          </button>
        </div>

        <div>
          <div className="label-eyebrow" style={{ marginBottom: 8 }}>Enrolled devices &amp; key fingerprints</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {devices.map((d) => (
              <div key={d.id} className="card" style={{ padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ font: "700 13.5px 'Source Sans 3'" }}>
                    {d.name} {d.current && <span style={{ color: "var(--accent)", fontSize: 10.5 }}>· THIS SESSION</span>}
                  </div>
                  <div style={{ color: "var(--faint)", fontSize: 11.5 }}>{d.platform}</div>
                </div>
                <div className="mono" style={{ fontSize: 11, color: d.biometricFingerprint ? "var(--muted)" : "var(--dim)", marginTop: 6, wordBreak: "break-all" }}>
                  {d.biometricFingerprint ? `🔑 ${d.biometricFingerprint}` : "No biometric key enrolled"}
                </div>
              </div>
            ))}
            {devices.length === 0 && <div style={{ color: "var(--faint)", fontSize: 13 }}>No devices yet.</div>}
          </div>
        </div>

        <div>
          <div className="label-eyebrow" style={{ marginBottom: 8 }}>Recent events</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {events.map((e, i) => {
              const meta = EVENT_LABELS[e.eventType] || { label: e.eventType, color: "var(--faint)" };
              return (
                <div key={i} className="card" style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ font: "600 13px 'Source Sans 3'", color: meta.color }}>{meta.label}</div>
                    <div style={{ color: "var(--faint)", fontSize: 11.5, marginTop: 2 }}>
                      {e.deviceName}
                      {e.detail?.fingerprint ? ` · ${e.detail.fingerprint.slice(0, 19)}…` : ""}
                      {e.detail?.reason ? ` · ${e.detail.reason}` : ""}
                    </div>
                  </div>
                  <div style={{ color: "var(--dim)", fontSize: 11, whiteSpace: "nowrap" }}>{timeAgo(e.createdAt)}</div>
                </div>
              );
            })}
            {events.length === 0 && <div style={{ color: "var(--faint)", fontSize: 13 }}>No events yet — try enrolling or unlocking on your phone.</div>}
          </div>
        </div>
      </div>
    </Screen>
  );
}

const backLinkStyle = {
  background: "none", border: "none", color: "var(--faint)", font: "600 13px 'Source Sans 3'",
  cursor: "pointer", padding: 0, textAlign: "left", width: "fit-content",
};
