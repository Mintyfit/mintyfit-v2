/**
 * ROOT LAYOUT — CSS, Font & Provider Architecture
 * -------------------------------------------------
 * BEFORE CHANGING THIS FILE, understand the full system:
 *
 * FONTS — Single source of truth: localFont (next/font/local).
 *   It outputs CSS variable --font-montserrat, consumed in globals.css body {}.
 *   DO NOT add @font-face to globals.css — that creates conflicting font setups.
 *
 * COLORS — Single source of truth: CSS custom properties in globals.css
 *   (:root for light, .dark for dark). ThemeProvider only toggles .dark class
 *   on <html> via useEffect. No other component sets --primary, --bg-*, etc.
 *
 * PROVIDER ORDER — Must be preserved:
 *   ThemeProvider > AuthProvider > [NavbarWrapper, main, ThemeToggle]
 *   This order ensures theme is available before auth renders.
 *
 * HYDRATION — suppressHydrationWarning on <body> is intentional.
 *   ThemeProvider resolves dark/light after mount (reads localStorage),
 *   which always differs from server render. This is benign.
 */
import localFont from 'next/font/local'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import NavbarWrapper from '@/components/shared/NavbarWrapper'
import ThemeToggle from '@/components/shared/ThemeToggle'
import './globals.css'

const montserrat = localFont({
  src: [
    { path: '../public/fonts/montserrat-300-700-latin-ext.woff2', weight: '300 800', style: 'normal' },
    { path: '../public/fonts/montserrat-300-700-latin.woff2', weight: '300 800', style: 'normal' },
  ],
  variable: '--font-montserrat',
  display: 'swap',
  adjustFontFallback: 'Arial',
})

export const metadata = {
  metadataBase: new URL('https://mintyfit.com'),
  title: {
    default: 'MintyFit — Family Nutrition & Meal Planning',
    template: '%s | MintyFit',
  },
  description: 'The only nutrition platform built for families, not individuals. AI-powered meal planning with personalized portions for every family member.',
  keywords: ['family nutrition', 'meal planning', 'AI nutrition', 'personalized diet', 'family meal planner'],
  authors: [{ name: 'MintyFit', url: 'https://mintyfit.com' }],
  creator: 'MintyFit',
  publisher: 'Smart Diet OÜ',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://mintyfit.com',
    siteName: 'MintyFit',
    title: 'MintyFit — Family Nutrition & Meal Planning',
    description: 'The only nutrition platform built for families, not individuals.',
    images: [{ url: '/MintyHero.webp', width: 1200, height: 630, alt: 'MintyFit — Family Nutrition' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MintyFit — Family Nutrition & Meal Planning',
    description: 'AI-powered meal planning for the whole family.',
    images: ['/MintyHero.webp'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon-192.png',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <NavbarWrapper />
            <main style={{ minHeight: '100vh' }}>{children}</main>
            <ThemeToggle />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
