// lib/blob.ts
import { del } from '@vercel/blob';

export function isVercelBlobUrl(url?: string | null): url is string {
  if (!url) return false;
  try {
    const u = new URL(url);
    // vercel blob hostları: *.public.blob.vercel-storage.com veya blob.vercel-storage.com
    return u.hostname.endsWith('blob.vercel-storage.com');
  } catch { return false; }
}

/** Hata yutmalı güvenli silme */
export async function deleteBlobIfVercel(url?: string | null) {
  if (!isVercelBlobUrl(url)) return;
  try {
    await del(url); // URL ile direkt siler
  } catch (e) {
    console.warn('Blob delete failed:', e);
  }
}