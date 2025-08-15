// app/api/seed/image/route.ts
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const debug = searchParams.get('debug') === '1';

  const cx = process.env.GOOGLE_CSE_ID || process.env.NEXT_PUBLIC_GOOGLE_CSE_ID;
  const key = process.env.GOOGLE_CSE_KEY || process.env.NEXT_PUBLIC_GOOGLE_CSE_KEY;

  if (!q) {
    return NextResponse.json({ url: null, error: 'missing_query' }, { status: 200 });
  }

  if (!cx || !key) {
    return NextResponse.json(
      { url: null, error: 'missing_env', debug: debug ? { hasCx: !!cx, hasKey: !!key } : undefined },
      { status: 200 }
    );
  }

  const params = new URLSearchParams({
    q,
    cx,
    key,
    searchType: 'image',
    num: '1',
    safe: 'active'
  });

  try {
    const resp = await fetch(`https://customsearch.googleapis.com/customsearch/v1?${params.toString()}`, { cache: 'no-store' });
    const status = resp.status;
    const json: any = await resp.json().catch(() => null);
    const url = json?.items?.[0]?.link ?? null;

    return NextResponse.json(
      debug
        ? { url, status, error: json?.error, queries: json?.queries, searchInformation: json?.searchInformation }
        : { url },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { url: null, error: 'fetch_failed', debug: debug ? { message: String(e?.message || e) } : undefined },
      { status: 200 }
    );
  }
}