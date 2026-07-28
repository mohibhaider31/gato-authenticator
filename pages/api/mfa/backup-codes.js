import { getAuthContext } from "../../../lib/authContext";
import { listBackupCodes, generateAndStoreBackupCodes } from "../../../lib/deviceStore";
import { generateBackupCodes } from "../../../lib/totp";

export default async function handler(req, res) {
  const ctx = await getAuthContext(req, res);
  if (!ctx.user) return res.status(401).json({ error: "not_logged_in" });
  if (!ctx.unlocked) return res.status(403).json({ error: "locked" });

  if (req.method === "GET") {
    const codes = await listBackupCodes(ctx.user.email);
    return res.status(200).json({ codes });
  }

  if (req.method === "POST") {
    const fresh = generateBackupCodes(10).map((c) => c.code);
    await generateAndStoreBackupCodes(ctx.user.email, fresh);
    const codes = await listBackupCodes(ctx.user.email);
    return res.status(200).json({ codes });
  }

  res.status(405).end();
}
