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
          '/nutritionist',
          '/plan',
          '/statistics',
          '/shopping-list',
          '/onboarding',
          '/family-invite/',
          '/api/',
        ],
      },
    ],
    sitemap: 'https://mintyfit.com/sitemap.xml',
  }
}
