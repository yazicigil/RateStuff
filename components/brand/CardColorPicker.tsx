'use client';
import { useEffect, useId, useState } from 'react';

type Props = {
  /** SSR’da gelen hex (#RRGGBB) ya da null */
  initialColor: string | null;
  /** Kart elementinin id’si; CSS var’larını buna basacağız */
  targetId?: string; // default: 'brand-hero-card'
  className?: string;
};

const PALETTE = ['#FFFFFF','#FEF3C7','#DBEAFE','#DCFCE7','#FEE2E2','#EDE9FE','#F5F5F5','#E0F2FE','#FFE4E6'];

export default function CardColorPicker({ initialColor, targetId = 'brand-hero-card', className }: Props) {
  const [color, setColor] = useState<string>(initialColor ?? '#FFFFFF');
  const inputId = useId();

  // SSR gelen rengi uygula
  useEffect(() => {
    apply(initialColor ?? '#FFFFFF', false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialColor, targetId]);

  async function persist(hex: string | null) {
    await fetch('/api/brand/color', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color: hex }),
    });
  }

  function apply(hex: string, shouldPersist = true) {
    setColor(hex);
    const el = document.getElementById(targetId);
    const root = document.documentElement; // <-- write vars here so scope is global

    // If we cannot find the target element, we still proceed with global vars
    const bg = hexToRgba(hex, 0.65);       // kept for optional glass uses
    const border = hexToRgba(hex, 0.35);

    // PURE HEX (no blending): derive rgb channels
    const raw = hex.replace('#', '');
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);

    // Subtle surface wash from the same hex (theme‑aware alpha)
    const isDark = document.documentElement.classList.contains('dark');
    const surfaceAlpha = isDark ? 0.18 : 0.10; // stronger wash for better harmony
    const surfaceWeak = `rgba(${r}, ${g}, ${b}, ${surfaceAlpha})`;

    // Pick best ink color (white or dark) AGAINST the pure hex background
    const ink = pickInk({ r, g, b }); // '#0B1220' or '#FFFFFF'
    const subtle = withAlpha(ink, 0.7);
    const chipBg = `rgba(${r}, ${g}, ${b}, 0.08)`;
// Elevation tokens derived from the ink (contrast color)
const elevBaseIsWhite = ink === '#FFFFFF';
const elevRGB = elevBaseIsWhite ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 };
const elevBg     = `rgba(${elevRGB.r}, ${elevRGB.g}, ${elevRGB.b}, ${elevBaseIsWhite ? 0.18 : 0.08})`;
const elevStrong = `rgba(${elevRGB.r}, ${elevRGB.g}, ${elevRGB.b}, ${elevBaseIsWhite ? 0.28 : 0.16})`;
const elevBd     = `rgba(${elevRGB.r}, ${elevRGB.g}, ${elevRGB.b}, ${elevBaseIsWhite ? 0.28 : 0.12})`;
    // --- GLOBAL (root) variables — used by ItemsTab & others ---
    root.style.setProperty('--brand-ink', ink);
    root.style.setProperty('--brand-ink-subtle', subtle);
    root.style.setProperty('--brand-chip-bg', chipBg);
    root.style.setProperty('--brand-items-bg', `rgb(${r}, ${g}, ${b})`);
    root.style.setProperty('--brand-surface-weak', surfaceWeak);
