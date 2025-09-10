"use client";
import Link from "next/link";
import Image from "next/image";
import { SocialIcon } from "react-social-icons";
import React from "react";

/**
 * RateStuff Footer
 * - Social links (IG, X/Twitter, GitHub)
 * - Brand landing link (RateStuff for Brands)
 * - Mobile‑first, dark/light aware, accessible
 */
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-10 border-t dark:border-gray-800">
      <div className="rs-mobile-edge mx-auto max-w-screen-xl px-4 py-8 grid gap-6 md:grid-cols-3">
        {/* Brand left */}
        <div className="flex flex-col items-start">
          <Link href="/" className="mb-2">
            <Image src="/logo.svg" alt="RateStuff" width={96} height={96} className="dark:invert" />
          </Link>
          <p className="text-sm opacity-70 max-w-sm">
            Her şeyi puanla, başkalarının deneyimlerinden ilham al.
          </p>
        </div>

        {/* Social middle */}
        <div className="flex items-center md:justify-center gap-3 self-end md:self-center">
          <SocialIcon url="https://instagram.com/ratestuffnet" target="_blank" rel="noopener noreferrer" style={{ height: 32, width: 32 }} />
          <SocialIcon url="https://x.com/ratestuffnet" target="_blank" rel="noopener noreferrer" style={{ height: 32, width: 32 }} />
          <SocialIcon url="https://www.linkedin.com/company/ratestuff/" target="_blank" rel="noopener noreferrer" style={{ height: 32, width: 32 }} />
        </div>

        {/* For Brands right */}
        <div className="md:text-right flex flex-col items-end">
          <Link href="/brand" aria-label="RateStuff for Brands">
            <Image
              src="/forbrandslogo.svg"
              alt="RateStuff for Brands"
              width={160}
              height={160}
              className="dark:invert dark:brightness-0"
            />
          </Link>
          <div className="mt-2 text-xs opacity-60">© {year} RateStuff</div>
        </div>
      </div>
    </footer>
  );
}
