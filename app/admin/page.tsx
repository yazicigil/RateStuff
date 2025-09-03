import { isAdmin } from "@/lib/admin";
import AdminDashboard from "@/components/admin/AdminDashboard";
import BrandAccounts from "@/components/admin/BrandAccounts";
import Link from "next/link";
import Lottie from "lottie-react";
import starWinkAnim from "@/assets/animations/star-wink.json";

export default async function AdminPage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const ok = await isAdmin();
  if (!ok) return <div className="p-6">Yetkisiz.</div>;

  const tab = (Array.isArray(searchParams?.tab) ? searchParams?.tab[0] : searchParams?.tab) || "";
  const showingBrands = tab === "brands";
  const toggleHref = showingBrands ? "/admin" : "/admin?tab=brands";

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="RateStuff" className="h-8 w-auto" />
          <h1 className="text-xl font-semibold tracking-tight">Admin Dashboard</h1>
        </div>

        <Link
          href={toggleHref}
          className={[
            "inline-flex items-center gap-2 px-3 py-2 rounded-md border transition",
            showingBrands
              ? "bg-emerald-600 text-white border-emerald-600"
              : "border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          ].join(" ")}
          aria-pressed={showingBrands}
        >
          <Lottie
            animationData={starWinkAnim}
            autoplay={false}
            loop={false}
            renderer="svg"
            style={{ width: 28, height: 28 }}
            className="brand-lottie"
            rendererSettings={{ preserveAspectRatio: 'xMidYMid meet', className: 'lottie-colorize text-neutral-800 dark:text-neutral-100' }}
          />
          <span className="text-sm font-medium">RateStuff for Brands</span>
        </Link>
      </div>

      {showingBrands ? (
        <BrandAccounts />
      ) : (
        <AdminDashboard />
      )}
    </div>
  );
}