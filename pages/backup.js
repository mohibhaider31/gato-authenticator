import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api } from "../lib/client";
import Screen, { Toast } from "../components/Screen";

export default function Backup() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [codes, setCodes] = useState([]);
  const [toast, setToast] = useState("");
  const firstRun = router.query.firstRun === "1";

  useEffect(() => {
    (async () => {
      const me = await api("/api/auth/me");
      if (!me.data.loggedIn) return router.replace("/");
      if (!me.data.enrolled) return router.replace("/enroll");
      if (!me.data.unlocked) return router.replace("/lock");

      const { data } = await api("/api/mfa/backup-codes");
      setCodes(data.codes || []);
      setReady(true);
    })();
  }, [router]);

  function show(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }

  function copyAll() {
    const text = codes.map((c) => c.code).join("\n");
    navigator.clipboard?.writeText(text);
    show("All codes copied");
  }

  function download() {
    const text = codes.map((c) => c.code).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gato-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function printCodes() {
    const w = window.open("", "_blank");
    w.document.write(
      `<pre style="font:16px monospace; padding:24px;">GATO Authenticator — backup codes\n\n${codes
        .map((c) => c.code)
        .join("\n")}</pre>`
    );
    w.document.close();
    w.print();
  }

  async function regenerate() {
    if (!confirm("Generate new backup codes? Your old codes will stop working.")) return;
    const { data } = await api("/api/mfa/backup-codes", { body: {} });
    setCodes(data.codes || []);
    show("New backup codes generated");
  }

  if (!ready) return null;

  return (
    <Screen>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <button className="btn-back" onClick={() => router.push(firstRun ? "/home" : "/settings")} style={backLinkStyle}>
          ← {firstRun ? "Skip to my codes" : "Back to settings"}
        </button>

        <div>
          <h1 style={{ font: "800 22px 'Source Sans 3'", margin: 0 }}>Backup codes</h1>
          <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 14, lineHeight: 1.5 }}>
            Store these somewhere safe. Each code works once, and this full list is shown only
            now.
          </p>
        </div>

        <div className="card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {codes.map((c, i) => (
            <div
              key={i}
              className="mono"
              style={{
                fontSize: 13.5,
                padding: "9px 10px",
                borderRadius: 8,
                background: "var(--field)",
                color: c.used ? "var(--dim)" : "var(--ink)",
                textDecoration: c.used ? "line-through" : "none",
                textAlign: "center",
              }}
            >
              {c.code}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" style={{ flex: 1, fontSize: 13 }} onClick={copyAll}>
            Copy all
          </button>
          <button className="btn btn-secondary" style={{ flex: 1, fontSize: 13 }} onClick={download}>
            Download
          </button>
          <button className="btn btn-secondary" style={{ flex: 1, fontSize: 13 }} onClick={printCodes}>
            Print
          </button>
        </div>

        <button className="btn btn-secondary" onClick={regenerate}>
          Generate new codes
        </button>

        {firstRun && (
          <button className="btn btn-primary" onClick={() => router.push("/home")}>
            Done — take me to my codes
          </button>
        )}
      </div>
      <Toast message={toast} />
    </Screen>
  );
}

const backLinkStyle = {
  background: "none",
  border: "none",
  color: "var(--faint)",
  font: "600 13px 'Source Sans 3'",
  cursor: "pointer",
  padding: 0,
  textAlign: "left",
  width: "fit-content",
};
