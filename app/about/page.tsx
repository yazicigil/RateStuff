import React from "react";
// app/about/page.tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import SplitText from "components/reactbits/SplitText";
import ScrollReveal from "@/components/reactbits/ScrollReveal";
import { UserGroupIcon, SparklesIcon, CheckCircleIcon } from "@heroicons/react/20/solid";
import SpotlightCard from "components/reactbits/SpotlightCard";
import Orb from "@/components/reactbits/Orb";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import LearnMoreOpener from "@/components/brand/LearnMoreOpener";
import Aurora from "@/components/reactbits/Aurora";
import AnimatedCtaFooter from "@/components/cta/AnimatedCtaFooter";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description:
    "RateStuff insanların hayatındaki her şey hakkında yıldız verip yorum yapabildiği topluluk odaklı bir platformdur. Gerçek deneyimler, şeffaf geri bildirim ve markalar için yeni bir pencere.",
  openGraph: {
    title: "Hakkımızda",
    description:
      "Gerçek deneyimler, şeffaf geri bildirim. RateStuff topluluğuna katıl veya markan için yeni nesil dinleme kanalı aç.",
    images: [{ url: "/og-image.jpg" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hakkımızda",
    description:
      "Gerçek deneyimler, şeffaf geri bildirim. RateStuff topluluğuna katıl.",
    images: ["/og-image.jpg"],
  },
};

export default function AboutPage() {
  return (
    <main className="relative">
      {/* HERO */}
      <section className="relative">
        <div className="absolute inset-0 -z-10 pointer-events-auto">
          <Orb hoverIntensity={0.35} />
        </div>
        <div className="mx-auto max-w-6xl px-5 pt-28 pb-20 sm:pt-40 sm:pb-28">
          <div className="flex flex-col items-center text-center gap-6 pointer-events-none">
            <div className="text-3xl sm:text-5xl font-semibold leading-tight tracking-tight text-balance">
              <SplitText
                key="hero-line-1"
                tag="h1"
                text="Her şeyi puanla."
                className="block"
                display="block"
                threshold={0.05}
                rootMargin="0px"
              />
            </div>
            <p className="max-w-2xl text-base sm:text-lg text-black/70 dark:text-white/70 text-balance">
              RateStuff'ta deneyimlerini payalaşabilir , topluluğun fikrini alabilirsin. Gerçek deneyimlerden faydalan.
            </p>
            

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2 pointer-events-auto">
              <Link
                href="/signin"
                aria-label="Topluluğa katıl"
                className="rounded-full px-5 py-2.5 text-sm font-medium bg-violet-600 text-white shadow-sm hover:bg-violet-500 dark:bg-violet-500 dark:hover:bg-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 transition"
              >
                Topluluğa katıl
              </Link>
              <Link
                href="/brand"
                aria-label="RateStuff for Brands"
                className="rounded-full px-5 py-2.5 text-sm font-medium border border-violet-500 text-violet-700 hover:bg-violet-500/10 dark:border-violet-400 dark:text-violet-300 dark:hover:bg-violet-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 transition"
              >
                RateStuff for Brands
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3 PİLAR */}
      <section className="mx-auto max-w-6xl px-5 pt-10 pb-0 sm:pt-12 sm:pb-0">
        <div className="grid gap-6 sm:grid-cols-3">
          <SpotlightCard className="p-6 sm:p-8 bg-white/80 dark:bg-white/5 backdrop-blur border border-black/20 dark:border-white/20">
            <div className="mb-3 inline-flex items-center gap-2">
              <UserGroupIcon className="h-6 w-6" aria-hidden="true" />
              <h3 className="text-lg font-semibold">Topluluk Odaklı</h3>
            </div>
            <p className="text-sm text-black/70 dark:text-white/70">
              Gerçek kullanıcı yorumları, fotoğraflar ve mizah. Keşif, trend ve iletişim tek yerde.
            </p>
            <ul className="mt-4 space-y-1 text-sm text-black/70 dark:text-white/70">
              <li>• Yıldız + yorum + görsel</li>
              <li>• Trend etiketler</li>
              <li>• Doğal keşif</li>
            </ul>
          </SpotlightCard>
          <SpotlightCard className="p-6 sm:p-8 bg-white/80 dark:bg-white/5 backdrop-blur border border-black/20 dark:border-white/20">
            <div className="mb-3 inline-flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              <h3 className="text-lg font-semibold">Şeffaf &amp; Bağımsız</h3>
            </div>
            <p className="text-sm text-black/70 dark:text-white/70">
              Görmek istediğin doğrultusunda filtrele; parlatılmış vitrin değil, gerçek deneyim akışı.
            </p>
            <ul className="mt-4 space-y-1 text-sm text-black/70 dark:text-white/70">
              <li>• Filtrelenebilir akış</li>
              <li>• Şeffaf kurallar</li>
              <li>• Topluluk normları</li>
            </ul>
          </SpotlightCard>
          <SpotlightCard className="p-6 sm:p-8 bg-white/80 dark:bg-white/5 backdrop-blur border border-black/20 dark:border-white/20">
            <div className="mb-3 inline-flex items-center gap-2">
              <SparklesIcon className="h-6 w-6" aria-hidden="true" />
              <h3 className="text-lg font-semibold">Tek başına karar verme</h3>
            </div>
            <p className="text-sm text-black/70 dark:text-white/70">
              Bir ürünü veya hizmeti almadan önce topluluğun deneyimini gör.
            </p>
            <ul className="mt-4 space-y-1 text-sm text-black/70 dark:text-white/70">
              <li>• Kıyaslamayı kolaylaştırır</li>
              <li>• Artı/eksi netliği</li>
              <li>• Zaman kazandırır</li>
            </ul>
          </SpotlightCard>
        </div>
      </section>

      {/* CONTAINER SCROLL (Aceternity) */}
      <section className="mx-auto max-w-6xl px-5 pt-0 pb-0 sm:pt-0 sm:pb-0 -mt-72 sm:-mt-40 relative z-0 pointer-events-none">
        <div className="flex flex-col overflow-visible">
          <ContainerScroll
            titleComponent={
              <>
                <h1 className="text-4xl font-semibold text-black dark:text-white text-center">
                  Markalar için <br />
                  <span className="text-4xl md:text-[6rem] font-bold mt-1 leading-none">
                    RateStuff
                  </span>
                </h1>
              </>
            }
          >
            <div className="relative">
              {/* Light mode image */}
              <img
                src="/screen.webp"
                alt="RateStuff ekran görüntüsü"
                height={720}
                width={1400}
                loading="lazy"
                decoding="async"
                sizes="(min-width: 1024px) 1024px, 100vw"
                className="mx-auto rounded-2xl object-cover h-full object-[center_top] dark:hidden"
                draggable={false}
              />
              {/* Dark mode image */}
              <img
                src="/screen-dark.webp"
                alt="RateStuff ekran görüntüsü (dark)"
                height={720}
                width={1400}
                loading="lazy"
                decoding="async"
                sizes="(min-width: 1024px) 1024px, 100vw"
                className="hidden dark:block mx-auto rounded-2xl object-cover h-full object-[center_top]"
                draggable={false}
              />
            </div>
          </ContainerScroll>
        </div>
      </section>

      {/* BÜYÜK STAT + VIBE SATIRI */}
      <section className="mx-auto max-w-6xl px-5 pt-0 pb-0 sm:pt-0 sm:pb-0 -mt-72 sm:-mt-40 relative z-10 pointer-events-none">
        
          <ScrollReveal
  baseOpacity={0}
  enableBlur={true}
  baseRotation={5}
  blurStrength={10}
>
  İnsanlar zaten konuşuyor.{" "}
            <strong className="font-semibold">RateStuff</strong>, bu konuşmaları
            görünür ve anlamlı kılar. Aradığın şey yalnızca puan değil;{" "}
            <em>bağlam</em>, <em>duygu</em> ve <em>hikâye</em>.
</ScrollReveal>
         
      </section>

      {/* FOR BRANDS BLOĞU */}
      <section className="mx-auto max-w-6xl px-5 py-10 sm:py-16">
        <div className="relative overflow-hidden rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur p-6 sm:p-10">
          {/* subtle glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -left-16 h-64 w-64 rounded-full blur-3xl opacity-30"
            style={{ background: "radial-gradient(60% 60% at 50% 50%, rgba(139,92,246,0.45), transparent 70%)" }}
          />
          <div className="grid gap-8 sm:grid-cols-2 items-center relative">
            {/* copy */}
            <div className="order-2 sm:order-1">
              <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium bg-violet-500/10 text-violet-500 ring-1 ring-violet-500/30">
                <SparklesIcon className="h-4 w-4" aria-hidden="true" />
                RateStuff for Brands
              </span>
              <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight">
                Markalar için yeni bir pencere
              </h2>
              <p className="mt-3 text-black/70 dark:text-white/70">
                İnsanlar markalar hakkında zaten konuşuyor. <strong>RateStuff for Brands</strong>, bu konuşmaları tek yerde toplar, ölçülebilir hale getirir ve şeffaf bir ilişki kurmanı sağlar. OTP ile kolay doğrulama, doğrulanmış rozet, profil rengi, kapak görseli ve bio ile resmî varlığını inşa et.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-black/70 dark:text-white/70">
                <li className="inline-flex items-start gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-violet-500 mt-0.5" aria-hidden="true" />
                  Gerçek zamanlı geri bildirim akışı
                </li>
                <li className="inline-flex items-start gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-violet-500 mt-0.5" aria-hidden="true" />
                  Trend konular ve etiketler üzerinden içgörü
                </li>
                <li className="inline-flex items-start gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-violet-500 mt-0.5" aria-hidden="true" />
                  Toplulukla doğrudan, samimi etkileşim
                </li>
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/brand"
                  className="rounded-full px-5 py-2.5 text-sm font-medium bg-violet-600 text-white shadow-sm hover:bg-violet-500 dark:bg-violet-500 dark:hover:bg-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 transition"
                >
                  Keşfet
                </Link>
                <LearnMoreOpener  />
              </div>
            </div>
            {/* visual */}
            <div className="order-1 sm:order-2">
              <div className="relative mx-auto w-full max-w-md rounded-2xl ring-1 ring-black/10 dark:ring-white/10 shadow-lg overflow-hidden">
                <Image
                  src="/forbrands.webp"
                  alt="RateStuff for Brands"
                  width={560}
                  height={420}
                  sizes="(min-width: 640px) 420px, 80vw"
                  loading="lazy"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <AnimatedCtaFooter
  title="Deneyimini paylaş, herkes faydalansın."
  description={
    <>
      Bir ürün, bir hizmet ya da hayattan küçük bir detay — yıldız ver,
      yorum yaz, görsel ekle. Birinin kararını kolaylaştır.
    </>
  }
  primary={{ href: "/", label: "Paylaşmaya başla" }}
  secondary={{ href: "/brand", label: "Markam var" }}
/>
    </main>
  );
}