import { isAdmin } from "@/lib/admin";
import AdminDashboard from "@/components/admin/AdminDashboard";

export default async function AdminPage() {
  const ok = await isAdmin();
  if (!ok) return <div className="p-6">Yetkisiz.</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="RateStuff" className="h-8 w-auto" />
          <h1 className="text-xl font-semibold tracking-tight">Admin Dashboard</h1>
        </div>
      </div>
      <AdminDashboard />
    </div>
  );
}