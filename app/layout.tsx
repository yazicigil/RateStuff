// app/layout.tsx
import "./globals.css";
import Script from "next/script";
import type { Metadata } from "next";
import Providers from "@/components/Providers";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "RateStuff - Her Şeyi Puanla ve Yorumla",
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
    title: "RateStuff - Her Şeyi Puanla ve Yorumla",
    description:
      "RateStuff ile istediğin her şeyi ekle, puanla ve yorumla. Trendleri keşfet, kendi listeni oluştur.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "RateStuff" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "RateStuff - Her Şeyi Puanla ve Yorumla",
    description:
      "RateStuff ile istediğin her şeyi ekle, puanla ve yorumla. Trendleri keşfet, kendi listeni oluştur.",
    images: ["/og-image.jpg"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
      </head>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}