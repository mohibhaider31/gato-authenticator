// Resolves the WebAuthn relying-party ID and expected origin. On Vercel,
// VERCEL_URL is set automatically at build/runtime; for a custom domain, set
// RP_ID and RP_ORIGIN explicitly in your Vercel project's env vars.
export function getRpConfig(req) {
  if (process.env.RP_ID && process.env.RP_ORIGIN) {
    return { rpID: process.env.RP_ID, rpOrigin: process.env.RP_ORIGIN, rpName: "GATO Authenticator" };
  }

  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
  const proto = req.headers["x-forwarded-proto"] || (host.includes("localhost") ? "http" : "https");
  const rpID = host.split(":")[0];

  return {
    rpID,
    rpOrigin: `${proto}://${host}`,
    rpName: "GATO Authenticator",
  };
}
