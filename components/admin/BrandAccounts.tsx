// components/admin/BrandAccounts.tsx
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import ImageUploader from "@/components/common/ImageUploader";
import React from "react";
import EditBrandModal from "@/components/admin/EditBrandModal";
import { redirect } from "next/navigation";
import CreatedFlash from "@/components/admin/CreatedFlash";

// ---- slug helpers (TR-friendly) ----
function slugifyTr(input: string) {
  const s = (input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return s || "brand";
}

async function ensureUniqueSlug(baseRaw: string) {
  const base = slugifyTr(baseRaw);
  // fetch existing slugs that start with base
  const existing = await prisma.brandAccount.findMany({
    where: { slug: { startsWith: base } },
    select: { slug: true },
  });
  if (existing.length === 0) return base;

  // compute next available suffix
  let max = 1;
  const re = new RegExp(`^${base}(?:-(\\d+))?$`);
  for (const { slug } of existing) {
    const m = slug.match(re);
    if (m) {
      const n = m[1] ? parseInt(m[1], 10) : 1;
      if (n >= max) max = n + 1;
    }
  }
  return max === 1 ? base : `${base}-${max}`;
}
// ---- end slug helpers ----

async function toggleActive(id: string, active: boolean) {
  "use server";
  await prisma.brandAccount.update({ where: { id }, data: { active } });
  // Bu componenti nerede kullanırsan kullan, admin listesi aynı path’teyse revalidate et
  revalidatePath("/admin");
}

async function deleteBrand(id: string) {
  "use server";
  // Önce email'i al
  const brand = await prisma.brandAccount.findUnique({
    where: { id },
    select: { email: true },
  });

  if (!brand) {
    // Kayıt zaten yoksa idempotent davran
    revalidatePath("/admin");
    return;
  }

  await prisma.$transaction(async (tx) => {
    // BrandAccount'ı sil
    await tx.brandAccount.delete({ where: { id } });

    // İlgili brand OTP / nonce kayıtlarını temizle
    await tx.brandOtp.deleteMany({ where: { email: brand.email } }).catch(() => {});
    await tx.brandLoginNonce.deleteMany({ where: { email: brand.email } }).catch(() => {});

    // Aynı email ile User var mı? Varsa item sayısına göre karar ver
    const user = await tx.user.findUnique({
      where: { email: brand.email },
      select: { id: true, _count: { select: { items: true } }, kind: true },
    });

    if (user) {
      if (user._count.items === 0) {
        // Bağımlı item yoksa User'ı tamamen sil
        await tx.user.delete({ where: { email: brand.email } });
      } else {
        // Item'ları var: user'ı koru ama BRAND işaretini kaldır (opsiyonel)
        await tx.user.update({
          where: { email: brand.email },
          data: { kind: "REGULAR" },
        });
      }
    }
  });

  revalidatePath("/admin");
}

async function updateBrand(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  if (!id) return;
  const email = String(formData.get("email") || "").toLowerCase().trim() || undefined;
  const displayNameRaw = String(formData.get("displayName") || "").trim();
  const displayName = displayNameRaw.length ? displayNameRaw : null;
  const avatarUrlRaw = String(formData.get("avatarUrl") || "").trim();
  const avatarUrl = avatarUrlRaw.length ? avatarUrlRaw : null;
  // fetch current brand account to know previous email (in case of email change)
  const current = await prisma.brandAccount.findUnique({
    where: { id },
    select: { email: true },
  });
  let newSlug: string | undefined = undefined;
  if (displayName) {
    newSlug = await ensureUniqueSlug(displayName);
  }
  await prisma.brandAccount.update({
    where: { id },
    data: {
      ...(email ? { email } : {}),
      displayName,
      ...(newSlug ? { slug: newSlug } : {}),
    },
  });
  // User tablosunda avatar ve isim (name) senkronize edilir
  const effectiveEmail = (email && email.length ? email : current?.email) || null;
  if (effectiveEmail) {
    await prisma.user.upsert({
      where: { email: effectiveEmail },
      update: {
        avatarUrl,
        name: displayName, // displayName ile user.name'i de güncelle
      },
      create: {
        email: effectiveEmail,
        avatarUrl,
        name: displayName,
      },
    });
  }
  revalidatePath("/admin");
}

async function createBrand(formData: FormData) {
  "use server";
  const email = String(formData.get("email") || "").toLowerCase().trim();
  const displayNameRaw = String(formData.get("displayName") || "").trim();
  const displayName = displayNameRaw.length ? displayNameRaw : null;
  const avatarUrlRaw = String(formData.get("avatarUrl") || "").trim();
  const avatarUrl = avatarUrlRaw.length ? avatarUrlRaw : null;
  if (!email) return;
  // slug: displayName varsa ondan, yoksa email local-part'tan üret
  const baseForSlug = displayName ?? (email.includes("@") ? email.split("@")[0] : email);
  const slug = await ensureUniqueSlug(baseForSlug);

  await prisma.brandAccount.create({
    data: {
      email,
      displayName,
      slug,       // NEW
      active: true,
    },
  });
  // User tablosuna da kaydet / güncelle:
  // - İlk oluşturma: name=displayName, kind=BRAND, avatarUrl (varsa)
  // - Zaten varsa: kind=BRAND'e çek; name boşsa displayName ile doldur; avatarUrl geldiyse güncelle
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true },
  });
  if (!existingUser) {
    await prisma.user.create({
      data: {
        email,
        name: displayName,
        avatarUrl,
        kind: "BRAND",
      },
    });
  } else {
    const nameShouldSet = (!existingUser.name || !existingUser.name.trim().length) && !!displayName;
    await prisma.user.update({
      where: { email },
      data: {
        kind: "BRAND",
        ...(nameShouldSet ? { name: displayName! } : {}),
        ...(avatarUrl ? { avatarUrl } : {}),
      },
    });
  }
  redirect(`admin?tab=brands`);
}

