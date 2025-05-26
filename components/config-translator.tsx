"use client"

import React, { useState, useCallback, useEffect } from 'react'
import { Upload, Download, FileText, Globe, Clock, Hash, BarChart3, Copy, Check, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { TranslationService } from '@/lib/translation-service'
import { SUPPORTED_LANGUAGES } from '@/lib/languages'
import { ConfigFile, TranslationResult, Language } from '@/lib/types'
import { ModeToggle } from '@/components/mode-toggle'
import { Footer } from '@/components/footer'

export function ConfigTranslator() {
  const [configFile, setConfigFile] = useState<ConfigFile | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState<string>("")
  const [isTranslating, setIsTranslating] = useState(false)
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null)
  const [progress, setProgress] = useState(0)
  const [copied, setCopied] = useState(false)
  const [rateLimitInfo, setRateLimitInfo] = useState<{ remaining: number; limit: number; resetTime?: number } | null>(null)

  const { toast } = useToast()

  // Check rate limit status on component mount and periodically refresh
  useEffect(() => {
    const checkRateLimit = async () => {
      try {
        const response = await fetch('/api/translate')
        if (response.ok) {
          const data = await response.json()
          if (data.rateLimiter?.currentStatus) {
            setRateLimitInfo({
              remaining: data.rateLimiter.currentStatus.remaining,
              limit: data.rateLimiter.currentStatus.remaining === 999 ? 999 : 10, // Handle local dev unlimited
              resetTime: data.rateLimiter.currentStatus.resetTime
            })
          }
        }
      } catch (error) {
        console.log('Could not check rate limit status:', error)
      }
    }
    
    // Initial check
    checkRateLimit()
    
    // Refresh every 30 seconds for better UX
    const interval = setInterval(checkRateLimit, 30000)
    
    return () => clearInterval(interval)
  }, [])

  // Helper function to format reset time
  const formatResetTime = (resetTime: number) => {
    const now = Date.now()
    const timeLeft = resetTime - now
    
    if (timeLeft <= 0) return 'now'
    
    const minutes = Math.floor(timeLeft / (1000 * 60))
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    }
    return `${seconds}s`
  }

  // Check if rate limited
  const isRateLimited = rateLimitInfo?.remaining === 0

  // Update countdown timer every second when rate limited
  useEffect(() => {
    if (!isRateLimited || !rateLimitInfo?.resetTime) return

    const interval = setInterval(() => {
      const now = Date.now()
      if (now >= rateLimitInfo.resetTime!) {
        // Rate limit has expired, refresh the status
        const checkRateLimit = async () => {
          try {
            const response = await fetch('/api/translate')
            if (response.ok) {
              const data = await response.json()
              if (data.rateLimiter?.currentStatus) {
                setRateLimitInfo({
                  remaining: data.rateLimiter.currentStatus.remaining,
                  limit: 10,
                  resetTime: data.rateLimiter.currentStatus.resetTime
                })
              }
            }
          } catch (error) {
            console.log('Could not refresh rate limit status:', error)
          }
        }
        checkRateLimit()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isRateLimited, rateLimitInfo?.resetTime])

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check file size (100KB limit)
    if (file.size > 100 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 100KB.",
        variant: "destructive"
      })
      return
    }

    // Check file type
    const allowedTypes = ['.yml', '.yaml', '.json', '.properties', '.conf', '.config', '.lang']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    
    if (!allowedTypes.includes(fileExtension)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a configuration file (.yml, .yaml, .json, .properties, .conf, .config, .lang).",
        variant: "destructive"
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setConfigFile({
        name: file.name,
        content,
        size: file.size,
        type: fileExtension
      })
      setTranslationResult(null)
      toast({
        title: "File uploaded successfully",
        description: `${file.name} (${(file.size / 1024).toFixed(1)}KB) is ready for translation.`
      })
    }
    reader.readAsText(file)
  }, [toast])

  const handleTranslate = useCallback(async () => {
    if (!configFile || !selectedLanguage) return

    const targetLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === selectedLanguage)
    if (!targetLanguage) return

    setIsTranslating(true)
    setProgress(0)

    // Check if it's a large file that will be chunked
    const isLargeFile = configFile.content.split('\n').length > 200
    
    // Different progress simulation for large vs small files
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (isLargeFile) {
          // Slower progress for large files to be more realistic
          return Math.min(prev + 5, 85)
        } else {
          // Faster progress for small files
          return Math.min(prev + 15, 90)
        }
      })
    }, isLargeFile ? 500 : 200)

    try {
      const result = await TranslationService.translateConfig(
        configFile.content,
        targetLanguage,
        configFile.name
      )
      
      setTranslationResult(result)
      setProgress(100)
      
      // Update rate limit info if available
      if (result.rateLimitInfo) {
        setRateLimitInfo(result.rateLimitInfo)
        
        // Show warning if getting close to limit or rate limited
        if (result.rateLimitInfo.remaining === 0) {
          const resetTime = result.rateLimitInfo.resetTime ? new Date(result.rateLimitInfo.resetTime).toLocaleTimeString() : 'later'
          toast({
            title: "Translation completed!",
            description: `Successfully translated ${configFile.name} to ${targetLanguage.name}. Rate limit reached - resets at ${resetTime}.`,
            variant: "destructive"
          })
        } else if (result.rateLimitInfo.remaining <= 2) {
          toast({
            title: "Translation completed!",
            description: `Successfully translated ${configFile.name} to ${targetLanguage.name}. Warning: Only ${result.rateLimitInfo.remaining} translations remaining this hour.`,
            variant: "destructive"
          })
        } else {
          // Check if it was a chunked translation for special message
          const baseMessage = `Successfully translated ${configFile.name} to ${targetLanguage.name}.`
          const chunkMessage = isLargeFile ? ` Large file processed in chunks for optimal quality.` : ''
          toast({
            title: "Translation completed!",
            description: baseMessage + chunkMessage
          })
        }
      } else {
        // Check if it was a chunked translation for special message
        const baseMessage = `Successfully translated ${configFile.name} to ${targetLanguage.name}.`
        const chunkMessage = isLargeFile ? ` Large file processed in chunks for optimal quality.` : ''
        toast({
          title: "Translation completed!",
          description: baseMessage + chunkMessage
        })
      }
    } catch (error) {
      // Check if it's a rate limit error and update the state
      if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
        // Try to extract reset time from error message or refresh rate limit status
        const checkRateLimit = async () => {
          try {
            const response = await fetch('/api/translate')
            if (response.ok) {
              const data = await response.json()
              if (data.rateLimiter?.currentStatus) {
                setRateLimitInfo({
                  remaining: data.rateLimiter.currentStatus.remaining,
                  limit: 10,
                  resetTime: data.rateLimiter.currentStatus.resetTime
                })
              }
            }
          } catch (error) {
            console.log('Could not refresh rate limit status:', error)
          }
        }
        checkRateLimit()
      }
      
      toast({
        title: "Translation failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive"
      })
    } finally {
      clearInterval(progressInterval)
      setIsTranslating(false)
      setTimeout(() => setProgress(0), 1000)
    }
  }, [configFile, selectedLanguage, toast])

  const handleCopy = useCallback(async () => {
    if (!translationResult) return
    
    try {
      await navigator.clipboard.writeText(translationResult.translatedContent)
      setCopied(true)
      toast({
        title: "Copied to clipboard",
        description: "The translated configuration has been copied to your clipboard."
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard. Please select and copy manually.",
        variant: "destructive"
      })
    }
  }, [translationResult, toast])

  const handleDownload = useCallback(() => {
    if (!translationResult || !configFile) return

    const blob = new Blob([translationResult.translatedContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = configFile.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Download started",
      description: `${configFile.name} has been downloaded.`
    })
  }, [translationResult, configFile, toast])

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024).toFixed(1) + ' KB'
  }

  const formatTime = (ms: number) => {
    return (ms / 1000).toFixed(1) + 's'
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="relative text-center mb-8">
        <div className="absolute top-0 right-0">
          <ModeToggle />
        </div>
        <h1 className="text-4xl font-bold mb-2">ConfigTranslator</h1>
        <p className="text-muted-foreground text-lg">
          AI-powered Minecraft plugin configuration translator by{' '}
          <span className="text-primary font-semibold">Noximity</span>
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          🤖 AI-powered translation service with MiniMessage color code support
        </p>
        {rateLimitInfo && (
          <div className="mt-3">
            <Badge variant={rateLimitInfo.remaining === 0 ? "destructive" : rateLimitInfo.remaining <= 2 ? "destructive" : rateLimitInfo.remaining <= 5 ? "secondary" : rateLimitInfo.limit === 999 ? "outline" : "default"}>
              {rateLimitInfo.limit === 999 ? (
                <>🚀 Unlimited translations (Local Development)</>
              ) : rateLimitInfo.remaining === 0 ? (
                <>Rate limited - resets in {rateLimitInfo.resetTime ? formatResetTime(rateLimitInfo.resetTime) : 'unknown'}</>
              ) : (
                <>{rateLimitInfo.remaining}/{rateLimitInfo.limit} translations remaining this hour</>
              )}
            </Badge>
          </div>
        )}
        
        {/* Debug: Show rate limit status */}
        <div className="mt-2">
          <button 
            onClick={async () => {
              try {
                const response = await fetch('/api/translate')
                const data = await response.json()
                console.log('Rate limit debug:', data.rateLimiter)
                const isLocalDev = data.rateLimiter?.currentStatus?.remaining === 999
                toast({
                  title: "Rate Limit Debug",
                  description: `${isLocalDev ? '🚀 Local Dev Mode - ' : ''}Remaining: ${data.rateLimiter?.currentStatus?.remaining || 'Unknown'}, Total entries: ${data.rateLimiter?.stats?.totalEntries || 0}`,
                })
              } catch (error) {
                console.error('Debug error:', error)
              }
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            🔍 Debug Rate Limit Status
          </button>
        </div>

        <div className="mt-4">
          <a 
            href="https://ko-fi.com/noximitycollective" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-500 text-white text-sm font-medium rounded-md transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 hover:brightness-110"
          >
            <Heart className="h-4 w-4" />
            Support Us on Ko-fi
          </a>
          <p className="text-xs text-muted-foreground mt-2">
            Help us keep this service free and improve it further
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Configuration
            </CardTitle>
            <CardDescription>
              Upload your Minecraft plugin configuration or language file (max 100KB)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".yml,.yaml,.json,.properties,.conf,.config,.lang"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports: .yml, .yaml, .json, .properties, .conf, .config, .lang
                </p>
              </label>
            </div>

            {configFile && (
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{configFile.name}</span>
                  <Badge variant="secondary">{formatFileSize(configFile.size)}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {configFile.content.split('\n').length} lines • {configFile.type} file
                </div>
                {configFile.content.split('\n').length > 200 && (
                  <div className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                    ⚡ Large file - will be processed in chunks for optimal quality
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
                              <Label htmlFor="language-select">Target Language (31 supported)</Label>
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target language" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      <span className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleTranslate}
              disabled={!configFile || !selectedLanguage || isTranslating || isRateLimited}
              className="w-full"
              size="lg"
            >
              {isTranslating ? (
                <>
                  <Globe className="h-4 w-4 mr-2 animate-spin" />
                  Translating...
                </>
              ) : isRateLimited ? (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Rate Limited - Resets in {rateLimitInfo?.resetTime ? formatResetTime(rateLimitInfo.resetTime) : 'unknown'}
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4 mr-2" />
                  Translate Configuration
                </>
              )}
            </Button>

            {isTranslating && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    {configFile && configFile.content.split('\n').length > 200 
                      ? 'Processing Large File...' 
                      : 'Translation Progress'
                    }
                  </span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="w-full" />
                {configFile && configFile.content.split('\n').length > 200 && (
                  <div className="text-xs text-muted-foreground text-center">
                    Large file detected ({configFile.content.split('\n').length} lines) - processing in chunks for optimal quality
                  </div>
                )}
                {configFile && configFile.content.split('\n').length > 200 && progress > 0 && (
                  <div className="text-xs text-blue-600 text-center">
                    ⚡ AI is carefully translating each section while preserving structure and formatting
                  </div>
                )}
              </div>
            )}

            {isRateLimited && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
                <Clock className="h-8 w-8 mx-auto mb-2 text-destructive" />
                <p className="text-sm font-medium text-destructive">Rate Limit Reached</p>
                <p className="text-xs text-muted-foreground mt-1">
                  You can translate again in {rateLimitInfo?.resetTime ? formatResetTime(rateLimitInfo.resetTime) : 'unknown time'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Translation Results
            </CardTitle>
            <CardDescription>
              View your translated configuration and statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {translationResult ? (
              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="stats">Statistics</TabsTrigger>
                </TabsList>
                
                <TabsContent value="preview" className="space-y-4">
                  <div className="flex gap-2">
                    <Button onClick={handleCopy} variant="outline" size="sm">
                      {copied ? (
                        <Check className="h-4 w-4 mr-2" />
                      ) : (
                        <Copy className="h-4 w-4 mr-2" />
                      )}
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                    <Button onClick={handleDownload} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  
                  <Textarea
                    value={translationResult.translatedContent}
                    readOnly
                    className="min-h-[400px] font-mono text-sm"
                    placeholder="Translated configuration will appear here..."
                  />
                </TabsContent>
                
                <TabsContent value="stats" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Lines</span>
                      </div>
                      <div className="text-2xl font-bold">
                        {translationResult.stats.translatedLines}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Original: {translationResult.stats.originalLines}
                      </div>
                    </div>
                    
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Characters</span>
                      </div>
                      <div className="text-2xl font-bold">
                        {translationResult.stats.charactersTranslated.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ~{translationResult.stats.estimatedTokens} tokens
                      </div>
                    </div>
                    
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Processing Time</span>
                      </div>
                      <div className="text-2xl font-bold">
                        {formatTime(translationResult.stats.processingTime)}
                      </div>
                    </div>
                    
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Language</span>
                      </div>
                      <div className="text-lg font-bold flex items-center gap-2">
                        <span>{translationResult.targetLanguage.flag}</span>
                        <span>{translationResult.targetLanguage.name}</span>
                      </div>
                      {translationResult.stats.originalLines > 200 && (
                        <div className="text-xs text-blue-600 mt-1">
                          ⚡ Chunked processing
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-12">
                <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Upload a configuration file and select a language to start translating
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Original File Preview */}
      {configFile && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Original Configuration Preview
            </CardTitle>
            <CardDescription>
              Preview of your uploaded configuration file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={configFile.content}
              readOnly
              className="min-h-[300px] font-mono text-sm"
              placeholder="Original configuration content..."
            />
          </CardContent>
        </Card>
      )}
        </div>
      </div>
      <Footer />
    </div>
  )
} 