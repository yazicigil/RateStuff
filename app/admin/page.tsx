import { isAdmin } from "@/lib/admin";
import BroadcastNotification from "@/components/admin/BroadcastNotification";
import ReportsCard from "@/components/admin/ReportsCard";
import UserExplorer from "@/components/admin/UserExplorer";
import StatsCard from "@/components/admin/StatsCard";
import SuspendedItemsCard from "@/components/admin/SuspendedItemsCard";


export default async function AdminPage() {
  const ok = await isAdmin();
  if (!ok) return <div className="p-6">Yetkisiz.</div>;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="RateStuff" className="h-8 w-auto" />
          <h1 className="text-xl font-semibold tracking-tight">Admin Dashboard</h1>
        </div>
        {/* space for future controls (filters, date range, etc.) */}
        <div className="hidden sm:flex items-center gap-2 text-sm opacity-60">
          Yönetim araçları
        </div>
      </div>
 <div className="mb-6">
      <StatsCard />
    </div>
      {/* Content grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top row: UserExplorer & Reports side-by-side */}
        <UserExplorer />
        <ReportsCard />
        <SuspendedItemsCard />

        {/* Bottom row: Broadcast full width, left-aligned narrow column */}
        <div className="md:col-span-2 flex">
          <div className="w-full md:w-1/3">
            <BroadcastNotification />
          </div>
        </div>
      </div>
    </div>
  );
}