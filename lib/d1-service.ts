// Cloudflare D1 Database Service for ConfigTranslator

interface D1Database {
  prepare(query: string): D1PreparedStatement
  exec(query: string): Promise<D1ExecResult>
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>
}

interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement
  first<T = any>(colName?: string): Promise<T | null>
  run(): Promise<D1Result>
  all<T = any>(): Promise<D1Result<T>>
}

interface D1Result<T = any> {
  results?: T[]
  success: boolean
  error?: string
  meta: {
    duration: number
    rows_read: number
    rows_written: number
  }
}

interface D1ExecResult {
  count: number
  duration: number
}



interface TranslationStats {
  totalTranslations: number
  lastUpdated: string
}

export class D1Service {
  private db: D1Database

  constructor(database: D1Database) {
    this.db = database
  }

  // Translation Counter Methods
  async incrementTranslationCounter(): Promise<number> {
    try {
      const result = await this.db
        .prepare(`
          UPDATE translation_counter 
          SET total_translations = total_translations + 1, 
              last_updated = CURRENT_TIMESTAMP 
          WHERE id = 1
        `)
        .run()

      if (result.success) {
        const counter = await this.getTranslationCounter()
        return counter.totalTranslations
      }
      throw new Error('Failed to increment counter')
    } catch (error) {
      console.error('Error incrementing translation counter:', error)
      throw error
    }
  }

  async getTranslationCounter(): Promise<TranslationStats> {
    try {
      const result = await this.db
        .prepare('SELECT total_translations, last_updated FROM translation_counter WHERE id = 1')
        .first<{ total_translations: number; last_updated: string }>()

      if (result) {
        return {
          totalTranslations: result.total_translations,
          lastUpdated: result.last_updated
        }
      }

      // Initialize if not exists
      await this.db
        .prepare('INSERT OR IGNORE INTO translation_counter (id, total_translations) VALUES (1, 0)')
        .run()

      return { totalTranslations: 0, lastUpdated: new Date().toISOString() }
    } catch (error) {
      console.error('Error getting translation counter:', error)
      return { totalTranslations: 0, lastUpdated: new Date().toISOString() }
    }
  }



  // Translation History Methods
  async logTranslation(data: {
    hashedIPAddress: string  // Now expects a hashed IP for privacy
    targetLanguage: string
    fileType?: string
    fileSize?: number
    linesCount?: number
    success: boolean
    errorMessage?: string
    processingTime?: number
  }): Promise<void> {
    try {
      await this.db
        .prepare(`
          INSERT INTO translation_history 
          (ip_address, target_language, file_type, file_size, lines_count, success, error_message, processing_time)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          data.hashedIPAddress,  // Store the hashed IP instead of real IP
          data.targetLanguage,
          data.fileType || null,
          data.fileSize || null,
          data.linesCount || null,
          data.success,
          data.errorMessage || null,
          data.processingTime || null
        )
        .run()
    } catch (error) {
      console.error('Error logging translation:', error)
      // Don't throw - logging is not critical
    }
  }

  // Analytics Methods
  async getAnalytics(): Promise<{
    totalTranslations: number
    translationsToday: number
    topLanguages: Array<{ language: string; count: number }>
    successRate: number
  }> {
    try {
      const [total, today, languages, successStats] = await Promise.all([
        this.getTranslationCounter(),
        this.db
          .prepare(`
            SELECT COUNT(*) as count 
            FROM translation_history 
            WHERE DATE(created_at) = DATE('now')
          `)
          .first<{ count: number }>(),
        this.db
          .prepare(`
            SELECT target_language as language, COUNT(*) as count 
            FROM translation_history 
            WHERE created_at > datetime('now', '-7 days')
            GROUP BY target_language 
            ORDER BY count DESC 
            LIMIT 5
          `)
          .all<{ language: string; count: number }>(),
        this.db
          .prepare(`
            SELECT 
              COUNT(*) as total,
              SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful
            FROM translation_history 
            WHERE created_at > datetime('now', '-7 days')
          `)
          .first<{ total: number; successful: number }>()
      ])

      return {
        totalTranslations: total.totalTranslations,
        translationsToday: today?.count || 0,
        topLanguages: languages.results || [],
        successRate: successStats && successStats.total > 0 
          ? (successStats.successful / successStats.total) * 100 
          : 100
      }
    } catch (error) {
      console.error('Error getting analytics:', error)
      return {
        totalTranslations: 0,
        translationsToday: 0,
        topLanguages: [],
        successRate: 100
      }
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
export let d1Service: D1Service | null = null

export function initializeD1Service(database: D1Database): void {
  d1Service = new D1Service(database)
} 