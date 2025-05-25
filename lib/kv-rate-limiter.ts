// Cloudflare KV Rate Limiter for ConfigTranslator with IP Hashing for Privacy

interface KVNamespace {
  get(key: string, options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<any>
  put(key: string, value: string | ArrayBuffer | ArrayBufferView | ReadableStream, options?: {
    expirationTtl?: number
    expiration?: number
    metadata?: any
  }): Promise<void>
  delete(key: string): Promise<void>
  list(options?: {
    prefix?: string
    limit?: number
    cursor?: string
  }): Promise<{
    keys: Array<{ name: string; expiration?: number; metadata?: any }>
    list_complete: boolean
    cursor?: string
  }>
}

interface RateLimitData {
  count: number
  windowStart: number
  resetTime: number
  // Note: We no longer store the actual IP address for privacy
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
}

export class KVRateLimiter {
  private kv: KVNamespace
  private maxRequests: number
  private windowMs: number
  private keyPrefix: string

  constructor(kvNamespace: KVNamespace, maxRequests = 10, windowMs = 60 * 60 * 1000) {
    this.kv = kvNamespace
    this.maxRequests = maxRequests
    this.windowMs = windowMs
    this.keyPrefix = 'rate_limit:'
  }

  private getKey(hashedIdentifier: string): string {
    // The identifier is already hashed, so we just add our prefix
    return `${this.keyPrefix}${hashedIdentifier}`
  }

  async checkRateLimit(hashedIdentifier: string): Promise<RateLimitResult> {
    try {
      const now = Date.now()
      const key = this.getKey(hashedIdentifier)
      
      // Get existing rate limit data
      const existingData = await this.kv.get(key, { type: 'json' }) as RateLimitData | null

      if (!existingData || now > existingData.resetTime) {
        // First request or window expired - create new window
        const resetTime = now + this.windowMs
        const newData: RateLimitData = {
          count: 1,
          windowStart: now,
          resetTime
        }

        // Store with TTL slightly longer than window to handle clock skew
        await this.kv.put(key, JSON.stringify(newData), {
          expirationTtl: Math.ceil(this.windowMs / 1000) + 60 // Add 60 seconds buffer
        })

        return {
          allowed: true,
          remaining: this.maxRequests - 1,
          resetTime
        }
      }

      if (existingData.count >= this.maxRequests) {
        // Rate limit exceeded
        return {
          allowed: false,
          remaining: 0,
          resetTime: existingData.resetTime
        }
      }

      // Increment count
      const updatedData: RateLimitData = {
        ...existingData,
        count: existingData.count + 1
      }

      await this.kv.put(key, JSON.stringify(updatedData), {
        expirationTtl: Math.ceil((existingData.resetTime - now) / 1000) + 60
      })

      return {
        allowed: true,
        remaining: this.maxRequests - updatedData.count,
        resetTime: existingData.resetTime
      }
    } catch (error) {
      console.error('KV Rate limiter error:', error)
      // Fallback to allow request if KV error
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: Date.now() + this.windowMs
      }
    }
  }

  async peekRateLimit(hashedIdentifier: string): Promise<RateLimitResult> {
    try {
      const now = Date.now()
      const key = this.getKey(hashedIdentifier)
      
      const existingData = await this.kv.get(key, { type: 'json' }) as RateLimitData | null

      if (!existingData || now > existingData.resetTime) {
        // No existing data or window expired
        return {
          allowed: true,
          remaining: this.maxRequests,
          resetTime: now + this.windowMs
        }
      }

      const remaining = Math.max(0, this.maxRequests - existingData.count)

      return {
        allowed: remaining > 0,
        remaining,
        resetTime: existingData.resetTime
      }
    } catch (error) {
      console.error('KV Rate limiter peek error:', error)
      return {
        allowed: true,
        remaining: this.maxRequests,
        resetTime: Date.now() + this.windowMs
      }
    }
  }

  async resetRateLimit(hashedIdentifier: string): Promise<void> {
    try {
      const key = this.getKey(hashedIdentifier)
      await this.kv.delete(key)
    } catch (error) {
      console.error('Error resetting rate limit:', error)
    }
  }

  async getStats(): Promise<{
    totalEntries: number
    maxRequests: number
    windowMs: number
  }> {
    try {
      const result = await this.kv.list({ prefix: this.keyPrefix, limit: 1000 })
      return {
        totalEntries: result.keys.length,
        maxRequests: this.maxRequests,
        windowMs: this.windowMs
      }
    } catch (error) {
      console.error('Error getting KV stats:', error)
      return {
        totalEntries: 0,
        maxRequests: this.maxRequests,
        windowMs: this.windowMs
      }
    }
  }

  // Cleanup expired entries (optional, KV handles expiration automatically)
  async cleanup(): Promise<number> {
    try {
      const now = Date.now()
      const result = await this.kv.list({ prefix: this.keyPrefix, limit: 1000 })
      let deletedCount = 0

      for (const key of result.keys) {
        try {
          const data = await this.kv.get(key.name, { type: 'json' }) as RateLimitData | null
          if (data && now > data.resetTime) {
            await this.kv.delete(key.name)
            deletedCount++
          }
        } catch (error) {
          console.error(`Error checking/deleting key ${key.name}:`, error)
        }
      }

      return deletedCount
    } catch (error) {
      console.error('Error during KV cleanup:', error)
      return 0
    }
  }
}

// Helper function to check if we're in local development
export function isLocalDevelopment(): boolean {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
  const nodeEnv = process.env.NODE_ENV || ''
  
  return (
    nodeEnv === 'development' ||
    siteUrl.includes('localhost') ||
    siteUrl.includes('127.0.0.1') ||
    siteUrl.includes('3000') ||
    siteUrl === 'http://localhost:3000'
  )
}

// Global instance - will be initialized in API routes
export let kvRateLimiter: KVRateLimiter | null = null

export function initializeKVRateLimiter(kvNamespace: KVNamespace): void {
  kvRateLimiter = new KVRateLimiter(kvNamespace)
} 