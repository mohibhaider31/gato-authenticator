import { getSession } from "../../../lib/session";

// Bearer/mobile clients "log out" simply by discarding their stored token
// client-side — there's nothing server-side to destroy for them. This route
// only needs to handle the web cookie case.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await getSession(req, res);
  session.destroy();
  res.status(200).json({ ok: true });
}
