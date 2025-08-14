// lib/seo.ts
export const site = {
  name: "RateStuff",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  locale: "tr_TR",
  twitter: "", // yoksa "" bırak
  defaultTitle: "RateStuff - Her şeyi puanla",
  defaultDesc:
    "RateStuff ile istediğin her şeyi ekle, puanla ve yorumla. Trendleri keşfet, kendi listeni oluştur.",
  ogImage: "/og-image.jpg", // public içine koy
};