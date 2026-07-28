import { getAuthContext } from "../../../lib/authContext";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const ctx = await getAuthContext(req, res);
  if (!ctx.user) return res.status(401).json({ error: "not_logged_in" });

  const sessionToken = await ctx.persist({ unlocked: false });
  res.status(200).json({ ok: true, sessionToken });
}
