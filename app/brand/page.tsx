"use client";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";

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
    <div className="max-w-sm mx-auto py-10">
      <h1 className="text-2xl font-semibold mb-4">Marka girişi</h1>

      {step === 1 && (
        <>
          <label className="text-sm">E-posta</label>
          <input
            className="w-full mt-1 mb-3 px-3 py-2 rounded border"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="ornek@marka.com"
          />
          <button
            className="w-full h-10 rounded bg-emerald-600 text-white disabled:opacity-60"
            disabled={busy || !email}
            onClick={requestCode}
          >
            {busy ? "Gönderiliyor..." : "Giriş kodu gönder"}
          </button>
          <p className="text-xs text-neutral-500 mt-2">
            Bu e-posta marka listemizde kayıtlı olmalı.
          </p>
          {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
        </>
      )}

      {step === 2 && (
        <>
          <label className="text-sm">6 haneli kod</label>
          <input
            className="w-full mt-1 mb-3 px-3 py-2 rounded border tracking-widest text-center"
            inputMode="numeric" maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="------"
          />
          <button
            className="w-full h-10 rounded bg-emerald-600 text-white disabled:opacity-60"
            disabled={busy || code.length !== 6}
            onClick={verifyAndSignIn}
          >
            {busy ? "Doğrulanıyor..." : "Giriş yap"}
          </button>

          <div className="flex items-center justify-between mt-2">
            <button
              className="h-10 px-3 rounded border"
              onClick={() => setStep(1)}
            >
              E-postayı değiştir
            </button>
            <button
              className="h-10 px-3 rounded border disabled:opacity-60"
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
  );
}