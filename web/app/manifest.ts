import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Proper Place',
    short_name: 'Proper Place',
    description: 'Find affordable motorhome overnight stays across the UK',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#5B8FC4',
    icons: [
      {
        src: '/logo-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/logo-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
