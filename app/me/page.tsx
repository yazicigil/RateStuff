// app/me/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import Link from "next/link";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MePage() {
  const me = await getSessionUser();
  if (!me) redirect("/");

  const [user, items, ratings, comments, allTags, trending] = await Promise.all([
    prisma.user.findUnique({ where: { id: me.id } }),
    prisma.item.findMany({ where: { createdById: me.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.rating.findMany({ where: { userId: me.id }, include: { item: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.comment.findMany({ where: { userId: me.id }, include: { item: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.tag.findMany({ orderBy: { name: "asc" }, take: 200 }),
    prisma.itemTag.groupBy({ by: ["tagId"], _count: { tagId: true }, orderBy: { _count: { tagId: "desc" } }, take: 20 }),
  ]);

  const trendingNames = await Promise.all(
    trending.map(async (g) => {
      const t = await prisma.tag.findUnique({ where: { id: g.tagId } });
      return t?.name || "";
    })
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <header className="sticky top-0 z-40 backdrop-blur border-b bg-white/80 dark:bg-gray-900/70 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-xl font-bold">RateStuff</Link>
          <div className="ml-auto" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
        <aside>
          <section className="rounded-2xl border p-4 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800">
            <h3 className="text-lg mb-2">Trend Etiketler</h3>
            <div className="flex flex-wrap gap-2">
              {trendingNames.filter(Boolean).map((t) => (
                <Link key={t} className="px-2 py-1 rounded-full text-sm border bg-white hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700" href={`/?q=${encodeURIComponent(t)}`}>#{t}</Link>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border p-4 shadow-sm mt-4 bg-white dark:bg-gray-900 dark:border-gray-800">
            <h3 className="text-lg mb-2">Tüm Etiketler</h3>
            <div className="flex flex-wrap gap-2 max-h-[50vh] overflow-auto pr-1">
              {allTags.map((t)=>(
                <Link key={t.id} className="px-2 py-1 rounded-full text-sm border bg-white hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700" href={`/?q=${encodeURIComponent(t.name)}`}>#{t.name}</Link>
              ))}
            </div>
          </section>
        </aside>

        <section className="space-y-8">
          <header className="flex items-center gap-4">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="me" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-300" />
            )}
            <div>
              <div className="text-xl font-semibold">{user?.name || me.email}</div>
              <div className="text-sm opacity-70">{user?.email}</div>
            </div>
          </header>

          <section>
            <h2 className="text-lg font-medium mb-2">Eklediğin Item’lar</h2>
            {items.length === 0 ? (
              <div className="text-sm opacity-70">Henüz yok.</div>
            ) : (
              <ul className="space-y-1">{items.map(it=>(
                <li key={it.id} className="text-sm">• {it.name}</li>
              ))}</ul>
            )}
          </section>

          <section>
            <h2 className="text-lg font-medium mb-2">Verdiğin Yıldızlar</h2>
            {ratings.length === 0 ? (
              <div className="text-sm opacity-70">Henüz yok.</div>
            ) : (
              <ul className="space-y-1">{ratings.map(r=>(
                <li key={r.id} className="text-sm">• {r.item?.name}: {r.value} ★</li>
              ))}</ul>
            )}
          </section>

          <section>
            <h2 className="text-lg font-medium mb-2">Yorumların</h2>
            {comments.length === 0 ? (
              <div className="text-sm opacity-70">Henüz yok.</div>
            ) : (
              <ul className="space-y-1">{comments.map(c=>(
                <li key={c.id} className="text-sm">• {c.item?.name}: “{c.text}”</li>
              ))}</ul>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}
