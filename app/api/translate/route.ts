import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { Language } from '@/lib/types'
import { rateLimiter, getClientIdentifier } from '@/lib/rate-limiter'

// Configure Edge Runtime for Cloudflare Pages compatibility
export const runtime = 'edge'

// Initialize OpenAI with OpenRouter (will be created per request with validated API key)
let openai: OpenAI

const MAX_FILE_SIZE = 100 * 1024 // 100KB limit

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const clientId = getClientIdentifier(request)
    const rateLimitResult = rateLimiter.check(clientId)
    
    if (!rateLimitResult.allowed) {
      const resetDate = new Date(rateLimitResult.resetTime)
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. You can make 10 translations per hour.',
          resetTime: resetDate.toISOString(),
          remaining: rateLimitResult.remaining
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
          }
        }
      )
    }

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

    // Check if API key is configured
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey || 
        apiKey === "your_openrouter_api_key_here" ||
        apiKey.trim() === "" ||
        !apiKey.startsWith('sk-')) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured', useMockTranslation: true },
        { status: 400 }
      )
    }

    // Initialize OpenAI with validated API key
    openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: apiKey,
      defaultHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": process.env.NEXT_PUBLIC_SITE_NAME || "ConfigTranslator",
      },
    })

    // Create AI translation prompt
    const prompt = `You are a professional translator specializing in Minecraft plugin configuration files. 

IMPORTANT RULES:
1. ONLY translate human-readable text content (messages, descriptions, etc.)
2. PRESERVE all MiniMessage color codes exactly as they are (e.g., <red>, <green>, <gradient:blue:purple>, <#FF0000>)
3. PRESERVE all placeholders exactly as they are (e.g., %player%, %time%, %balance%, %count%)
4. PRESERVE all YAML/JSON structure, keys, technical values, and formatting
5. DO NOT translate configuration keys, file paths, technical identifiers, or boolean/numeric values
6. PRESERVE all comments and their formatting

Translate the following Minecraft plugin configuration file to ${targetLanguage.name} (${targetLanguage.code}):

\`\`\`
${content}
\`\`\`

Return ONLY the translated configuration file with the same exact structure and formatting.`

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent translations
      max_tokens: 4000,
    })

    const translatedContent = completion.choices[0]?.message?.content
    if (!translatedContent) {
      return NextResponse.json(
        { error: 'No translation received from AI service' },
        { status: 500 }
      )
    }

    // Clean up the response (remove code block markers if present)
    const cleanedContent = translatedContent.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim()

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
    
    // Handle specific OpenAI errors
    if (error instanceof Error) {
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