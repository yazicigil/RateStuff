// components/admin/BrandAccounts.tsx
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import ImageUploader from "@/components/common/ImageUploader";
import { useState } from "react";
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
      avatarUrl,
    },
  });
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
      avatarUrl,
      active: true,
    },
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
      avatarUrl: true,
      active: true,
      createdAt: true,
    },
  });

  // Build email -> itemCount map using User._count.items
  const emails = list.map((b) => b.email);
  const usersWithCounts = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { email: true, _count: { select: { items: true } } },
  });
  const itemCountByEmail = new Map<string, number>(
    usersWithCounts.map((u) => [u.email!, u._count.items])
  );

  return (
    <div className="max-w-3xl mx-auto py-10">
      <h2 className="text-2xl font-semibold mb-6">Brand Accounts</h2>

      <form action={createBrand} className="flex gap-2 mb-6">
        <input
          name="email"
          type="email"
          placeholder="email@brand.com"
          className="px-3 py-2 rounded border flex-1"
          required
        />
        <input
          name="displayName"
          placeholder="Görünen ad (opsiyonel)"
          className="px-3 py-2 rounded border flex-1"
        />
        <ImageUploader
          name="avatarUrl"
          className="flex-1"
        />
        <button className="px-4 rounded bg-emerald-600 text-white">Ekle</button>
      </form>

      <table className="w-full text-sm">
        <thead className="text-left text-neutral-500">
          <tr>
            <th className="py-2">Email</th>
            <th>Ad</th>
            <th>Avatar</th>
            <th>Paylaşılan Item</th>
            <th>Aktif</th>
            <th>Oluşturulma</th>
            <th>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {list.map((b) => (
            <tr key={b.id} className="border-t">
              <td className="py-2">{b.email}</td>
              <td>{b.displayName ?? "-"}</td>
              <td>
                {b.avatarUrl ? (
                  <img src={b.avatarUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  "-"
                )}
              </td>
              <td>{itemCountByEmail.get(b.email) ?? 0}</td>
              <td>{b.active ? "✓" : "—"}</td>
              <td>{b.createdAt.toLocaleString()}</td>
              <td>
                <div className="flex items-center gap-2">
                  <details className="group relative">
                    <summary className="px-2 py-1 rounded border cursor-pointer list-none select-none inline-flex items-center gap-1">
                      Düzenle
                    </summary>
                    <div className="absolute z-10 mt-2 w-80 rounded border bg-white shadow p-3 dark:bg-neutral-900 dark:border-neutral-700">
                      <form action={updateBrand} className="space-y-2">
                        <input type="hidden" name="id" value={b.id} />
                        <div className="flex gap-2">
                          <input
                            name="email"
                            type="email"
                            defaultValue={b.email}
                            placeholder="email@brand.com"
                            className="px-2 py-1 rounded border flex-1"
                          />
                        </div>
                        <div className="flex gap-2">
                          <input
                            name="displayName"
                            defaultValue={b.displayName ?? ""}
                            placeholder="Görünen ad"
                            className="px-2 py-1 rounded border flex-1"
                          />
                        </div>
                        <div>
                          <ImageUploader name="avatarUrl" defaultValue={b.avatarUrl ?? ""} />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button className="px-3 py-1 rounded border">Kaydet</button>
                        </div>
                      </form>
                    </div>
                  </details>

                  <form action={toggleActive.bind(null, b.id, !b.active)}>
                    <button className="px-2 py-1 rounded border">
                      {b.active ? "Pasifleştir" : "Aktifleştir"}
                    </button>
                  </form>
                  <form action={deleteBrand.bind(null, b.id)}>
                    <button className="px-2 py-1 rounded border border-red-500 text-red-600 hover:bg-red-50">
                      Sil
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr>
              <td colSpan={7} className="py-6 text-center text-neutral-500">
                Henüz kayıt yok.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}