import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: Request) {
  try {
    const { messages, context, model } = await request.json()
    
    // 1. Auth & Keys
    const authHeader = request.headers.get('Authorization')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader || '' } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get API Keys securely from DB
    const { data: settings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // 2. Prepare the System Prompt
    const systemPrompt = `
      You are an expert meeting analyst. 
      Answer the user's question based ONLY on the following meeting transcripts.
      
      TRANSCRIPTS:
      ${context}
    `

    // 3. Route to the correct AI Model
    if (model === 'gemini') {
        if (!settings?.gemini_key) throw new Error('Gemini API Key missing in Settings')
        
        const genAI = new GoogleGenerativeAI(settings.gemini_key)
        
        // UPDATED MODEL: gemini-2.5-flash is the current standard in late 2025
        const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
        
        const lastUserMessage = messages[messages.length - 1].content
        const fullPrompt = `${systemPrompt}\n\nUser Question: ${lastUserMessage}`
        
        const result = await geminiModel.generateContent(fullPrompt)
        const response = result.response.text()
        
        return NextResponse.json({ content: response })
    } 
    else {
        // Default to OpenAI
        if (!settings?.openai_key) throw new Error('OpenAI API Key missing in Settings')
            
        const openai = new OpenAI({ apiKey: settings.openai_key })
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4o", // Updated to GPT-4o for better performance
            messages: [
                { role: "system", content: systemPrompt },
                ...messages
            ],
        })

        return NextResponse.json({ content: completion.choices[0].message.content })
    }

  } catch (error: any) {
    console.error("Chat API Error:", error)
    return NextResponse.json({ error: error.message || 'AI processing failed' }, { status: 500 })
  }
}