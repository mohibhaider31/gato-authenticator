import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api } from "../lib/client";
import Screen, { Logo } from "../components/Screen";

export default function Onboarding() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await api("/api/auth/me");
      if (!data.loggedIn) {
        setChecking(false);
        return;
      }
      if (!data.hasPin && !data.hasWebauthn) return router.replace("/setup");
      if (!data.enrolled) return router.replace("/enroll");
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
          <p style={{ color: "var(--dim)", fontSize: 12, textAlign: "center", margin: 0 }}>
            On a phone? Scan the QR code shown on your GATO Systems sign-in page instead.
          </p>
        </div>
      </div>
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
