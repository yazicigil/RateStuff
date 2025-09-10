"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import LearnMoreModal from "@/components/brand/LearnMore";
import { UserKind } from "@prisma/client";

export default function BrandLoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    const kind = (session as any)?.user?.kind || (session as any)?.user?.role || (session as any)?.user?.type;
    if (kind === "brand" || kind === UserKind.BRAND) {
      router.replace("/brand/me");
    }
  }, [status, session, router]);

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [remember, setRemember] = useState(false);
  const [openLearnMore, setOpenLearnMore] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // Prefill e-posta: önceki girişte "Beni hatırla" açık ise localStorage'dan çek
  useEffect(() => {
    try {
      const saved = localStorage.getItem("rs_brand_email");
      if (saved && typeof saved === "string" && saved.includes("@")) {
        setEmail(saved);
        setRemember(true);
      }
    } catch {}
  }, []);

  async function requestCode() {
    setErr(null); setBusy(true);
    try {
      await fetch("/api/brand/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStep(2);
      setCooldown(30); // basit rate-limit UX — 30 sn yeniden gönder
    } catch (e: any) {
      setErr("Bir sorun oluştu. Tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyAndSignIn() {
    setErr(null); setBusy(true);
    try {
      const res = await fetch("/api/brand/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!data?.ok || !data?.nonce) {
        setErr("Kod geçersiz veya süresi doldu.");
        setBusy(false);
        return;
      }
      // "Beni hatırla" açıksa e-postayı kaydet; değilse temizle
      try {
        if (remember) {
          localStorage.setItem("rs_brand_email", email);
        } else {
          localStorage.removeItem("rs_brand_email");
        }
      } catch {}
      await signIn("brand-otp", {
        email, nonce: data.nonce,
        redirect: true, callbackUrl: "/brand/me",
        remember,
      });
    } catch {
      setErr("Giriş başarısız. Tekrar deneyin.");
      setBusy(false);
    }
  }

  if (
    status === "authenticated" &&
    (
      (session as any)?.user?.kind === "brand" ||
      (session as any)?.user?.role === "brand" ||
      (session as any)?.user?.type === "brand" ||
      (session as any)?.user?.kind === UserKind.BRAND
    )
  ) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      {/* Left visual */}
      <div className="hidden md:flex w-1/2 relative">
        <Image
          src="/brand.jpg"
          alt="Brand visual"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Right pane */}
      <div className="flex w-full md:w-1/2 flex-col items-center justify-center p-6 md:p-10 bg-white dark:bg-neutral-950">
        {/* Logo aligned with title (left aligned in the form column) */}
        <div className="w-full max-w-sm text-neutral-900 dark:text-neutral-100">
          <div className="mb-6 self-start">
            <Image
              src="/forbrandslogo.svg"
              alt="RateStuff for Brands"
              width={360}
              height={72}
              priority
              className="-ml-3 md:-ml-2"
            />
          </div>

          <h1 className="text-2xl font-semibold mb-6 text-[#011a3d] dark:text-white">
            Marka hesabınla giriş yap
          </h1>

          {/* STEP 1: email + remember */}
          {step === 1 && (
            <>
              <label className="text-sm text-[#011a3d] dark:text-white">E-posta</label>
              <input
                className="w-full mt-1 mb-3 px-3 py-2 rounded-md border bg-white text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#011a3d] dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 dark:placeholder-neutral-400 dark:focus:ring-[#011a3d]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="ornek@marka.com"
              />

              {/* Remember toggle */}
              <div className="flex items-center mt-2 mb-4 space-x-2 text-neutral-700 dark:text-neutral-200">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 shadow-inner peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#011a3d] rounded-full peer dark:bg-neutral-700 peer-checked:bg-[#011a3d] transition-colors"></div>
                  <div className="absolute left-0.5 top-0.5 bg-white dark:bg-neutral-100 w-5 h-5 rounded-full transition-transform peer-checked:translate-x-full"></div>
                </label>
                <span className="text-sm select-none text-[#011a3d] dark:text-white">Beni hatırla</span>
              </div>

              <button
                className="w-full h-10 rounded-md bg-[#011a3d] text-white disabled:opacity-60 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#011a3d] focus:ring-offset-white dark:focus:ring-offset-neutral-950"
                disabled={busy || !email}
                onClick={requestCode}
              >
                {busy ? "Gönderiliyor..." : "Giriş kodu gönder"}
              </button>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                Bu e-posta marka listemizde kayıtlı olmalı.
              </p>
              {err && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{err}</p>}
            </>
          )}

          {/* STEP 2: code verify */}
          {step === 2 && (
            <>
              <label className="text-sm text-[#011a3d] dark:text-white">6 haneli kod</label>
              <input
                className="w-full mt-1 mb-3 px-3 py-2 rounded-md border tracking-widest text-center bg-white text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#011a3d] dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 dark:placeholder-neutral-400 dark:focus:ring-[#011a3d]"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="------"
              />
              <button
                className="w-full h-10 rounded-md bg-[#011a3d] text-white disabled:opacity-60 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#011a3d] focus:ring-offset-white dark:focus:ring-offset-neutral-950"
                disabled={busy || code.length !== 6}
                onClick={verifyAndSignIn}
              >
                {busy ? "Doğrulanıyor..." : "Giriş yap"}
              </button>

              <div className="flex items-center justify-between mt-2">
                <button
                  className="h-10 px-3 rounded-md border text-[#011a3d] border-[#011a3d] dark:text-white dark:border-white hover:bg-[#011a3d]/5 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#011a3d]"
                  onClick={() => setStep(1)}
                >
                  E-postayı değiştir
                </button>
                <button
                  className="h-10 px-3 rounded-md border text-[#011a3d] border-[#011a3d] dark:text-white dark:border-white hover:bg-[#011a3d]/5 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#011a3d]"
                  disabled={cooldown > 0}
                  onClick={requestCode}
                  title={cooldown > 0 ? `${cooldown}s` : "Kodu yeniden gönder"}
                >
                  {cooldown > 0 ? `Tekrar: ${cooldown}s` : "Kodu yeniden gönder"}
                </button>
              </div>

              {err && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{err}</p>}
            </>
          )}

          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-6 text-center">
            Markan RateStuff’ta gösterilsin mi?{" "}
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); setOpenLearnMore(true); }}
              className="text-[#011a3d] dark:text-white font-medium hover:underline"
            >
              Daha fazla bilgi al
            </a>
          </p>
        </div>
      </div>
      <LearnMoreModal
        open={openLearnMore}
        onClose={() => setOpenLearnMore(false)}
      />
    </div>
  );
}