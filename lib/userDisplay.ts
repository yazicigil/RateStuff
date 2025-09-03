export type UserLike = {
  id?: string;
  name?: string | null;
  maskedName?: string | null;
  kind?: "REGULAR" | "BRAND" | string | null;
};

export function getDisplayName(u: UserLike): string {
  if (!u) return "Kullanıcı";
  // BRAND ise maskeleme yok
  if (u.kind === "BRAND") {
    return (u.name ?? u.maskedName ?? "Kullanıcı").trim();
  }
  // Diğerlerinde maskeyi koru
  return (u.maskedName ?? u.name ?? "Kullanıcı").trim();
}

export function isBrand(u: UserLike): boolean {
  return u?.kind === "BRAND";
}