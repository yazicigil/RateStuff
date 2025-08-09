import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export default async function MePage() {
  const me = await getSessionUser();
  if (!me) redirect("/"); // login yoksa ana sayfaya

  const [user, items, ratings, comments] = await Promise.all([
    prisma.user.findUnique({ where: { id: me.id } }),
    prisma.item.findMany({ where: { createdById: me.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.rating.findMany({ where: { userId: me.id }, include: { item: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.comment.findMany({ where: { userId: me.id }, include: { item: true }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="flex items-center gap-4">
        {user?.avatarUrl ? <img src={user.avatarUrl} alt="me" className="w-16 h-16 rounded-full object-cover" /> :
          <div className="w-16 h-16 rounded-full bg-gray-300" />}
        <div>
          <div className="text-xl font-semibold">{user?.maskedName || user?.name || user?.email}</div>
          <div className="text-sm opacity-70">{user?.email}</div>
        </div>
      </header>

      <section>
        <h2 className="text-lg font-medium mb-2">Eklediğin Item’lar</h2>
        <ul className="space-y-1">{items.map(it=>(
          <li key={it.id} className="text-sm">• {it.name}</li>
        ))}</ul>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">Verdiğin Yıldızlar</h2>
        <ul className="space-y-1">{ratings.map(r=>(
          <li key={r.id} className="text-sm">• {r.item?.name}: {r.value} ★</li>
        ))}</ul>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">Yorumların</h2>
        <ul className="space-y-1">{comments.map(c=>(
          <li key={c.id} className="text-sm">• {c.item?.name}: “{c.text}”</li>
        ))}</ul>
      </section>
    </div>
  );
}
