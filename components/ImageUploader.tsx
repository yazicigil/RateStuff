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
      setErr('Sadece görsel yükleyebilirsiniz');
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
        setErr(j?.error || 'Yükleme başarısız');
      }
    } catch (e: any) {
      setErr(e?.message || 'Yükleme başarısız');
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

      <div className="flex items-stretch gap-3 sm:gap-4">
        {/* Preview (left, outside dashed area) */}
        <div className="shrink-0">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-lg border bg-white dark:bg-gray-900 dark:border-gray-700 overflow-hidden grid place-items-center">
            {url ? (
              <img
                src={url}
                alt="preview"
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <img
                src="/default-item.svg"
                alt="default item"
                className="w-14 h-14 opacity-60"
                loading="lazy"
                decoding="async"
              />
            )}
          </div>
          {url && (
            <button
              type="button"
              className="mt-2 w-full px-3 py-2 rounded-lg border text-sm dark:border-gray-700"
              onClick={clearImage}
              disabled={uploading}
            >
              Kaldır
            </button>
          )}
        </div>

        {/* Dashed dropzone (right) */}
        <div className="relative flex-1 min-w-0">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={`w-full h-32 md:h-40 rounded-xl border transition-colors grid place-items-center text-center px-4 ${
              dragOver
                ? 'border-emerald-400 ring-2 ring-emerald-300/60 bg-emerald-50/40 dark:bg-emerald-900/20'
                : 'border-dashed border-gray-300 dark:border-gray-700 hover:bg-gray-50/40 dark:hover:bg-gray-800/30'
            }`}
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
            <div className="flex flex-col items-center">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 dark:border-gray-700 mb-2">
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden className="opacity-70">
                  <path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm0 0l5.5 6.5 3.5-4 6 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <div className="text-sm font-medium">{uploading ? 'Yükleniyor…' : 'Görseli buraya bırakın veya dosya seçin'}</div>
              <div className="text-xs opacity-60 mt-1">Maksimum boyut: {maxSizeMB}MB</div>
            </div>
          </button>
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
