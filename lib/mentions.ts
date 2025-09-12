// lib/mentions.ts
export type ParsedMention = { brandId: string, display: string };

const MENTION_MD = /@\[(.+?)\]\((?:brand:([a-z0-9]+))(?:\|slug:[^)]+)?\)/ig;

export function extractMentionsFromHtml(html: string): ParsedMention[] {
  const out: ParsedMention[] = [];
  // 1) data-mention-id
  const div = globalThis.document?.createElement?.('div');
  if (div) {
    div.innerHTML = html;
    div.querySelectorAll<HTMLElement>('[data-mention-id]').forEach(el => {
      const id = el.getAttribute('data-mention-id')!;
      const display = el.textContent?.trim() || '';
      if (id) out.push({ brandId: id, display });
    });
  }
  // 2) markdown pattern fallback
  let m;
  while ((m = MENTION_MD.exec(html)) !== null) {
    const display = (m[1] || '').trim();
    const brandId = (m[2] || '').trim();
    if (brandId) out.push({ brandId, display });
  }
  // uniq by brandId
  return Array.from(new Map(out.map(x => [x.brandId, x])).values());
}

// kısa alıntı (snippet) için:
export function buildSnippet(raw: string, max = 140) {
  const txt = raw.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return txt.length > max ? txt.slice(0, max - 1) + '…' : txt;
}