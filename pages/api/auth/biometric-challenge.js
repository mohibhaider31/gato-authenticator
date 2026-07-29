import { signChallenge } from "../../../lib/challengeToken";
import crypto from "crypto";

// Deliberately unauthenticated — this runs at app launch, possibly before
// any valid session exists at all. Knowing a nonce grants nothing on its
// own; only a signature over it from the device's enrolled private key
// (checked at /api/auth/token-introspect) proves anything.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const nonce = crypto.randomBytes(24).toString("base64url");
  res.status(200).json({ nonce, challengeToken: signChallenge(nonce) });
}
