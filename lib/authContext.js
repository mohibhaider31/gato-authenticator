import { getSession } from "./session";
import { getDeviceIdFromReq } from "./deviceCookie";
import { getBearerToken, verifyMobileToken, createMobileToken } from "./mobileToken";

// Resolves { user, unlocked, deviceId } the same way regardless of whether
// the caller is a browser (cookie-based session) or a native client sending
// an Authorization: Bearer token + X-Device-Id header. Route handlers call
// ctx.persist({...}) to update state; on mobile this returns a new token the
// client must store, on web it's saved into the session cookie directly.
export async function getAuthContext(req, res) {
  const bearer = getBearerToken(req);

  if (bearer !== null) {
    const data = verifyMobileToken(bearer) || {};
    return {
      isMobile: true,
      user: data.user || null,
      unlocked: !!data.unlocked,
      deviceId: req.headers["x-device-id"] || null,
      async persist(patch) {
        const next = { user: data.user || null, unlocked: !!data.unlocked, ...patch };
        return createMobileToken(next);
      },
    };
  }

  const session = await getSession(req, res);
  return {
    isMobile: false,
    user: session.user || null,
    unlocked: !!session.unlocked,
    deviceId: getDeviceIdFromReq(req),
    async persist(patch) {
      if ("user" in patch) session.user = patch.user;
      if ("unlocked" in patch) session.unlocked = patch.unlocked;
      await session.save();
      return null;
    },
  };
}
