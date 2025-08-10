'use client';
import { useRef, useState } from 'react';

type Props = {
  value: string | null;                 // mevcut imageUrl (varsa)
  onChange: (url: string | null) => void;
  className?: string;
};

export default function ImageUploader({ value, onChange, className }: Props) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setErr(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErr('Sadece görsel yükleyin'); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErr('Maksimum 5MB'); return;
    }

    const fd = new FormData();
    fd.append('file', file);

    setUploading(true);
    try {
      const r = await fetch('/api/upload', { method: 'POST', body: fd });
      const j = await r.json();
      if (j.ok) onChange(j.url);
      else setErr(j.error || 'Yükleme hatası');
    } catch (e:any) {
      setErr(e?.message || 'Yükleme hatası');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        {value ? (
          <img src={value} alt="preview" className="w-16 h-16 rounded object-cover border" />
        ) : (
          <div className="w-16 h-16 rounded border grid place-items-center text-xs opacity-60">
            no img
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="px-3 py-2 rounded-xl border text-sm"
            disabled={uploading}
          >
            {uploading ? 'Yükleniyor…' : 'Dosya seç'}
          </button>
          {value && (
            <button
              type="button"
              className="px-3 py-2 rounded-xl border text-sm"
              onClick={() => onChange(null)}
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
          e.currentTarget.value = ''; // aynı dosyayı tekrar seçebil
        }}
      />
    </div>
  );
}
