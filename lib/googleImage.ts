// lib/googleImage.ts
export async function fetchFirstImageUrl(q: string): Promise<string | null> {
  const cx = process.env.NEXT_PUBLIC_GOOGLE_CSE_ID || process.env.GOOGLE_CSE_ID;
  const key = process.env.NEXT_PUBLIC_GOOGLE_CSE_KEY || process.env.GOOGLE_CSE_KEY;

  if (!cx || !key) return null;

  const params = new URLSearchParams({
    q,
    cx,
    key,
    searchType: 'image',
    num: '1',
    safe: 'active'
  });

  try {
    const r = await fetch(`https://customsearch.googleapis.com/customsearch/v1?${params.toString()}`, { cache: 'no-store' });
    const j: any = await r.json().catch(() => null);
    const link = j?.items?.[0]?.link;
    if (typeof link === 'string' && link.startsWith('http')) return link;
  } catch {}
  return null;
}