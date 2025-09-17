// 1) temel renk yardımcıları
const DEFAULT_LIGHT_BG = '#ffffff';
const DEFAULT_DARK_BG  = '#0b1220'; // project dark surface
const clamp = (v: number, min=0, max=1) => Math.min(max, Math.max(min, v));

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.trim().replace('#', '');
  const s = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  const num = parseInt(s, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex(r: number, g: number, b: number) {
  const to = (x: number) => x.toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function mix(hexA: string, hexB: string, t: number) {
  const a = hexToRgb(hexA), b = hexToRgb(hexB);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return rgbToHex(r, g, bl);
}

// 2) WCAG kontrast
function relLum(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const norm = [r, g, b].map(v => v / 255).map(c =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * norm[0] + 0.7152 * norm[1] + 0.0722 * norm[2];
}

function contrastRatio(fgHex: string, bgHex: string) {
  const L1 = relLum(fgHex), L2 = relLum(bgHex);
  const [light, dark] = L1 >= L2 ? [L1, L2] : [L2, L1];
  return (light + 0.05) / (dark + 0.05);
}

// 3) “ton karartma” ana fonksiyonu
function darkenUntilContrast(brandHex: string, bgHex = DEFAULT_LIGHT_BG, target = 4.5, maxDarken = 0.4) {
  // brand rengini siyaha doğru karıştırarak 4.5:1’e ulaşmayı dener
  if (contrastRatio(brandHex, bgHex) >= target) return brandHex;

  // binary search ile 0..maxDarken aralığında t bul
  let lo = 0, hi = maxDarken, best = mix(brandHex, '#000000', maxDarken);
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    const cand = mix(brandHex, '#000000', mid);
    if (contrastRatio(cand, bgHex) >= target) { best = cand; hi = mid; }
    else { lo = mid; }
  }
  // Eğer best hâlâ yetmiyorsa dışarıda fallback yapacağız
  return best;
}

export function getContrastAdjustedColor(brandHex: string, bgHex = DEFAULT_LIGHT_BG, target = 4.5, maxDarken = 0.4) {
  const darkened = darkenUntilContrast(brandHex, bgHex, target, maxDarken);
  const ok = contrastRatio(darkened, bgHex) >= target;
  return ok ? darkened : '#111111';
}

export function getTabTextColorForLightMode(brandHex: string) {
  return getContrastAdjustedColor(brandHex, DEFAULT_LIGHT_BG);
}

export function getTabColorsForLightMode(brandHex: string) {
  const adjusted = getContrastAdjustedColor(brandHex, DEFAULT_LIGHT_BG);
  return { text: adjusted, bar: adjusted };
}

export function getTabTextColorForDarkMode(brandHex: string, bgHex = DEFAULT_DARK_BG) {
  // In dark mode, ensure text has ≥4.5 contrast against dark surface
  return getContrastAdjustedColor(brandHex, bgHex);
}

export function getTabColorsForDarkMode(brandHex: string, bgHex = DEFAULT_DARK_BG) {
  const adjusted = getContrastAdjustedColor(brandHex, bgHex);
  return { text: adjusted, bar: adjusted };
}

/** Unified helper: decide by isDark; optionally override bg */
export function getTabColors(brandHex: string, opts?: { isDark?: boolean; bgHex?: string; target?: number; maxDarken?: number }) {
  const isDark = !!opts?.isDark;
  const bg = opts?.bgHex ?? (isDark ? DEFAULT_DARK_BG : DEFAULT_LIGHT_BG);
  const target = opts?.target ?? 4.5;
  const maxDarken = opts?.maxDarken ?? 0.4;
  const adjusted = getContrastAdjustedColor(brandHex, bg, target, maxDarken);
  return { text: adjusted, bar: adjusted };
}