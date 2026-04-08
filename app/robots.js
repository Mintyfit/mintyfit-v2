export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/my-account',
          '/my-family',
          '/plan',
          '/statistics',
          '/onboarding',
          '/api/',
        ],
      },
    ],
    sitemap: 'https://mintyfit.com/sitemap.xml',
  }
}
