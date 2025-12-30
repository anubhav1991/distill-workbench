import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const FIREFLIES_ENDPOINT = 'https://api.fireflies.ai/graphql'

export async function POST(request: Request) {
  try {
    const { ids } = await request.json() // Receives specific IDs e.g. ["123", "456"]
    
    // 1. Auth & Key Retrieval
    const authHeader = request.headers.get('Authorization')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader || '' } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: settings } = await supabase
      .from('user_settings')
      .select('fireflies_key')
      .eq('user_id', user.id)
      .single()

    if (!settings?.fireflies_key) {
      return NextResponse.json({ error: 'Missing Fireflies Key' }, { status: 400 })
    }

    // 2. Fetch All Transcripts in Parallel
    // We fire off a request for every ID simultaneously
    const fetchPromises = ids.map(async (id: string) => {
        const query = `
          query GetTranscript {
            transcript(id: "${id}") {
              id
              title
              date
              sentences {
                index
                speaker_name
                text
              }
            }
          }
        `
        const res = await fetch(FIREFLIES_ENDPOINT, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.fireflies_key}`
            },
            body: JSON.stringify({ query })
        })
        const json = await res.json()
        return json.data?.transcript
    })

    const results = await Promise.all(fetchPromises)
    const transcripts = results.filter(t => t !== null)

    return NextResponse.json({ transcripts })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Batch fetch failed' }, { status: 500 })
  }
}