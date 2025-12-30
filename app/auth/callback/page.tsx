'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    // 1. Supabase automatically detects the "code" in the URL here.
    // 2. It exchanges that code for a Session.
    // 3. Once we have a session, we redirect to the Dashboard.
    
    const handleAuth = async () => {
      // Check if we already have a session (the exchange happened automatically)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        router.push('/dashboard')
      } else {
        // If not, listen for the sign-in event
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' || session) {
            router.push('/dashboard')
          }
        })
        return () => subscription.unsubscribe()
      }
    }

    handleAuth()
  }, [router])

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-slate-600">Finalizing secure login...</p>
      </div>
    </div>
  )
}