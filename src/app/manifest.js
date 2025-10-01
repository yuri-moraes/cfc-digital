import { MetadataRoute } from 'next';

/**
 * @returns {MetadataRoute.Manifest}
 */
export default function manifest() {
  return {
    name: 'CFC Digital',
    short_name: 'CFC Digital',
    description: 'Sistema de agendamento de aulas para CFC',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0C4A6E',
    theme_color: '#0C4A6E',
    lang: 'pt-BR',
    orientation: 'portrait',
    categories: ['education', 'productivity'],
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
