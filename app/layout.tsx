// app/layout.tsx
import "./globals.css";
import Script from "next/script";
import type { Metadata } from "next";
import Providers from "@/components/Providers";
import { Analytics } from '@vercel/analytics/react';

// --- Theme: pre-hydration guard (prevents light flash / resets on refresh) ---
const THEME_STORAGE_KEYS = ["rs-theme", "theme", "ratestuff-theme"] as const;
const THEME_INIT_SCRIPT = `(() => {
  try {
    let saved = null;

    // 1) Scan localStorage: find any key whose value is "dark" or "light"
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        const v = localStorage.getItem(k);
        if (v === 'dark' || v === 'light') { saved = v; break; }
      }
    } catch {}

    // 2) Check cookie "theme=dark|light"
    if (!saved && typeof document !== 'undefined') {
      const m = document.cookie.match(/(?:^|; )theme=(dark|light)(?:;|$)/);
      if (m) saved = m[1];
    }

    // 3) Fallback to system preference
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = (saved === 'dark' || saved === 'light') ? saved : (prefersDark ? 'dark' : 'light');

    const cls = document.documentElement.classList;
    if (theme === 'dark') cls.add('dark'); else cls.remove('dark');

    // Help UA & form controls render correct colors before hydration
    try { document.documentElement.style.colorScheme = theme; } catch {}
  } catch {}
})();`;
// --- end theme guard ---

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "RateStuff - Her şeyi puanla",
    template: "%s | RateStuff",
  },
  description:
    "RateStuff ile istediğin her şeyi ekle, puanla ve yorumla. Trendleri keşfet, kendi listeni oluştur.",
  applicationName: "RateStuff",
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "RateStuff",
    locale: "tr_TR",
    title: "RateStuff - Her şeyi puanla",
    description:
      "RateStuff ile istediğin her şeyi ekle, puanla ve yorumla. Trendleri keşfet, kendi listeni oluştur.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "RateStuff" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "RateStuff - Her şeyi puanla",
    description:
      "RateStuff ile istediğin her şeyi ekle, puanla ve yorumla. Trendleri keşfet, kendi listeni oluştur.",
    images: ["/og-image.jpg"],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
    ],
    shortcut: ["/favicon.ico"],
    other: [
      { rel: "mask-icon", url: "/logo.svg", color: "#000000" },
    ],
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)",  color: "#0b0b0b" }, // dark için uygun bir ton
  ],
  other: {
    // Eski Edge/Windows desteği (opsiyonel)
    "msapplication-TileColor": "#0b0b0b",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const orgLD = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "RateStuff",
    alternateName: ["Rate Stuff"],
    url: SITE_URL,
    logo: `${SITE_URL}/android-chrome-512x512.png`,
    sameAs: [
      "https://twitter.com/ratestuffnet",
      "https://www.instagram.com/ratestuffnet"
    ],
  };
  const websiteLD = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "RateStuff",
    alternateName: ["Rate Stuff"],
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        {/* Theme pre-hydration guard */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* Google AdSense */}
      <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6558549333507218"
     crossOrigin="anonymous"></script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLD) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLD) }}
        />
        <link rel="icon" href="/favicon.ico?v=2" sizes="any" />
      </head>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
          <Analytics />
      </body>
    </html>
  );
}