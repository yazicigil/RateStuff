'use client';
import React from 'react';

type ReachUsModalProps = {
  open: boolean;
  onClose: () => void;
};

type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
  honey?: string; // honeypot
};

const initialState: FormState = {
  name: '',
  email: '',
  subject: '',
  message: '',
  honey: '',
};

export default function ReachUsModal({ open, onClose }: ReachUsModalProps) {
  const [form, setForm] = React.useState<FormState>(initialState);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  // Close on ESC
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const update = (patch: Partial<FormState>) =>
    setForm((f) => ({ ...f, ...patch }));

  const validEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim());
  const canSend =
    !!form.name.trim() && validEmail(form.email) && !!form.message.trim() && !sending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canSend) return;
    if (form.honey && form.honey.trim().length > 0) {
      // bot
      return;
    }
    try {
      setSending(true);
      // Backend endpoint expected to relay the message to mehmetcan@ratestuff.net
      const res = await fetch('/api/reach-us', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          subject: form.subject.trim(),
          message: form.message.trim(),
          to: 'mehmetcan@ratestuff.net',
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Mesaj gönderilemedi.');
      }
      setDone(true);
      setForm(initialState);
    } catch (err: any) {
      setError(err?.message || 'Bilinmeyen bir hata oluştu.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reachus-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative z-10 w-[92vw] max-w-lg rounded-2xl border border-white/10 bg-white p-5 shadow-xl dark:bg-gray-900 dark:border-gray-800">
        <div className="flex items-start justify-between gap-3">
          <h2 id="reachus-title" className="text-lg font-semibold">
            Bize ulaş
          </h2>
          <button
            type="button"
            className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 grid place-items-center"
            onClick={onClose}
            aria-label="Kapat"
          >
            ×
          </button>
        </div>

        {done ? (
          <div className="mt-3 rounded-xl border border-emerald-300/50 bg-emerald-50 px-3 py-2 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-100 dark:border-emerald-700/60">
            Mesajın alındı! En kısa sürede dönüş yapacağız.
            <div className="mt-3 text-right">
              <button
                type="button"
                className="inline-flex h-9 items-center rounded-full bg-emerald-600 px-3 text-sm font-medium text-white hover:brightness-110"
                onClick={() => {
                  setDone(false);
                  onClose();
                }}
              >
                Tamam
              </button>
            </div>
          </div>
        ) : (
          <form className="mt-3 space-y-3" onSubmit={onSubmit} noValidate>
            {/* honeypot */}
            <input
              type="text"
              value={form.honey}
              onChange={(e) => update({ honey: e.target.value })}
              className="absolute left-[-9999px] top-auto opacity-0"
              tabIndex={-1}
              aria-hidden="true"
              autoComplete="off"
            />

            <div>
              <label className="mb-1 block text-sm font-medium">İsim *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-700 dark:bg-transparent"
                placeholder="Adınız Soyadınız"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">E‑posta *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => update({ email: e.target.value })}
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 invalid:border-red-500 dark:border-gray-700 dark:bg-transparent"
                placeholder="ornek@eposta.com"
              />
              {!validEmail(form.email) && form.email.length > 0 && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">Geçerli bir e‑posta girin.</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Konu <span className="opacity-60">(opsiyonel)</span>
              </label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => update({ subject: e.target.value })}
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-700 dark:bg-transparent"
                placeholder="Konu"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Mesajınız *</label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={(e) => update({ message: e.target.value })}
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-700 dark:bg-transparent"
                placeholder="Bize yazmak istediğiniz şeyler…"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-100 dark:border-red-700/60">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                className="h-9 rounded-full border px-3 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                onClick={onClose}
                disabled={sending}
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={!canSend}
                className="inline-flex h-9 items-center rounded-full bg-purple-600 px-4 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
              >
                {sending ? 'Gönderiliyor…' : 'Gönder'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
