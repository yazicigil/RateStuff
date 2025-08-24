import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://ratestuff.net").replace(/\/+$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/signin", "/items/new"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE.replace(/^https?:\/\//, ""),
  };
}
