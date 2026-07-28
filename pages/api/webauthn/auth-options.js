import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { getSession } from "../../../lib/session";
import { getRpConfig } from "../../../lib/webauthn";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await getSession(req, res);
  if (!session.user) return res.status(401).json({ error: "not_logged_in" });
  if (!session.webauthnCredentialId) return res.status(400).json({ error: "no_credential" });

  const { rpID } = getRpConfig(req);

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials: [{ id: session.webauthnCredentialId }],
  });

  session.webauthnChallenge = options.challenge;
  await session.save();

  res.status(200).json(options);
}
