export interface Language {
  code: string
  name: string
  flag: string
}

export interface TranslationStats {
  originalLines: number
  translatedLines: number
  charactersTranslated: number
  estimatedTokens: number
  processingTime: number
}

export interface ConfigFile {
  name: string
  content: string
  size: number
  type: string
}

export interface TranslationResult {
  translatedContent: string
  stats: TranslationStats
  targetLanguage: Language
} 