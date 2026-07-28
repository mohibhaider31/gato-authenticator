import { generateRegistrationOptions } from "@simplewebauthn/server";
import { getSession } from "../../../lib/session";
import { getRpConfig } from "../../../lib/webauthn";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await getSession(req, res);
  if (!session.user) return res.status(401).json({ error: "not_logged_in" });

  const { rpID, rpName } = getRpConfig(req);

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: session.user.email,
    userDisplayName: session.user.name,
    attestationType: "none",
    authenticatorSelection: {
      // Requires an on-device platform authenticator — Face ID, Touch ID,
      // Windows Hello — not a roaming security key, matching "biometric lock".
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "preferred",
    },
  });

  session.webauthnChallenge = options.challenge;
  await session.save();

  res.status(200).json(options);
}
