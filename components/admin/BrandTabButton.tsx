

"use client";
import Link from "next/link";
import { useRef } from "react";
import Lottie from "lottie-react";
import starWinkAnim from "@/assets/animations/star-wink.json";

export default function BrandTabButton({
  showingBrands,
  toggleHref,
}: {
  showingBrands: boolean;
  toggleHref: string;
}) {
  const lottieRef = useRef<any>(null);
  return (
    <Link
      href={toggleHref}
      className={[
        "inline-flex items-center gap-2 px-3 py-2 rounded-md border transition",
        showingBrands
          ? "bg-emerald-600 text-white border-emerald-600"
          : "border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800",
      ].join(" ")}
      aria-pressed={showingBrands}
      onMouseEnter={() => lottieRef.current?.play?.()}
      onMouseLeave={() => lottieRef.current?.stop?.()}
    >
      <Lottie
        lottieRef={lottieRef as any}
        animationData={starWinkAnim}
        autoplay={false}
        loop={false}
        renderer="svg"
        style={{ width: 28, height: 28 }}
        className="brand-lottie"
        rendererSettings={{
          preserveAspectRatio: "xMidYMid meet",
          className:
            "lottie-colorize text-neutral-800 dark:text-neutral-100",
        }}
      />
      <span className="text-sm font-medium">RateStuff for Brands</span>
    </Link>
  );
}