'use client';
import React from "react";
import ReachUsModal from "@/components/common/ReachUs";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Gizlilik Politikası | RateStuff",
  description:
    "RateStuff gizlilik politikası: hangi verileri topluyoruz, neden topluyoruz, nasıl saklıyoruz ve haklarınız neler.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  const updatedAt = new Date("2025-09-10"); // gerekli olduğunda güncelle
  const email = "contact@ratestuff.net";
  const [reachOpen, setReachOpen] = React.useState(false);

  return (
    <main className="rs-mobile-edge mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Gizlilik Politikası</h1>
      <p className="mt-1 text-sm opacity-70">
        Son güncelleme: {updatedAt.toLocaleDateString("tr-TR")}
      </p>

      <div className="prose prose-sm md:prose-base dark:prose-invert mt-6 space-y-6">
        <p className="mt-2">
          Bu gizlilik politikası, RateStuff ("<strong>RateStuff</strong>", "<strong>biz</strong>",
          "<strong>bize</strong>") olarak kişisel verilerinizi nasıl işlediğimizi açıklar. Uygulama ve web
          sitemizi ("<strong>Hizmet</strong>") kullanırken; topladığımız veri türleri, kullanım amaçları,
          saklama süreleri ve haklarınızı burada bulabilirsiniz.
        </p>

        <h2 className="text-lg md:text-xl font-bold mt-8 mb-3">Topladığımız Veriler</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Hesap bilgileri:</strong> ad/rumuz, e‑posta, profil görseli (varsa), şifre özetleri.
          </li>
          <li>
            <strong>İçerik ve etkileşimler:</strong> puanlar, yorumlar, etiketler, favoriler, kaydetmeler.
          </li>
          <li>
            <strong>Cihaz / kullanım verileri:</strong> IP, tarayıcı bilgisi, dil, yönlendiren URL, çerez
            kimlikleri, oturum bilgileri, hata kayıtları (loglar).
          </li>
          <li>
            <strong>İletişim formları:</strong> “Bize Ulaş” gibi formlarda ilettiğiniz ad, e‑posta, konu ve mesaj.
          </li>
        </ul>

        <h2 className="text-lg md:text-xl font-bold mt-8 mb-3">Verileri Nasıl Kullanıyoruz</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Hizmeti sağlamak, güvenli ve çalışır tutmak (kimlik doğrulama, güvenlik, hata ayıklama).</li>
          <li>Moderasyon: kötüye kullanımın önlenmesi, topluluk güvenliği.</li>
          <li>İyileştirme: analitik, performans ölçümü, yeni özellik geliştirme.</li>
          <li>İletişim: destek taleplerine yanıt, önemli değişiklikleri bildirme.</li>
          <li>Hukuki yükümlülüklerin yerine getirilmesi.</li>
        </ul>

        <h2 className="text-lg md:text-xl font-bold mt-8 mb-3">İşleme Dayanağı</h2>
        <p className="mt-2">
          Avrupa Birliği/AEA kullanıcıları için Genel Veri Koruma Tüzüğü (GDPR) kapsamında işleme dayanaklarımız; sözleşmenin
          ifası, meşru menfaat, hukuki yükümlülük ve açık rızadır (gerekli hallerde).
        </p>

        <h2 className="text-lg md:text-xl font-bold mt-8 mb-3">Çerezler ve Benzeri Teknolojiler</h2>
        <p className="mt-2">
          Oturum yönetimi, tercihlerin hatırlanması ve analitik için çerezler kullanırız. Tarayıcı ayarlarından çerezleri
          yönetebilirsiniz. Analitik/performans çerezleri için ayrı bir onay (banner) gösterilebilir.
        </p>

        <h2 className="text-lg md:text-xl font-bold mt-8 mb-3">Üçüncü Taraflarla Paylaşım</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Altyapı/hosting ve e‑posta sağlayıcıları (yalnızca gerekli ölçüde).</li>
          <li>Hukuki talepler ve güvenlik gereklilikleri halinde yetkili makamlar.</li>
          <li>Birleşme/devralma gibi kurumsal işlemler sırasında, yürürlükteki hukuk uyarınca.</li>
        </ul>

        <h2 className="text-lg md:text-xl font-bold mt-8 mb-3">Uluslararası Aktarımlar</h2>
        <p className="mt-2">
          Veriler, hizmet sağlayıcılarımızın bulunduğu ülkelerde işlenebilir. Gerekli olduğunda uygun koruma önlemleri
          (ör. standart sözleşme maddeleri) uygularız.
        </p>

        <h2 className="text-lg md:text-xl font-bold mt-8 mb-3">Saklama Süreleri</h2>
        <p className="mt-2">
          Verileri, toplanma amacına ve hukuki gerekliliklere uygun makul sürelerle saklarız. Hesabınızı silmeniz
          halinde, yasal zorunluluklar ve meşru menfaatler (örn. güvenlik, uyuşmazlık çözümü) kapsamında istisnalar saklıdır.
        </p>

        <h2 className="text-lg md:text-xl font-bold mt-8 mb-3">Haklarınız</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Erişim, düzeltme, silme, işlemeyi kısıtlama/itiraz.</li>
          <li>Taşınabilirlik hakkı (uygulanabildiği ölçüde).</li>
          <li>Rıza temelli işlemlerde rızayı geri çekme.</li>
          <li>Yetkili denetim otoritesine şikâyet.</li>
        </ul>

        <p className="mt-2">
          Bu hakları kullanmak için bizimle iletişime geçin: <a className="underline" href={`mailto:${email}`}>{email}</a>
        </p>

        <h2 className="text-lg md:text-xl font-bold mt-8 mb-3">Çocukların Gizliliği</h2>
        <p className="mt-2">
          Hizmet, yürürlükteki hukuka göre gerekli asgari yaşın altındaki kişilere yönelik değildir. Bilmeden veri
          topladığımızı düşünüyorsanız bize bildirin; gerekli işlemleri yaparız.
        </p>

        <h2 className="text-lg md:text-xl font-bold mt-8 mb-3">Güvenlik</h2>
        <p className="mt-2">
          Uygun teknik ve idari önlemler uygularız; ancak internet üzerinden aktarılan verilere ilişkin mutlak güvenlik
          garanti edilemez.
        </p>

        <h2 className="text-lg md:text-xl font-bold mt-8 mb-3">Değişiklikler</h2>
        <p className="mt-2">
          Bu politikayı zaman zaman güncelleyebiliriz. Güncellenmiş sürümü bu sayfada yayınlarız ve "Son güncelleme"
          tarihini değiştiririz.
        </p>

        <h2 className="text-lg md:text-xl font-bold mt-8 mb-3">İletişim</h2>
        <p className="mt-2">
          Sorularınız için <a className="underline" href={`mailto:${email}`}>{email}</a> adresine e‑posta gönderebilir
          veya <button
            type="button"
            onClick={() => setReachOpen(true)}
            className="underline text-purple-600 dark:text-purple-400"
          >
            Bize Ulaş
          </button> formunu kullanabilirsiniz.
        </p>
      </div>
      <ReachUsModal open={reachOpen} onClose={() => setReachOpen(false)} />
    </main>
  );
}
