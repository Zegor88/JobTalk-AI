import type { WebAppManifest } from '@remix-pwa/dev';
import { json } from '@remix-run/node';

export const loader = () => {
  return json(
    {
      name: 'JobTalk AI',
      short_name: 'JobTalk',
      description: 'AI-powered email client for job seekers',
      start_url: '/',
      display: 'standalone',
      background_color: '#FFFFFF',
      theme_color: '#4F46E5',
      icons: [
        {
          src: '/favicon.ico',
          sizes: '48x48',
          type: 'image/x-icon',
        },
      ],
    } as WebAppManifest,
    {
      headers: {
        'Cache-Control': 'public, max-age=600',
        'Content-Type': 'application/manifest+json',
      },
    }
  );
};
