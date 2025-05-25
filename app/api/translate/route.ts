import { NextRequest, NextResponse } from 'next/server'
import { Language } from '@/lib/types'
import { rateLimiter, getClientIdentifier } from '@/lib/rate-limiter'

// Configure Edge Runtime for Cloudflare Pages compatibility
export const runtime = 'edge'

const MAX_FILE_SIZE = 100 * 1024 // 100KB limit
const MAX_CHUNK_LINES = 200 // Process files in chunks of 200 lines to avoid token limits

// Function to split content into manageable chunks
function splitIntoChunks(content: string, maxLines: number): string[] {
  const lines = content.split('\n')
  const chunks: string[] = []
  
  for (let i = 0; i < lines.length; i += maxLines) {
    const chunk = lines.slice(i, i + maxLines).join('\n')
    chunks.push(chunk)
  }
  
  return chunks
}

// Function to translate a single chunk
async function translateChunk(
  chunk: string, 
  targetLanguage: any, 
  apiKey: string, 
  chunkIndex: number, 
  totalChunks: number
): Promise<string> {
  const prompt = `You are a professional translator specializing in Minecraft plugin configuration files. 

IMPORTANT RULES:
1. ONLY translate human-readable text content (messages, descriptions, etc.)
2. PRESERVE all MiniMessage color codes exactly as they are (e.g., <red>, <green>, <gradient:blue:purple>, <#FF0000>)
3. PRESERVE all placeholders exactly as they are (e.g., %player%, %time%, %balance%, %count%)
4. PRESERVE all YAML/JSON structure, keys, technical values, and formatting
5. DO NOT translate configuration keys, file paths, technical identifiers, or boolean/numeric values
6. PRESERVE all comments and their formatting
7. This is chunk ${chunkIndex + 1} of ${totalChunks} - maintain consistency with previous translations

Translate the following Minecraft plugin configuration file chunk to ${targetLanguage.name} (${targetLanguage.code}):

\`\`\`
${chunk}
\`\`\`

Return ONLY the translated configuration chunk with the same exact structure and formatting.`

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
      max_tokens: 8000, // Increased for better chunk handling
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Chunk ${chunkIndex + 1} translation failed: ${errorData.error || 'Unknown error'}`)
  }

  const data = await response.json()
  const translatedContent = data.choices?.[0]?.message?.content

  if (!translatedContent) {
    throw new Error(`No translation received for chunk ${chunkIndex + 1}`)
  }

  // Clean up the response (remove code block markers if present)
  return translatedContent.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim()
}

// Simple GET endpoint to test if the API route is working
export async function GET(request: NextRequest) {
  const clientId = getClientIdentifier(request)
  const rateLimitStats = rateLimiter.getStats()
  
  return NextResponse.json({
    status: 'API route is working',
    runtime: 'edge',
    timestamp: new Date().toISOString(),
    environment: {
      hasApiKey: !!process.env.OPENROUTER_API_KEY,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
      siteName: process.env.NEXT_PUBLIC_SITE_NAME
    },
    rateLimiter: {
      clientId: clientId.substring(0, 20) + '...',
      stats: rateLimitStats,
      currentStatus: rateLimiter.check(clientId)
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

    // Rate limiting check
    const clientId = getClientIdentifier(request)
    const rateLimitResult = rateLimiter.check(clientId)
    
    console.log('Rate limit check:', {
      clientId: clientId.substring(0, 20) + '...', // Log partial ID for privacy
      allowed: rateLimitResult.allowed,
      remaining: rateLimitResult.remaining
    })
    
    if (!rateLimitResult.allowed) {
      const resetDate = new Date(rateLimitResult.resetTime)
      console.log('Rate limit exceeded for client:', clientId.substring(0, 20) + '...')
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

    // Check if file needs to be chunked (for large files)
    const lines = content.split('\n')
    const needsChunking = lines.length > MAX_CHUNK_LINES
    
    console.log('File analysis:', {
      totalLines: lines.length,
      needsChunking,
      maxChunkLines: MAX_CHUNK_LINES
    })

    let translatedContent: string

    if (needsChunking) {
      console.log('Processing large file in chunks...')
      const chunks = splitIntoChunks(content, MAX_CHUNK_LINES)
      console.log(`Split into ${chunks.length} chunks`)
      
      const translatedChunks: string[] = []
      
      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        console.log(`Translating chunk ${i + 1}/${chunks.length}...`)
        try {
          const translatedChunk = await translateChunk(chunks[i], targetLanguage, apiKey, i, chunks.length)
          translatedChunks.push(translatedChunk)
          console.log(`Chunk ${i + 1} completed successfully`)
        } catch (error) {
          console.error(`Error translating chunk ${i + 1}:`, error)
          return NextResponse.json(
            { error: `Failed to translate chunk ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`, useMockTranslation: true },
            { status: 500 }
          )
        }
      }
      
      // Combine all translated chunks
      translatedContent = translatedChunks.join('\n')
      console.log('All chunks processed successfully')
      
    } else {
      console.log('Processing small file as single request...')
      // For smaller files, use the original single-request approach
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
          max_tokens: 8000, // Increased from 4000
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
      const rawTranslatedContent = data.choices?.[0]?.message?.content

      if (!rawTranslatedContent) {
        return NextResponse.json(
          { error: 'No translation received from AI service' },
          { status: 500 }
        )
      }

      // Clean up the response (remove code block markers if present)
      translatedContent = rawTranslatedContent.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim()
    }

    // Final cleanup
    const cleanedContent = translatedContent

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