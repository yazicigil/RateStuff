import { isAdmin } from "@/lib/admin";
import AdminDashboard from "@/components/admin/AdminDashboard";
import NotificationsLab from "@/components/admin/NotificationsLab";
import Link from "next/link";
import AnimatedLab from "@/components/common/AnimatedLab";

export default async function AdminPage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const ok = await isAdmin();
  if (!ok) return <div className="p-6">Yetkisiz.</div>;

  const tab = (Array.isArray(searchParams?.tab) ? searchParams?.tab[0] : searchParams?.tab) || "";
  const showingLab = tab === "notifications";
  const toggleHref = showingLab ? "/admin" : "/admin?tab=notifications";

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="RateStuff" className="h-8 w-auto" />
          <h1 className="text-xl font-semibold tracking-tight">Admin Dashboard</h1>
        </div>

        {/* Bildirim Laboratuvarı toggle button */}
        <Link
          href={toggleHref}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900 transition"
          aria-pressed={showingLab}
        >
          <AnimatedLab playing={showingLab} />
          <span className="hidden sm:inline">Bildirim Laboratuvarı</span>
        </Link>
      </div>

      {showingLab ? (
        <NotificationsLab />
      ) : (
        <AdminDashboard />
      )}
    </div>
  );
}