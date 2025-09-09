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

  // Çok açık renk eşiği (neredeyse beyazlar, #fff dahil)
  const isTooLight = L > 0.90;

  // Ink (metin) ve subtle ink için minimum kontrast garantisi
  const inkRgb   = isTooLight ? BLACK : mix(base, BLACK, 0.6);       // açık renkse direkt siyaha yakın
  const inkSub   = isTooLight ? mix(BLACK, WHITE, 0.35) : mix(base, BLACK, 0.75);

  // Chip/Elevation zeminleri: açık marka renklerinde nötr yumuşak griye kay
  const chipBgRgb = isTooLight ? mix(WHITE, BLACK, 0.06) : mix(base, WHITE, 0.92);
  const elevBgRgb = isTooLight ? mix(WHITE, BLACK, 0.04) : mix(base, WHITE, 0.94);

  // Border/outline: açık renklerde gri, koyu/orta renklerde markadan türemiş koyu ton
  const outlineRgb = isTooLight ? mix(WHITE, BLACK, 0.18) : mix(base, BLACK, 0.75);

  return {
    ['--brand-items-bg' as any]: toRgbStr(base),
    ['--brand-elev-bd'  as any]: toRgbStr(outlineRgb),
    ['--brand-chip-bg'  as any]: toRgbStr(chipBgRgb),
    ['--brand-elev-bg'  as any]: toRgbStr(elevBgRgb),
    ['--brand-ink'      as any]: toRgbStr(inkRgb),
    ['--brand-ink-subtle' as any]: toRgbStr(inkSub),
  } as React.CSSProperties;
}