// app/about/page.tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import SplitText from "components/reactbits/SplitText";
import ScrollReveal from "@/components/reactbits/ScrollReveal";
import { UserGroupIcon, SparklesIcon } from "@heroicons/react/20/solid";
import SpotlightCard from "components/reactbits/SpotlightCard";
import Orb from "@/components/reactbits/Orb";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";

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
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 pointer-events-auto">
          <Orb hoverIntensity={0.35} />
        </div>
        <div className="mx-auto max-w-6xl px-5 pt-28 pb-20 sm:pt-40 sm:pb-28">
          <div className="flex flex-col items-center text-center gap-6 pointer-events-none">
            <div className="text-3xl sm:text-5xl font-semibold leading-tight tracking-tight">
              <SplitText
                key="hero-line-1"
                tag="h1"
                text="Her şey değerlendirilebilir."
                className="block"
                display="block"
                threshold={0.05}
                rootMargin="0px"
              />
            </div>
            <p className="max-w-2xl text-base sm:text-lg text-black/70 dark:text-white/70">
              RateStuff, insanların gündelik hayatlarında karşılaştıkları her
              şeye yıldız verip yorum yapabildiği topluluk odaklı bir
              platformdur. Parlatılmış reklamlar değil, sahici deneyimler.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2 pointer-events-auto">
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
      <section className="mx-auto max-w-6xl px-5 pt-10 pb-3 sm:pt-12 sm:pb-4">
        <div className="grid gap-6 sm:grid-cols-3">
          <SpotlightCard className="p-6 sm:p-8 bg-white/80 dark:bg-white/5 backdrop-blur">
            <div className="mb-3 inline-flex items-center gap-2">
              <UserGroupIcon className="h-6 w-6" aria-hidden="true" />
              <h3 className="text-lg font-semibold">Topluluk Odaklı</h3>
            </div>
            <p className="text-sm text-black/70 dark:text-white/70">
              Gerçek kullanıcı yorumları, fotoğraflar ve mizah. Keşif, trend ve sohbet tek yerde.
            </p>
            <ul className="mt-4 space-y-1 text-sm text-black/70 dark:text-white/70">
              <li>• Yıldız + yorum + görsel</li>
              <li>• Trend etiketler</li>
              <li>• Doğal keşif</li>
            </ul>
          </SpotlightCard>
          <SpotlightCard className="p-6 sm:p-8 bg-white/80 dark:bg-white/5 backdrop-blur">
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
          <SpotlightCard className="p-6 sm:p-8 bg-white/80 dark:bg-white/5 backdrop-blur">
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
      <section className="mx-auto max-w-6xl px-5 pt-2 pb-0 sm:pt-3 sm:pb-1">
        <div className="flex flex-col overflow-hidden">
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
                className="mx-auto rounded-2xl object-cover h-full object-[center_top] dark:hidden"
                draggable={false}
              />
              {/* Dark mode image */}
              <img
                src="/screen-dark.webp"
                alt="RateStuff ekran görüntüsü (dark)"
                height={720}
                width={1400}
                className="hidden dark:block mx-auto rounded-2xl object-cover h-full object-[center_top]"
                draggable={false}
              />
            </div>
          </ContainerScroll>
        </div>
      </section>

      {/* BÜYÜK STAT + VIBE SATIRI */}
      <section className="mx-auto max-w-6xl px-5 pt-2 pb-6 sm:pt-3 sm:pb-8">
        
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

function Value({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 p-6 bg-white/70 dark:bg-white/5 backdrop-blur">
      <div className="mb-3 inline-flex items-center gap-2">
        <h4 className="text-base font-semibold">{title}</h4>
      </div>
      <p className="text-sm text-black/70 dark:text-white/70">{text}</p>
    </div>
  );
}