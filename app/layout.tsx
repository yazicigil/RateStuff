// app/layout.tsx
import "./globals.css";
import Script from "next/script";
import type { Metadata } from "next";
import Providers from "@/components/Providers";
import { Analytics } from '@vercel/analytics/react';

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
  alternates: { canonical: SITE_URL },
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
      { url: "/favicon.ico" },                       // classic
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/favicon.ico"],
    other: [
      { rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#000000" }, // markanın ana rengi
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
    url: SITE_URL,
    logo: `${SITE_URL}/android-chrome-512x512.png`,
    sameAs: [
      "https://twitter.com/ratestuffnet",
      "https://www.instagram.com/ratestuffnet"
    ],
  };
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        {/* Google AdSense */}
        <Script
          id="adsbygoogle-init"
          strategy="afterInteractive"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6558549333507218"
          crossOrigin="anonymous"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLD) }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
          <Analytics />
      </body>
    </html>
  );
}