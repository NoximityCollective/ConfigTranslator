// Simple rate limiter for Edge Runtime
// Note: Edge Runtime doesn't guarantee persistent state between requests
// This is a basic implementation that may not persist across isolates

interface RateLimitEntry {
  count: number
  resetTime: number
}

// Use a simple object instead of class for Edge Runtime compatibility
const rateLimitStore = new Map<string, RateLimitEntry>()
const MAX_REQUESTS = 10
const WINDOW_MS = 60 * 60 * 1000 // 1 hour

function cleanup() {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

export const rateLimiter = {
  check(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now()
    
    // Perform cleanup on-demand
    cleanup()
    
    const entry = rateLimitStore.get(identifier)

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      const resetTime = now + WINDOW_MS
      rateLimitStore.set(identifier, { count: 1, resetTime })
      return {
        allowed: true,
        remaining: MAX_REQUESTS - 1,
        resetTime
      }
    }

    if (entry.count >= MAX_REQUESTS) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime
      }
    }

    // Increment count
    entry.count++
    rateLimitStore.set(identifier, entry)

    return {
      allowed: true,
      remaining: MAX_REQUESTS - entry.count,
      resetTime: entry.resetTime
    }
  }
}

// Helper function to get client identifier
export function getClientIdentifier(request: Request): string {
  // Try to get real IP from headers (for production with reverse proxy)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIp) {
    return realIp
  }
  
  // Fallback to a combination of headers for local development
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const acceptLanguage = request.headers.get('accept-language') || 'unknown'
  
  return `${userAgent}-${acceptLanguage}`.slice(0, 100) // Limit length
} 