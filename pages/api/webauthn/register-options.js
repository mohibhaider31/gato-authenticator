import { generateRegistrationOptions } from "@simplewebauthn/server";
import { getAuthContext } from "../../../lib/authContext";
import { getRpConfig } from "../../../lib/webauthn";
import { signChallenge } from "../../../lib/challengeToken";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const ctx = await getAuthContext(req, res);
  if (!ctx.user) return res.status(401).json({ error: "not_logged_in" });

  const { rpID, rpName } = getRpConfig(req);

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: ctx.user.email,
    userDisplayName: ctx.user.name,
    attestationType: "none",
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "preferred",
    },
  });

  res.status(200).json({ ...options, challengeToken: signChallenge(options.challenge) });
}
