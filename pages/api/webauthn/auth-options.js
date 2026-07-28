import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { getAuthContext } from "../../../lib/authContext";
import { getRpConfig } from "../../../lib/webauthn";
import { getDevice } from "../../../lib/deviceStore";
import { signChallenge } from "../../../lib/challengeToken";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const ctx = await getAuthContext(req, res);
  if (!ctx.user) return res.status(401).json({ error: "not_logged_in" });

  const device = ctx.deviceId ? await getDevice(ctx.user.email, ctx.deviceId) : null;
  if (!device?.webauthn_credential_id) return res.status(400).json({ error: "no_credential" });

  const { rpID } = getRpConfig(req);
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials: [{ id: device.webauthn_credential_id }],
  });

  res.status(200).json({ ...options, challengeToken: signChallenge(options.challenge) });
}
