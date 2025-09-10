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
      <div className="rs-mobile-edge mx-auto max-w-screen-xl px-4 py-8 grid grid-cols-1 gap-6 items-start md:grid-cols-3">
        {/* Brand left */}
        <div className="flex flex-col items-start">
          <Link href="/" className="mb-2">
            <Image
              src="/logo.svg"
              alt="RateStuff"
              width={96}
              height={96}
              className="dark:invert -ml-1 md:-ml-2 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24"
            />
          </Link>
          <p className="text-sm opacity-70 max-w-sm">
            Her şeyi puanla, başkalarının deneyimlerinden ilham al.
          </p>
        </div>

        {/* Social middle */}
        <div className="flex items-center gap-3 mt-3 md:mt-6 md:justify-center">
          <SocialIcon url="https://instagram.com/ratestuffnet" target="_blank" rel="noopener noreferrer" style={{ height: 28, width: 28 }} />
          <SocialIcon url="https://x.com/ratestuffnet" target="_blank" rel="noopener noreferrer" style={{ height: 28, width: 28 }} />
          <SocialIcon url="https://www.linkedin.com/company/ratestuff/" target="_blank" rel="noopener noreferrer" style={{ height: 28, width: 28 }} />
        </div>

        {/* For Brands right */}
        <div className="flex flex-col items-center md:items-end md:text-right">
          <Link href="/brand" aria-label="RateStuff for Brands">
            <Image
              src="/forbrandslogo.svg"
              alt="RateStuff for Brands"
              width={200}
              height={200}
              className="dark:invert dark:brightness-0 w-28 h-auto sm:w-36 md:w-44 lg:w-52"
            />
          </Link>
          <div className="mt-2 text-xs opacity-60 text-center md:text-right">© {year} RateStuff</div>
        </div>
      </div>
    </footer>
  );
}
