import { createPublicClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export const revalidate = 3600

const STATIC_PAGES = {
  'privacy-policy': {
    title: 'Privacy Policy',
    content: `
<h2>Privacy Policy</h2>
<p><strong>Last updated:</strong> April 2026</p>

<h3>1. Data We Collect</h3>
<p>MintyFit (Smart Diet OÜ) collects the following information to provide the service:</p>
<ul>
  <li>Account information: email, name, profile photo (via OAuth)</li>
  <li>Health data: age, weight, height, dietary preferences, goals — used solely for nutrition calculations</li>
  <li>Usage data: recipes generated, meals logged, activity tracked</li>
</ul>

<h3>2. How We Use Your Data</h3>
<p>Your data is used exclusively to:</p>
<ul>
  <li>Calculate personalized nutrition targets for you and your family members</li>
  <li>Generate AI-powered recipe suggestions</li>
  <li>Build your meal plan and shopping list</li>
</ul>
<p>We never sell your data. We never use your health data for advertising.</p>

<h3>3. Data Storage</h3>
<p>Data is stored in Supabase (EU region). Supabase is GDPR compliant. Data is encrypted at rest and in transit.</p>

<h3>4. Your Rights (GDPR)</h3>
<p>If you are in the EU/EEA, you have the right to:</p>
<ul>
  <li><strong>Access</strong> your data — email gdpr@mintyfit.com</li>
  <li><strong>Rectify</strong> incorrect data — update in My Account</li>
  <li><strong>Delete</strong> your account and all data — Settings → Delete Account</li>
  <li><strong>Export</strong> your data — Settings → Export Data</li>
  <li><strong>Object</strong> to processing — contact gdpr@mintyfit.com</li>
</ul>

<h3>5. Cookies</h3>
<p>We use only essential cookies required for authentication. No third-party advertising cookies.</p>

<h3>6. Third-Party Services</h3>
<ul>
  <li>Supabase (database, auth)</li>
  <li>Anthropic Claude (AI recipe generation)</li>
  <li>Stripe (payment processing — we never see your full card number)</li>
  <li>Vercel (hosting)</li>
</ul>

<h3>7. Contact</h3>
<p>Smart Diet OÜ · Estonia · gdpr@mintyfit.com</p>
    `,
  },
  'terms-of-service': {
    title: 'Terms of Service',
    content: `
<h2>Terms of Service</h2>
<p><strong>Last updated:</strong> April 2026</p>

<h3>1. Acceptance</h3>
<p>By using MintyFit, you agree to these Terms. MintyFit is operated by Smart Diet OÜ, Estonia.</p>

<h3>2. Service Description</h3>
<p>MintyFit provides AI-powered family nutrition planning. The service includes meal planning, recipe generation, and nutritional guidance. MintyFit is not a medical service. Consult a healthcare provider for medical nutrition advice.</p>

<h3>3. Account</h3>
<ul>
  <li>You must be 16+ to create an account</li>
  <li>You are responsible for your account security</li>
  <li>One account per person</li>
</ul>

<h3>4. Subscription</h3>
<p>Free tier: limited recipe generations per month. Pro ($4.99/mo): unlimited. Family ($7.99/mo): unlimited + family features. Subscriptions renew automatically. Cancel anytime in Settings.</p>

<h3>5. AI-Generated Content</h3>
<p>Recipes and nutritional information are AI-generated and may contain errors. MintyFit does not guarantee nutritional accuracy. Always verify ingredients against allergen requirements.</p>

<h3>6. Prohibited Use</h3>
<ul>
  <li>Do not use the service to scrape data</li>
  <li>Do not attempt to reverse-engineer the AI models</li>
  <li>Do not share your account credentials</li>
</ul>

<h3>7. Termination</h3>
<p>We may terminate accounts that violate these Terms. You may delete your account at any time.</p>

<h3>8. Limitation of Liability</h3>
<p>MintyFit is provided "as is". Smart Diet OÜ is not liable for inaccurate nutritional data or health outcomes.</p>

<h3>9. Governing Law</h3>
<p>These Terms are governed by Estonian law. Disputes resolved in Estonian courts.</p>

<h3>10. Contact</h3>
<p>Smart Diet OÜ · legal@mintyfit.com</p>
    `,
  },
}

async function getCmsPage(slug) {
  if (STATIC_PAGES[slug]) return STATIC_PAGES[slug]
  const supabase = createPublicClient()
  const { data } = await supabase
    .from('pages')
    .select('title, content, seo_title, seo_description')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()
  return data
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const page = await getCmsPage(slug)
  if (!page) return { title: 'Page Not Found — MintyFit' }
  return {
    title: `${page.seo_title || page.title} — MintyFit`,
    description: page.seo_description || page.title,
    alternates: { canonical: `/pages/${slug}` },
  }
}

export default async function CmsPage({ params }) {
  const { slug } = await params
  const page = await getCmsPage(slug)
  if (!page) notFound()

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1rem' }}>
      <nav style={{ marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary, #6b7280)' }}>
        <Link href="/" style={{ color: '#10b981', textDecoration: 'none' }}>Home</Link>
        {' / '}
        <span>{page.title}</span>
      </nav>

      <div
        style={{ lineHeight: 1.8, color: 'var(--text-primary, #374151)' }}
        dangerouslySetInnerHTML={{ __html: page.content }}
      />

      <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color, #e5e7eb)', fontSize: '0.875rem', color: 'var(--text-secondary, #6b7280)' }}>
        <Link href="/" style={{ color: '#10b981', textDecoration: 'none' }}>← Back to MintyFit</Link>
      </div>
    </div>
  )
}
