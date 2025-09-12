'use client';

import { PrimeReactProvider } from 'primereact/api';
import { PropsWithChildren } from 'react';

export default function PrimeProvider({ children }: PropsWithChildren) {
  // SSR güvenli değer: 'self' stringi; body’ye almak istersen aşağıdaki yorumu aç
  const value = {
    appendTo: 'self',                     // dropdown tam inputun altında
    // appendTo: typeof window !== 'undefined' ? document.body : undefined, // body’ye portal
    autoZIndex: false,                    // değerleri biz belirleyelim
    zIndex: {
      modal: 1100,
      overlay: 60,                        // dropdown/overlay
      menu: 60,
      tooltip: 90,
      toast: 1200,
    },
    hideOverlaysOnDocumentScrolling: true,
  } as const;

  return <PrimeReactProvider value={value}>{children}</PrimeReactProvider>;
}