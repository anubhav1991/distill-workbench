'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase' // Ensure this path matches your project
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles, ShieldCheck, Zap } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/dashboard')
      }
    }
    checkUser()
  }, [router])

  const handleLogin = async () => {
    setLoading(true)
    
    // DYNAMIC REDIRECT: Uses the current browser URL
    // On localhost, this is http://localhost:3000
    // On Prod, this is https://distillworkbench.com
    const redirectTo = `${window.location.origin}/auth/callback`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
        alert(error.message)
        setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-10 shadow-xl border border-slate-100">
        
        {/* Logo / Brand */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
          <Sparkles className="h-8 w-8 text-blue-600" />
        </div>
        
        <div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Distill
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Your meeting intelligence workbench.
          </p>
        </div>

        {/* Login Button */}
        <div className="mt-8 space-y-4">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 disabled:opacity-50 hover:shadow-lg"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              // Google SVG Icon
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            {loading ? 'Connecting...' : 'Continue with Google'}
          </button>
        </div>
        
        {/* Footer Features */}
        <div className="mt-8 grid grid-cols-2 gap-4 border-t pt-6">
            <div className="flex flex-col items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-slate-400"/>
                <span className="text-xs font-medium text-slate-500">Secure Auth</span>
            </div>
            <div className="flex flex-col items-center gap-2">
                <Zap className="h-5 w-5 text-slate-400"/>
                <span className="text-xs font-medium text-slate-500">AI Powered</span>
            </div>
        </div>

      </div>
    </div>
  )
}