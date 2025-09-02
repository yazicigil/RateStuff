// components/AllTagsCard.tsx
'use client';
import CollapsibleSection from '@/components/home/CollapsibleSection';
import Tag from '@/components/common/Tag';
import { memo, useMemo } from 'react';

export type AllTagsCardProps = {
  /** Tüm etiketler */
  tags: string[];
  /** Trend listesini, trend rozet stili için geçiriyoruz */
  trending?: string[];
  /** Seçili etiketler (AND filtresi) */
  selected: Set<string>;
  /** Tek etiketi toggle et */
  onToggle: (tag: string) => void;
  /** Tüm seçimleri temizle (opsiyonel, dblclick jesti için) */
  onClearAll?: () => void;
  /** Açılışta açık/kapalı */
  defaultOpen?: boolean;
  /** Kart dış sınıfları override */
  className?: string;
  /** Başlık sınıfı override */
  summaryClassName?: string;
  /** İç yükseklik; varsayılan 50vh */
  maxBodyHeight?: string;
};

function AllTagsCardImpl({
  tags,
  trending = [],
  selected,
  onToggle,
  onClearAll,
  defaultOpen = false,
  className,
  summaryClassName,
  maxBodyHeight = '50vh',
}: AllTagsCardProps) {
  const selectedCount = useMemo(
    () => tags.filter((t) => selected.has(t)).length,
    [tags, selected],
  );

  return (
    <CollapsibleSection
      title={`Tüm Etiketler${selectedCount ? ` (${selectedCount} seçili)` : ''}`}
      defaultOpen={defaultOpen}
      className={className}
      summaryClassName={summaryClassName}
    >
      <div
        className="flex flex-wrap gap-2 overflow-auto pr-1"
        style={{ maxHeight: maxBodyHeight }}
      >
        {tags.map((t) => {
          const active = selected.has(t);
          const isTrending = trending.includes(t);
          const baseTrending =
            'bg-violet-500/10 text-violet-900 border-violet-300 hover:bg-violet-500/20 ' +
            'dark:bg-violet-400/10 dark:text-violet-100 dark:border-violet-700 dark:hover:bg-violet-400/20';
        return (
            <Tag
              key={t}
              label={t}
              active={active}
              onClick={() => onToggle(t)}
              onDoubleClick={() => onClearAll?.()}
              className={
                isTrending
                  ? active
                    ? 'bg-violet-600 text-white border-violet-600 hover:bg-violet-700 shadow'
                    : baseTrending
                  : undefined
              }
            />
          );
        })}
      </div>
    </CollapsibleSection>
  );
}

const AllTagsCard = memo(AllTagsCardImpl);
export default AllTagsCard;