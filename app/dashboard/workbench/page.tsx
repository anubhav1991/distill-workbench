'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Send, Sparkles, Bot, Loader2, PanelRightOpen, PanelRightClose, MessageSquare } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

export default function WorkbenchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ids = searchParams.get('ids')?.split(',') || []

  // Data States
  const [loading, setLoading] = useState(true)
  const [transcripts, setTranscripts] = useState<any[]>([])
  
  // UI States
  const [selectedTranscriptId, setSelectedTranscriptId] = useState<string | null>(null)
  const [showSidebar, setShowSidebar] = useState(true)
  const [mobileTab, setMobileTab] = useState<'chat' | 'transcript'>('chat')
  const [selectedModel, setSelectedModel] = useState<'gemini' | 'openai'>('gemini')

  // Chat States
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchFullTranscripts = async () => {
      if (ids.length === 0) return
      
      const { data: { session } } = await supabase.auth.getSession()
      
      const res = await fetch('/api/fireflies/batch', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ ids })
      })
      const data = await res.json()
      
      if (data.transcripts) {
        setTranscripts(data.transcripts)
        if (data.transcripts.length > 0) setSelectedTranscriptId(data.transcripts[0].id)
      }
      setLoading(false)
    }
    fetchFullTranscripts()
  }, []) 

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleSendMessage = async () => {
    if (!input.trim()) return

    const newMsg = { role: 'user', content: input }
    setMessages(prev => [...prev, newMsg])
    setInput('')
    setIsTyping(true)

    const context = transcripts.map(t => {
        const text = t.sentences ? t.sentences.map((s: any) => `${s.speaker_name}: ${s.text}`).join('\n') : "(No transcript text available)"
        return `Meeting: ${t.title} (${new Date(t.date).toLocaleDateString()})\n\n${text}`
    }).join('\n\n---\n\n')

    try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({ 
                messages: [...messages, newMsg], 
                context, 
                model: selectedModel 
            })
        })
        const data = await res.json()
        
        if (data.error) throw new Error(data.error)

        setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
    } catch (e: any) {
        setMessages(prev => [...prev, { role: 'assistant', content: "Error: " + e.message }])
    } finally {
        setIsTyping(false)
    }
  }

  if (loading) return (
    <div className="flex h-screen flex-col items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="mt-4 text-slate-600 font-medium">Loading your workbench...</p>
    </div>
  )

  const activeTranscript = transcripts.find(t => t.id === selectedTranscriptId)

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
        
        {/* MOBILE TAB SWITCHER */}
        <div className="md:hidden flex border-b bg-slate-50">
            <button 
                onClick={() => setMobileTab('chat')}
                className={`flex-1 py-3 text-sm font-medium ${mobileTab === 'chat' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-500'}`}
            >
                AI Chat
            </button>
            <button 
                onClick={() => setMobileTab('transcript')}
                className={`flex-1 py-3 text-sm font-medium ${mobileTab === 'transcript' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-500'}`}
            >
                Transcripts ({transcripts.length})
            </button>
        </div>

        <div className="flex flex-1 overflow-hidden relative">
            
            {/* --- LEFT SIDE: CHAT INTERFACE --- */}
            <div className={`flex flex-col transition-all duration-300 bg-slate-50/30
                ${mobileTab === 'transcript' ? 'hidden md:flex' : 'flex w-full'}
                ${showSidebar ? 'md:w-1/2 md:border-r' : 'md:w-full'}
            `}>
                
                {/* Desktop Header */}
                <header className="hidden md:flex items-center justify-between border-b px-6 py-4 bg-white shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-800 p-1 hover:bg-slate-100 rounded-md transition-all">
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div>
                            {/* BRANDING UPDATE */}
                            <h1 className="text-lg font-bold text-slate-900">Distill Workbench</h1>
                            <p className="text-xs text-slate-500">{transcripts.length} sources loaded</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <select 
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value as any)}
                            className="text-xs font-medium border rounded-md px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                        >
                            <option value="gemini">Google Gemini 2.5</option>
                            <option value="openai">GPT-4o</option>
                        </select>
                        
                        {!showSidebar && (
                            <button onClick={() => setShowSidebar(true)} className="text-slate-500 hover:text-slate-800 ml-2">
                                <PanelRightOpen className="h-5 w-5"/>
                            </button>
                        )}
                    </div>
                </header>

                {/* Mobile Header (Back Button) */}
                <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b">
                    <button onClick={() => router.back()} className="flex items-center text-slate-500">
                        <ArrowLeft className="h-4 w-4 mr-1" /> Back
                    </button>
                     <select 
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value as any)}
                        className="text-xs border rounded-md px-2 py-1 bg-slate-50"
                    >
                        <option value="gemini">Gemini 2.5</option>
                        <option value="openai">GPT-4o</option>
                    </select>
                </header>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60 text-center">
                            <Sparkles className="h-12 w-12 md:h-16 md:w-16 mb-4" />
                            <p className="text-lg font-medium">Ask questions about your meetings.</p>
                        </div>
                    )}
                    
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex gap-3 md:gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'assistant' && (
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 border border-blue-200">
                                    <Bot className="h-4 w-4 text-blue-600" />
                                </div>
                            )}
                            
                            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
                                ${msg.role === 'user' 
                                    ? 'bg-slate-900 text-white rounded-br-none' 
                                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'}
                            `}>
                                {msg.role === 'user' ? msg.content : (
                                    <ReactMarkdown
                                        components={{
                                            ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                                            ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                                            li: ({node, ...props}) => <li className="pl-1" {...props} />,
                                            strong: ({node, ...props}) => <strong className="font-semibold text-slate-900" {...props} />,
                                            h1: ({node, ...props}) => <h1 className="text-lg font-bold mt-4 mb-2" {...props} />,
                                            h2: ({node, ...props}) => <h2 className="text-base font-bold mt-3 mb-2" {...props} />,
                                            p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                        }}
                                    >
                                        {msg.content}
                                    </ReactMarkdown>
                                )}
                            </div>
                        </div>
                    ))}
                    
                    {isTyping && (
                         <div className="flex gap-4">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200">
                                <Bot className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="bg-white border px-4 py-3 rounded-2xl rounded-bl-none flex items-center gap-1">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t shrink-0">
                    <div className="flex gap-2 max-w-3xl mx-auto">
                        <input 
                            type="text" 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Type a message..."
                            className="flex-1 bg-slate-100 border-0 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <button 
                            onClick={handleSendMessage}
                            disabled={!input.trim() || isTyping}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-3 rounded-xl transition-all"
                        >
                            <Send className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* --- RIGHT SIDE: TRANSCRIPT VIEWER --- */}
            <div className={`flex flex-col bg-white h-full
                ${mobileTab === 'chat' ? 'hidden md:flex' : 'flex w-full'}
                ${showSidebar ? 'md:w-1/2 md:border-l' : 'hidden'}
            `}>
                {/* Viewer Header */}
                <div className="flex items-center justify-between border-b px-4 py-3 bg-slate-50 shrink-0">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-[80%]">
                        {transcripts.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setSelectedTranscriptId(t.id)}
                                className={`text-xs whitespace-nowrap px-3 py-1.5 rounded-full border transition-all
                                    ${selectedTranscriptId === t.id 
                                        ? 'bg-white border-slate-300 shadow-sm text-slate-900 font-medium' 
                                        : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-200'}
                                `}
                            >
                                {t.title || 'Untitled'}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setShowSidebar(false)} className="hidden md:block text-slate-400 hover:text-slate-600">
                        <PanelRightClose className="h-5 w-5"/>
                    </button>
                </div>

                {/* Transcript Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-white">
                    {activeTranscript ? (
                        <div className="max-w-2xl mx-auto">
                            <h2 className="text-xl font-bold text-slate-900 mb-2">{activeTranscript.title}</h2>
                            <div className="flex items-center gap-4 text-xs text-slate-500 mb-8 pb-4 border-b">
                                <span>{new Date(activeTranscript.date).toLocaleDateString()}</span>
                                <span>•</span>
                                <span>Organizer: {activeTranscript.organizer_email}</span>
                            </div>

                            <div className="space-y-6">
                                {activeTranscript.sentences && activeTranscript.sentences.length > 0 ? (
                                    activeTranscript.sentences.map((sentence: any, i: number) => (
                                        <div key={i} className="flex gap-3 md:gap-4 group">
                                            <div className="w-20 md:w-24 shrink-0 text-xs font-semibold text-slate-400 text-right pt-1 truncate">
                                                {sentence.speaker_name || 'Speaker'}
                                            </div>
                                            <div className="flex-1 text-sm text-slate-700 leading-relaxed group-hover:text-slate-900">
                                                {sentence.text}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-20 text-slate-400">
                                        <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-20"/>
                                        <p>Transcript text is processing or unavailable.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400">
                            Select a transcript above to view details
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  )
}