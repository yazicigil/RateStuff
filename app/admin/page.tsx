import { isAdmin } from "@/lib/admin";
import AdminDashboard from "@/components/admin/AdminDashboard";
import NotificationsLab from "@/components/admin/NotificationsLab";
import Link from "next/link";
import LabHeaderButton from "@/components/admin/LabHeaderButton";

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

        <LabHeaderButton showingLab={showingLab} toggleHref={toggleHref} />
      </div>

      {showingLab ? (
        <NotificationsLab />
      ) : (
        <AdminDashboard />
      )}
    </div>
  );
}