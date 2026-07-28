import { getSession } from "../../../lib/session";
import { redeemBackupCode } from "../../../lib/deviceStore";

// Lets someone unlock THIS device using an account-level backup code — for
// when they've forgotten their PIN and don't have biometrics set up, without
// resorting to a full sign-out. Each code is single-use, per the original
// PRD (7.4).
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await getSession(req, res);
  if (!session.user) return res.status(401).json({ error: "not_logged_in" });

  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: "missing_code" });

  const ok = await redeemBackupCode(session.user.email, code.trim().toUpperCase());
  if (ok) {
    session.unlocked = true;
    await session.save();
  }

  res.status(200).json({ ok });
}
