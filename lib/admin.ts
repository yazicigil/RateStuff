import { auth } from "@/lib/auth"; // sende session getiren helper (getServerSession sarmalı vs.)
const ADMINS = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "")
  .split(",")
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

export async function requireAdmin() {
  const session = await auth(); // { user: { email } } bekliyoruz
  const email = session?.user?.email?.toLowerCase();
  if (!email || !ADMINS.includes(email)) {
    throw Object.assign(new Error("unauthorized"), { status: 401 });
  }
  return session;
}

export async function isAdmin() {
  try { await requireAdmin(); return true; } catch { return false; }
}