'use client';
import { useState } from "react";
import Link from "next/link";

export default function NewItemPage() {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [tags, setTags] = useState('');
  const [rating, setRating] = useState<number | ''>('');
  const [comment, setComment] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: desc, tagsCsv: tags, rating: rating || 0, comment, imageUrl })
    });
    const json = await res.json();
    setSaving(false);
    if (json.ok) {
      window.location.href = "/";
    } else {
      alert("Hata: " + json.error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Yeni Item</h1>
        <Link className="btn" href="/">Geri</Link>
      </div>
      <form onSubmit={submit} className="card space-y-3 max-w-2xl">
        <input className="input w-full" placeholder="Adı *" value={name} onChange={e=>setName(e.target.value)} required />
        <textarea className="input w-full min-h-28" placeholder="Açıklama *" value={desc} onChange={e=>setDesc(e.target.value)} required />
        <input className="input w-full" placeholder="Etiketler (virgüllü) *" value={tags} onChange={e=>setTags(e.target.value)} required />
        <input className="input w-full" placeholder="Resim URL (opsiyonel)" value={imageUrl} onChange={e=>setImageUrl(e.target.value)} />
        <input className="input w-full" type="number" min={1} max={5} placeholder="Puan (1-5) *"
          value={rating} onChange={e=>setRating(e.target.value ? parseInt(e.target.value,10) : '')} required />
        <textarea className="input w-full min-h-20" placeholder="İlk yorum *" value={comment} onChange={e=>setComment(e.target.value)} required />
        <button className="btn" type="submit" disabled={saving}>{saving ? "Kaydediliyor…" : "Kaydet"}</button>
      </form>
      <div className="text-sm opacity-70">
        Not: Şimdilik resim **URL** ile ekleniyor. Bir sonraki adımda dosya yüklemeyi (R2/S3) açacağız.
      </div>
    </div>
  );
}
