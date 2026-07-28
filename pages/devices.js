import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api } from "../lib/client";
import Screen, { Toast } from "../components/Screen";
import TabBar from "../components/TabBar";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 2) return "Active now";
  if (mins < 60) return `Last used ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Last used ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Last used ${days}d ago`;
}

export default function Devices() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [devices, setDevices] = useState([]);
  const [confirmSheet, setConfirmSheet] = useState(null); // { type: 'one'|'all', id? }
  const [toast, setToast] = useState("");

  async function load() {
    const res = await fetch("/api/mfa/devices");
    if (!res.ok) return;
    const data = await res.json();
    setDevices(data.devices);
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

  function show(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  }

  async function confirmRevoke() {
    if (confirmSheet.type === "one") {
      await fetch("/api/mfa/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", deviceRowId: confirmSheet.id }),
      });
      show("Device revoked");
    } else {
      await fetch("/api/mfa/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revokeAllOthers" }),
      });
      show("All other devices revoked");
    }
    setConfirmSheet(null);
    await load();
  }

  if (!ready) return null;

  const others = devices.filter((d) => !d.current);

  return (
    <Screen>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <button onClick={() => router.push("/settings")} style={backLinkStyle}>← Back to settings</button>

        <div>
          <h1 style={{ font: "800 22px 'Source Sans 3'", margin: 0 }}>Devices</h1>
          <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 14 }}>
            Places your account can generate codes.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {devices.map((d) => (
            <div key={d.id} className="card" style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ font: "700 14px 'Source Sans 3'" }}>{d.name}</span>
                    {d.current && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase",
                        color: "var(--chip-ink)", background: "var(--accent)", borderRadius: 5, padding: "2px 6px",
                      }}>
                        This device
                      </span>
                    )}
                  </div>
                  <div style={{ color: "var(--faint)", fontSize: 12.5, marginTop: 3 }}>
                    {timeAgo(d.lastUsedAt)} · Enrolled {formatDate(d.createdAt)}
                  </div>
                </div>
                {!d.current && (
                  <button
                    onClick={() => setConfirmSheet({ type: "one", id: d.id })}
                    style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: 18, padding: 4 }}
                    aria-label={`Revoke ${d.name}`}
                  >
                    🗑
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {others.length > 0 && (
          <div className="card" style={{ borderColor: "rgba(255,84,112,0.35)" }}>
            <div style={{ font: "700 14px 'Source Sans 3'" }}>Suspect a compromise?</div>
            <p style={{ color: "var(--faint)", fontSize: 12.5, marginTop: 6, lineHeight: 1.5 }}>
              Revoke every other device at once. They'll each need to re-enroll from GATO Systems.
            </p>
            <button
              className="btn btn-danger"
              style={{ marginTop: 10 }}
              onClick={() => setConfirmSheet({ type: "all" })}
            >
              Revoke all other devices
            </button>
          </div>
        )}
      </div>
      <TabBar active="devices" />

      {confirmSheet && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
          alignItems: "flex-end", justifyContent: "center", zIndex: 60,
        }}>
          <div className="card" style={{ width: "100%", maxWidth: 420, borderRadius: "16px 16px 0 0", margin: 0 }}>
            <div style={{ font: "700 15px 'Source Sans 3'" }}>
              {confirmSheet.type === "one" ? "Revoke this device?" : "Revoke all other devices?"}
            </div>
            <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>
              Its codes stop working immediately and it must be re-enrolled to sign in again.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmSheet(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" style={{ flex: 1, background: "var(--danger)", color: "#fff" }} onClick={confirmRevoke}>
                Revoke
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast} />
    </Screen>
  );
}

const backLinkStyle = {
  background: "none", border: "none", color: "var(--faint)", font: "600 13px 'Source Sans 3'",
  cursor: "pointer", padding: 0, textAlign: "left", width: "fit-content",
};
