import { getSession } from "./session";
import { getDeviceIdFromReq } from "./deviceCookie";
import { getBearerToken, verifyMobileToken, createMobileToken } from "./mobileToken";
import { getDevice } from "./deviceStore";

function withinTrustWindow(device) {
  if (!device?.unlocked_at) return false;
  const days = device.remember_days ?? 14;
  const elapsedMs = Date.now() - new Date(device.unlocked_at).getTime();
  return elapsedMs < days * 24 * 60 * 60 * 1000;
}

// Resolves { user, unlocked, deviceId, device } the same way regardless of
// whether the caller is a browser (cookie-based session) or a native client
// sending an Authorization: Bearer token + X-Device-Id header. Route
// handlers call ctx.persist({...}) to update state; on mobile this returns a
// new token the client must store, on web it's saved into the session
// cookie directly.
//
// "unlocked" here reflects EITHER an explicit unlock this session, OR the
// device still being within its "remember this device for N days" window —
// so a trusted device skips re-authentication entirely on relaunch, rather
// than just remembering a setting nobody enforces.
export async function getAuthContext(req, res) {
  const bearer = getBearerToken(req);
  const deviceIdHeader = req.headers["x-device-id"];
  const isMobile = !!deviceIdHeader || bearer !== null;

  let rawUser, rawUnlocked, deviceId, persistFn;

  if (isMobile) {
    const data = bearer ? verifyMobileToken(bearer) || {} : {};
    rawUser = data.user || null;
    rawUnlocked = !!data.unlocked;
    deviceId = deviceIdHeader || null;
    persistFn = async (patch) => {
      const next = { user: data.user || null, unlocked: !!data.unlocked, ...patch };
      return createMobileToken(next);
    };
  } else {
    const session = await getSession(req, res);
    rawUser = session.user || null;
    rawUnlocked = !!session.unlocked;
    deviceId = getDeviceIdFromReq(req);
    persistFn = async (patch) => {
      if ("user" in patch) session.user = patch.user;
      if ("unlocked" in patch) session.unlocked = patch.unlocked;
      await session.save();
      return null;
    };
  }

  let device = null;
  if (rawUser && deviceId) {
    device = await getDevice(rawUser.email, deviceId);
  }

  // "Unlocked" is determined ENTIRELY by the trust window, not by also
  // trusting a separate session-level flag — a flag that, once set true,
  // would otherwise never expire on its own and would make the
  // "remember this device for N days" setting meaningless. A fresh
  // successful unlock sets device.unlocked_at = now(); every request after
  // that re-checks it against remember_days, and an explicit "Lock now"
  // clears it, ending the window immediately regardless of how much of it
  // was left.
  const unlocked = withinTrustWindow(device);

  return {
    isMobile,
    user: rawUser,
    unlocked,
    deviceId,
    device,
    persist: persistFn,
  };
}
