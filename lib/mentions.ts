// lib/mentions.ts
export type ParsedMention =
  | { brandId: string; display?: string }
  | { slug: string; display?: string };

const MENTION_MD = /@\[(.+?)\]\((?:brand:([a-z0-9]+))(?:\|slug:[^)]+)?\)/ig;
// Düz @slug (örn: @test-brand) — e-posta'yı yakalamamak için @ öncesinde word char olmasın
const AT_SLUG = /(^|[\s([{"'.,:;!?\-])@([a-z0-9][a-z0-9-]{1,30})(?=\b)/ig;

export function extractMentionsFromHtml(html: string): ParsedMention[] {
  const out: ParsedMention[] = [];
  // 1) data-mention-id
  const doc: Document | undefined = (globalThis as any).document as Document | undefined;
  if (doc && typeof doc.createElement === 'function') {
    const div = doc.createElement('div');
    div.innerHTML = html;
    const nodes = div.querySelectorAll('[data-mention-id]') as NodeListOf<HTMLElement>;
    nodes.forEach((el: HTMLElement) => {
      const id = el.getAttribute('data-mention-id') || '';
      const display = (el.textContent || '').trim();
      if (id) out.push({ brandId: id, display });
    });
  }
  // 2) markdown pattern fallback
  let m: RegExpExecArray | null;
  while ((m = MENTION_MD.exec(html)) !== null) {
    const display = (m[1] || '').trim();
    const brandId = (m[2] || '').trim();
    if (brandId) out.push({ brandId, display });
  }
  // 3) düz @slug
  let m2: RegExpExecArray | null;
  while ((m2 = AT_SLUG.exec(html)) !== null) {
    const slug = (m2[2] || '').toLowerCase();
    if (slug) out.push({ slug });
  }

  // uniq by brandId/slug
  const map = new Map<string, ParsedMention>();
  for (const x of out) {
    const key = (x as any).brandId ? `id:${(x as any).brandId}` : `slug:${(x as any).slug}`;
    if (!map.has(key)) map.set(key, x);
  }
  return Array.from(map.values());
}

// kısa alıntı (snippet) için:
export function buildSnippet(raw: string, max = 140) {
  const txt = raw.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return txt.length > max ? txt.slice(0, max - 1) + '…' : txt;
}