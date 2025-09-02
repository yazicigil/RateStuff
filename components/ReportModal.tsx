// components/ReportModal.tsx
'use client';
import { useEffect } from 'react';

type ReportModalProps = {
  open: boolean;
  presets: readonly string[];
  preset: string;
  details: string;
  submitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: () => void;
  onSelectPreset: (v: string) => void;
  onChangeDetails: (v: string) => void;
};

export default function ReportModal({
  open,
  presets,
  preset,
  details,
  submitting = false,
  error = null,
  onClose,
  onSubmit,
  onSelectPreset,
  onChangeDetails,
}: ReportModalProps) {
  // Escape ile kapat
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const isOther = preset === 'Diğer';

  return (
    <div className="fixed inset-0 z-[200]">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/30 dark:bg-black/50"
        onClick={onClose}
      />
      {/* modal */}
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-md rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-xl">
          <div className="px-5 pt-4 pb-3 border-b dark:border-gray-800 flex items-center justify-between">
            <h3 className="text-base font-semibold">Rapor et</h3>
            <button
              className="w-8 h-8 grid place-items-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={onClose}
              aria-label="Kapat"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <div className="px-5 py-4 space-y-3">
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
            )}

            <label className="block text-sm font-medium">Rapor sebebi</label>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Rapor sebebi">
              {presets.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onSelectPreset(opt)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    preset === opt
                      ? 'bg-red-600 border-red-600 text-white'
                      : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            {/* Details textarea */}
            {isOther ? (
              <div className="mt-1">
                <label className="block text-sm opacity-80 mb-1">Sebebi yaz</label>
                <textarea
                  value={details}
                  onChange={(e) => onChangeDetails(e.target.value)}
                  rows={4}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 dark:bg-gray-800 dark:border-gray-700"
                  placeholder="Kısaca açıklayın…"
                />
              </div>
            ) : (
              <div className="mt-1">
                <label className="block text-sm opacity-80 mb-1">
                  Ek not <span className="opacity-60">(opsiyonel)</span>
                </label>
                <textarea
                  value={details}
                  onChange={(e) => onChangeDetails(e.target.value)}
                  rows={3}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 dark:bg-gray-800 dark:border-gray-700"
                  placeholder="İstersen kısa bir not bırak"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                className="px-3 py-2 rounded-lg text-sm border hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                onClick={onClose}
              >
                İptal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={onSubmit}
                className="px-3 py-2 rounded-lg text-sm bg-red-600 text-white disabled:opacity-60"
              >
                {submitting ? 'Gönderiliyor…' : 'Gönder'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}