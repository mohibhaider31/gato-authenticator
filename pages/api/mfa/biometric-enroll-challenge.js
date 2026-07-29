import { getAuthContext } from "../../../lib/authContext";
import { signChallenge } from "../../../lib/challengeToken";
import crypto from "crypto";

// Step in the enrollment flow: right after SSO login, before we trust a
// public key the client hands us, we make it prove it holds the matching
// private key by signing a nonce we generate — not something the client
// could fabricate on its own.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const ctx = await getAuthContext(req, res);
  if (!ctx.user) return res.status(401).json({ error: "not_logged_in" });

  const nonce = crypto.randomBytes(24).toString("base64url");
  res.status(200).json({ nonce, challengeToken: signChallenge(nonce) });
}
