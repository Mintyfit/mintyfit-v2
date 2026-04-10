'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(undefined)
  const [authReady, setAuthReady] = useState(false)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  async function fetchProfile(userId) {
    if (!supabase) return null
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) { console.error('Error fetching profile:', error); return null }
    return data
  }

  useEffect(() => {
    if (!supabase) {
      setUser(null)
      setAuthReady(true)
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthReady(true)
      setLoading(false)
      if (session?.user) fetchProfile(session.user.id).then(setProfile)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) fetchProfile(session.user.id).then(setProfile)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signUp(email, password, fullName, gdprConsent = false) {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') }
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, gdpr_consent: gdprConsent } },
    })
    return { data, error }
  }

  async function signInWithEmail(email, password) {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  async function signInWithGoogle() {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    })
    return { data, error }
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  async function resetPassword(email) {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') }
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { data, error }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      setProfile, 
      loading, 
      authReady,
      signOut,
      signUp,
      signInWithEmail,
      signInWithGoogle,
      resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
