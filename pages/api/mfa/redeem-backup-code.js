import { getAuthContext } from "../../../lib/authContext";
import { redeemBackupCode } from "../../../lib/deviceStore";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const ctx = await getAuthContext(req, res);
  if (!ctx.user) return res.status(401).json({ error: "not_logged_in" });

  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: "missing_code" });

  const ok = await redeemBackupCode(ctx.user.email, code.trim().toUpperCase());
  let sessionToken = null;
  if (ok) sessionToken = await ctx.persist({ unlocked: true });

  res.status(200).json({ ok, sessionToken });
}
