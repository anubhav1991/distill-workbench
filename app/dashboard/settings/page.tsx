'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Save, Loader2, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [keys, setKeys] = useState({ fireflies_key: '', openai_key: '', gemini_key: '' })

  useEffect(() => {
    const fetchSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data) setKeys(data)
    }
    fetchSettings()
  }, [])

  const handleSave = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Upsert means "Insert if new, Update if exists"
    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: user.id, ...keys })

    if (error) alert('Error saving keys: ' + error.message)
    else alert('Keys saved successfully!')
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-2xl bg-white p-8 rounded-xl shadow-sm border">
        <button onClick={() => router.back()} className="flex items-center text-slate-500 mb-6 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4 mr-2"/> Back to Dashboard
        </button>
        
        <h1 className="text-2xl font-bold mb-6">API Configuration</h1>
        
        <div className="space-y-6">
          
          {/* Fireflies Section */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Fireflies.ai API Key</label>
            <input 
              type="password" 
              value={keys.fireflies_key || ''}
              onChange={(e) => setKeys({...keys, fireflies_key: e.target.value})}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Enter your key (starts with un_...)"
            />
            <p className="text-xs text-slate-500 mt-1">Found in Fireflies Dashboard {'>'} Integrations {'>'} Custom Apps</p>
          </div>

          <hr />

          {/* AI Keys Section (Future Proofing) */}
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">OpenAI Key (Optional)</label>
                <input 
                  type="password"
                  value={keys.openai_key || ''}
                  onChange={(e) => setKeys({...keys, openai_key: e.target.value})}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Gemini Key (Optional)</label>
                <input 
                  type="password"
                  value={keys.gemini_key || ''}
                  onChange={(e) => setKeys({...keys, gemini_key: e.target.value})}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                />
             </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={loading}
            className="flex items-center justify-center w-full bg-slate-900 text-white py-3 rounded-lg hover:bg-slate-800 transition-all"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5"/> : <><Save className="w-4 h-4 mr-2"/> Save Keys</>}
          </button>
        </div>
      </div>
    </div>
  )
}