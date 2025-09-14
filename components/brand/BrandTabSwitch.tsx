'use client'

import { StatefulTabs, Tab } from 'baseui/tabs-motion'
import { ShoppingBagIcon, AtSymbolIcon } from '@heroicons/react/24/outline'
import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

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

  return (
    <StatefulTabs
      initialState={{ activeKey: active }}
      onChange={({ activeKey }) => {
        const params = new URLSearchParams(searchParams?.toString() || '')
        params.set('tab', String(activeKey))
        router.replace('?' + params.toString())
      }}
      overrides={{
        Root: {
          style: {
            backgroundColor: 'transparent',
          },
        },
        TabBar: {
          style: {
            borderBottomColor: color || '#000',
            borderBottomWidth: '2px',
            borderBottomStyle: 'solid',
          },
        },
        TabHighlight: {
          style: {
            backgroundColor: color || '#000',
            height: '2px',
            borderRadius: '0px',
          },
        },
      }}
    >
      <Tab
        key="items"
        title={
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors"
            style={{ color: active === 'items' ? (color || '#000') : 'inherit', fontWeight: active === 'items' ? 600 : 500 }}
          >
            <ShoppingBagIcon className="w-4 h-4" />
            {variant === 'me' ? 'Ürünlerim' : 'Ürünler'}
          </span>
        }
      />
      <Tab
        key="mentions"
        title={
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors"
            style={{ color: active === 'mentions' ? (color || '#000') : 'inherit', fontWeight: active === 'mentions' ? 600 : 500 }}
          >
            <AtSymbolIcon className="w-4 h-4" />
            Bahsetmeler
          </span>
        }
      />
    </StatefulTabs>
  )
}
