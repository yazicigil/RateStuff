// app/share/[id]/page.tsx
import type { Metadata } from "next";
import { headers } from "next/headers";
import SeoLD from "@/components/SeoLD";

type Props = { params: { id: string } };

// Base URL'i güvenle üret (env yoksa host header'dan al)
function getBaseUrl() {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env && /^https?:\/\//i.test(env)) return env.replace(/\/+$/, "");
  const h = headers();
  const host = h.get("host");
  // WhatsApp/FB fetcher https kullanır; http varsa da çalışsın diye https tercih ediyoruz.
  return host ? `https://${host}` : "https://ratestuff.net";
}

async function getItemMeta(id: string, base: string) {
  try {
    // Mutlaka absolute URL (sosyal botlarda relative sorun çıkarabiliyor)
    const res = await fetch(`${base}/api/items?id=${encodeURIComponent(id)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const j = await res.json().catch(() => null);
    // /api/items hem {item} hem {items:[...]} dönebiliyor; güvenli çek
    const item =
      j?.item ??
      (Array.isArray(j?.items) ? j.items[0] : undefined) ??
      (Array.isArray(j) ? j[0] : undefined) ??
      null;
    return item;
  } catch {
    return null;
  }
}

// Olası görsel anahtarlarını tek yerden kontrol et
function pickThumb(it: any): string | null {
  const keys = [
    "thumbnailUrl",
    "imageUrl",
    "image",
    "thumbUrl",
    "thumbnail",
    "thumb",
    "cover",
    "coverUrl",
  ];
  for (const k of keys) {
    const v = it?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const base = getBaseUrl();
  const it = await getItemMeta(params.id, base);

  const shareUrl = `${base}/share/${params.id}`;

  if (!it) {
    // Item bulunamadı → noindex; OG yine de düzgün çıksın
    return {
      title: "Bulunamadı — RateStuff",
      description: "İçerik bulunamadı.",
      alternates: { canonical: shareUrl },
      robots: { index: false, follow: true },
      openGraph: {
        type: "website",
        url: shareUrl,
        siteName: "RateStuff",
        title: "Bulunamadı — RateStuff",
        description: "İçerik bulunamadı.",
        images: [`${base}/og-image.jpg`],
        locale: "tr_TR",
      },
      twitter: {
        card: "summary_large_image",
        title: "Bulunamadı — RateStuff",
        description: "İçerik bulunamadı.",
        images: [`${base}/og-image.jpg`],
      },
    };
  }

  // Başlık / açıklama
  const title = it?.name ? `${it.name} — RateStuff` : "RateStuff";
  const desc =
    it?.description ??
    (typeof it?.avg === "number"
      ? `Ortalama ${Number(it.avg).toFixed(2)} ⭐`
      : "RateStuff’ta keşfet");

  // 1) item görselini kullan; absolute yap
  const raw = pickThumb(it);
  const ogImg = raw
    ? raw.startsWith("http")
      ? raw
      : `${base}${raw.startsWith("/") ? "" : "/"}${raw}`
    : `${base}/api/og/item/${params.id}`; // 2) fallback: dinamik OG

  // Open Graph için boyut bildirmek bazı platformlarda yardımcı
  const ogImages = [{ url: ogImg, width: 1200, height: 630 }];

  return {
    title,
    description: desc,
    alternates: { canonical: shareUrl },
    openGraph: {
      type: "article",
      url: shareUrl,
      siteName: "RateStuff",
      title,
      description: desc,
      images: ogImages,
      locale: "tr_TR",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [ogImg],
    },
  };
}

export default function ShareRedirectPage({ params }: Props) {
  const href = `/?item=${encodeURIComponent(params.id)}`;
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://ratestuff.net").replace(/\/+$/, "");

  // Minimal JSON-LD: ayrı item sayfan yokken CreativeWork yeterli
  const itemLD = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: "RateStuff içeriği",
    url: `${base}/share/${params.id}`,
    mainEntityOfPage: `${base}/share/${params.id}`,
  };

  return (
    <main className="min-h-screen grid place-items-center p-6">
      {/* SEO: JSON-LD for item */}
      <SeoLD json={itemLD} />

      <div className="text-sm opacity-70">
        RateStuff’a yönlendiriliyor…{" "}
        <a href={href} className="underline">
          git
        </a>
      </div>

      {/* Botların metadata'yı okuması için server-side redirect yok; client'ta yönlendiriyoruz */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{location.replace(${JSON.stringify(href)})}catch(e){location.href=${JSON.stringify(
            href
          )}}`,
        }}
      />
      <noscript>
        <meta httpEquiv="refresh" content={`0; url=${href}`} />
      </noscript>
    </main>
  );
}