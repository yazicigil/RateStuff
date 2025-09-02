// components/TrendingTagsCard.tsx
'use client';
import CollapsibleSection from '@/components/CollapsibleSection';
import Tag from '@/components/Tag';
import { memo, useMemo } from 'react';

export type TrendingTagsCardProps = {
  tags: string[];
  selected: Set<string>;
  onToggle: (tag: string) => void;
  onClearAll?: () => void; // optional: double-click jestinde hepsini temizle
  defaultOpen?: boolean;
  className?: string;          // opsiyonel ek sınıflar
  summaryClassName?: string;   // başlık rengi vs. override
};

function TrendingTagsCardImpl({
  tags,
  selected,
  onToggle,
  onClearAll,
  defaultOpen = true,
  className,
  summaryClassName,
}: TrendingTagsCardProps) {
  const selectedCount = useMemo(() => tags.filter(t => selected.has(t)).length, [tags, selected]);

  return (
    <CollapsibleSection
      title={`Trend Etiketler${selectedCount ? ` (${selectedCount} seçili)` : ''}`}
      defaultOpen={defaultOpen}
      className={
        className ?? 'border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-900/20'
      }
      summaryClassName={summaryClassName ?? 'text-violet-900 dark:text-violet-200'}
    >
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => {
          const active = selected.has(t);
          return (
            <Tag
              key={t}
              label={t}
              active={active}
              onClick={() => onToggle(t)}
              onDoubleClick={() => onClearAll?.()}
              className={
                active
                  ? 'bg-violet-600 text-white border-violet-600 hover:bg-violet-700 shadow'
                  : 'bg-violet-500/10 text-violet-900 border-violet-300 hover:bg-violet-500/20 dark:bg-violet-400/10 dark:text-violet-100 dark:border-violet-700 dark:hover:bg-violet-400/20'
              }
            />
          );
        })}
      </div>
    </CollapsibleSection>
  );
}

const TrendingTagsCard = memo(TrendingTagsCardImpl);
export default TrendingTagsCard;
