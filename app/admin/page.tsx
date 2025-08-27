import { isAdmin } from "@/lib/admin";
import BroadcastNotification from "@/components/admin/BroadcastNotification";
import ReportsCard from "@/components/admin/ReportsCard";
import UserExplorer from "@/components/admin/UserExplorer";

export default async function AdminPage() {
  const ok = await isAdmin();
  if (!ok) return <div className="p-6">Yetkisiz.</div>;

  return (
    <div className="p-6 grid gap-6 md:grid-cols-2">
      <BroadcastNotification />
      <ReportsCard />
      <UserExplorer />
    </div>
  );
}