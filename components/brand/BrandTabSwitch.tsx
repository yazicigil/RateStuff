'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShoppingBagIcon, AtSymbolIcon } from '@heroicons/react/24/outline'

export default function BrandTabSwitch({
  active,
  color,
  variant,
}: {
  active: 'items' | 'mentions'
  color: string
  variant?: 'me' | 'slug'
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const itemsRef = React.useRef<HTMLButtonElement | null>(null)
  const mentionsRef = React.useRef<HTMLButtonElement | null>(null)
  const barRef = React.useRef<HTMLDivElement | null>(null)
  const [metrics, setMetrics] = React.useState<{ left: number; width: number }>({ left: 0, width: 0 })

  const updateBar = React.useCallback(() => {
    const el = active === 'items' ? itemsRef.current : mentionsRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const parentRect = el.parentElement?.getBoundingClientRect()
    if (!parentRect) return
    setMetrics({ left: rect.left - parentRect.left, width: rect.width })
  }, [active])

  React.useEffect(() => {
    updateBar()
    const ro = new ResizeObserver(() => updateBar())
    if (itemsRef.current) ro.observe(itemsRef.current)
    if (mentionsRef.current) ro.observe(mentionsRef.current)
    window.addEventListener('resize', updateBar)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updateBar)
    }
  }, [updateBar])

  function go(to: 'items' | 'mentions') {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('tab', to)
    router.replace('?' + params.toString())
  }

  const activeColor = color || '#000'

  return (
    <div className="w-full">
      <div className="relative">
        <div className="flex gap-6">
          <button
            ref={itemsRef}
            type="button"
            onClick={() => go('items')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors"
            style={{ color: active === 'items' ? activeColor : 'inherit', fontWeight: active === 'items' ? 600 as any : 500 as any }}
          >
            <ShoppingBagIcon className="w-4 h-4" />
            {variant === 'me' ? 'Ürünlerim' : 'Ürünler'}
          </button>
          <button
            ref={mentionsRef}
            type="button"
            onClick={() => go('mentions')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors"
            style={{ color: active === 'mentions' ? activeColor : 'inherit', fontWeight: active === 'mentions' ? 600 as any : 500 as any }}
          >
            <AtSymbolIcon className="w-4 h-4" />
            Bahsetmeler
          </button>
        </div>
        {/* bottom rail */}
        <div className="mt-2 h-[2px] w-full bg-neutral-200 dark:bg-white/10" />
        {/* highlight */}
        <div
          ref={barRef}
          className="absolute bottom-0 h-[3px]"
          style={{
            left: metrics.left,
            width: metrics.width,
            backgroundColor: activeColor,
            transition: 'left 220ms cubic-bezier(0.22,1,0.36,1), width 220ms cubic-bezier(0.22,1,0.36,1)'
          }}
        />
      </div>
    </div>
  )
}
