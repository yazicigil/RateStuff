import type { Metadata } from "next";
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};
// app/share/[id]/page.tsx
import { headers } from "next/headers";
import SeoLD from "@/components/SeoLD";

const SITE_DESC =
  (process.env.NEXT_PUBLIC_SITE_DESC && process.env.NEXT_PUBLIC_SITE_DESC.trim()) ||
  "RateStuff: Her şeyi puanla ve yorumla.";

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
  const itemName = typeof it?.name === "string" && it.name.trim() ? it.name.trim() : "Bu içerik";
  const title = `${itemName} yorumları & puanları | RateStuff`;
  const hasAvg = typeof it?.avg === "number";
  const avgTxt = hasAvg ? `ortalama ${Number(it.avg).toFixed(2)} ⭐. ` : "";
  const desc =
    `${itemName} nasıl? ` +
    `${itemName} yorumları & puanları: ${avgTxt}` +
    `Gerçek kullanıcı deneyimlerini oku; şimdi sen de yorum yap ve puan ver.`;

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

export default async function ShareRedirectPage({ params }: Props) {
  // Build canonical targets
  const base = getBaseUrl();
  const href = `/?item=${encodeURIComponent(params.id)}`;

  // Fetch item on the server so we render meaningful HTML (better for SEO & for bots that don't execute JS reliably)
  const it = await getItemMeta(params.id, base);

  // Bot tespiti: User-Agent'i server tarafında al ve bilinen crawler imzalarını yakala
  const h = headers();
  const ua = (h.get("user-agent") || "").toLowerCase();
  const isBot = /\b(googlebot|bingbot|duckduckbot|baiduspider|yandex(bot|images)|slurp|sogou|exabot|facebot|facebookexternalhit|twitterbot|linkedinbot|pinterest|whatsapp|telegrambot|applebot|discordbot|embedly|quora link preview|crawler|spider|bot)\b/.test(ua);

  // Minimal JSON-LD: enrich if we have rating info
  const rawImg = pickThumb(it);
  const absImg = rawImg
    ? rawImg.startsWith("http")
      ? rawImg
      : `${base}${rawImg.startsWith("/") ? "" : "/"}${rawImg}`
    : undefined;

  const ratingValue = typeof it?.avg === "number" ? Number(it.avg) : undefined;
  const ratingCount =
    typeof it?.ratingCount === "number"
      ? it.ratingCount
      : Array.isArray(it?.ratings)
      ? it.ratings.length
      : undefined;

  const itemLD: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: it?.name || "RateStuff içeriği",
    description: it?.description || undefined,
    url: `${base}/share/${params.id}`,
    image: absImg,
  };
  if (ratingValue && ratingCount) {
    itemLD.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(ratingValue.toFixed(2)),
      ratingCount,
    };
  }
  // Reviews (if comments array is present and has text/rating)
  if (Array.isArray(it?.comments) && it.comments.length) {
    itemLD.review = it.comments
      .filter((c: any) => typeof c?.text === "string" && c.text.trim())
      .slice(0, 5)
      .map((c: any) => {
        const authorName =
          (c?.user && (c.user.maskedName || c.user.name)) || "Kullanıcı";
        const rValue =
          typeof c?.rating === "number" ? Math.max(0, Math.min(5, c.rating)) : undefined;
        return {
          "@type": "Review",
          author: { "@type": "Person", name: authorName },
          reviewBody: c.text.trim(),
          datePublished: c?.createdAt || undefined,
          reviewRating: rValue != null ? { "@type": "Rating", ratingValue: rValue, bestRating: 5, worstRating: 0 } : undefined,
        };
      });
  }

  const qName = (it?.name && String(it.name).trim()) || "Bu içerik";
  const q = `${qName} nasıl?`;

  const answerParts: string[] = [];
  if (ratingValue) {
    answerParts.push(`${qName} kullanıcıları ortalama ${ratingValue.toFixed(2)} ⭐ verdi${ratingCount ? ` (${ratingCount} oy).` : "."}`);
  }
  answerParts.push("Gerçek kullanıcı yorumlarını oku; kendi deneyimini paylaş.");

  const faqLD: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: answerParts.join(" ") },
      },
    ],
  };

  return (
    <main className="min-h-screen grid place-items-center p-6">
      {/* SEO: JSON-LD for item (server-rendered) */}
      <SeoLD json={itemLD} />
      <SeoLD json={faqLD} />

      {/* Server-rendered preview so crawlers see content */}
      <article className="max-w-[720px] text-center">
        <h1 className="text-xl font-semibold mb-2">{it?.name || "RateStuff içeriği"}</h1>
        {it?.description ? (
          <p className="text-sm opacity-80 mb-3 line-clamp-3">{it.description}</p>
        ) : null}
        {absImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={absImg}
            alt={it?.name || "Görsel"}
            className="mx-auto rounded border border-black/10 mb-4 max-h-64 object-contain"
            loading="eager"
          />
        ) : null}
        {ratingValue ? (
          <div className="text-sm opacity-80 mb-2">Ortalama: {ratingValue.toFixed(2)} ⭐{ratingCount ? ` · ${ratingCount} oy` : ""}</div>
        ) : null}
        <div className="text-sm opacity-70">
          RateStuff’a yönlendiriliyor…{" "}
          <a href={href} className="underline">
            git
          </a>
        </div>
      </article>

      {/* Client-side redirect only for human users; bots stay on this server-rendered page */}
      {!isBot && (
        <>
          <script
            dangerouslySetInnerHTML={{
              __html: `setTimeout(function(){try{location.replace(${JSON.stringify(
                href
              )})}catch(e){location.href=${JSON.stringify(href)}}},150);`,
            }}
          />
          <noscript>
            <meta httpEquiv="refresh" content={`1; url=${href}`} />
          </noscript>
        </>
      )}
    </main>
  );
}