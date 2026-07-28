import { getSession } from "../../../lib/session";

// This stands in for the real flow: in production, this route is replaced by
// a redirect to CIS's actual SSO/OAuth endpoint, and this handler becomes the
// callback that receives the authenticated identity from CIS. For now it lets
// you test the rest of the app end to end.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const session = await getSession(req, res);
  session.user = {
    email: "m.kazmi@gato.systems",
    name: "Mohib Kazmi",
  };
  await session.save();

  res.status(200).json({ user: session.user });
}
