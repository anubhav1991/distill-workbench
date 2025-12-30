'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { LogOut, FileText, Search, Settings, ArrowDown, CheckCircle2, Circle, Sparkles, FastForward, CheckSquare, X, Key, MousePointerClick, MessageSquare, Loader2, Calendar, User } from 'lucide-react'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  
  // UI States
  const [showWelcome, setShowWelcome] = useState(false)
  
  // Data States
  const [loading, setLoading] = useState(false)
  const [scanProgress, setScanProgress] = useState('') 
  const [searchTerm, setSearchTerm] = useState('')
  const [transcripts, setTranscripts] = useState<any[]>([])
  
  // Pagination States
  const [skip, setSkip] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [checkedCount, setCheckedCount] = useState(0)
  const [oldestDate, setOldestDate] = useState<string | null>(null)

  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/')
      else setUser(user)

      const hasSeenWelcome = localStorage.getItem('hasSeenWelcome')
      if (!hasSeenWelcome) setShowWelcome(true)
    }
    initUser()
  }, [router])

  const dismissWelcome = () => {
    setShowWelcome(false)
    localStorage.setItem('hasSeenWelcome', 'true')
  }

  const fetchPage = async (currentSkip: number, session: any) => {
    try {
      const res = await fetch('/api/fireflies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ 
            searchQuery: searchTerm,
            skip: currentSkip 
        }),
      })
      const data = await res.json()
      
      // Handle Missing Key Error Gracefully
      if (data.error && data.error.includes('Key')) {
        if(confirm("You need to add your Fireflies API Key first. Go to settings?")) {
            router.push('/dashboard/settings')
        }
        return null
      }
      
      if (data.error) throw new Error(data.error)
      
      return {
        newTranscripts: data.transcripts || [],
        hasMore: data.hasMore
      }
    } catch (e) {
      console.error(e)
      return null
    }
  }

  const executeSearch = async (mode: 'new' | 'next' | 'deep') => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    
    let currentSkip = mode === 'new' ? 0 : skip + 50
    let accumulatedTranscripts: any[] = []
    let moreAvailable = false

    if (mode === 'new' || mode === 'next') {
        const result = await fetchPage(currentSkip, session)
        if (result) {
            accumulatedTranscripts = result.newTranscripts
            moreAvailable = result.hasMore
            
            if (mode === 'new') {
                setTranscripts(result.newTranscripts)
                setCheckedCount(50)
            } else {
                setTranscripts(prev => {
                    const existingIds = new Set(prev.map(t => t.id))
                    const uniqueNew = result.newTranscripts.filter((t: any) => !existingIds.has(t.id))
                    return [...prev, ...uniqueNew]
                })
                setCheckedCount(prev => prev + 50)
            }
            setSkip(currentSkip)
            setHasMore(moreAvailable)
        }
    } 
    else if (mode === 'deep') {
        let pagesToFetch = 10
        let tempSkip = currentSkip
        
        for (let i = 0; i < pagesToFetch; i++) {
            setScanProgress(`Scanning... batch ${i + 1} of ${pagesToFetch}`)
            const result = await fetchPage(tempSkip, session)
            
            if (!result) break; 
            
            accumulatedTranscripts.push(...result.newTranscripts)
            tempSkip += 50
            
            if (!result.hasMore) {
                moreAvailable = false
                break
            } else {
                moreAvailable = true
            }
        }
        
        setTranscripts(prev => {
            const existingIds = new Set(prev.map(t => t.id))
            const uniqueNew = accumulatedTranscripts.filter((t: any) => !existingIds.has(t.id))
            return [...prev, ...uniqueNew]
        })

        setCheckedCount(prev => prev + (pagesToFetch * 50))
        setSkip(tempSkip - 50)
        setHasMore(moreAvailable)
        setScanProgress('')
    }

    setTimeout(() => {
        setTranscripts(currentList => {
            if (currentList.length > 0) {
                const lastItem = currentList[currentList.length - 1]
                setOldestDate(lastItem.date)
            }
            return currentList
        })
    }, 100)
    
    setLoading(false)
  }

  const handleNewSearch = () => {
    setTranscripts([])
    setSelectedIds([]) 
    setOldestDate(null)
    executeSearch('new')
  }

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleToggleSelectAll = () => {
    if (selectedIds.length === transcripts.length) {
        setSelectedIds([])
    } else {
        setSelectedIds(transcripts.map(t => t.id))
    }
  }

  const handleGoToWorkbench = () => {
    const ids = selectedIds.join(',')
    router.push(`/dashboard/workbench?ids=${ids}`)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!user) return <div className="p-10">Loading...</div>

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <nav className="border-b bg-white px-6 py-4 shadow-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          {/* BRANDING UPDATE */}
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Distill</h1>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="hidden md:inline text-sm text-slate-600">{user.email}</span>
            <button 
              onClick={() => router.push('/dashboard/settings')}
              className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
            <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-red-600 ml-2">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        
        {/* BANNER UPDATE */}
        {showWelcome && (
            <div className="mb-8 rounded-xl border border-blue-100 bg-blue-50 p-6 relative animate-in slide-in-from-top-4">
                <button onClick={dismissWelcome} className="absolute top-4 right-4 text-blue-400 hover:text-blue-700">
                    <X className="h-5 w-5" />
                </button>
                <h3 className="text-lg font-bold text-blue-900 mb-2">Welcome to Distill! 🚀</h3>
                <p className="text-sm text-blue-700 mb-4">Turn your meeting history into actionable insights.</p>
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="flex items-start gap-3 bg-white p-3 rounded-lg shadow-sm">
                        <div className="bg-blue-100 p-2 rounded-md"><Key className="h-4 w-4 text-blue-600"/></div>
                        <div className="text-sm">
                            <p className="font-semibold text-slate-900">1. Add Keys</p>
                            <p className="text-slate-500 text-xs">Connect your Fireflies & AI accounts in Settings.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 bg-white p-3 rounded-lg shadow-sm">
                        <div className="bg-blue-100 p-2 rounded-md"><Search className="h-4 w-4 text-blue-600"/></div>
                        <div className="text-sm">
                            <p className="font-semibold text-slate-900">2. Find</p>
                            <p className="text-slate-500 text-xs">Search deep into your history by topic or email.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 bg-white p-3 rounded-lg shadow-sm">
                        <div className="bg-blue-100 p-2 rounded-md"><Sparkles className="h-4 w-4 text-blue-600"/></div>
                        <div className="text-sm">
                            <p className="font-semibold text-slate-900">3. Distill</p>
                            <p className="text-slate-500 text-xs">Select meetings and ask Distill for the insights.</p>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-900">Library</h2>
                {transcripts.length > 0 && (
                    <button 
                        onClick={handleToggleSelectAll}
                        className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
                    >
                        <CheckSquare className="h-4 w-4" />
                        {selectedIds.length === transcripts.length ? 'Deselect All' : 'Select All'}
                    </button>
                )}
            </div>

            {selectedIds.length > 0 && (
                <span className="self-start sm:self-auto text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    {selectedIds.length} selected
                </span>
            )}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNewSearch()}
                className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-4 text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="Search by meeting name or email..." 
              />
            </div>
            <button 
              onClick={handleNewSearch}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-6 font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              {loading && skip === 0 ? <Loader2 className="animate-spin h-5 w-5"/> : 'Search'}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm text-slate-500 px-1 gap-2">
             <p>
                Found {transcripts.length} match{transcripts.length !== 1 && 'es'} 
                {checkedCount > 0 && ` (scanned ${checkedCount} meetings)`}
             </p>
             {oldestDate && (
                 <p className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    History visible back to: <span className="font-semibold text-slate-700">{new Date(oldestDate).toLocaleDateString()}</span>
                 </p>
             )}
          </div>

          {/* MOBILE OPTIMIZED GRID (grid-cols-1) */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {transcripts.map((t: any) => {
              const isSelected = selectedIds.includes(t.id)
              return (
                <div 
                    key={t.id} 
                    onClick={() => toggleSelection(t.id)}
                    className={`group relative flex flex-col justify-between rounded-xl border p-6 shadow-sm transition-all cursor-pointer
                        ${isSelected ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/10' : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md'}
                    `}
                >
                    <div className="absolute top-4 right-4">
                        {isSelected ? (
                            <CheckCircle2 className="h-6 w-6 text-blue-600 fill-blue-100" />
                        ) : (
                            <Circle className="h-6 w-6 text-slate-300 group-hover:text-blue-400" />
                        )}
                    </div>

                    <div>
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                            <Calendar className="h-3 w-3" />
                            {new Date(t.date).toLocaleDateString()}
                        </div>
                        <h3 className="mt-2 text-lg font-semibold text-slate-900 line-clamp-2 pr-8">
                            {t.title || 'Untitled Meeting'}
                        </h3>
                        <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                            <User className="h-4 w-4 text-slate-400" />
                            <span className="truncate">{t.organizer_email}</span>
                        </div>
                    </div>
                </div>
              )
            })}
          </div>

          {hasMore && (
            <div className="flex flex-col items-center gap-4 pt-8 border-t border-dashed mt-8">
                {scanProgress && (
                    <div className="flex items-center gap-2 text-blue-600 animate-pulse font-medium">
                        <Loader2 className="animate-spin h-4 w-4"/>
                        {scanProgress}
                    </div>
                )}
                
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <button 
                        onClick={() => executeSearch('next')}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-all disabled:opacity-50"
                    >
                        <ArrowDown className="h-4 w-4"/>
                        Load next 50
                    </button>
                    
                    <button 
                        onClick={() => executeSearch('deep')}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-200 hover:text-blue-700 transition-all disabled:opacity-50"
                    >
                        <FastForward className="h-4 w-4"/>
                        Auto-Scan next 500
                    </button>
                </div>
            </div>
          )}

          {!loading && checkedCount > 0 && transcripts.length === 0 && !hasMore && (
            <div className="text-center py-20">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <FileText className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-slate-900">No transcripts found</h3>
              <p className="mt-1 text-slate-500">Checked {checkedCount} meetings back to {oldestDate ? new Date(oldestDate).toLocaleDateString() : 'now'}.</p>
            </div>
          )}
        </div>
      </main>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md px-4 animate-in slide-in-from-bottom-4 duration-200 z-50">
            <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between border border-slate-700">
                <div className="flex flex-col px-2">
                    <span className="font-bold">{selectedIds.length} Selected</span>
                    <span className="text-xs text-slate-400">Ready to Distill</span>
                </div>
                <button 
                    onClick={handleGoToWorkbench}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-semibold transition-all shadow-lg hover:shadow-blue-900/20"
                >
                    <Sparkles className="w-4 h-4" />
                    Open Workbench
                </button>
            </div>
        </div>
      )}
    </div>
  )
}