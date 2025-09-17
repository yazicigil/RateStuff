'use client'
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, MessageSquare, ShieldCheck, Sparkles, Star, Plus, Feather, Settings, MessageCircle } from "lucide-react";

// --- Data ---------------------------------------------------------------
const faqs: { q: string; a: React.ReactNode; icon?: React.ReactNode }[] = [
  {
    q: "RateStuff nedir ve nasıl çalışır?",
    a: (
      <>
        RateStuff, aklına gelen hemen her şeyi (ürün, mekân, uygulama, gündelik nesne) ekleyip
        yıldızla puanlayabileceğin ve yorumlayabileceğin sosyal bir platform. İnsanlar gerçek
        deneyimlerini paylaşır; sen de keşfeder, kaydeder, tartışır ve topluluğun kolektif aklından
        faydalanırsın.
      </>
    ),
    icon: <Star className="h-5 w-5" aria-hidden />,
  },
  {
    q: "RateStuff for Brands ne sunar?",
    a: (
      <>
        For Brands, markalara topluluğun içindeki görünürlük ve geri bildirim akışını tek yerde
        yönetme imkânı verir. Marka profili açar, ürünlerini listeler, “bahsetmeler” ve yorumlar
        üzerinden nabız tutarsın. Amaç: gerçek kullanıcı görüşlerine dayalı, şeffaf ve sürdürülebilir
        etkileşim.
      </>
    ),
    icon: <ShieldCheck className="h-5 w-5" aria-hidden />,
  },
  {
    q: "Nasıl yeni bir item eklerim?",
    a: (
      <>
        Giriş yaptıktan sonra ana sayfadaki <b>+ Ekle</b> kartından isim, kısa açıklama ve istersen
        görsel ekleyerek anında paylaşabilirsin. Kopya/tekrarları önlemek için sistem olası
        eşleşmeleri gösterir; topluluk kurallarına aykırı içerikler moderasyondan geçmez.
      </>
    ),
    icon: <Plus className="h-5 w-5" aria-hidden />,
  },
  {
    q: "Marka olarak nasıl başvuru yaparım?",
    a: (
      <>
        <b>/brands</b> adresindeki <b>“Daha Fazla Bilgi Al”</b> formunu dolduruyorsun; markanla ilgili
        temel bilgileri alıyoruz. Başvurunu inceliyoruz ve uygunluk durumuna göre e‑posta ile dönüş
        yapıyoruz. Onay sonrası profilini açman ve içeriklerini eklemen için gerekli adımları
        paylaşıyoruz.
      </>
    ),
    icon: <Feather className="h-5 w-5" aria-hidden />,
  },
  {
    q: "Markalar profil ve ürünlerini nasıl yönetir?",
    a: (
      <>
        Onaylı markalar, profil sayfasından kapak görseli, logo, bio ve sosyal linkleri
        düzenleyebilir; ürün ekleyip düzenleyebilir. Görsel/bio gibi alanlar keşfedilebilirliği
        artırır; ürün kartların platform içinde tutarlı görünür, topluluk geri bildirimleri aynı
        yerden izlenir.
      </>
    ),
    icon: <Settings className="h-5 w-5" aria-hidden />,
  },
  {
    q: "Yorumlar ve moderasyon nasıl ilerler?",
    a: (
      <>
        Kullanıcı yorumları bağımsızdır; markalar yorumları değiştiremez/silemez. Uygunsuz, spam ya da
        yönlendirici içerikler <b>Rapor Et</b> ile bildirilir; ekip inceleyip gerekli işlemi yapar
        (ihtar, kaldırma, item askıya alma vb.). Böylece hem ifade özgürlüğü hem güvenlik korunur.
      </>
    ),
    icon: <MessageCircle className="h-5 w-5" aria-hidden />,
  },
];

// --- Styles -------------------------------------------------------------
const itemBase =
  "group border border-white/10 dark:border-white/10 rounded-2xl bg-white/70 dark:bg-white/[0.03] backdrop-blur px-4 sm:px-6 py-3 sm:py-4 shadow-sm hover:shadow-md transition-shadow";

// --- Accordion Item -----------------------------------------------------
function AccordionItem({
  id,
  question,
  answer,
  icon,
  isOpen,
  onToggle,
}: {
  id: string;
  question: string;
  answer: React.ReactNode;
  icon?: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const contentId = `${id}-content`;
  const buttonId = `${id}-button`;

  return (
    <div className={itemBase}>
      <button
        id={buttonId}
        aria-controls={contentId}
        aria-expanded={isOpen}
        onClick={onToggle}
        className="w-full flex items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 rounded-xl"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 text-indigo-600 dark:text-indigo-300">
          {icon ?? <Sparkles className="h-5 w-5" aria-hidden />}
        </div>
        <span className="flex-1 font-medium text-zinc-900 dark:text-zinc-50 leading-tight">
          {question}
        </span>
        <motion.span
          initial={false}
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="ml-2 rounded-lg p-1 text-zinc-600 dark:text-zinc-300"
          aria-hidden
        >
          <ChevronDown className="h-5 w-5" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.section
            id={contentId}
            role="region"
            aria-labelledby={buttonId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-3 sm:pt-4 text-sm sm:text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
              {answer}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Root Component -----------------------------------------------------
export default function ModernFAQAccordion({
  title = "Sıkça Sorulan Sorular",
  allowMultiple = true,
}: {
  title?: string;
  allowMultiple?: boolean;
}) {
  const [open, setOpen] = React.useState<number[]>([0]);

  const toggle = (idx: number) => {
    setOpen((prev) => {
      const isOpen = prev.includes(idx);
      if (allowMultiple) {
        return isOpen ? prev.filter((i) => i !== idx) : [...prev, idx];
      }
      return isOpen ? [] : [idx];
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="mb-6 sm:mb-8 text-center">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {title}
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          RateStuff ve RateStuff for Brands hakkında merak edilenler
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:gap-4">
        {faqs.map((f, i) => (
          <AccordionItem
            key={i}
            id={`faq-${i}`}
            question={`${i + 1}) ${f.q}`}
            answer={f.a}
            icon={f.icon}
            isOpen={open.includes(i)}
            onToggle={() => toggle(i)}
          />
        ))}
      </div>

      {/* Subtle gradient glow */}
      <div
        aria-hidden
        className="pointer-events-none mt-8 h-24 w-full rounded-[24px] bg-gradient-to-r from-transparent via-indigo-500/15 to-transparent blur-2xl"
      />
    </div>
  );
}

// --- Usage --------------------------------------------------------------
// <ModernFAQAccordion title="FAQ" allowMultiple={false} />