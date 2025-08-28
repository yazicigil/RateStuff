// components/admin/AdminDashboard.tsx
"use client";
import { useState } from "react";
import StatsCard from "@/components/admin/StatsCard";
import BroadcastNotification from "@/components/admin/BroadcastNotification";
import UserExplorer from "@/components/admin/UserExplorer";
import ReportsCard from "@/components/admin/ReportsCard";
import SuspendedItemsCard from "@/components/admin/SuspendedItemsCard";
import AllItemsCard from "@/components/admin/AllItemsCard";
import NotificationsLab from "@/components/admin/NotificationsLab";

export type AdminTab = null | "users" | "reports" | "suspended" | "allItems";

export default function AdminDashboard() {
  const [active, setActive] = useState<AdminTab>(null);

  return (
    <div className="flex flex-col gap-6">
      {/* Stats on top; acts like a launcher for tabs below */}
      <StatsCard activeTab={active} onOpenTab={(t) => setActive(t)} />

      {/* Below stats: sticky Broadcast on the left, tabs on the right */}
      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        <div className="md:sticky md:top-6 h-fit">
          <BroadcastNotification />
        </div>

        <div>
          {/* Tab body */}
          <div className="rounded-2xl">
            {active === "users" && <UserExplorer />}
            {active === "reports" && <ReportsCard />}
            {active === "suspended" && <SuspendedItemsCard />}
            {active === "allItems" && <AllItemsCard />}
            {!active && (
              <div className="text-sm opacity-60 border rounded-2xl p-6">
                Bir görünüm seçmek için yukarıdaki istatistik kartından bir kutuya tıkla: <b>Toplam Kullanıcı</b>, <b>Toplam Rapor</b>, <b>Askıdaki Gönderi</b> veya <b>Toplam Gönderi</b>.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
