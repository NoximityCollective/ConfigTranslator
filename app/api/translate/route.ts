import { NextRequest, NextResponse } from 'next/server'
import { Language } from '@/lib/types'

// Configure Edge Runtime for Cloudflare Pages compatibility
export const runtime = 'edge'

const MAX_FILE_SIZE = 100 * 1024 // 100KB limit

// Simple GET endpoint to test if the API route is working
export async function GET() {
  return NextResponse.json({
    status: 'API route is working',
    runtime: 'edge',
    timestamp: new Date().toISOString(),
    environment: {
      hasApiKey: !!process.env.OPENROUTER_API_KEY,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
      siteName: process.env.NEXT_PUBLIC_SITE_NAME
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    console.log('API route called - parsing request body...')
    const { content, targetLanguage, fileName } = await request.json()

    console.log('Request parsed successfully:', {
      hasContent: !!content,
      targetLanguage: targetLanguage?.name,
      fileName,
      contentLength: content?.length
    })

    // Validate input
    if (!content || !targetLanguage || !fileName) {
      console.log('Validation failed - missing required fields')
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
    console.log('API key check:', {
      hasApiKey: !!apiKey,
      keyPrefix: apiKey?.substring(0, 3),
      keyLength: apiKey?.length
    })
    
    if (!apiKey || 
        apiKey === "your_openrouter_api_key_here" ||
        apiKey.trim() === "" ||
        !apiKey.startsWith('sk-')) {
      console.log('API key validation failed')
      return NextResponse.json(
        { error: 'OpenRouter API key not configured', useMockTranslation: true },
        { status: 400 }
      )
    }

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

    // Call OpenRouter API using native fetch (Edge Runtime compatible)
    console.log('Making API request to OpenRouter...')
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": process.env.NEXT_PUBLIC_SITE_NAME || "ConfigTranslator",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    })

    console.log('OpenRouter response status:', response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenRouter API error:', response.status, errorData)
      
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid API key', useMockTranslation: true },
          { status: 401 }
        )
      }
      if (response.status === 402 || response.status === 429) {
        return NextResponse.json(
          { error: 'API quota exceeded. Please check your OpenRouter billing.', useMockTranslation: true },
          { status: 402 }
        )
      }
      
      return NextResponse.json(
        { error: 'Translation service temporarily unavailable', useMockTranslation: true },
        { status: 500 }
      )
    }

    const data = await response.json()
    const translatedContent = data.choices?.[0]?.message?.content

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
    })

  } catch (error) {
    console.error('Translation API error:', error)
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json(
      { 
        error: 'Translation service temporarily unavailable', 
        useMockTranslation: true,
        debug: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
} 