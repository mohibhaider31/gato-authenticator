// Device identity is intentionally separate from the login session cookie.
// Signing out should end your session, not make the app forget which
// physical device this is — otherwise every sign-out/sign-in cycle would
// silently create a duplicate device row. This cookie persists for a year
// and is only ever cleared if the device itself is revoked or reset.
const COOKIE_NAME = "gato_device_id";
const MAX_AGE = 60 * 60 * 24 * 365;

export function getDeviceIdFromReq(req) {
  const header = req.headers.cookie || "";
  const match = header
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${COOKIE_NAME}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

export function setDeviceIdCookie(res, deviceId) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const cookie = `${COOKIE_NAME}=${encodeURIComponent(deviceId)}; Max-Age=${MAX_AGE}; Path=/; HttpOnly; SameSite=Lax${secure}`;
  const existing = res.getHeader("Set-Cookie");
  const cookies = existing ? (Array.isArray(existing) ? existing : [existing]) : [];
  res.setHeader("Set-Cookie", [...cookies, cookie]);
}

export function clearDeviceIdCookie(res) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure}`;
  const existing = res.getHeader("Set-Cookie");
  const cookies = existing ? (Array.isArray(existing) ? existing : [existing]) : [];
  res.setHeader("Set-Cookie", [...cookies, cookie]);
}
