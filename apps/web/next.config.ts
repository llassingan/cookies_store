// =============================================================================
// Maison Croûte (House of Crust) — Next.js 15 Configuration
// =============================================================================
//
// This file configures the Next.js frontend for the cookie shop. The web
// app lives in apps/web/ and talks to the Hono API backend through
// Next.js rewrites, so the browser never makes cross-origin requests
// directly to the API server.
//
// Key settings:
//
//   rewrites
//     Every request to /api/* is proxied to the Hono API at the URL
//     defined by the WEB_API_URL environment variable. This means the
//     browser calls /api/menu and Next.js forwards it to the actual API
//     server — no CORS headaches on the client side.
//
//   images.remotePatterns
//     Allows Next.js Image Optimization to fetch from any HTTPS source
//     (for cookie photos hosted on external CDNs) and from localhost
//     (for images served by the API during development).
//
//   allowedDevOrigins
//     During development, Next.js will accept requests from these
//     origins. The wildcard *.mahara.web.id lets you test on a
//     subdomain without whitelisting each one individually.
//
//   poweredByHeader: false
//     Removes the "X-Powered-By: Next.js" header from responses
//     (minor security hardening).
// =============================================================================

import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Allow Next.js Image Optimization to load cookie photos from any
  // HTTPS source (for external CDNs) and from localhost in development.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },

  // Proxy all /api/* requests to the Hono API backend. The frontend
  // never talks to the API directly — Next.js handles the forwarding.
  async rewrites() {
    const apiUrl = process.env.WEB_API_URL ?? 'http://localhost:14045';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },

  // Origins allowed to access the dev server (including wildcard
  // subdomains on mahara.web.id for testing deployments).
  allowedDevOrigins: ['*.mahara.web.id', 'localhost', '127.0.0.1'],
};

export default config;
