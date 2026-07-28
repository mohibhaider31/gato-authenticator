import { getAuthContext } from "../../../lib/authContext";
import { getDevice } from "../../../lib/deviceStore";

export default async function handler(req, res) {
  const ctx = await getAuthContext(req, res);

  let device = null;
  if (ctx.user && ctx.deviceId) {
    device = await getDevice(ctx.user.email, ctx.deviceId);
  }

  res.status(200).json({
    loggedIn: !!ctx.user,
    user: ctx.user,
    hasPin: !!device?.pin_hash,
    hasWebauthn: !!device?.webauthn_credential_id,
    enrolled: !!device,
    unlocked: ctx.unlocked,
    rememberDays: device?.remember_days ?? 14,
    hideCodes: device?.hide_codes ?? false,
    appearance: device?.appearance ?? "dark",
  });
}
