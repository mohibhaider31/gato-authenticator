import { getAuthContext } from "../../../lib/authContext";
import { getDeviceIdFromReq, setDeviceIdCookie } from "../../../lib/deviceCookie";
import { newDeviceId } from "../../../lib/deviceStore";

// This stands in for the real flow: in production, this route is replaced by
// a redirect to CIS's actual SSO/OAuth endpoint, and this handler becomes the
// callback that receives the authenticated identity from CIS. For now it lets
// you test the rest of the app end to end.
//
// Works for both the web (cookie session) and native clients (bearer token,
// via getAuthContext) — see lib/authContext.js.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const ctx = await getAuthContext(req, res);
  const user = { email: "m.kazmi@gato.systems", name: "Mohib Kazmi" };
  const sessionToken = await ctx.persist({ user });

  if (!ctx.isMobile && !getDeviceIdFromReq(req)) {
    setDeviceIdCookie(res, newDeviceId());
  }

  res.status(200).json({ user, sessionToken });
}
