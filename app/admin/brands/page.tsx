import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Link from "next/link";

async function toggleActive(id: string, active: boolean) {
  "use server";
  await prisma.brandAccount.update({ where: { id }, data: { active } });
  revalidatePath("/admin/brands");
}

async function createBrand(formData: FormData) {
  "use server";
  const email = String(formData.get("email") || "").toLowerCase().trim();
  const displayName = String(formData.get("displayName") || "").trim() || null;
  if (!email) return;
  await prisma.brandAccount.create({ data: { email, displayName, active: true } });
  revalidatePath("/admin/brands");
}

export default async function AdminBrands() {
  const list = await prisma.brandAccount.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-3xl mx-auto py-10">
      <h1 className="text-2xl font-semibold mb-6">Brand Accounts</h1>

      <form action={createBrand} className="flex gap-2 mb-6">
        <input name="email" type="email" placeholder="email@brand.com" className="px-3 py-2 rounded border flex-1" />
        <input name="displayName" placeholder="Görünen ad (opsiyonel)" className="px-3 py-2 rounded border flex-1" />
        <button className="px-4 rounded bg-emerald-600 text-white">Ekle</button>
      </form>

      <table className="w-full text-sm">
        <thead className="text-left text-neutral-500">
          <tr>
            <th className="py-2">Email</th>
            <th>Ad</th>
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
        </tbody>
      </table>

      <div className="mt-6">
        <Link href="/brand" className="underline text-blue-600">/brand</Link> giriş sayfasına git
      </div>
    </div>
  );
}