'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import AuthModal from '@/components/landing/AuthModal'

function LoginContent() {
  const router = useRouter()
  const params = useSearchParams()
  const tab = params.get('tab') === 'signup' ? 'signup' : 'signin'
  const redirectTo = params.get('redirect') || '/recipes'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      <AuthModal
        isOpen={true}
        onClose={() => router.push('/')}
        onSuccess={() => router.push(redirectTo)}
        defaultTab={tab}
        redirectAfter={redirectTo}
      />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
