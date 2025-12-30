import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const FIREFLIES_ENDPOINT = 'https://api.fireflies.ai/graphql'

export async function POST(request: Request) {
  try {
    const { searchQuery, skip = 0 } = await request.json()
    
    // 1. Auth Check
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
      return NextResponse.json({ error: 'No Fireflies Key found. Please add it in Settings.' }, { status: 400 })
    }

    // 2. Search Logic (Reverted to Limit 50 for safety)
    const isEmailSearch = searchQuery.includes('@')
    
    // Construct the argument string carefully
    // If it's an email search, we only use skip
    // If it's a keyword search, we use skip AND keyword
    const queryArgument = isEmailSearch 
      ? `skip: ${skip}` 
      : `skip: ${skip}${searchQuery ? `, keyword: "${searchQuery}"` : ''}`

    const query = `
      query Transcripts {
        transcripts(limit: 50, ${queryArgument}) {
          id
          title
          date
          organizer_email
          meeting_attendees {
            email
            displayName
          }
        }
      }
    `

    // Log the query to the terminal for debugging
    console.log("Sending Query to Fireflies:", queryArgument)

    const response = await fetch(FIREFLIES_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.fireflies_key}`
      },
      body: JSON.stringify({ query })
    })

    const data = await response.json()
    
    if (data.errors) {
        console.error("Fireflies API Error:", JSON.stringify(data.errors, null, 2))
        return NextResponse.json({ error: data.errors[0].message }, { status: 500 })
    }

    let results = data.data?.transcripts || []

    // 3. Filter Logic
    if (isEmailSearch) {
      const term = searchQuery.toLowerCase()
      results = results.filter((t: any) => {
        const organizerMatch = t.organizer_email?.toLowerCase().includes(term)
        const attendeeMatch = t.meeting_attendees?.some((a: any) => 
          a.email?.toLowerCase().includes(term) || a.displayName?.toLowerCase().includes(term)
        )
        return organizerMatch || attendeeMatch
      })
    }

    return NextResponse.json({ 
        transcripts: results,
        // If we got 50 results, there might be more
        hasMore: data.data?.transcripts?.length === 50 
    })

  } catch (error) {
    console.error("Server Error:", error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}