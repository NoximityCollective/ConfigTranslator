// IP Address Hashing Utilities for Privacy Protection
// This module provides secure hashing of IP addresses to protect user privacy

/**
 * Hashes an IP address using SHA-256 with a salt for privacy protection
 * @param ipAddress - The IP address to hash
 * @param salt - Optional salt for additional security (defaults to a static salt)
 * @returns Promise<string> - The hashed IP address as a hex string
 */
export async function hashIPAddress(ipAddress: string, salt?: string): Promise<string> {
  // Use a default salt if none provided (in production, this should be an environment variable)
  const defaultSalt = process.env.IP_HASH_SALT || 'configtranslator-default-salt-2024'
  const actualSalt = salt || defaultSalt
  
  // Combine IP with salt
  const dataToHash = `${ipAddress}:${actualSalt}`
  
  // Convert string to Uint8Array
  const encoder = new TextEncoder()
  const data = encoder.encode(dataToHash)
  
  // Hash using Web Crypto API (available in Edge Runtime)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  
  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  return hashHex
}

/**
 * Creates a shorter hash for use as keys (first 16 characters of full hash)
 * This provides good uniqueness while keeping keys manageable
 * @param ipAddress - The IP address to hash
 * @param salt - Optional salt for additional security
 * @returns Promise<string> - A shortened hash suitable for use as keys
 */
export async function createIPKey(ipAddress: string, salt?: string): Promise<string> {
  const fullHash = await hashIPAddress(ipAddress, salt)
  // Return first 16 characters for a good balance of uniqueness and key length
  return fullHash.substring(0, 16)
}

/**
 * Validates if an IP address is valid (IPv4 or IPv6)
 * @param ipAddress - The IP address to validate
 * @returns boolean - True if valid IP address
 */
export function isValidIPAddress(ipAddress: string): boolean {
  // IPv4 regex
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  
  // IPv6 regex (simplified)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/
  
  return ipv4Regex.test(ipAddress) || ipv6Regex.test(ipAddress)
}

/**
 * Sanitizes an IP address for logging (shows only first and last octet for IPv4)
 * @param ipAddress - The IP address to sanitize
 * @returns string - Sanitized IP for safe logging
 */
export function sanitizeIPForLogging(ipAddress: string): string {
  if (!ipAddress) return 'unknown'
  
  // Handle IPv4
  if (ipAddress.includes('.')) {
    const parts = ipAddress.split('.')
    if (parts.length === 4) {
      return `${parts[0]}.xxx.xxx.${parts[3]}`
    }
  }
  
  // Handle IPv6 (show first and last segment)
  if (ipAddress.includes(':')) {
    const parts = ipAddress.split(':')
    if (parts.length >= 2) {
      return `${parts[0]}:xxxx:...:${parts[parts.length - 1]}`
    }
  }
  
  // Handle localhost and special cases
  if (ipAddress === '::1' || ipAddress === '127.0.0.1') {
    return 'localhost'
  }
  
  // Fallback - show first 4 characters
  return ipAddress.substring(0, 4) + 'xxx'
}

/**
 * Gets the real IP address from request headers (handles proxies, CDNs)
 * @param request - The request object
 * @returns string - The real IP address
 */
export function getRealIPAddress(request: Request): string {
  // Check common headers used by proxies and CDNs
  const headers = [
    'cf-connecting-ip',     // Cloudflare
    'x-forwarded-for',      // Standard proxy header
    'x-real-ip',            // Nginx proxy
    'x-client-ip',          // Apache proxy
    'x-forwarded',          // General forwarded
    'forwarded-for',        // Alternative
    'forwarded'             // RFC 7239
  ]
  
  for (const header of headers) {
    const value = request.headers.get(header)
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ip = value.split(',')[0].trim()
      if (isValidIPAddress(ip)) {
        return ip
      }
    }
  }
  
  // Fallback to a default if no valid IP found
  return '0.0.0.0'
} 