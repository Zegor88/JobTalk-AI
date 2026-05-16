export const loader = () => {
  return new Response(
    JSON.stringify({
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
    }),
    {
      headers: {
        'Cache-Control': 'public, max-age=600',
        'Content-Type': 'application/manifest+json',
      },
    }
  );
};
