'use client';
import { useRef, useState, useMemo } from 'react';

type Uploaded = { url: string; width?: number; height?: number; blurDataUrl?: string };
type Props = {
  /** Form submit’te alan adı (hidden input üretir) */
  name?: string;
  /** Kontrollü kullanım için tekil değer */
  value?: string | null;
  /** Kontrollü kullanım için tekil değişim bildirimi */
  onChange?: (url: string | null) => void;
  /** Çoklu kullanım için callback: yüklenen dosyaların URL listesi */
  onUploaded?: (files: Uploaded[]) => void;
  /** Kontrollüsüz başlangıç tekil değer */
  defaultValue?: string | null;
  /** Maks dosya boyutu (MB) – varsayılan 5 */
  maxSizeMB?: number;
  /** Çoklu dosya yükleme modu */
  multiple?: boolean;
  /** Çoklu modda en fazla kaç dosya seçilebilir/yüklenebilir */
  maxFiles?: number;
  /** accept attribute – "image/*" veya input'un kabul edeceği mime/uzantılar */
  accept?: Record<string, string[]> | string;
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

function normalizeAccept(accept?: Record<string, string[]> | string) {
  if (!accept) return 'image/*';
  if (typeof accept === 'string') return accept;
  const parts: string[] = [];
  for (const [mime, exts] of Object.entries(accept)) {
    parts.push(mime);
    if (Array.isArray(exts)) parts.push(...exts);
  }
  return parts.join(',');
}

export default function ImageUploader({
  name,
  value,
  onChange,
  onUploaded,
  defaultValue = null,
  maxSizeMB = 5,
  multiple = false,
  maxFiles,
  accept,
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

  const acceptStr = normalizeAccept(accept);
  const effectiveMaxFiles = typeof maxFiles === 'number' && maxFiles > 0 ? maxFiles : 100;

  function prevent(e: React.DragEvent) { e.preventDefault(); e.stopPropagation(); }

  async function handleDrop(e: React.DragEvent) {
    prevent(e);
    setDragOver(false);
    const dt = e.dataTransfer;
    if (!dt) return;
    const files = Array.from(dt.files || []);
    if (!files.length) return;
    await handleFiles(files);
  }

  async function handleFiles(files: File[]) {
    const picked = files.slice(0, effectiveMaxFiles);
    if (multiple) {
      const results: Uploaded[] = [];
      for (const f of picked) {
        const r = await uploadSingle(f);
        if (r) results.push(r);
      }
      if (results.length && onUploaded) onUploaded(results);
    } else if (picked[0]) {
      const r = await uploadSingle(picked[0]);
      if (r) {
        if (isControlled) onChange?.(r.url); else setInnerUrl(r.url);
      }
    }
  }

  async function uploadSingle(file: File): Promise<Uploaded | null> {
    setErr(null);
    if (!file.type.startsWith('image/')) { setErr('Sadece görsel yükleyin'); return null; }
    const max = maxSizeMB * 1024 * 1024;
    if (file.size > max) { setErr(`Maksimum ${maxSizeMB} MB`); return null; }

    let toSend = file;
    try { toSend = await downscaleIfNeeded(file, 1600); } catch { toSend = file; }

    const fd = new FormData();
    fd.append('file', toSend);

    setUploading(true);
    try {
      const r = await fetch('/api/upload', { method: 'POST', body: fd });
      const j = await r.json().catch(() => null);
      if (j?.ok && j?.url) {
        const out: Uploaded = { url: j.url, width: j.width, height: j.height, blurDataUrl: j.blurDataUrl };
        return out;
      } else {
        setErr(j?.error || 'Yükleme hatası');
        return null;
      }
    } catch (e: any) {
      setErr(e?.message || 'Yükleme hatası');
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function handleFile(file: File) {
    await handleFiles([file]);
  }

  function clearImage() {
    if (isControlled) onChange?.(null);
    else setInnerUrl(null);
  }

  return (
    <div className={className}>
      {/* Form submit’i için gizli input (name verilirse) */}
      {name ? <input type="hidden" name={name} value={url ?? ''} /> : null}

      <div className="relative">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={`w-full h-36 md:h-44 rounded-xl border transition-colors px-3 py-3 text-left ${
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

          <div className="flex items-center gap-4">
            {/* PREVIEW sütunu: kare, kutudan biraz küçük */}
            <div className="shrink-0">
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-lg overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                <img
                  src={url || '/default-item.svg'}
                  alt="Önizleme"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>

            {/* METİN sütunu */}
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold">
                {uploading ? (
                  'Yükleniyor…'
                ) : (
                  <>
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-md border text-sm font-medium bg-white/70 dark:bg-gray-800/70 border-gray-300 dark:border-gray-600 shadow-sm select-none pointer-events-none"
                      aria-hidden="true"
                    >
                      {multiple ? 'Dosyaları seç' : 'Dosya seç'}
                    </span>
                    <span className="ml-1 text-sm opacity-80">veya sürükleyip bırak</span>
                  </>
                )}
              </div>
              
            </div>
          </div>
        </button>

        {url && (
          <button
            type="button"
            className="mt-2 px-3 py-2 rounded-lg border text-sm dark:border-gray-700"
            onClick={clearImage}
            disabled={uploading}
          >
            Kaldır
          </button>
        )}
      </div>

      {err && <div className="mt-2 text-xs text-red-600">{err}</div>}

      <input
        ref={fileRef}
        type="file"
        accept={acceptStr}
        hidden
        multiple={multiple}
        onChange={async (e) => {
          const files = Array.from(e.target.files || []).slice(0, effectiveMaxFiles);
          if (files.length) await handleFiles(files);
          e.currentTarget.value = '';
        }}
      />
    </div>
  );
}
