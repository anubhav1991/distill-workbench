'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Bot, Lock, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/dashboard`,
      },
    })
    if (error) {
      alert(error.message)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white">
      <div className="w-full max-w-md space-y-8 px-4 text-center">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-xl">
            <Bot className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
            Transcript Reader AI
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Sign in to analyze your Fireflies.ai meetings with Gemini & GPT-4
          </p>
        </div>

        {/* Login Button */}
        <div className="mt-8">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="group relative flex w-full justify-center rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50 transition-all"
            >
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-4 w-4 text-slate-400 group-hover:text-slate-300" />
              </span>
              {loading ? 'Connecting to Google...' : 'Sign in with Google'}
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </button>
        </div>
        
        <p className="text-xs text-slate-400 mt-8">
            Production Ready V1.0 • Secure Auth by Supabase
        </p>
      </div>
    </div>
  )
}