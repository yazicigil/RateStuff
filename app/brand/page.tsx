"use client";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";

export default function BrandLoginPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

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
      await signIn("brand-otp", {
        email, nonce: data.nonce,
        redirect: true, callbackUrl: "/",
      });
    } catch {
      setErr("Giriş başarısız. Tekrar deneyin.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Sol görsel */}
      <div className="hidden md:flex w-1/2 relative">
        <Image
          src="/brand.jpg"
          alt="Brand visual"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Sağ taraf: logo + form */}
      <div className="flex w-full md:w-1/2 flex-col items-center justify-center p-6 md:p-8">
        <Image
          src="/forbrandslogo.svg"
          alt="RateStuff for Brands"
          width={220}
          height={44}
          className="mb-8"
          priority
        />

        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold mb-6">Marka hesabınla giriş yap</h1>

          {step === 1 && (
            <>
              <label className="text-sm">Email</label>
              <input
                className="w-full mt-1 mb-3 px-3 py-2 rounded-md border bg-white dark:bg-neutral-900 dark:border-neutral-800"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="ornek@marka.com"
              />

              <div className="flex items-center gap-2 mb-3 text-xs text-neutral-500">
                <input type="checkbox" disabled className="h-4 w-8 rounded-full appearance-none bg-neutral-200" />
                Beni hatırla
              </div>

              <button
                className="w-full h-10 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 disabled:opacity-60"
                disabled={busy || !email}
                onClick={requestCode}
              >
                {busy ? "Gönderiliyor..." : "Giriş yap"}
              </button>

              <p className="text-xs text-neutral-500 mt-6 text-center">
                Markan RateStuff’ta gösterilsin mi?{" "}
                <Link href="#" className="text-emerald-600 font-medium">Kaydol</Link>
              </p>

              {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
            </>
          )}

          {step === 2 && (
            <>
              <label className="text-sm">6 haneli kod</label>
              <input
                className="w-full mt-1 mb-3 px-3 py-2 rounded-md border tracking-widest text-center bg-white dark:bg-neutral-900 dark:border-neutral-800"
                inputMode="numeric" maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="------"
              />
              <button
                className="w-full h-10 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 disabled:opacity-60"
                disabled={busy || code.length !== 6}
                onClick={verifyAndSignIn}
              >
                {busy ? "Doğrulanıyor..." : "Giriş yap"}
              </button>

              <div className="flex items-center justify-between mt-2">
                <button
                  className="h-10 px-3 rounded-md border dark:border-neutral-800"
                  onClick={() => setStep(1)}
                >
                  E-postayı değiştir
                </button>
                <button
                  className="h-10 px-3 rounded-md border disabled:opacity-60 dark:border-neutral-800"
                  disabled={cooldown > 0}
                  onClick={requestCode}
                  title={cooldown > 0 ? `${cooldown}s` : "Kodu yeniden gönder"}
                >
                  {cooldown > 0 ? `Tekrar: ${cooldown}s` : "Kodu yeniden gönder"}
                </button>
              </div>

              {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}