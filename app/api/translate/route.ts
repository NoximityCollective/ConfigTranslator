import { NextRequest, NextResponse } from 'next/server'
import { Language } from '@/lib/types'
import { rateLimiter, getClientIdentifier } from '@/lib/rate-limiter'
import { d1Service, initializeD1Service, isLocalDevelopment } from '@/lib/d1-service'
import { kvRateLimiter, initializeKVRateLimiter } from '@/lib/kv-rate-limiter'

// Configure Edge Runtime for Cloudflare Pages compatibility
export const runtime = 'edge'

// Extend global type for local development counter
declare global {
  var localTranslationCounter: number | undefined
}

const MAX_FILE_SIZE = 100 * 1024 // 100KB limit
const MAX_CHUNK_LINES = 150 // Reduced for better quality and context preservation

// Function to split content into manageable chunks with smart boundaries
function splitIntoChunks(content: string, maxLines: number): string[] {
  const lines = content.split('\n')
  const chunks: string[] = []
  
  let currentChunk: string[] = []
  let currentLineCount = 0
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    currentChunk.push(line)
    currentLineCount++
    
    // Check if we should split here
    if (currentLineCount >= maxLines) {
      // Try to find a good breaking point (empty line, comment, or section boundary)
      let splitIndex = currentChunk.length
      
      // Look for a good breaking point in the last 20 lines
      for (let j = Math.max(0, currentChunk.length - 20); j < currentChunk.length; j++) {
        const checkLine = currentChunk[j].trim()
        if (checkLine === '' || 
            checkLine.startsWith('#') || 
            checkLine.startsWith('//') ||
            checkLine.match(/^[a-zA-Z0-9_-]+:$/) || // YAML section
            checkLine === '}' || checkLine === '{' || // JSON boundaries
            checkLine.startsWith('[') && checkLine.endsWith(']')) { // Properties sections
          splitIndex = j + 1
          break
        }
      }
      
      // Create chunk and prepare for next
      if (splitIndex < currentChunk.length) {
        chunks.push(currentChunk.slice(0, splitIndex).join('\n'))
        currentChunk = currentChunk.slice(splitIndex)
        currentLineCount = currentChunk.length
      } else {
        chunks.push(currentChunk.join('\n'))
        currentChunk = []
        currentLineCount = 0
      }
    }
  }
  
  // Add remaining lines as final chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n'))
  }
  
  return chunks.filter(chunk => chunk.trim().length > 0)
}

