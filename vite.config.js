import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const pwaIcons = [
  { src: '/brand/logo-64.webp', sizes: '64x64', type: 'image/webp', purpose: 'any' },
  { src: '/brand/logo-128.webp', sizes: '128x128', type: 'image/webp', purpose: 'any' },
  { src: '/brand/logo-192.webp', sizes: '192x192', type: 'image/webp', purpose: 'any' },
  { src: '/brand/logo-256.webp', sizes: '256x256', type: 'image/webp', purpose: 'any' },
  { src: '/brand/logo-384.webp', sizes: '384x384', type: 'image/webp', purpose: 'any' },
  { src: '/brand/logo-512.webp', sizes: '512x512', type: 'image/webp', purpose: 'any' },
  { src: '/brand/logo-192-maskable.webp', sizes: '192x192', type: 'image/webp', purpose: 'maskable' },
  { src: '/brand/logo-512-maskable.webp', sizes: '512x512', type: 'image/webp', purpose: 'maskable' },
  { src: '/brand/logo-64.png', sizes: '64x64', type: 'image/png', purpose: 'any' },
]

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['brand/**/*', 'fonts/**/*', 'og-image.webp'],
      manifest: {
        id: '/',
        name: 'Win Gold | لوحة المحل والمورد',
        short_name: 'Win Gold',
        description: 'إدارة المنتجات والعروض والطلبيات لأصحاب المتاجر والموردين.',
        theme_color: '#2563eb',
        background_color: '#f1f5f9',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        lang: 'ar',
        dir: 'rtl',
        categories: ['business', 'productivity'],
        shortcuts: [
          {
            name: 'إضافة منتج',
            short_name: 'منتج',
            description: 'افتح نموذج إضافة منتج جديد',
            url: '/store/add-product-offer?pwaTab=product',
            icons: [{ src: '/brand/logo-64.webp', sizes: '64x64', type: 'image/webp' }],
          },
          {
            name: 'إضافة عرض',
            short_name: 'عرض',
            description: 'افتح نموذج إضافة عرض جديد',
            url: '/store/add-product-offer?pwaTab=offer',
            icons: [{ src: '/brand/logo-64.webp', sizes: '64x64', type: 'image/webp' }],
          },
          {
            name: 'متجري',
            short_name: 'متجري',
            description: 'افتح ملف المتجر وإدارته',
            url: '/store/my-store',
            icons: [{ src: '/brand/logo-64.webp', sizes: '64x64', type: 'image/webp' }],
          },
          {
            name: 'شراء أكواد',
            short_name: 'أكواد',
            description: 'اطلب أو اشترِ بطاقات الهدايا',
            url: '/store/buy-codes',
            icons: [{ src: '/brand/logo-64.webp', sizes: '64x64', type: 'image/webp' }],
          },
        ],
        icons: pwaIcons,
      },
      workbox: {
        importScripts: ['sw-push.js'],
        globPatterns: ['**/*.{js,css,html,webp,png,svg,ico,woff,woff2}'],
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: true,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && /\.(webp|png|svg|ico|woff2?)$/i.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'trader-static-assets',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'trader-cloudinary-images',
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'trader-pages',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 24, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5175,
    strictPort: true,
  },
})
