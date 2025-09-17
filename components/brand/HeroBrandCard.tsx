// components/brand/HeroBrandCard.tsx
"use client";

import dynamic from "next/dynamic";
import clsx from "clsx";

// Dinamik alt bileşenler (sayfalardakiyle aynı)
const BrandBioInline = dynamic(() => import("@/components/brand/BrandBioInline"), { ssr: false });
const OwnerSettings  = dynamic(() => import("@/components/brand/OwnerSettings"), { ssr: false });
const SocialBar      = dynamic(() => import("@/components/brand/SocialBar"), { ssr: false });
const CardColorPicker = dynamic(() => import("@/components/brand/CardColorPicker"), { ssr: false });

type Mode = "public" | "edit";

type BrandLite = {
  id: string;
  email: string;
  displayName?: string | null;
  coverImageUrl?: string | null;
  bio?: string | null;
  cardColor?: string | null;
  slug?: string | null;
};

type UserLite = {
  id: string;
  name?: string | null;
  avatarUrl?: string | null;
  kind?: any;
  email?: string | null;
};

type Metrics = {
  itemsCount: number;
  avgRating?: number | null;
};

export function HeroBrandCard(props: {
  mode: Mode;
  brand: BrandLite;
  user: UserLite;            // brand owner user
  viewerId?: string | null;
  viewerIsAdmin?: boolean;
  metrics: Metrics;
  className?: string;
  publicProfileHref?: string; // edit moddaki sağ alt buton için
}) {
  const { mode, brand, user, viewerId, viewerIsAdmin, metrics, className, publicProfileHref } = props;

  // ——— renk / kontrast yardımcıları (sayfa kodlarıyla birebir) ———
  function hexToRgbLocal(hex?: string | null) {
    const h = (hex || "#ffffff").replace("#", "").trim() || "ffffff";
    const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "f");
    const n = parseInt(v, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function relLumaLocal(rgb: { r: number; g: number; b: number }) {
    const toLin = (v: number) => {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    const R = toLin(rgb.r), G = toLin(rgb.g), B = toLin(rgb.b);
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  }

  const brandHex = brand.cardColor || "#ffffff";
  const isLightBrand = (() => {
    try { return relLumaLocal(hexToRgbLocal(brandHex)) > 0.6; } catch { return true; }
  })();

  // Kart içi mürekkep/tonlar
  const heroInk = isLightBrand ? "#111" : "#fff";
  const heroSubtle = isLightBrand ? "rgba(17,17,17,.70)" : "rgba(255,255,255,.75)";

  // Meta pill border’ını ve kart border’ını %20 opaklığa indiriyoruz
  const border20 = "color-mix(in srgb, var(--brand-elev-bd) 20%, transparent)";

  // Doğrudan sayfalardaki sınıf/parçalarla birebir
  const baseClass =
    "brand-hero-scope relative rounded-3xl border bg-white dark:bg-[#0b1220] shadow-md p-4 sm:p-6 md:p-7 pt-24 " +
    "sm:pt-10 md:pt-9 pl-4 sm:pl-40 md:pl-44 -translate-y-2 sm:translate-y-0";

  // Verified badge — iki sayfada da aynı SVG
  const VerifiedBadge = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className="inline-block ml-1 w-[18px] h-[18px] align-middle">
      <circle cx="12" cy="12" r="9" className="fill-[#3B82F6] dark:fill-[#3B82F6]" />
      <path d="M8.5 12.5l2 2 4-4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <div
      id="brand-hero-card"
      className={clsx(baseClass, className)}
      style={{
        color: heroInk,
        ["--hero-ink" as any]: heroInk,
        ["--brand-ink" as any]: heroInk,
        backgroundColor: "var(--brand-items-bg)",
        borderColor: border20, // %20 opacity
      }}
    >
      {/* Top block: title + owner tools */}
      <div className="mt-0 flex flex-col gap-2 md:pr-2">
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
          <h1 className="text-2xl sm:text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
            {mode === "public"
              ? (brand.displayName as string)
              : (brand.displayName ?? user.name ?? user.email ?? "Brand")}
          </h1>
          <VerifiedBadge />

          {/* public modda — yalnızca sahibi ise OwnerSettings görünür (slug sayfasıyla aynı koşul) */}
          {mode === "public" && viewerId === user.id ? (
            <span className="owner-settings-scope inline-flex items-center" style={{ color: "var(--hero-ink)" }}>
              <OwnerSettings brandEmail={brand.email} ownerUserId={user.id} />
            </span>
          ) : null}
        </div>

        {/* SocialBar */}
        <div style={{ color: "var(--hero-ink)" }}>
          {mode === "public" ? (
            <SocialBar userId={user.id} canEdit={false} className="pt-1" />
          ) : (
            <SocialBar userId={user.id} canEdit className="pt-1" />
          )}
        </div>

        {/* Bio */}
        {mode === "public" ? (
          (brand.bio && brand.bio.trim().length > 0) ? (
            <div
              className="bio-scope pt-2 text-[13px] sm:text-sm leading-6 max-w-prose [&_*]:text-[var(--hero-ink)]"
              style={{ color: "var(--hero-ink)" }}
            >
              <BrandBioInline brandId={brand.id} initialBio={brand.bio!} isOwner={false} />
            </div>
          ) : null
        ) : (
          <div className="pt-2 text-[13px] sm:text-sm leading-6 max-w-prose">
            <BrandBioInline brandId={brand.id} initialBio={brand.bio ?? ""} isOwner />
            {/* pasif info me sayfasında ayrı durumda gösteriliyordu — gerekirse prop ile eklenir */}
          </div>
        )}
      </div>

      {/* Meta row */}
      <div className="mt-3 flex flex-wrap gap-2">
        <div
          className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 border"
          style={{
            backgroundColor: mode === "public" ? "transparent" : "var(--brand-chip-bg)",
            borderColor: border20,
          }}
        >
          <span className="text-[10px] uppercase tracking-wide" style={{ color: mode === "public" ? heroSubtle : "var(--brand-ink-subtle)" }}>
            Ürün
          </span>
          <span className="text-sm font-semibold leading-none">{metrics.itemsCount}</span>
        </div>

        <div
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border"
          style={{
            backgroundColor: mode === "public" ? "transparent" : "var(--brand-chip-bg)",
            borderColor: border20,
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-yellow-500">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="text-sm font-semibold leading-none">
            {typeof metrics.avgRating === "number" ? metrics.avgRating.toFixed(2) : "—"}
          </span>
          <span className="text-[11px] leading-none" style={{ color: mode === "public" ? heroSubtle : "var(--brand-ink-subtle)" }}>
            / 5
          </span>
        </div>
      </div>

      {/* Edit modda: renk seçici + public profile butonu */}
      {mode === "edit" ? (
        <>
          <div className="mt-3 sm:mt-4">
            <CardColorPicker initialColor={brand.cardColor ?? null} targetId="brand-hero-card" />
          </div>
          {brand.slug && publicProfileHref ? (
            <a
              href={publicProfileHref}
              aria-label="Herkese açık profili görüntüle"
              title="Herkese açık profili görüntüle"
              className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm border transition shadow-sm"
              style={{
                borderColor: "var(--brand-elev-bd, rgba(0,0,0,0.12))",
                backgroundColor: "var(--brand-chip-bg, rgba(0,0,0,0.04))",
                color: "var(--brand-ink, inherit)",
              }}
            >
              <span>Herkese açık profili gör</span>
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-80"
              >
                <path d="M7 17L17 7M17 7H9M17 7v8" />
              </svg>
            </a>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default HeroBrandCard;