// Function to translate a single chunk
async function translateChunk(
  chunk: string, 
  targetLanguage: any, 
  apiKey: string, 
  chunkIndex: number, 
  totalChunks: number,
  fileName: string
): Promise<string> {
  const fileType = fileName.split('.').pop()?.toLowerCase() || 'config'
  
  const prompt = `You are a professional translator specializing in Minecraft plugin configuration files.

CRITICAL TRANSLATION RULES:
1. ONLY translate human-readable text content (messages, descriptions, lore text, etc.)
2. PRESERVE ALL technical elements EXACTLY:
   - MiniMessage color codes: <red>, <green>, <gradient:blue:purple>, <#FF0000>
   - Placeholders: %player%, %time%, %balance%, %count%, {player}, etc.
   - YAML/JSON structure, keys, and formatting
   - Configuration keys, file paths, technical identifiers
   - Boolean/numeric values (true, false, numbers)
   - Comments and their formatting
3. Maintain consistent terminology throughout all chunks
4. This is chunk ${chunkIndex + 1} of ${totalChunks} from a ${fileType} file

CONTEXT: This is part of a larger Minecraft plugin configuration file. Maintain consistency with standard Minecraft terminology in ${targetLanguage.name}.

File chunk to translate:

\`\`\`
${chunk}
\`\`\`

Return ONLY the translated chunk with identical structure and formatting. Do not add explanations or modify the format.`

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      "X-Title": process.env.NEXT_PUBLIC_SITE_NAME || "ConfigTranslator",
    },
          body: JSON.stringify({
        model: "google/gemini-flash-1.5-8b",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2, // Lower temperature for more consistent translations
        max_tokens: 16000, // Optimized for chunk size
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
  // Initialize services if available
  if (!d1Service && (request as any).env?.DB) {
    initializeD1Service((request as any).env.DB)
  }
  if (!kvRateLimiter && (request as any).env?.RATE_LIMIT_KV) {
    initializeKVRateLimiter((request as any).env.RATE_LIMIT_KV)
  }

  const clientId = await getClientIdentifier(request)
  const isLocalDev = isLocalDevelopment()
  
  // Get rate limit status
  let rateLimitStatus
  if (kvRateLimiter && !isLocalDev) {
    rateLimitStatus = await kvRateLimiter.peekRateLimit(clientId)
  } else {
    // Fallback to in-memory rate limiter for local dev or if KV not available
    rateLimitStatus = rateLimiter.peek(clientId)
  }

  // Get translation counter
  let translationStats = { totalTranslations: 0, lastUpdated: new Date().toISOString() }
  if (d1Service) {
    try {
      translationStats = await d1Service.getTranslationCounter()
    } catch (error) {
      console.error('Error getting translation stats:', error)
    }
  } else if (isLocalDev) {
    // For local development, return the in-memory counter
    const localCount = global.localTranslationCounter || 0
    translationStats = {
      totalTranslations: localCount,
      lastUpdated: new Date().toISOString()
    }
  }
  
  return NextResponse.json({
    status: 'API route is working',
    runtime: 'edge',
    timestamp: new Date().toISOString(),
    environment: {
      hasApiKey: !!process.env.OPENROUTER_API_KEY,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
      siteName: process.env.NEXT_PUBLIC_SITE_NAME,
      nodeEnv: process.env.NODE_ENV,
      isLocalDev,
      hasD1: !!d1Service,
      hasKV: !!kvRateLimiter
    },
    translationStats,
    rateLimiter: {
      clientId: typeof clientId === 'string' ? clientId.substring(0, 20) + '...' : 'unknown', // Hashed ID for privacy
      currentStatus: {
        allowed: rateLimitStatus.allowed,
        remaining: rateLimitStatus.remaining,
        resetTime: rateLimitStatus.resetTime
      }
    }
  })
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Initialize services if available
    if (!d1Service && (request as any).env?.DB) {
      initializeD1Service((request as any).env.DB)
    }
    if (!kvRateLimiter && (request as any).env?.RATE_LIMIT_KV) {
      initializeKVRateLimiter((request as any).env.RATE_LIMIT_KV)
    }

    console.log('API route called - parsing request body...')
    const { content, targetLanguage, fileName } = await request.json()

    console.log('Request parsed successfully:', {
      hasContent: !!content,
      targetLanguage: targetLanguage?.name,
      fileName,
      contentLength: content?.length
    })

    // Rate limiting check
    const clientId = await getClientIdentifier(request)
    const isLocalDev = isLocalDevelopment()
    
    let rateLimitResult
    if (kvRateLimiter && !isLocalDev) {
      rateLimitResult = await kvRateLimiter.checkRateLimit(clientId)
    } else {
      // Fallback to in-memory rate limiter for local dev or if KV not available
      rateLimitResult = rateLimiter.check(clientId)
    }
    
    console.log('Rate limit check:', {
      clientId: typeof clientId === 'string' ? clientId.substring(0, 20) + '...' : 'unknown', // Log partial hashed ID for privacy
      allowed: rateLimitResult.allowed,
      remaining: rateLimitResult.remaining
    })
    
    if (!rateLimitResult.allowed) {
      const resetDate = new Date(rateLimitResult.resetTime)
      console.log('Rate limit exceeded for client:', typeof clientId === 'string' ? clientId.substring(0, 20) + '...' : 'unknown')
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
      
      // Process each chunk with retry logic
      for (let i = 0; i < chunks.length; i++) {
        console.log(`Translating chunk ${i + 1}/${chunks.length}...`)
        
        let retryCount = 0
        const maxRetries = 2
        let translatedChunk: string | null = null
        
        while (retryCount <= maxRetries && !translatedChunk) {
          try {
            translatedChunk = await translateChunk(chunks[i], targetLanguage, apiKey, i, chunks.length, fileName)
            console.log(`Chunk ${i + 1} completed successfully${retryCount > 0 ? ` (retry ${retryCount})` : ''}`)
          } catch (error) {
            retryCount++
            console.error(`Error translating chunk ${i + 1} (attempt ${retryCount}):`, error)
            
            if (retryCount > maxRetries) {
              return NextResponse.json(
                { error: `Failed to translate chunk ${i + 1} after ${maxRetries + 1} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`, useMockTranslation: true },
                { status: 500 }
              )
            }
            
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
          }
        }
        
        if (translatedChunk) {
          translatedChunks.push(translatedChunk)
        }
      }
      
      // Combine all translated chunks with smart joining
      translatedContent = translatedChunks
        .map(chunk => chunk.trim()) // Remove extra whitespace
        .filter(chunk => chunk.length > 0) // Remove empty chunks
        .join('\n')
      
      console.log('All chunks processed successfully')
      console.log(`Combined ${translatedChunks.length} chunks into final result`)
      
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
          model: "google/gemini-flash-1.5-8b",
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 30000, // Increased from 4000
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
    const processingTime = Date.now() - startTime

    // Increment translation counter and log translation
    let totalTranslations = 0
    if (d1Service) {
      try {
        totalTranslations = await d1Service.incrementTranslationCounter()
        
        // Log translation details
        await d1Service.logTranslation({
          hashedIPAddress: clientId,
          targetLanguage: targetLanguage.code,
          fileType: fileName.split('.').pop()?.toLowerCase(),
          fileSize: new Blob([content]).size,
          linesCount: content.split('\n').length,
          success: true,
          processingTime
        })
      } catch (error) {
        console.error('Error updating translation stats:', error)
      }
    } else if (isLocalDev) {
      // For local development, use a simple in-memory counter
      // This will reset when the server restarts, but it's better than showing 0
      if (!global.localTranslationCounter) {
        global.localTranslationCounter = 0
      }
      global.localTranslationCounter++
      totalTranslations = global.localTranslationCounter
      console.log(`Local dev translation counter: ${totalTranslations}`)
    }

    return NextResponse.json({
      translatedContent: cleanedContent,
      success: true,
      totalTranslations: totalTranslations
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