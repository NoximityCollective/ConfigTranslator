import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { Language } from '@/lib/types'
import { rateLimiter, getClientIdentifier } from '@/lib/rate-limiter'

// Configure Edge Runtime for Cloudflare Pages compatibility
export const runtime = 'edge'

const MAX_FILE_SIZE = 100 * 1024 // 100KB limit

export async function POST(request: NextRequest) {
  console.log('Translation API called')
  try {
    // Rate limiting check (temporarily disabled for debugging)
    const clientId = getClientIdentifier(request)
    const rateLimitResult = rateLimiter.check(clientId)
    
    // Temporarily allow all requests for debugging
    // if (!rateLimitResult.allowed) {
    //   const resetDate = new Date(rateLimitResult.resetTime)
    //   return NextResponse.json(
    //     { 
    //       error: 'Rate limit exceeded. You can make 10 translations per hour.',
    //       resetTime: resetDate.toISOString(),
    //       remaining: rateLimitResult.remaining
    //     },
    //     { 
    //       status: 429,
    //       headers: {
    //         'X-RateLimit-Limit': '10',
    //         'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
    //         'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
    //         'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
    //       }
    //     }
    //   )
    // }

    const { content, targetLanguage, fileName } = await request.json()

    // Validate input
    if (!content || !targetLanguage || !fileName) {
      return NextResponse.json(
        { error: 'Missing required fields: content, targetLanguage, fileName' },
        { status: 400 }
      )
    }

    // Check file size
    const sizeInBytes = new Blob([content]).size
    if (sizeInBytes > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024}KB limit` },
        { status: 400 }
      )
    }

    // Temporary mock translation for debugging
    console.log('Creating mock translation...')
    const cleanedContent = `# Mock translation to ${targetLanguage.name}\n${content}\n# Translation completed`

    return NextResponse.json({
      translatedContent: cleanedContent,
      success: true
    }, {
      headers: {
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
      }
    })

  } catch (error) {
    console.error('Translation API error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    // Handle specific OpenAI errors
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Invalid API key', useMockTranslation: true },
          { status: 401 }
        )
      }
      if (error.message.includes('quota') || error.message.includes('billing')) {
        return NextResponse.json(
          { error: 'API quota exceeded. Please check your OpenRouter billing.', useMockTranslation: true },
          { status: 402 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Translation service temporarily unavailable', useMockTranslation: true },
      { status: 500 }
    )
  }
} 