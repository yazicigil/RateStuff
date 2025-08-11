'use client';
import { useRef, useState, useMemo } from 'react';

type Props = {
  /** Form submit’te alan adı (hidden input üretir) */
  name?: string;
  /** Kontrollü kullanım için değer */
  value?: string | null;
  /** Kontrollü kullanım için değişim bildirimi */
  onChange?: (url: string | null) => void;
  /** Kontrollüsüz başlangıç değeri */
  defaultValue?: string | null;
  /** Maks dosya boyutu (MB) – varsayılan 5 */
  maxSizeMB?: number;
  className?: string;
};

export default function ImageUploader({
  name,
  value,
  onChange,
  defaultValue = null,
  maxSizeMB = 5,
  className,
}: Props) {
  // Kontrollü mü? value prop’u varsa kontrollü kabul ediyoruz
  const isControlled = useMemo(() => value !== undefined, [value]);
  const [innerUrl, setInnerUrl] = useState<string | null>(defaultValue);
  const url = (isControlled ? value! : innerUrl) ?? null;

  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setErr(null);
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErr('Sadece görsel yükleyin');
      return;
    }
    const max = maxSizeMB * 1024 * 1024;
    if (file.size > max) {
      setErr(`Maksimum ${maxSizeMB} MB`);
      return;
    }

    const fd = new FormData();
    fd.append('file', file);

    setUploading(true);
    try {
      const r = await fetch('/api/upload', { method: 'POST', body: fd });
      const j = await r.json().catch(() => null);

      if (j?.ok && j?.url) {
        if (isControlled) onChange?.(j.url);
        else setInnerUrl(j.url);
      } else {
        setErr(j?.error || 'Yükleme hatası');
      }
    } catch (e: any) {
      setErr(e?.message || 'Yükleme hatası');
    } finally {
      setUploading(false);
    }
  }

  function clearImage() {
    if (isControlled) onChange?.(null);
    else setInnerUrl(null);
  }

  return (
    <div className={className}>
      {/* Form submit’i için gizli input (name verilirse) */}
      {name ? <input type="hidden" name={name} value={url ?? ''} /> : null}

      <div className="flex items-center gap-3">
        {url ? (
          <img
            src={url}
            alt="preview"
            className="w-16 h-16 rounded object-cover border dark:border-gray-700"
          />
        ) : (
          <div className="w-16 h-16 rounded border dark:border-gray-700 grid place-items-center text-xs opacity-60">
            no img
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="px-3 py-2 rounded-xl border text-sm dark:border-gray-700"
            disabled={uploading}
          >
            {uploading ? 'Yükleniyor…' : 'Dosya seç'}
          </button>

          {url && (
            <button
              type="button"
              className="px-3 py-2 rounded-xl border text-sm dark:border-gray-700"
              onClick={clearImage}
              disabled={uploading}
            >
              Kaldır
            </button>
          )}
        </div>
      </div>

      {err && <div className="mt-2 text-xs text-red-600">{err}</div>}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          // aynı dosyayı tekrar seçebilesin
          e.currentTarget.value = '';
        }}
      />
    </div>
  );
}
