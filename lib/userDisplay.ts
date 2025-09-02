export function getDisplayName(
  u: { name?: string | null; verified?: boolean } | null | undefined,
  fallback = "Kullanıcı"
) {
  if (!u) return fallback;
  const n = (u.name ?? "").trim();
  if (u.verified) return n || fallback;
  if (!n) return fallback;
  return n.length <= 2 ? fallback : `${n.slice(0, 3)}…`;
}

export function isVerified(u?: { verified?: boolean }) {
  return !!u?.verified;
}