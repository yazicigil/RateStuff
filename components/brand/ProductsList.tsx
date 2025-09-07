'use client';

import React from 'react';
import TagFilterBar from '@/components/common/TagFilterBar';

export type ProductsListItem = {
  id: string;
  name: string;
  tags?: string[];
  desc?: string | null;
  imageUrl?: string | null;
  rating?: number | null;
  // Ek alanlar varsa genişletin
  [key: string]: any;
};

export type ProductsListProps<T extends ProductsListItem = ProductsListItem> = {
  /** Ham ürün listesi */
  items: T[];
  /** Trend etiketler */
  trending?: string[];
  /** Tüm etiketler (filtre bar için) */
  allTags?: string[];
  /** Başlangıç seçili etiketler */
  initialSelectedTags?: string[];
  /** Marka teması: CSS değişkenleri (var(--brand-*)) tanımlıysa otomatik uyar */
  brandTheme?: boolean;
  /** Ürün kartını nasıl çizeceğimizi belirten render prop (yoksa basit bir kart çizer) */
  renderItem?: (item: T) => React.ReactNode;
  /** Liste boş ise gösterilecek JSX */
  emptyState?: React.ReactNode;
  /** Arama kutusunun placeholder metni */
  searchPlaceholder?: string;
  /** Dışarıya değişiklikleri bildirmek isterseniz */
  onFilterChange?: (state: { q: string; selected: Set<string> }) => void;
  className?: string;
};

export default function ProductsList<T extends ProductsListItem = ProductsListItem>({
  items,
  trending = [],
  allTags,
  initialSelectedTags = [],
  brandTheme = false,
  renderItem,
  emptyState,
  searchPlaceholder = 'Ürün ara…',
  onFilterChange,
  className = '',
}: ProductsListProps<T>) {
  // State
  const [q, setQ] = React.useState('');
  const [selected, setSelected] = React.useState<Set<string>>(new Set(initialSelectedTags));

  // Tüm etiketler: verilmişse onu kullan; yoksa item'lardan topla
  const tags = React.useMemo(() => {
    if (allTags && allTags.length) return allTags;
    const s = new Set<string>();
    for (const it of items) (it.tags || []).forEach((t) => s.add(t));
    return Array.from(s);
  }, [allTags, items]);

  // Filtreli liste
  const filtered = React.useMemo(() => {
    const hasSel = selected.size > 0;
    const qn = q.trim().toLowerCase();
    return items.filter((it) => {
      const matchTags = !hasSel || (it.tags || []).some((t) => selected.has(t));
      const matchQ = !qn || it.name.toLowerCase().includes(qn) || (it.desc || '').toLowerCase().includes(qn);
      return matchTags && matchQ;
    });
  }, [items, selected, q]);

  React.useEffect(() => {
    onFilterChange?.({ q, selected });
  }, [q, selected, onFilterChange]);

  // Stil: marka teması varsa CSS değişkenlerini kullan
  const tone = brandTheme
    ? {
        // Kart ve kontroller marka renklerine uyum sağlar
        // Aşağıdaki değişken isimleri projedeki brand theme ile uyumluysa otomatik oturur.
        // Yoksa bu stil objesini kaldırabilirsiniz.
        backgroundColor: 'var(--brand-elev, transparent)',
        color: 'var(--brand-ink, inherit)',
      } as React.CSSProperties
    : undefined;

  return (
    <section className={`w-full ${className}`} style={tone}>
      {/* Tag Filter */}
      {tags.length > 0 && (
        <div className="mb-3">
          <TagFilterBar
            tags={tags}
            trending={trending}
            selected={selected}
            onToggle={(t) =>
              setSelected((prev) => {
                const next = new Set(prev);
                if (next.has(t)) next.delete(t); else next.add(t);
                return next;
              })
            }
            onClear={() => setSelected(new Set())}
          />
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-4">
        <div
          className={`flex items-center gap-2 rounded-2xl border px-3 py-2 shadow-sm backdrop-blur-sm
          ${brandTheme ? '' : 'bg-white/70 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800'}
        `}
          style={brandTheme ? { background: 'var(--brand-elev-weak, transparent)', borderColor: 'var(--brand-elev-bd, rgba(0,0,0,.08))' } : undefined}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
            <path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder}
            className="flex-1 bg-transparent outline-none text-sm py-1"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              className="rounded-lg px-2 py-1 text-xs border hover:bg-black/5 dark:hover:bg-white/10"
            >
              Temizle
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="grid place-items-center h-32 text-sm opacity-70">
          {emptyState ?? <span>Kayıt bulunamadı.</span>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((it) => (
            <div key={it.id} className="min-w-0">
              {renderItem ? (
                renderItem(it)
              ) : (
                <BasicProductCard item={it} brandTheme={brandTheme} />
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// Basit default kart (kendi ItemCard'ınız varsa renderItem ile geçiniz)
function BasicProductCard({ item, brandTheme }: { item: ProductsListItem; brandTheme?: boolean }) {
  return (
    <article
      className={`rounded-2xl border p-3 shadow-sm ${brandTheme ? '' : 'bg-white/70 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800'}`}
      style={brandTheme ? { background: 'var(--brand-elev-strong, transparent)', borderColor: 'var(--brand-elev-bd, rgba(0,0,0,.08))' } : undefined}
    >
      {item.imageUrl && (
        <div className="mb-2 overflow-hidden rounded-xl aspect-[4/3] bg-black/5 dark:bg-white/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
        </div>
      )}
      <h3 className="text-sm font-semibold line-clamp-2">{item.name}</h3>
      {item.desc && <p className="text-xs opacity-70 line-clamp-2 mt-0.5">{item.desc}</p>}
      {Array.isArray(item.tags) && item.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.tags.slice(0, 4).map((t) => (
            <span key={t} className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] dark:border-gray-700">#{t}</span>
          ))}
        </div>
      )}
    </article>
  );
}
