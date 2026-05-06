'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import AuthModal from '@/components/landing/AuthModal'

function LoginContent() {
  const router = useRouter()
  const params = useSearchParams()
  const tab = params.get('tab') === 'signup' ? 'signup' : 'signin'

  console.log('[LoginPage] Rendering with tab:', tab)
  
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      <AuthModal
        isOpen={true}
        onClose={() => {
          console.log('[LoginPage] onClose called - redirecting to home')
          router.push('/')
        }}
        onSuccess={() => {
          console.log('[LoginPage] onSuccess called - redirecting to /recipes')
          router.push('/recipes')
        }}
        defaultTab={tab}
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
