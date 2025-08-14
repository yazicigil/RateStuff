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
  return host ? `https://${host}` : "https://ratestuff.net"; // güvenli varsayılan
}

async function getItemMeta(id: string, base: string) {
  try {
    const res = await fetch(`${base}/api/items?id=${encodeURIComponent(id)}`, {
      // og/tweet önizlemeleri için 1 dk cache yeterli
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const j = await res.json();
    return (j?.item ?? (Array.isArray(j?.items) ? j.items[0] : null) ?? (Array.isArray(j) ? j[0] : null));
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const base = getBaseUrl();
  const it = await getItemMeta(params.id, base);

  // fallback’ler
  const title = it?.name ? `${it.name} — RateStuff` : "RateStuff";
  const desc =
    it?.description ??
    (typeof it?.avg === "number"
      ? `Ortalama ${Number(it.avg).toFixed(2)} ⭐`
      : "RateStuff’ta keşfet");

  const shareUrl = `${base}/share/${params.id}`;
  let ogImg: string;
if (it?.thumbnailUrl) {
  ogImg = it.thumbnailUrl.startsWith("http")
    ? it.thumbnailUrl
    : `${base}${it.thumbnailUrl.startsWith("/") ? "" : "/"}${it.thumbnailUrl}`;
} else {
  ogImg = `${base}/api/og/item/${params.id}`;
}

  // item yoksa noindex
  if (!it) {
    return {
      title: "Bulunamadı — RateStuff",
      description: "İçerik bulunamadı.",
      alternates: { canonical: shareUrl },
      robots: { index: false, follow: true },
      openGraph: {
        type: "website",
        url: shareUrl,
        title: "Bulunamadı — RateStuff",
        description: "İçerik bulunamadı.",
        images: [`${base}/og-image.jpg`],
        siteName: "RateStuff",
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

  return {
    title,
    description: desc,
    alternates: { canonical: shareUrl },
    openGraph: {
      type: "article", // içerik sayfası daha anlamlı
      url: shareUrl,
      siteName: "RateStuff",
      title,
      description: desc,
      images: [ogImg], // dinamik OG endpoint
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

      {/* Botlar metadata'yı okuyabilsin diye server-side redirect kullanmıyoruz */}
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