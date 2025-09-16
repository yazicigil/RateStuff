// app/about/page.tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import Aurora from "components/reactbits/Aurora";
import SpotlightCard from "components/reactbits/SpotlightCard";
import SplitText from "components/reactbits/SplitText";
import ScrollReveal from "components/reactbits/ScrollReveal";
import { UserGroupIcon, SparklesIcon } from "@heroicons/react/24/solid";

export const metadata: Metadata = {
  title: "RateStuff | Hakkımızda",
  description:
    "RateStuff insanların hayatındaki her şey hakkında yıldız verip yorum yapabildiği topluluk odaklı bir platformdur. Gerçek deneyimler, şeffaf geri bildirim ve markalar için yeni bir pencere.",
  openGraph: {
    title: "RateStuff | Hakkımızda",
    description:
      "Gerçek deneyimler, şeffaf geri bildirim. RateStuff topluluğuna katıl veya markan için yeni nesil dinleme kanalı aç.",
    images: [{ url: "/og-image.jpg" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "RateStuff | Hakkımızda",
    description:
      "Gerçek deneyimler, şeffaf geri bildirim. RateStuff topluluğuna katıl.",
    images: ["/og-image.jpg"],
  },
};

export default function AboutPage() {
  return (
    <main className="relative">
      {/* Global Aurora background behind header */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <Aurora />
      </div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-5 pt-20 pb-12 sm:pt-28 sm:pb-16">
          <div className="flex flex-col items-center text-center gap-6">
            <Image
              src="/logo.svg"
              alt="RateStuff"
              width={56}
              height={56}
              className="opacity-90"
              priority
            />
            <h1 className="text-3xl sm:text-5xl font-semibold leading-tight tracking-tight">
              <SplitText text="Her şey değerlendirilebilir." />
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-black/80 via-black to-black/70 dark:from-white dark:to-white/70">
                <SplitText text="Gerçek deneyimler burada." />
              </span>
            </h1>
            <p className="max-w-2xl text-base sm:text-lg text-black/70 dark:text-white/70">
              RateStuff, insanların gündelik hayatlarında karşılaştıkları her
              şeye yıldız verip yorum yapabildiği topluluk odaklı bir
              platformdur. Parlatılmış reklamlar değil, sahici deneyimler.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/signin"
                className="rounded-full px-5 py-2.5 text-sm font-medium bg-black text-white dark:bg-white dark:text-black shadow-sm hover:opacity-90 transition"
              >
                Topluluğa katıl
              </Link>
              <Link
                href="/brand"
                className="rounded-full px-5 py-2.5 text-sm font-medium border border-black/15 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 transition"
              >
                RateStuff for Brands
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3 PİLAR */}
      <section className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        <div className="grid gap-6 sm:grid-cols-3 [--spc:rgba(17,24,39,0.08)] dark:[--spc:rgba(255,255,255,0.22)]">
          <SpotlightCard spotlightColor="var(--spc)"><Card
            title="Topluluk Odaklı"
            desc="Gerçek kullanıcı yorumları, fotoğraflar ve mizah. Keşif, trend ve sohbet tek yerde."
            bullet={["Yıldız + yorum + görsel", "Trend etiketler", "Doğal keşif"]}
            icon={<UserGroupIcon />}
          /></SpotlightCard>
          <SpotlightCard spotlightColor="var(--spc)"><Card
            title="Şeffaf & Bağımsız"
            desc="Görmek istediğin doğrultusunda filtrele; parlatılmış vitrin değil, gerçek deneyim akışı."
            bullet={["Filtrelenebilir akış", "Şeffaf kurallar", "Topluluk normları"]}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            }
          /></SpotlightCard>
          <SpotlightCard spotlightColor="var(--spc)"><Card
            title="Karar Destek"
            desc="Bir ürünü almadan önce, bir hizmeti kullanmadan önce topluluğun deneyimini gör."
            bullet={["Kıyaslamayı kolaylaştırır", "Artı/eksi netliği", "Zaman kazandırır"]}
            icon={<SparklesIcon />}
          /></SpotlightCard>
        </div>
      </section>

      {/* BÜYÜK STAT + VIBE SATIRI */}
      <section className="mx-auto max-w-6xl px-5 py-6 sm:py-10">
        <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6 sm:p-8 bg-white/60 dark:bg-white/5 backdrop-blur">
          <ScrollReveal baseOpacity={0.2} blurStrength={6} baseRotation={2}>
            <p className="text-lg sm:text-xl leading-relaxed text-black/80 dark:text-white/80">
              İnsanlar zaten konuşuyor.{" "}
              <strong className="font-semibold">RateStuff</strong>, bu konuşmaları
              görünür ve anlamlı kılar. Aradığın şey yalnızca puan değil;{" "}
              <em>bağlam</em>, <em>duygu</em> ve <em>hikâye</em>.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* FOR BRANDS BLOĞU */}
      <section className="mx-auto max-w-6xl px-5 py-10 sm:py-16">
        <div className="grid gap-8 sm:grid-cols-2 items-center">
          <div className="order-2 sm:order-1">
            <h2 className="text-2xl sm:text-3xl font-semibold mb-3">
              Markalar için yeni bir pencere
            </h2>
            <p className="text-black/70 dark:text-white/70 mb-4">
              İnsanlar markalar hakkında zaten konuşuyor.{" "}
              <strong>RateStuff for Brands</strong>, bu konuşmaları tek yerde
              toplar, ölçülebilir hale getirir ve şeffaf bir ilişki kurmanı
              sağlar. OTP ile kolay doğrulama, doğrulanmış rozet, profil rengi,
              kapak görseli ve bio ile resmî varlığını inşa et.
            </p>
            <ul className="space-y-2 text-sm text-black/70 dark:text-white/70">
              <li>• Gerçek zamanlı geri bildirim akışı</li>
              <li>• Trend konular ve etiketler üzerinden içgörü</li>
              <li>• Toplulukla doğrudan, samimi etkileşim</li>
            </ul>
            <div className="mt-5 flex gap-3">
              <Link
                href="/brand"
                className="rounded-lg px-4 py-2 text-sm font-medium bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition"
              >
                RateStuff for Brands’i keşfet
              </Link>
              <Link
                href="/reach-us"
                className="rounded-lg px-4 py-2 text-sm font-medium border border-black/15 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 transition"
              >
                Bizimle iletişime geç
              </Link>
            </div>
          </div>
          <div className="order-1 sm:order-2 flex justify-center">
            <Image
              src="/forbrandslogo.svg"
              alt="RateStuff for Brands"
              width={420}
              height={320}
              className="opacity-90 w-full max-w-md"
            />
          </div>
        </div>
      </section>

      {/* DEĞERLER */}
      <section className="mx-auto max-w-6xl px-5 pb-16 sm:pb-24">
        <h3 className="text-xl sm:text-2xl font-semibold mb-6">Değerlerimiz</h3>
        <div className="grid gap-6 sm:grid-cols-3">
          <Value
            title="Sadelik"
            text="Karmaşık şeyi basit anlat. İnsanlar hızlı karar verir."
          />
          <Value
            title="Şeffaflık"
            text="Geri bildirim görünür oldukça güven artar."
          />
          <Value
            title="Topluluk"
            text="İyi ürünler toplulukla beraber şekillenir."
          />
        </div>
      </section>

      {/* CTA FOOTER */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="rounded-2xl border border-black/10 dark:border-white/10 p-8 sm:p-10 text-center bg-white/70 dark:bg-white/5 backdrop-blur">
          <h4 className="text-2xl sm:text-3xl font-semibold mb-3">
            Deneyimini paylaş. Dünyayı aydınlat.
          </h4>
          <p className="text-black/70 dark:text-white/70 mb-6">
            Bir ürün, bir hizmet ya da hayattan küçük bir detay — yıldız ver,
            yorum yaz, görsel ekle. Birinin kararını kolaylaştır.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/"
              className="rounded-full px-5 py-2.5 text-sm font-medium bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition"
            >
              Keşfetmeye başla
            </Link>
            <Link
              href="/brand"
              className="rounded-full px-5 py-2.5 text-sm font-medium border border-black/15 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              Markam var
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

/** ---------- küçük yardımcı bileşenler (server component) ---------- */

function Card({
  title,
  desc,
  bullet = [],
  icon,
}: {
  title: string;
  desc: string;
  bullet?: string[];
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 p-6 bg-white/70 dark:bg-white/5 backdrop-blur">
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className="h-5 w-5 text-black/70 dark:text-white/70">{icon}</span>}
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-black/70 dark:text-white/70">{desc}</p>
      {bullet.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm text-black/70 dark:text-white/70">
          {bullet.map((b, i) => (
            <li key={i}>• {b}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Value({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 p-6 bg-white/70 dark:bg-white/5 backdrop-blur">
      <div className="mb-3 inline-flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-current opacity-80" />
        <h4 className="text-base font-semibold">{title}</h4>
      </div>
      <p className="text-sm text-black/70 dark:text-white/70">{text}</p>
    </div>
  );
}