root.style.setProperty('--brand-elev-bg', elevBg);
root.style.setProperty('--brand-elev-strong', elevStrong);
root.style.setProperty('--brand-elev-bd', elevBd);
    // Accent tokens for ItemCard harmony
    root.style.setProperty('--brand-accent', hex);
    root.style.setProperty('--brand-accent-weak', hexToRgba(hex, 0.18));
    root.style.setProperty('--brand-accent-bd', hexToRgba(hex, 0.28));
    root.style.setProperty('--brand-focus', hexToRgba(hex, 0.42));

    // --- Local (hero card) variables — kept for backwards-compat ---
    if (el) {
      el.style.setProperty('--brand-card-bg', bg);
      el.style.setProperty('--brand-card-border', border);
      el.style.setProperty('--brand-ink', ink);
      el.style.setProperty('--brand-ink-subtle', subtle);
      el.style.setProperty('--brand-chip-bg', chipBg);
      el.style.setProperty('--brand-items-bg', `rgb(${r}, ${g}, ${b})`);
      // Accent tokens (local mirrors, optional, for backwards-compat)
      el.style.setProperty('--brand-accent', hex);
      el.style.setProperty('--brand-accent-weak', hexToRgba(hex, 0.18));
      el.style.setProperty('--brand-accent-bd', hexToRgba(hex, 0.28));
      el.style.setProperty('--brand-focus', hexToRgba(hex, 0.42));
      el.style.setProperty('--brand-surface-weak', surfaceWeak);
      el.style.setProperty('--brand-elev-bg', elevBg);
el.style.setProperty('--brand-elev-strong', elevStrong);
el.style.setProperty('--brand-elev-bd', elevBd);
    }

    if (shouldPersist) persist(hex);
  }

  function reset() {
    const el = document.getElementById(targetId);
    const root = document.documentElement;

    // Clear local (hero) vars
    if (el) {
      el.style.removeProperty('--brand-card-bg');
      el.style.removeProperty('--brand-card-border');
      el.style.removeProperty('--brand-ink');
      el.style.removeProperty('--brand-ink-subtle');
      el.style.removeProperty('--brand-chip-bg');
      el.style.removeProperty('--brand-items-bg');
      el.style.removeProperty('--brand-accent');
      el.style.removeProperty('--brand-accent-weak');
      el.style.removeProperty('--brand-accent-bd');
      el.style.removeProperty('--brand-focus');
      el.style.removeProperty('--brand-surface-weak');
      el.style.removeProperty('--brand-elev-bg');
el.style.removeProperty('--brand-elev-strong');
el.style.removeProperty('--brand-elev-bd');
    }

    // Clear global vars
    root.style.removeProperty('--brand-ink');
    root.style.removeProperty('--brand-ink-subtle');
    root.style.removeProperty('--brand-chip-bg');
    root.style.removeProperty('--brand-items-bg');
    root.style.removeProperty('--brand-accent');
    root.style.removeProperty('--brand-accent-weak');
    root.style.removeProperty('--brand-accent-bd');
    root.style.removeProperty('--brand-focus');
    root.style.removeProperty('--brand-surface-weak');
    root.style.removeProperty('--brand-elev-bg');
root.style.removeProperty('--brand-elev-strong');
root.style.removeProperty('--brand-elev-bd');

    setColor('#FFFFFF');
    persist(null);
  }

  return (
    <div className={['mt-3 flex items-center gap-2 flex-wrap', className].filter(Boolean).join(' ')}>
      <span className="text-xs text-neutral-500 dark:text-neutral-400">Marka rengi:</span>

      {/* Hızlı palet */}
      {PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Renk ${c}`}
          onClick={() => apply(c)}
          className="h-6 w-6 rounded-full border border-black/10 dark:border-white/10 hover:scale-[1.05] transition"
          style={{ backgroundColor: c, boxShadow: c === color ? '0 0 0 2px rgba(0,0,0,0.15) inset' : undefined }}
        />
      ))}

      {/* Özel renk */}
      <label htmlFor={inputId} className="sr-only">Özel renk</label>
      <input
        id={inputId}
        type="color"
        value={color}
        onChange={(e) => apply(e.target.value)}
        className="h-7 w-10 rounded cursor-pointer border border-black/10 dark:border-white/10 bg-transparent p-0"
      />

      <button
        type="button"
        onClick={reset}
        className="ml-1 text-xs px-2 py-1 rounded border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
      >
        Sıfırla
      </button>
    </div>
  );
}

// #RRGGBB → rgba(a)
function hexToRgba(hex: string, a = 1) {
  const raw = hex.replace('#','');
  const r = parseInt(raw.slice(0,2),16);
  const g = parseInt(raw.slice(2,4),16);
  const b = parseInt(raw.slice(4,6),16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// --- contrast helpers ---
function parseRgba(str?: string | null) {
  if (!str) return null;
  const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
  if (!m) return null;
  return { r: +m[1], g: +m[2], b: +m[3], a: m[4] ? +m[4] : 1 };
}

function getEffectiveBackground(el: HTMLElement) {
  let node: HTMLElement | null = el;
  while (node) {
    const bg = getComputedStyle(node).backgroundColor;
    const rgba = parseRgba(bg);
    if (rgba && rgba.a > 0.95) return { r: rgba.r, g: rgba.g, b: rgba.b };
    node = node.parentElement;
  }
  const isDark = document.documentElement.classList.contains('dark');
  return isDark ? { r: 11, g: 18, b: 32 } : { r: 255, g: 255, b: 255 };
}

function blendRgbaOver(fg: string, base: { r: number; g: number; b: number }) {
  const c = parseRgba(fg)!; // {r,g,b,a}
  const a = c.a ?? 1;
  const r = Math.round(c.r * a + base.r * (1 - a));
  const g = Math.round(c.g * a + base.g * (1 - a));
  const b = Math.round(c.b * a + base.b * (1 - a));
  return { r, g, b };
}

function pickInk(bg: { r: number; g: number; b: number }) {
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 11, g: 18, b: 32 }; // brand dark text
  const cWhite = contrastRatio(bg, white);
  const cBlack = contrastRatio(bg, black);
  return cBlack >= cWhite ? '#0B1220' : '#FFFFFF';
}

function contrastRatio(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) {
  const L1 = relLuminance(a);
  const L2 = relLuminance(b);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function relLuminance({ r, g, b }: { r: number; g: number; b: number }) {
  const [R, G, B] = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function withAlpha(hexOrRgb: string, alpha: number) {
  const p = parseRgba(hexOrRgb);
  if (p) return `rgba(${p.r},${p.g},${p.b},${alpha})`;
  const raw = hexOrRgb.replace('#', '');
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}