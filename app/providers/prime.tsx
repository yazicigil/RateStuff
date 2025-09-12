'use client';

import { PrimeReactProvider } from 'primereact/api';
import { PropsWithChildren } from 'react';

export default function PrimeProvider({ children }: PropsWithChildren) {
  // Body'ye portal (SSR guard ile), stacking sorunlarını kökten çözer
  const value = {
    appendTo: typeof window !== 'undefined' ? document.body : undefined,
    // PrimeReact z-index'leri otomatik uygulasın ki overlay her zaman üstte olsun
    autoZIndex: true,
    zIndex: {
      // Kartlardan yüksek, header/menu'den düşük bir seviye önerisi
      overlay: 140,
      menu: 140,
      tooltip: 160,
      modal: 1200,
      toast: 1400,
    },
    hideOverlaysOnDocumentScrolling: true,
  } as const;

  return <PrimeReactProvider value={value}>{children}</PrimeReactProvider>;
}