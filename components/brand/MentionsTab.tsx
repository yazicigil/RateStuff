'use client'

import React from 'react'
import ProductsList, { type ProductsListItem, type ProductsListProps } from '@/components/brand/ProductsList'
import { MentionsContext } from '@/components/brand/MentionsContext'


/**
 * MentionsTab
 *
 * Bu tab, ilgili markanın AÇIKLAMASINDA (description/comment) mentionlandığı
 * tüm item'ları `ItemCard` bileşenleriyle listeler. Görsel ve davranış olarak
 * `ProductsList` ile birebir aynıdır; UI/UX eşleşmesi için `ProductsList`
 * içine delege ederiz.
 *
 * Kullanım opsiyonları:
 *  - `items` prop verirsen, doğrudan onları gösterir.
 *  - `brandId` veya `brandSlug` verirsen, verileri client-side fetch eder.
 *    (Backend endpoint örnekleri: `/api/mentions?brandId=...` veya
 *     `/api/mentions?brandSlug=...`) — kendi API'ne göre uyarlayabilirsin.
 */

export type MentionsTabProps<T extends ProductsListItem = ProductsListItem> = {
  /** Hazır item listesi (opsiyonel). Varsa fetch yapılmaz. */
  items?: T[]
  /** Backend fetch için marka kimliği (opsiyonel) */
  brandId?: string
  /** Backend fetch için marka slug (opsiyonel) */
  brandSlug?: string
  /** ProductsList ile aynı görünüm için brand değişkenlerini kullan */
  brandTheme?: ProductsListProps['brandTheme']
  /** Başlangıç seçili etiketler */
  initialSelectedTags?: string[]
  /** Liste boş ise gösterilecek JSX */
  emptyState?: React.ReactNode
  /** Arama placeholder'ı */
  searchPlaceholder?: string
  /** ProductsList'e doğrudan geçilecek ek prop'lar */
  itemCardProps?: ProductsListProps['itemCardProps']

  /** Aşağıdakiler, ProductsList/ItemCard davranışlarıyla birebir uyum için paslanır */
  me?: ProductsListProps['me']
  amAdmin?: ProductsListProps['amAdmin']
  myId?: ProductsListProps['myId']
  savedIds?: ProductsListProps['savedIds']
  copiedShareId?: ProductsListProps['copiedShareId']
  onDeleted?: ProductsListProps['onDeleted']
  onDelete?: ProductsListProps['onDelete']
  onSavedChanged?: ProductsListProps['onSavedChanged']
  onItemChanged?: ProductsListProps['onItemChanged']
  onOpenSpotlight?: ProductsListProps['onOpenSpotlight']
  onToggleSave?: ProductsListProps['onToggleSave']
  onReport?: ProductsListProps['onReport']
  onCopyShare?: ProductsListProps['onCopyShare']
  onNativeShare?: ProductsListProps['onNativeShare']
  onShowInList?: ProductsListProps['onShowInList']
  onVoteComment?: ProductsListProps['onVoteComment']
  showComments?: ProductsListProps['showComments']
  showCommentBox?: ProductsListProps['showCommentBox']
  selectedTagsExternal?: ProductsListProps['selectedTagsExternal']
  onToggleTag?: ProductsListProps['onToggleTag']
  onResetTags?: ProductsListProps['onResetTags']
  onReload?: ProductsListProps['onReload']
  className?: string
}

