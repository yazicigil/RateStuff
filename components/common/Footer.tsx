"use client";
import Link from "next/link";
import Image from "next/image";
import React from "react";

/**
 * RateStuff Footer
 * - Social links (IG, X/Twitter, GitHub)
 * - Brand landing link (RateStuff for Brands)
 * - Mobile‑first, dark/light aware, accessible
 */
export default function Footer() {
  const year = new Date().getFullYear();

  const social = [
    {
      name: "Instagram",
      href: "https://instagram.com/ratestuffnet",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
          <path
            fill="currentColor"
            d="M12 2.75c3.2 0 3.584.012 4.85.07 1.17.054 1.96.24 2.66.512.72.28 1.33.654 1.92 1.244.59.59.964 1.2 1.244 1.92.272.7.458 1.49.512 2.66.058 1.266.07 1.65.07 4.85s-.012 3.584-.07 4.85c-.054 1.17-.24 1.96-.512 2.66-.28.72-.654 1.33-1.244 1.92-.59.59-1.2.964-1.92 1.244-.7.272-1.49.458-2.66.512-1.266.058-1.65.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.054-1.96-.24-2.66-.512-.72-.28-1.33-.654-1.92-1.244-.59-.59-.964-1.2-1.244-1.92-.272-.7-.458-1.49-.512-2.66C2.762 15.584 2.75 15.2 2.75 12s.012-3.584.07-4.85c.054-1.17.24-1.96.512-2.66.28-.72.654-1.33 1.244-1.92.59-.59 1.2-.964 1.92-1.244.7-.272 1.49-.458 2.66-.512C8.416 2.762 8.8 2.75 12 2.75Zm0 1.5c-3.15 0-3.52.012-4.76.07-1.02.047-1.574.216-1.94.36-.49.19-.84.417-1.21.784-.367.37-.594.72-.784 1.21-.144.365-.313.92-.36 1.94-.058 1.24-.07 1.61-.07 4.76s.012 3.52.07 4.76c.047 1.02.216 1.574.36 1.94.19.49.417.84.784 1.21.37.367.72.594 1.21.784.365.144.92.313 1.94.36 1.24.058 1.61.07 4.76.07s3.52-.012 4.76-.07c1.02-.047 1.574-.216 1.94-.36.49-.19.84-.417 1.21-.784.367-.37.594-.72.784-1.21.144-.365.313-.92.36-1.94.058-1.24.07-1.61.07-4.76s-.012-3.52-.07-4.76c-.047-1.02-.216-1.574-.36-1.94-.19-.49-.417-.84-.784-1.21-.37-.367-.72-.594-1.21-.784-.365-.144-.92-.313-1.94-.36-1.24-.058-1.61-.07-4.76-.07Zm0 3.25a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Zm0 1.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm6.875-.9a1.125 1.125 0 1 1-2.25 0 1.125 1.125 0 0 1 2.25 0Z"
          />
        </svg>
      ),
    },
    {
      name: "X",
      href: "https://x.com/ratestuffnet",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
          <path fill="currentColor" d="M13.7 10.7 20.9 2h-2.8l-5.2 6.2L8 2H2l7.7 11L2.6 22h2.8l5.5-6.6 5.2 6.6H22l-8.3-11.3ZM6.1 3.8h1.9l9.9 13H16l-9.9-13Z"/>
        </svg>
      ),
    },
    
  ];

  return (
    <footer className="mt-10 border-t dark:border-gray-800">
      <div className="rs-mobile-edge mx-auto max-w-screen-xl px-4 py-8 grid gap-6 md:grid-cols-3">
        {/* Brand left */}
        <div className="space-y-2">
          <Link href="/" className="inline-flex items-center gap-2">
            <Image src="/logo.svg" alt="RateStuff" width={28} height={28} className="dark:invert" />
            <span className="text-base font-semibold">RateStuff</span>
          </Link>
          <p className="text-sm opacity-70 max-w-sm">
            Her şeyi puanla, başkalarının deneyimlerinden ilham al.
          </p>
        </div>

        {/* Social middle */}
        <div className="flex items-center md:justify-center gap-3">
          {social.map((s) => (
            <Link
              key={s.name}
              href={s.href}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.name}
              title={s.name}
            >
              {s.icon}
            </Link>
          ))}
        </div>

        {/* For Brands right */}
        <div className="md:text-right">
          <Link
            href="/brand"
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
            aria-label="RateStuff for Brands"
          >
            <Image
              src="/forbrandslogo.svg"
              alt="RateStuff for Brands"
              width={24}
              height={24}
              className="dark:invert dark:brightness-0"
            />
            <span className="text-sm font-medium">RateStuff for Brands</span>
          </Link>
          <div className="mt-2 text-xs opacity-60">© {year} RateStuff</div>
        </div>
      </div>
    </footer>
  );
}
