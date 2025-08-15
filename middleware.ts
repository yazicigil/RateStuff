// middleware.ts
import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['tr', 'en'],
  defaultLocale: 'tr',
  localePrefix: 'always' // /tr, /en gibi
});

export const config = {
  matcher: [
    // API hariç tüm route'lar
    '/((?!api|_next|.*\\..*).*)'
  ]
};