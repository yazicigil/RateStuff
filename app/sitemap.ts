// app/sitemap.ts
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const revalidate = 60 * 60; // 1 saat: sitemap cache süresi

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://ratestuff.net").replace(/\/+$/, "");
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
      select: { id: true, createdAt: true, editedAt: true },
      orderBy: { createdAt: "desc" },
      take: 50000, // Google sitemap URL limiti
    });

    for (const it of items as Array<{ id: string; createdAt?: Date; editedAt?: Date }>) {
      const lastModified = (it as any).editedAt ?? it.createdAt ?? now;
      entries.push({
        url: `${base}/share/${it.id}`,
        lastModified,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch {
    // prisma erişilemezse ana sayfa ile yetinir
  }

  return entries;
}