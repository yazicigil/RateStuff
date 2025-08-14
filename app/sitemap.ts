// app/sitemap.ts
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base =
    (process.env.NEXT_PUBLIC_SITE_URL ?? "https://ratestuff.net").replace(/\/+$/, "");
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  // Item’leri ekle (paylaşım linkleri üzerinden)
  try {
    const items = await prisma.item.findMany({
      select: { id: true, createdAt: true as any }, // updatedAt yoksa sorun çıkarmaz
      orderBy: { id: "desc" },                      // hızlı sıralama
      take: 5000,
    });

    for (const it of items) {
      entries.push({
        url: `${base}/share/${it.id}`,
        lastModified: (it as any).updatedAt ?? now,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch (_) {
    // prisma erişilemezse ana sayfa ile yetinir
  }

  return entries;
}