import { useEffect, useState, useCallback } from "react";
import Screen, { Logo } from "../components/Screen";

// Stands in for a page on the real GATO Systems website. That site already
// requires a real authenticated session before it would ever show this QR —
// this demo skips that check to make the loop testable end to end today.
export default function DemoGatoSystemsQr() {
  const [qr, setQr] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [scanned, setScanned] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/auth/qr-session-create", { method: "POST" });
    const data = await res.json();
    setQr(data.qrDataUrl);
    setSecondsLeft(Math.floor(data.expiresInMs / 1000));
    setScanned(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          refresh();
          return 120;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [refresh]);

  return (
    <Screen center>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, width: "100%" }}>
        <Logo size={44} />
        <div style={{ textAlign: "center" }}>
          <div className="label-eyebrow">GATO Systems — demo</div>
          <h1 style={{ font: "800 20px 'Source Sans 3'", margin: "6px 0 0" }}>
            Scan to sign in on another device
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 8, maxWidth: 280 }}>
            Standing in for a real GATO Systems page here — in production this only renders
            after your desktop session is already authenticated.
          </p>
        </div>

        <div className="card" style={{ padding: 20 }}>
          {qr && <img src={qr} alt="QR code to sign in" style={{ width: 220, height: 220, borderRadius: 12, background: "#EEF0FF" }} />}
        </div>

        <div style={{ color: "var(--faint)", fontSize: 12.5 }}>
          Refreshes in {secondsLeft}s
        </div>
      </div>
    </Screen>
  );
}