export default function MentionsTab<T extends ProductsListItem = ProductsListItem>(props: MentionsTabProps<T>) {
  const {
    items: itemsProp,
    brandId,
    brandSlug,
    brandTheme = false,
    initialSelectedTags = [],
    emptyState,
    searchPlaceholder = 'Bahsetmelerde ara...',
    itemCardProps,
    me,
    amAdmin,
    myId,
    savedIds,
    copiedShareId,
    onDeleted,
    onDelete,
    onSavedChanged,
    onItemChanged,
    onOpenSpotlight,
    onToggleSave,
    onReport,
    onCopyShare,
    onNativeShare,
    onShowInList,
    onVoteComment,
    showComments = false,
    showCommentBox = false,
    selectedTagsExternal,
    onToggleTag,
    onResetTags,
    onReload,
    className = '',
  } = props

  // İç state: items ya dışarıdan gelir ya da fetch edilir
  const [items, setItems] = React.useState<T[]>(() => itemsProp ?? [])
  const [loading, setLoading] = React.useState<boolean>(!itemsProp && (!!brandId || !!brandSlug))
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setItems(itemsProp ?? [])
  }, [itemsProp])

  React.useEffect(() => {
    let cancelled = false
    const needFetch = !itemsProp && (!!brandId || !!brandSlug)
    if (!needFetch) return

    const ctrl = new AbortController()
    async function run() {
      try {
        setLoading(true)
        setError(null)
        const qs = brandId ? `brandId=${encodeURIComponent(brandId)}` : brandSlug ? `brandSlug=${encodeURIComponent(brandSlug)}` : ''
        const res = await fetch(`/api/mentions?${qs}&take=200`, { signal: ctrl.signal })
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        const data = await res.json().catch(() => ([]))
        if (!cancelled) {
          const raw = (data?.items ?? data ?? []) as any[];
          const norm = raw.map((it) => {
            // Coerce possible string numbers to real numbers first
            const candNums = [it.avgRating, it.avg, it.rating]
              .map((v: any) => (v === null || v === undefined ? NaN : Number(v)));
            const avgFromAny = candNums.find((n) => Number.isFinite(n));
            const avgSafe = Number.isFinite(avgFromAny as number) ? (avgFromAny as number) : 0;

            const countRaw =
              typeof it.count === 'number' ? it.count :
              (it.count !== undefined ? Number(it.count) :
              (typeof it.counts?.ratings !== 'undefined' ? Number(it.counts?.ratings) : 0));
            const countSafe = Number.isFinite(Number(countRaw)) ? Number(countRaw) : 0;

            const ratingCoerced = (it.rating === null || it.rating === undefined) ? NaN : Number(it.rating);

            return {
              ...it,
              desc: it.desc ?? it.description ?? null,
              rating: Number.isFinite(ratingCoerced) ? ratingCoerced : avgSafe,
              avgRating: avgSafe,
              avg: Number.isFinite(Number(it.avg)) ? Number(it.avg) : avgSafe,
              count: countSafe,
            } as any;
          });
          setItems(norm as T[]);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Yükleme hatası')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true; ctrl.abort() }
  }, [itemsProp, brandId, brandSlug])

  // MentionsTab – OptionsPopover'dan gelen global gizleme event'ini dinle
  React.useEffect(() => {
    function onHidden(ev: any) {
      const id = ev?.detail?.itemId as string | undefined
      if (!id) return
      setItems((prev) => prev.filter((x: any) => x?.id !== id))
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('rs:mention-hidden', onHidden)
      return () => window.removeEventListener('rs:mention-hidden', onHidden)
    }
  }, [])

  // Mentions listesinde Ekle/QuickAdd görünmemeli; ownerId bilinmiyor gibi davranalım
  const ownerId: string | undefined = undefined

  // Yükleme/Hata durumları ProductsList ile aynı kapsayıcı içinde, stili bozmadan
  if (loading) {
    return (
      <section className={`w-full ${className}`}>
        <div className="rounded-3xl border shadow-sm p-4">
          <div className="h-32 grid place-items-center text-sm opacity-70">Yükleniyor…</div>
        </div>
      </section>
    )
  }
  if (error) {
    return (
      <section className={`w-full ${className}`}>
        <div className="rounded-3xl border shadow-sm p-4">
          <div className="h-32 grid place-items-center text-sm text-red-600 dark:text-red-400">{error}</div>
        </div>
      </section>
    )
  }

  return (
    <MentionsContext.Provider value={{ isMentions: true, brandId }}>
      <ProductsList
        items={items}
        trending={[]}
        allTags={undefined}
        initialSelectedTags={initialSelectedTags}
        brandTheme={brandTheme}
        renderItem={undefined}
        emptyState={emptyState}
        searchPlaceholder={searchPlaceholder}
        onFilterChange={undefined}
        className={className}
        me={me}
        amAdmin={amAdmin}
        myId={myId}
        savedIds={savedIds}
        copiedShareId={copiedShareId}
        onDeleted={onDeleted}
        onDelete={onDelete}
        onSavedChanged={onSavedChanged}
        onItemChanged={onItemChanged}
        onOpenSpotlight={onOpenSpotlight}
        onToggleSave={onToggleSave}
        onReport={onReport}
        onCopyShare={onCopyShare}
        onNativeShare={onNativeShare}
        onShowInList={onShowInList}
        onVoteComment={onVoteComment}
        showComments={showComments}
        showCommentBox={showCommentBox}
        selectedTagsExternal={selectedTagsExternal}
        onToggleTag={onToggleTag}
        onResetTags={onResetTags}
        itemCardProps={itemCardProps}
        ownerId={ownerId}
        onQuickAddDone={undefined}
        onReload={onReload}
      />
    </MentionsContext.Provider>
  )
}