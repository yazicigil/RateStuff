"use client";
import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import Aurora from "@/components/reactbits/Aurora";

type ButtonSpec = {
  href: string;
  label: string;
  ariaLabel?: string;
};

type AnimatedCtaFooterProps = {
  title: React.ReactNode;
  description: React.ReactNode;
  primary: ButtonSpec;
  secondary?: ButtonSpec;
  className?: string;
};

export default function AnimatedCtaFooter({
  title,
  description,
  primary,
  secondary,
  className,
}: AnimatedCtaFooterProps) {
  const ref = useRef<HTMLDivElement>(null);

  // CTA görünüm sınırına yaklaşırken büyüsün/öne gelsin
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 90%", "end 40%"], // girişte %90 -> çıkışta %40
  });

  const scale = useTransform(scrollYProgress, [0, 1], [0.9, 1.08]);
  const y = useTransform(scrollYProgress, [0, 1], [100, 20]);
  const bgOpacity = useTransform(scrollYProgress, [0, 1], [0.6, 1]);
  const rotateX = useTransform(scrollYProgress, [0, 1], [30, 0]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 100]);

  return (
    <section ref={ref} className={`mx-auto max-w-5xl px-5 pb-12 ${className ?? ""}`}>
      <div className="relative text-center">
        {/* Animated background (only this scales/tilts/opacity) */}
        <motion.div
          style={{ scale, y, opacity: bgOpacity, rotateX }}
          className="absolute inset-0 rounded-3xl border border-black/10 dark:border-white/10 backdrop-blur shadow-2xl will-change-transform overflow-hidden"
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/90 via-violet-500/80 to-indigo-500/80 dark:from-violet-700/60 dark:via-violet-600/60 dark:to-indigo-600/60" />
          <Aurora />
        </motion.div>

        {/* Content (kept crisp) */}
        <motion.div style={{ y: contentY }} className="relative rounded-3xl p-10 sm:p-14 flex flex-col items-center justify-center min-h-[16rem]">
          <h4 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
            {title}
          </h4>
          <p className="text-base sm:text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            {description}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href={primary.href}
              aria-label={primary.ariaLabel ?? primary.label}
              className="rounded-full px-6 py-3 text-sm font-medium bg-white text-violet-700 hover:bg-white/90 shadow transition"
            >
              {primary.label}
            </Link>
            {secondary && (
              <Link
                href={secondary.href}
                aria-label={secondary.ariaLabel ?? secondary.label}
                className="rounded-full px-6 py-3 text-sm font-medium border border-white/40 text-white hover:bg-white/10 transition"
              >
                {secondary.label}
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}