// components/admin/BrandAccounts.tsx
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import ImageUploader from "@/components/common/ImageUploader";
import React from "react";

async function toggleActive(id: string, active: boolean) {
  "use server";
  await prisma.brandAccount.update({ where: { id }, data: { active } });
  // Bu componenti nerede kullanırsan kullan, admin listesi aynı path’teyse revalidate et
  revalidatePath("/admin/brands");
}

async function deleteBrand(id: string) {
  "use server";
  await prisma.brandAccount.delete({ where: { id } });
  revalidatePath("/admin/brands");
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
  await prisma.brandAccount.update({
    where: { id },
    data: {
      ...(email ? { email } : {}),
      displayName,
    },
  });
  // Avatar değişikliği User tablosuna yazılır
  if (email) {
    await prisma.user.upsert({
      where: { email },
      update: { avatarUrl },
      create: { email, avatarUrl },
    });
  }
  revalidatePath("/admin/brands");
}

async function createBrand(formData: FormData) {
  "use server";
  const email = String(formData.get("email") || "").toLowerCase().trim();
  const displayNameRaw = String(formData.get("displayName") || "").trim();
  const displayName = displayNameRaw.length ? displayNameRaw : null;
  const avatarUrlRaw = String(formData.get("avatarUrl") || "").trim();
  const avatarUrl = avatarUrlRaw.length ? avatarUrlRaw : null;
  if (!email) return;
  await prisma.brandAccount.create({
    data: {
      email,
      displayName,
      active: true,
    },
  });
  // Avatar User tablosuna yazılır (create veya update)
  await prisma.user.upsert({
    where: { email },
    update: { avatarUrl },
    create: { email, avatarUrl },
  });
  revalidatePath("/admin/brands");
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
              <tr key={b.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30">
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
                    <details className="group relative">
                      <summary className="px-2 py-1 rounded-md border cursor-pointer list-none select-none inline-flex items-center gap-1 hover:bg-neutral-50 dark:hover:bg-neutral-800">
                        Düzenle
                      </summary>
                      <div className="absolute right-0 z-10 mt-2 w-80 rounded-lg border bg-white shadow-lg p-3 dark:bg-neutral-900 dark:border-neutral-700">
                        <form action={updateBrand} className="space-y-2">
                          <input type="hidden" name="id" value={b.id} />
                          <div className="flex gap-2">
                            <input
                              name="email"
                              type="email"
                              defaultValue={b.email}
                              placeholder="email@brand.com"
                              className="px-2 py-1 rounded-md border flex-1 bg-white dark:bg-neutral-900 dark:border-neutral-800"
                            />
                          </div>
                          <div className="flex gap-2">
                            <input
                              name="displayName"
                              defaultValue={b.displayName ?? ""}
                              placeholder="Görünen ad"
                              className="px-2 py-1 rounded-md border flex-1 bg-white dark:bg-neutral-900 dark:border-neutral-800"
                            />
                          </div>
                          <div>
                            <ImageUploader name="avatarUrl" defaultValue={avatarByEmail.get(b.email) ?? ""} />
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <button className="px-3 py-1 rounded-md border">Kaydet</button>
                          </div>
                        </form>
                      </div>
                    </details>
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