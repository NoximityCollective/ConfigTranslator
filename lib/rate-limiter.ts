// Edge Runtime compatible rate limiter
// Uses in-memory Map storage that works in Cloudflare Pages

interface RateLimitEntry {
  count: number
  resetTime: number
}

class EdgeRateLimiter {
  private requests = new Map<string, RateLimitEntry>()
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(maxRequests = 10, windowMs = 60 * 60 * 1000) { // 10 requests per hour
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  check(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now()
    const entry = this.requests.get(identifier)

    // Clean up expired entries
    this.cleanup(now)

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      const resetTime = now + this.windowMs
      this.requests.set(identifier, { count: 1, resetTime })
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime
      }
    }

    if (entry.count >= this.maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime
      }
    }

    // Increment count
    entry.count++
    this.requests.set(identifier, entry)

    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetTime: entry.resetTime
    }
  }

  private cleanup(now: number) {
    // Clean up expired entries to prevent memory leaks
    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetTime) {
        this.requests.delete(key)
      }
    }
  }

  // Get current stats (for debugging)
  getStats() {
    return {
      totalEntries: this.requests.size,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs
    }
  }
}

// Create a singleton instance
export const rateLimiter = new EdgeRateLimiter()

// Helper function to get client identifier from Edge Runtime request
export function getClientIdentifier(request: Request): string {
  // Try to get real IP from Cloudflare headers
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  const xForwardedFor = request.headers.get('x-forwarded-for')
  const xRealIp = request.headers.get('x-real-ip')
  
  if (cfConnectingIp) {
    return cfConnectingIp
  }
  
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim()
  }
  
  if (xRealIp) {
    return xRealIp
  }
  
  // Fallback to a combination of headers for development
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const acceptLanguage = request.headers.get('accept-language') || 'unknown'
  
  return `${userAgent}-${acceptLanguage}`.slice(0, 100) // Limit length
} 