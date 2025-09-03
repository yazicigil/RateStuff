// components/admin/BrandAccounts.tsx
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import ImageUploader from "@/components/common/ImageUploader";
import { useState } from "react";

async function toggleActive(id: string, active: boolean) {
  "use server";
  await prisma.brandAccount.update({ where: { id }, data: { active } });
  // Bu componenti nerede kullanırsan kullan, admin listesi aynı path’teyse revalidate et
  revalidatePath("/admin/brands");
}

async function createBrand(formData: FormData) {
  "use server";
  const email = String(formData.get("email") || "").toLowerCase().trim();
  const displayName = String(formData.get("displayName") || "").trim() || null;
  const avatarUrl = String(formData.get("avatarUrl") || "").trim() || null;
  if (!email) return;
  await prisma.brandAccount.create({ data: { email, displayName, avatarUrl, active: true } });
  revalidatePath("/admin/brands");
}

export default async function BrandAccounts() {
  const list = await prisma.brandAccount.findMany({
    orderBy: { createdAt: "desc" },
  });

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
            <th>Aktif</th>
            <th>Oluşturulma</th>
            <th></th>
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
              <td>{b.active ? "✓" : "—"}</td>
              <td>{b.createdAt.toLocaleString()}</td>
              <td>
                <form action={toggleActive.bind(null, b.id, !b.active)}>
                  <button className="px-2 py-1 rounded border">
                    {b.active ? "Pasifleştir" : "Aktifleştir"}
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-neutral-500">
                Henüz kayıt yok.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}