export default async function BrandAccounts() {
  const list = await prisma.brandAccount.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      displayName: true,
      active: true,
      createdAt: true,
    },
  });

  // Build email -> itemCount map using User._count.items
  const emails = list.map((b) => b.email);
  const usersWithCounts = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { email: true, avatarUrl: true, _count: { select: { items: true } } },
  });
  const itemCountByEmail = new Map<string, number>(
    usersWithCounts.map((u) => [u.email!, u._count.items])
  );
  const avatarByEmail = new Map<string, string | null>(
    usersWithCounts.map((u) => [u.email!, u.avatarUrl ?? null])
  );

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <CreatedFlash />
      <div className="mb-8 rounded-xl border bg-white/60 shadow-sm backdrop-blur-sm dark:bg-neutral-900/60 dark:border-neutral-800">
        <div className="p-4 md:p-6 border-b dark:border-neutral-800">
          <h3 className="text-base md:text-lg font-semibold">Yeni Brand hesabı ekle</h3>
          <p className="text-xs md:text-sm text-neutral-500 mt-1">
            E-posta whitelist’e eklenir; avatar ve görünen ad opsiyoneldir.
          </p>
        </div>
        <form action={createBrand} className="p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-start">
            <div className="md:col-span-4">
              <label className="text-xs text-neutral-500">E-posta</label>
              <input
                name="email"
                type="email"
                placeholder="email@brand.com"
                className="w-full mt-1 px-3 py-2 rounded-lg border bg-white dark:bg-neutral-900 dark:border-neutral-800"
                required
              />
            </div>
            <div className="md:col-span-4">
              <label className="text-xs text-neutral-500">Görünen ad (opsiyonel)</label>
              <input
                name="displayName"
                placeholder="Görünen ad"
                className="w-full mt-1 px-3 py-2 rounded-lg border bg-white dark:bg-neutral-900 dark:border-neutral-800"
              />
            </div>
            <div className="md:col-span-4">
              <label className="text-xs text-neutral-500">Avatar</label>
              <div className="mt-1">
                <ImageUploader
                  name="avatarUrl"
                  className="w-full"
                />
              </div>
            </div>
            <div className="md:col-span-12 flex justify-end pt-2">
              <button className="h-10 px-5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition">
                Ekle
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white/60 shadow-sm backdrop-blur-sm dark:bg-neutral-900/60 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="text-left text-neutral-600 dark:text-neutral-300 bg-neutral-50/60 dark:bg-neutral-900/40">
            <tr>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Ad</th>
              <th className="px-3 py-2">Avatar</th>
              <th className="px-3 py-2">Paylaşılan Item</th>
              <th className="px-3 py-2">Aktif</th>
              <th className="px-3 py-2">Oluşturulma</th>
              <th className="px-3 py-2">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-neutral-800">
            {list.map((b) => (
              <tr key={b.id} data-email={b.email} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30">
                <td className="px-3 py-2">{b.email}</td>
                <td className="px-3 py-2">{b.displayName ?? "-"}</td>
                <td className="px-3 py-2">
                  {avatarByEmail.get(b.email) ? (
                    <img
                      src={avatarByEmail.get(b.email)!}
                      alt="avatar"
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-black/5"
                    />
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2">{itemCountByEmail.get(b.email) ?? 0}</td>
                <td className="px-3 py-2">{b.active ? "✓" : "—"}</td>
                <td className="px-3 py-2">{b.createdAt.toLocaleString()}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <EditBrandModal
                      brand={{ id: b.id, email: b.email, displayName: b.displayName ?? null }}
                      defaultAvatarUrl={avatarByEmail.get(b.email) ?? ""}
                      updateAction={updateBrand}
                    />
                    <form action={toggleActive.bind(null, b.id, !b.active)}>
                      <button className="px-2 py-1 rounded-md border hover:bg-neutral-50 dark:hover:bg-neutral-800">
                        {b.active ? "Pasifleştir" : "Aktifleştir"}
                      </button>
                    </form>
                    <form action={deleteBrand.bind(null, b.id)}>
                      <button className="px-2 py-1 rounded-md border border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
                        Sil
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-neutral-500">
                  Henüz kayıt yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}