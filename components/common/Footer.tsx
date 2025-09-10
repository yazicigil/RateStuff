"use client";
import Link from "next/link";
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
      <div className="rs-mobile-edge mx-auto max-w-screen-xl px-4 py-8">
        {/* Top menu */}
        <nav
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-gray-600 dark:text-gray-300"
          aria-label="Footer menü"
        >
          <button
            type="button"
            className="hover:text-gray-900 dark:hover:text-gray-100 cursor-default font-medium"
            aria-disabled="true"
            title="Yakında"
          >
            Hakkımızda
          </button>
          <button
            type="button"
            className="hover:text-gray-900 dark:hover:text-gray-100 cursor-default font-medium"
            aria-disabled="true"
            title="Yakında"
          >
            Gizlilik
          </button>
          <button
            type="button"
            className="hover:text-gray-900 dark:hover:text-gray-100 cursor-default font-medium"
            aria-disabled="true"
            title="Yakında"
          >
            Bize ulaş
          </button>
          <Link
            href="/brands"
            className="hover:text-purple-600 dark:hover:text-purple-400 font-semibold"
            title="RateStuff | For Brands"
          >
            for Brands
          </Link>
        </nav>

        {/* Social icons */}
        <div className="mt-4 flex items-center justify-center gap-4">
          <SocialIcon url="https://instagram.com/ratestuffnet" target="_blank" rel="noopener noreferrer" style={{ height: 28, width: 28 }} />
          <SocialIcon url="https://x.com/ratestuffnet" target="_blank" rel="noopener noreferrer" style={{ height: 28, width: 28 }} />
          <SocialIcon url="https://github.com/ratestuff" target="_blank" rel="noopener noreferrer" style={{ height: 28, width: 28 }} />
          <SocialIcon url="https://www.linkedin.com/company/ratestuff/" target="_blank" rel="noopener noreferrer" style={{ height: 28, width: 28 }} />
        </div>

        {/* Copyright */}
        <div className="mt-4 text-center text-xs opacity-60">© {year} RateStuff</div>
      </div>
    </footer>
  );
}
