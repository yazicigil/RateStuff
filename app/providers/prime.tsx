'use client';

import { PrimeReactProvider } from 'primereact/api';
import { PropsWithChildren } from 'react';

export default function PrimeProvider({ children }: PropsWithChildren) {
  // Body'ye portal (SSR guard ile), stacking sorunlarını kesin çözer
  const value = {
    appendTo: typeof window !== 'undefined' ? document.body : undefined,                    // dropdown tam inputun altında
    // appendTo: typeof window !== 'undefined' ? document.body : undefined, // body’ye portal
    autoZIndex: false,                    // değerleri biz belirleyelim
    zIndex: {
      modal: 1100,
      overlay: 110,                        // dropdown/overlay
      menu: 60,
      tooltip: 90,
      toast: 1200,
    },
    hideOverlaysOnDocumentScrolling: true,
  } as const;

  return <PrimeReactProvider value={value}>{children}</PrimeReactProvider>;
}