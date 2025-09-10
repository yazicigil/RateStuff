'use client';
import React, { useCallback, useMemo, useState } from 'react';
import ImageUploader from '@/components/common/ImageUploader';

export type ItemEditorValue = {
  imageUrl: string;
  description: string;
  tags: string[];        // lower-case, uniq
  productUrl?: string;   // "" | undefined -> yok
};

type ItemEditorProps = {
  /** Başlangıç değerleri (uncontrolled başlangıç) */
  initial: ItemEditorValue;
  /** Brand ise ürün linki inputu gösterilir */
  isBrand: boolean;
  /** Sınırlar */
  maxTags?: number;      // default: 3
  maxDesc?: number;      // default: 140
  /** Dış durumlar */
  saving?: boolean;
  error?: string | null;
  /** Controlled kullanım için (opsiyonel) */
  value?: ItemEditorValue;
  onChange?: (v: ItemEditorValue) => void;
  /** Aksiyonlar */
  onSave: (v: ItemEditorValue) => Promise<void> | void;
  onCancel: () => void;
  /** Opsiyonel başlık (kart başlığı) */
  title?: string;
};

function useMaybeControlled<T>(controlled: T | undefined, initial: T) {
  const [inner, setInner] = useState<T>(initial);
  const isCtrl = typeof controlled !== 'undefined';
  return {
    value: (isCtrl ? controlled : inner) as T,
    setValue: (updater: React.SetStateAction<T>) => {
      if (isCtrl) throw new Error('setValue should not be used in controlled mode');
      setInner(updater);
    },
    isControlled: isCtrl,
  };
}

const isValidUrl = (u: string) => /^https?:\/\//i.test(u);

function normalizeTag(s: string) {
  return s.trim().replace(/^#+/, '').toLowerCase();
}

export default function ItemEditor({
  initial,
  isBrand,
  maxTags = 3,
  maxDesc = 140,
  saving,
  error,
  value,
  onChange,
  onSave,
  onCancel,
  title,
}: ItemEditorProps) {
  // state (controlled/uncontrolled)
  const { value: state, setValue, isControlled } = useMaybeControlled<ItemEditorValue>(value, initial);
  const [tagEditInput, setTagEditInput] = useState('');

  const tags = state.tags ?? [];

  const setState = useCallback((updater: Partial<ItemEditorValue>) => {
    const next = { ...state, ...updater };
    if (onChange) onChange(next);
    if (!isControlled) setValue(next);
  }, [state, onChange, isControlled, setValue]);

  const addTagsFromInput = useCallback((src?: string) => {
    const raw = typeof src === 'string' ? src : tagEditInput;
    const parts = raw
      ?.replace(/\uFF0C/g, ',')
      .split(/[,\n]+/)
      .map(normalizeTag)
      .filter(Boolean) ?? [];

    if (!parts.length) return;
    const set = new Set(tags);
    for (const p of parts) {
      if (set.size >= maxTags) break;
      set.add(p);
    }
    setState({ tags: Array.from(set).slice(0, maxTags) });
    setTagEditInput('');
  }, [tagEditInput, tags, maxTags, setState]);

  const removeTag = useCallback((t: string) => {
    setState({ tags: tags.filter(x => x !== t) });
  }, [tags, setState]);

  const handleTagKey = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTagsFromInput(tagEditInput);
    } else if (e.key === 'Backspace' && tagEditInput.trim() === '' && tags.length > 0) {
      e.preventDefault();
      setState({ tags: tags.slice(0, -1) });
    } else if (e.key === 'Escape') {
      setTagEditInput('');
    }
  }, [tagEditInput, tags, setState, addTagsFromInput]);

  const productUrlInvalid = useMemo(() => {
    const u = state.productUrl?.trim();
    if (!u) return false;
    return !isValidUrl(u);
  }, [state.productUrl]);

  return (
    <>
      {title && (
        <h3
          className="title-wrap text-[15px] md:text-[16px] font-semibold leading-snug tracking-tight mb-1"
          title={title}
          lang="tr"
        >
          {title}
        </h3>
      )}
      {/* Image */}
      <div className="mb-3">
        <ImageUploader
          {...({} as any)}
          value={state.imageUrl}
          onChange={(url: string) => setState({ imageUrl: url })}
          className="w-full"
        />
      </div>

      {/* Title dışarıdan gelir; burada sadece açıklama vs. */}

      {/* Description */}
      <div className="mt-2">
        <label className="block text-sm font-medium mb-1">Kısa açıklama</label>
        <textarea
          className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-transparent dark:bg-transparent dark:border-gray-700 dark:text-gray-100"
          rows={3}
          maxLength={maxDesc}
          value={state.description}
          onChange={(e) => setState({ description: e.target.value })}
          placeholder="kısa açıklama"
        />
        <div className="mt-1 text-[11px] opacity-60">{state.description.length}/{maxDesc}</div>
      </div>

      {/* Product URL */}
      {isBrand && (
        <div className="mt-3">
          <label className="block text-sm font-medium mb-1">
            Ürün linki <span className="opacity-60">(opsiyonel)</span>
          </label>
          <input
            value={state.productUrl ?? ''}
            onChange={(e) => setState({ productUrl: e.target.value })}
            className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none bg-transparent dark:bg-transparent dark:border-gray-700 dark:text-gray-100 ${
              state.productUrl && productUrlInvalid
                ? 'border-red-500 focus:ring-red-500 dark:border-red-600'
                : 'focus:ring-2 focus:ring-emerald-400'
            }`}
            placeholder="https://…"
            inputMode="url"
          />
          {state.productUrl && productUrlInvalid && (
            <div className="mt-1 text-xs text-red-600 dark:text-red-400">Lütfen http(s) ile başlayan geçerli bir URL gir.</div>
          )}
        </div>
      )}

      {/* Tags */}
      <div className="mt-3">
        <label className="block text-sm font-medium mb-1">Etiketler <span className="opacity-60">(en fazla {maxTags})</span></label>
        <div className="relative border rounded-xl px-2 py-1.5 flex flex-wrap gap-1 focus-within:ring-2 focus-within:ring-emerald-400 dark:bg-gray-800 dark:border-gray-700">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600">
              #{t}
              <button
                type="button"
                className="ml-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
                onClick={() => removeTag(t)}
                aria-label={`#${t} etiketini kaldır`}
              >
                ×
              </button>
            </span>
          ))}
          <input
            value={tagEditInput}
            onChange={(e) => {
              const v = e.target.value;
              setTagEditInput(v);
              if (/[,\n\uFF0C]/.test(v) && tags.length < maxTags) {
                addTagsFromInput(v);
              }
            }}
            onKeyDown={handleTagKey}
            className="flex-1 min-w-[120px] px-2 py-1 text-sm bg-transparent outline-none"
            placeholder={tags.length ? '' : 'kahve, ekipman'}
          />
        </div>
      </div>

      {/* Error */}
      {error && <div className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</div>}

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2 justify-end">
        <button
          type="button"
          className="px-3 h-8 rounded-full border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
          onClick={onCancel}
        >
          İptal
        </button>
        <button
          type="button"
          disabled={!!productUrlInvalid || !!saving}
          className="px-3 h-8 rounded-full bg-emerald-600 text-white disabled:opacity-60"
          onClick={() => onSave({
            imageUrl: state.imageUrl,
            description: state.description,
            tags: state.tags.slice(0, maxTags),
            productUrl: (state.productUrl ?? '').trim(),
          })}
        >
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </>
  );
}