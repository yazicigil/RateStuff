"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type LearnMoreFormData = {
  brandName: string;
  category: string;
  customCategory?: string;
  contact?: string; // social link or website
  about?: string;
  email: string;
};

type LearnMoreProps = {
  /** Modal open/close controlled from parent */
  open: boolean;
  /** Called when the modal requests to close (backdrop click / Esc / after success) */
  onClose: () => void;
  /**
   * Optional custom submit handler. If provided, it's responsible for sending the email.
   * Should throw on error. If not provided, component will POST to `/api/brand/learn-more`
   * with the form data as JSON and expect `{ ok: true }` on success.
   */
  onSubmit?: (data: LearnMoreFormData) => Promise<void>;
  /** Optional className to customize wrapper if needed */
  className?: string;
};

const CATEGORIES = [
  "Tekstil",
  "Gıda",
  "Teknoloji",
  "Kozmetik",
  "Eğlence",
  "Diğer",
];

export default function LearnMoreModal({
  open,
  onClose,
  onSubmit,
  className = "",
}: LearnMoreProps) {
  const [data, setData] = useState<LearnMoreFormData>({
    brandName: "",
    category: "",
    customCategory: "",
    contact: "",
    about: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<keyof LearnMoreFormData, boolean>>({
    brandName: false,
    category: false,
    customCategory: false as any,
    contact: false as any,
    about: false as any,
    email: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setSuccess(false);
      // lock scroll
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.documentElement.style.overflow = "";
      };
    }
  }, [open]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Basic validators
  const emailValid = useMemo(() => {
    if (!data.email) return false;
    // simple but effective
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);
  }, [data.email]);

  const brandValid = data.brandName.trim().length >= 2;
  const categoryIsOther = (data.category || "").toLowerCase() === "diğer";
  const categoryValid = data.category !== "" && (!categoryIsOther || (data.customCategory || "").trim().length >= 2);

  const formValid = emailValid && brandValid && categoryValid;

  const setField = <K extends keyof LearnMoreFormData>(key: K, value: LearnMoreFormData[K]) => {
    setData((d) => ({ ...d, [key]: value }));
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const defaultSubmit = async (payload: LearnMoreFormData) => {
    // Fallback POST. Backend should forward mail to brand@ratestuff.net.
    const res = await fetch("/api/brand/learn-more", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || "İstek başarısız oldu.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      brandName: true,
      category: true,
      customCategory: true as any,
      contact: true as any,
      about: true as any,
      email: true,
    });
    if (!formValid) {
      setError("Lütfen zorunlu alanları kontrol edin.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload: LearnMoreFormData = {
        brandName: data.brandName.trim(),
        category: categoryIsOther ? (data.customCategory || "").trim() : data.category,
        customCategory: categoryIsOther ? (data.customCategory || "").trim() : undefined,
        contact: (data.contact || "").trim() || undefined,
        about: (data.about || "").trim() || undefined,
        email: data.email.trim(),
      };
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        await defaultSubmit(payload);
      }
      setSuccess(true);
      // gentle delay then close
      setTimeout(() => {
        onClose();
        // reset form after close to keep success message visible briefly
        setData({
          brandName: "",
          category: "",
          customCategory: "",
          contact: "",
          about: "",
          email: "",
        });
        setTouched({
          brandName: false,
          category: false,
          customCategory: false as any,
          contact: false as any,
          about: false as any,
          email: false,
        });
        setSuccess(false);
      }, 1200);
    } catch (err: any) {
      setError(err?.message || "Bir şeyler ters gitti.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] ${className}`}
      onMouseDown={handleBackdropClick}
      aria-modal="true"
      role="dialog"
      aria-labelledby="learnmore-title"
      aria-describedby="learnmore-desc"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />

      {/* Panel */}
      <div
        ref={dialogRef}
        className="absolute left-1/2 top-1/2 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-black/10 bg-white p-0 shadow-2xl ring-1 ring-black/10 dark:border-white/10 dark:bg-[rgba(10,12,16,0.95)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 rounded-t-2xl px-6 py-5 border-b border-white/10">
          <div>
            <h2 id="learnmore-title" className="text-xl font-semibold tracking-tight">
              Bize markanızdan bahsedin
            </h2>
            <p id="learnmore-desc" className="mt-1 text-sm text-white/70">
            En kısa zamanda dönüş yapılacaktır.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="group inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 transition"
          >
            <span className="sr-only">Kapat</span>
            <svg viewBox="0 0 24 24" className="h-5 w-5 opacity-80 group-hover:opacity-100">
              <path fill="currentColor" d="M6.4 5l12.6 12.6-1.4 1.4L5 6.4 6.4 5zm12.6 1.4L6.4 19 5 17.6 17.6 5l1.4 1.4z"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5">
          {/* Brand Name */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium">Marka adı <span className="text-red-400">*</span></label>
            <input
              type="text"
              required
              value={data.brandName}
              onChange={(e) => setField("brandName", e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, brandName: true }))}
              placeholder="Örn: RASTUFF CO."
              className={inputCls(!brandValid && touched.brandName)}
            />
            {!brandValid && touched.brandName ? (
              <p className="mt-1 text-xs text-red-400">Lütfen en az 2 karakter girin.</p>
            ) : null}
          </div>

          {/* Category */}
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Kategori <span className="text-red-400">*</span></label>
              <select
                value={data.category}
                required
                onChange={(e) => setField("category", e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, category: true }))}
                className={inputCls(!categoryValid && touched.category)}
              >
                <option value="">Seçiniz…</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {!categoryValid && touched.category ? (
                <p className="mt-1 text-xs text-red-400">Lütfen bir kategori seçin.</p>
              ) : null}
            </div>

            {categoryIsOther ? (
              <div>
                <label className="mb-1.5 block text-sm font-medium">Diğer kategori</label>
                <input
                  type="text"
                  value={data.customCategory || ""}
                  onChange={(e) => setField("customCategory", e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, customCategory: true }))}
                  placeholder="Örn: Ev & Yaşam"
                  className={inputCls(((data.customCategory || "").trim().length < 2) && touched.customCategory)}
                />
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-sm font-medium">Sosyal medya / Web sitesi</label>
                <input
                  type="url"
                  inputMode="url"
                  value={data.contact || ""}
                  onChange={(e) => setField("contact", e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, contact: true }))}
                  placeholder="https://instagram.com/marka veya https://marka.com"
                  className={inputCls(false)}
                />
              </div>
            )}
          </div>

          {/* If category isn't Other, still show contact below in full width */}
          {categoryIsOther ? (
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium">Sosyal medya / Web sitesi</label>
              <input
                type="url"
                inputMode="url"
                value={data.contact || ""}
                onChange={(e) => setField("contact", e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, contact: true }))}
                placeholder="https://instagram.com/marka veya https://marka.com"
                className={inputCls(false)}
              />
            </div>
          ) : null}

          {/* About */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium">Markanızdan kısaca bahsedin</label>
            <textarea
              rows={4}
              value={data.about || ""}
              onChange={(e) => setField("about", e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, about: true }))}
              placeholder="Ürünleriniz, hedef kitleniz, öne çıkan özellikleriniz…"
              className={inputCls(false) + " resize-y"}
            />
          </div>

          {/* Email */}
          <div className="mb-2">
            <label className="mb-1.5 block text-sm font-medium">E‑posta adresi <span className="text-red-400">*</span></label>
            <input
              type="email"
              inputMode="email"
              required
              value={data.email}
              onChange={(e) => setField("email", e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              placeholder="sizin@marka.com"
              className={inputCls(!emailValid && touched.email)}
            />
            {!emailValid && touched.email ? (
              <p className="mt-1 text-xs text-red-400">Geçerli bir e‑posta girin.</p>
            ) : null}
          </div>

          {/* Footer */}
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
            <div className="text-sm text-white/60">
              {error ? <span className="text-red-400">{error}</span> : success ? <span className="text-green-400">Teşekkürler! Gönderildi.</span> : <span>&nbsp;</span>}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 items-center rounded-lg border border-white/15 bg-white/5 px-4 text-sm font-medium hover:bg-white/10 active:scale-95 transition"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={!formValid || loading}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-300/20 bg-emerald-500/90 px-4 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition"
              >
                {loading ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity=".3"/>
                    <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  </svg>
                ) : null}
                Gönder
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* enter animation */}
      <style jsx>{`
        .animate-fade-in {
          animation: fade-in 200ms ease-out forwards;
        }
        @keyframes fade-in {
          from { opacity: 0 }
          to { opacity: 1 }
        }
      `}</style>
    </div>
  );
}

function inputCls(invalid: boolean) {
  const base =
    "w-full rounded-lg border bg-white/5 px-3 py-2.5 text-sm outline-none transition placeholder:text-white/40 " +
    "focus:ring-2 focus:ring-white/20 focus:border-white/20 border-white/15";
  const err = invalid ? " border-red-400/40 ring-0 focus:ring-red-400/30 focus:border-red-400/50" : "";
  return base + err;
}
