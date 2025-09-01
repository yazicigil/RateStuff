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

// Bazı formatlar (HEIC/HEIF) tarayıcıda decode edilemeyebilir.
// Bu durumda client-side küçültme atlanır, sunucu optimize eder.
function canCanvasDecode(type: string) {
  return /image\/(png|jpe?g|webp|gif|avif)/i.test(type);
}

async function downscaleIfNeeded(file: File, maxW = 1600): Promise<File> {
  if (!canCanvasDecode(file.type)) return file;

  const img = document.createElement('img');
  img.decoding = 'async';
  img.loading = 'eager';
  img.src = URL.createObjectURL(file);
  await new Promise((res, rej) => {
    img.onload = () => res(null);
    img.onerror = () => rej(new Error('decode-failed'));
  });

  const scale = Math.min(1, maxW / (img.naturalWidth || maxW));
  if (scale === 1) {
    URL.revokeObjectURL(img.src);
    return file;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round((img.naturalWidth || maxW) * scale);
  canvas.height = Math.round((img.naturalHeight || maxW) * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob(
      (b) => (b ? res(b) : rej(new Error('toBlob-failed'))),
      'image/jpeg',
      0.82
    )
  );

  URL.revokeObjectURL(img.src);
  const name = file.name.replace(/\.\w+$/, '') + '.jpg';
  return new File([blob], name, { type: 'image/jpeg' });
}

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

  const [dragOver, setDragOver] = useState(false);
  function prevent(e: React.DragEvent) { e.preventDefault(); e.stopPropagation(); }
  async function handleDrop(e: React.DragEvent) {
    prevent(e);
    setDragOver(false);
    const dt = e.dataTransfer;
    if (!dt) return;
    const file = dt.files?.[0];
    if (file) {
      await handleFile(file);
    }
  }

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

    // İstemci tarafı downscale (opsiyonel hızlandırma)
    let toSend = file;
    try {
      toSend = await downscaleIfNeeded(file, 1600);
    } catch {
      // sessizce geç: sunucu optimize edecek
      toSend = file;
    }

    const fd = new FormData();
    fd.append('file', toSend);

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

      <div
        className={`relative flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 rounded-xl p-3 border transition-colors min-w-0 ${dragOver ? 'border-emerald-400 ring-2 ring-emerald-300/60 bg-emerald-50/40 dark:bg-emerald-900/20' : 'border-dashed border-gray-300 dark:border-gray-700'}`}
        onDragEnter={(e) => { prevent(e); setDragOver(true); }}
        onDragOver={(e) => { prevent(e); if (!dragOver) setDragOver(true); }}
        onDragLeave={(e) => { prevent(e); setDragOver(false); }}
        onDrop={handleDrop}
        aria-label="Görseli buraya sürükleyip bırak veya dosya seç"
      >
        {/* Drag overlay hint */}
        {dragOver && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-xl text-sm font-medium bg-white/90 dark:bg-gray-900/90">
            Bırak, yükleyelim ✨
          </div>
        )}
        {/* Preview */}
        <div className="shrink-0">
          {url ? (
            <img
              src={url}
              alt="preview"
              className="w-24 h-24 md:w-28 md:h-28 rounded object-cover border dark:border-gray-700"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <img
              src="/default-item.svg"
              alt="default item"
              className="w-24 h-24 md:w-28 md:h-28 rounded object-contain border dark:border-gray-700 opacity-70"
              loading="lazy"
              decoding="async"
            />
          )}
        </div>
        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-1 min-w-0">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="px-3 py-2 rounded-xl border text-sm dark:border-gray-700 shrink-0"
            disabled={uploading}
          >
            {uploading ? 'Yükleniyor…' : 'Dosya seç'}
          </button>
          {url && (
            <button
              type="button"
              className="px-3 py-2 rounded-xl border text-sm dark:border-gray-700 shrink-0"
              onClick={clearImage}
              disabled={uploading}
            >
              Kaldır
            </button>
          )}
          <span className="text-xs opacity-60 hidden md:inline whitespace-nowrap">veya sürükleyip bırak</span>
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
