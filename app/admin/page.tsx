import { isAdmin } from "@/lib/admin";
import BroadcastNotification from "@/components/admin/BroadcastNotification";
import ReportsCard from "@/components/admin/ReportsCard";
import UserExplorer from "@/components/admin/UserExplorer";

export default async function AdminPage() {
  const ok = await isAdmin();
  if (!ok) return <div className="p-6">Yetkisiz.</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-white dark:bg-neutral-900 shadow-sm p-4">
          <h2 className="text-lg font-semibold mb-3">Genel Bildirim Gönder</h2>
          <BroadcastNotification />
        </div>
        <div className="rounded-xl border bg-white dark:bg-neutral-900 shadow-sm p-4">
          <h2 className="text-lg font-semibold mb-3">Raporlanan Gönderiler</h2>
          <ReportsCard />
        </div>
        <div className="rounded-xl border bg-white dark:bg-neutral-900 shadow-sm p-4 md:col-span-2">
          <h2 className="text-lg font-semibold mb-3">Kullanıcı Gezgini</h2>
          <UserExplorer />
        </div>
      </div>
    </div>
  );
}