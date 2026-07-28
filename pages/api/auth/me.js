import { getSession } from "../../../lib/session";
import { getDeviceIdFromReq } from "../../../lib/deviceCookie";
import { getDevice } from "../../../lib/deviceStore";

export default async function handler(req, res) {
  const session = await getSession(req, res);
  const deviceId = getDeviceIdFromReq(req);

  let device = null;
  if (session.user && deviceId) {
    device = await getDevice(session.user.email, deviceId);
  }

  res.status(200).json({
    loggedIn: !!session.user,
    user: session.user || null,
    hasPin: !!device?.pin_hash,
    hasWebauthn: !!device?.webauthn_credential_id,
    enrolled: !!device,
    unlocked: !!session.unlocked,
    rememberDays: device?.remember_days ?? 14,
  });
}
