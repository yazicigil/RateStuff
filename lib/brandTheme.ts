// lib/brandTheme.ts
type RGB = { r: number; g: number; b: number };

export function hexToRgb(hex: string): RGB {
  const m = hex.trim().replace('#','');
  const n = m.length === 3
    ? [...m].map(x => parseInt(x + x, 16))
    : [m.slice(0,2), m.slice(2,4), m.slice(4,6)].map(h => parseInt(h, 16));
  return { r: n[0], g: n[1], b: n[2] };
}

export function toRgbStr({r,g,b}: RGB) { return `rgb(${r} ${g} ${b})`; }

function relLuma({r,g,b}: RGB) {
  // sRGB -> linear
  const ch = [r,g,b].map(v=>{
    v/=255;
    return v<=0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4);
  });
  return 0.2126*ch[0]+0.7152*ch[1]+0.0722*ch[2];
}

// Basit karışım (ink ve border için)
function mix(a: RGB, b: RGB, t: number): RGB {
  return { r: Math.round(a.r*(1-t)+b.r*t), g: Math.round(a.g*(1-t)+b.g*t), b: Math.round(a.b*(1-t)+b.b*t) };
}
const BLACK: RGB = { r:0,g:0,b:0 };
const WHITE: RGB = { r:255,g:255,b:255 };

export function getBrandCSSVars(brandHex?: string) {
  if (!brandHex) return {} as React.CSSProperties;
  const base = hexToRgb(brandHex);
  const L = relLuma(base);

  // Pick dark ink for medium-light & light brand colors, white ink for dark ones
  const isLight = L > 0.6;

  // Inks
  const inkRgb = isLight ? { r: 17, g: 17, b: 17 } : { r: 255, g: 255, b: 255 };
  const inkSubRgb = isLight
    ? mix({ r: 17, g: 17, b: 17 }, WHITE, 0.35)
    : mix({ r: 255, g: 255, b: 255 }, BLACK, 0.35);
  // Text for solid brand "items" backgrounds (hero card, solid chips)
  const onItemsInkRgb = inkRgb;

  // Backgrounds
  const chipBgRgb = isLight ? mix(WHITE, BLACK, 0.06) : mix(base, WHITE, 0.15);
  const elevBgRgb = isLight ? mix(WHITE, BLACK, 0.04) : mix(base, WHITE, 0.12);

  // Borders / outlines
  const outlineRgb = isLight ? mix(WHITE, BLACK, 0.18) : mix(base, WHITE, 0.28);

  // Subtle page tint used by the gradient overlay
  const surfaceWeakRgb = isLight ? mix(WHITE, base, 0.10) : mix(BLACK, base, 0.10);

  return {
    ['--brand-items-bg' as any]: toRgbStr(base),
    ['--brand-elev-bd'  as any]: toRgbStr(outlineRgb),
    ['--brand-chip-bg'  as any]: toRgbStr(chipBgRgb),
    ['--brand-elev-bg'  as any]: toRgbStr(elevBgRgb),
    ['--brand-ink'      as any]: toRgbStr(inkRgb),
    ['--brand-ink-subtle' as any]: toRgbStr(inkSubRgb),
    ['--brand-on-items-ink' as any]: toRgbStr(onItemsInkRgb),
    ['--brand-surface-weak' as any]: toRgbStr(surfaceWeakRgb),
  } as React.CSSProperties;
}