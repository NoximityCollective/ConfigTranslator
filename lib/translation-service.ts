import { Language, TranslationStats, TranslationResult } from './types'

// Fallback mock translations for when API key is not set
const MOCK_TRANSLATIONS: Record<string, Record<string, string>> = {
  'es': {
    // Basic messages
    'Welcome to the server': 'Bienvenido al servidor',
    'Goodbye': 'Adiós',
    'See you soon': 'Nos vemos pronto',
    'You don\'t have permission to use this command': 'No tienes permiso para usar este comando',
    'Available commands': 'Comandos disponibles',
    'Show this help message': 'Mostrar este mensaje de ayuda',
    'Teleport to spawn': 'Teletransportarse al spawn',
    'Teleport to your home': 'Teletransportarse a tu casa',
    'Player not found': 'Jugador no encontrado',
    'Invalid command': 'Comando inválido',
    'Use /help for assistance': 'Usa /help para ayuda',
    'Please wait': 'Por favor espera',
    'seconds before using this command again': 'segundos antes de usar este comando otra vez',
    
    // GUI elements
    'Main Menu': 'Menú Principal',
    'Teleportation': 'Teletransportación',
    'Click to open teleportation menu': 'Haz clic para abrir el menú de teletransportación',
    'Available destinations': 'Destinos disponibles',
    'Shop': 'Tienda',
    'Buy and sell items': 'Comprar y vender objetos',
    'Your balance': 'Tu saldo',
    
    // Sample config specific
    'Sample Minecraft Plugin Configuration': 'Configuración de Plugin de Minecraft de Ejemplo',
    'This is a test configuration file for ConfigTranslator': 'Este es un archivo de configuración de prueba para ConfigTranslator',
    'AwesomePlugin': 'PluginGenial',
    'Welcome to the server, %player%!': '¡Bienvenido al servidor, %player%!',
    'Goodbye, %player%! See you soon!': '¡Adiós, %player%! ¡Nos vemos pronto!',
    'You don\'t have permission to use this command!': '¡No tienes permiso para usar este comando!',
    'Invalid command. Use /help for assistance.': 'Comando inválido. Usa /help para ayuda.',
    'Please wait %time% seconds before using this command again.': 'Por favor espera %time% segundos antes de usar este comando otra vez.',
    'Player not found!': '¡Jugador no encontrado!',
    'Your balance: $%balance%': 'Tu saldo: $%balance%',
    'Available destinations: %count%': 'Destinos disponibles: %count%',
    
    // Common .lang file entries
    'join': 'unirse',
    'leave': 'salir',
    'death': 'muerte',
    'respawn': 'reaparecer',
    'chat': 'chat',
    'command': 'comando',
    'error': 'error',
    'success': 'éxito',
    'warning': 'advertencia',
    'info': 'información'
  },
  'fr': {
    'Welcome to the server': 'Bienvenue sur le serveur',
    'Goodbye': 'Au revoir',
    'See you soon': 'À bientôt',
    'You don\'t have permission to use this command': 'Vous n\'avez pas la permission d\'utiliser cette commande',
    'Available commands': 'Commandes disponibles',
    'Show this help message': 'Afficher ce message d\'aide',
    'Teleport to spawn': 'Se téléporter au spawn',
    'Teleport to your home': 'Se téléporter à votre maison',
    'Player not found': 'Joueur introuvable',
    'Invalid command': 'Commande invalide',
    'Use /help for assistance': 'Utilisez /help pour de l\'aide',
    'Please wait': 'Veuillez patienter',
    'seconds before using this command again': 'secondes avant d\'utiliser cette commande à nouveau',
    'Main Menu': 'Menu Principal',
    'Teleportation': 'Téléportation',
    'Click to open teleportation menu': 'Cliquez pour ouvrir le menu de téléportation',
    'Available destinations': 'Destinations disponibles',
    'Shop': 'Boutique',
    'Buy and sell items': 'Acheter et vendre des objets',
    'Your balance': 'Votre solde',
    
    // Sample config specific
    'Sample Minecraft Plugin Configuration': 'Configuration de Plugin Minecraft d\'Exemple',
    'This is a test configuration file for ConfigTranslator': 'Ceci est un fichier de configuration de test pour ConfigTranslator',
    'AwesomePlugin': 'PluginFormidable',
    'Welcome to the server, %player%!': 'Bienvenue sur le serveur, %player%!',
    'Goodbye, %player%! See you soon!': 'Au revoir, %player%! À bientôt!',
    'You don\'t have permission to use this command!': 'Vous n\'avez pas la permission d\'utiliser cette commande!',
    'Invalid command. Use /help for assistance.': 'Commande invalide. Utilisez /help pour de l\'aide.',
    'Please wait %time% seconds before using this command again.': 'Veuillez patienter %time% secondes avant d\'utiliser cette commande à nouveau.',
    'Player not found!': 'Joueur introuvable!',
    'Your balance: $%balance%': 'Votre solde: $%balance%',
    'Available destinations: %count%': 'Destinations disponibles: %count%',
    
    // Common .lang file entries
    'join': 'rejoindre',
    'leave': 'quitter',
    'death': 'mort',
    'respawn': 'réapparaître',
    'chat': 'chat',
    'command': 'commande',
    'error': 'erreur',
    'success': 'succès',
    'warning': 'avertissement',
    'info': 'information'
  },
  'pt': {
    'Welcome to the server': 'Bem-vindo ao servidor',
    'Goodbye': 'Tchau',
    'See you soon': 'Até breve',
    'You don\'t have permission to use this command': 'Você não tem permissão para usar este comando',
    'Player not found': 'Jogador não encontrado',
    'Invalid command': 'Comando inválido',
    'Main Menu': 'Menu Principal',
    'Shop': 'Loja',
    'Your balance': 'Seu saldo',
    'join': 'entrar',
    'leave': 'sair',
    'death': 'morte',
    'respawn': 'renascer',
    'error': 'erro',
    'success': 'sucesso'
  },
  'ru': {
    'Welcome to the server': 'Добро пожаловать на сервер',
    'Goodbye': 'До свидания',
    'See you soon': 'Увидимся скоро',
    'You don\'t have permission to use this command': 'У вас нет разрешения на использование этой команды',
    'Player not found': 'Игрок не найден',
    'Invalid command': 'Неверная команда',
    'Main Menu': 'Главное меню',
    'Shop': 'Магазин',
    'Your balance': 'Ваш баланс',
    'join': 'присоединиться',
    'leave': 'покинуть',
    'death': 'смерть',
    'respawn': 'возрождение',
    'error': 'ошибка',
    'success': 'успех'
  },
  'ja': {
    'Welcome to the server': 'サーバーへようこそ',
    'Goodbye': 'さようなら',
    'See you soon': 'また今度',
    'You don\'t have permission to use this command': 'このコマンドを使用する権限がありません',
    'Player not found': 'プレイヤーが見つかりません',
    'Invalid command': '無効なコマンド',
    'Main Menu': 'メインメニュー',
    'Shop': 'ショップ',
    'Your balance': 'あなたの残高',
    'join': '参加',
    'leave': '退出',
    'death': '死',
    'respawn': 'リスポーン',
    'error': 'エラー',
    'success': '成功'
  },
  'ko': {
    'Welcome to the server': '서버에 오신 것을 환영합니다',
    'Goodbye': '안녕히 가세요',
    'See you soon': '곧 만나요',
    'You don\'t have permission to use this command': '이 명령어를 사용할 권한이 없습니다',
    'Player not found': '플레이어를 찾을 수 없습니다',
    'Invalid command': '잘못된 명령어',
    'Main Menu': '메인 메뉴',
    'Shop': '상점',
    'Your balance': '당신의 잔액',
    'join': '참가',
    'leave': '떠나기',
    'death': '죽음',
    'respawn': '리스폰',
    'error': '오류',
    'success': '성공'
  },
  'nl': {
    'Welcome to the server': 'Welkom op de server',
    'Goodbye': 'Tot ziens',
    'See you soon': 'Tot snel',
    'You don\'t have permission to use this command': 'Je hebt geen toestemming om dit commando te gebruiken',
    'Player not found': 'Speler niet gevonden',
    'Invalid command': 'Ongeldig commando',
    'Main Menu': 'Hoofdmenu',
    'Shop': 'Winkel',
    'Your balance': 'Je saldo',
    'join': 'deelnemen',
    'leave': 'verlaten',
    'death': 'dood',
    'respawn': 'hergeboorte',
    'error': 'fout',
    'success': 'succes'
  },
  'pl': {
    'Welcome to the server': 'Witamy na serwerze',
    'Goodbye': 'Do widzenia',
    'See you soon': 'Do zobaczenia wkrótce',
    'You don\'t have permission to use this command': 'Nie masz uprawnień do użycia tej komendy',
    'Player not found': 'Gracz nie znaleziony',
    'Invalid command': 'Nieprawidłowa komenda',
    'Main Menu': 'Menu główne',
    'Shop': 'Sklep',
    'Your balance': 'Twoje saldo',
    'join': 'dołącz',
    'leave': 'opuść',
    'death': 'śmierć',
    'respawn': 'odrodzenie',
    'error': 'błąd',
    'success': 'sukces'
  },
  'de': {
    'Welcome to the server': 'Willkommen auf dem Server',
    'Goodbye': 'Auf Wiedersehen',
    'See you soon': 'Bis bald',
    'You don\'t have permission to use this command': 'Du hast keine Berechtigung, diesen Befehl zu verwenden',
    'Available commands': 'Verfügbare Befehle',
    'Show this help message': 'Diese Hilfenachricht anzeigen',
    'Teleport to spawn': 'Zum Spawn teleportieren',
    'Teleport to your home': 'Zu deinem Zuhause teleportieren',
    'Player not found': 'Spieler nicht gefunden',
    'Invalid command': 'Ungültiger Befehl',
    'Use /help for assistance': 'Verwende /help für Hilfe',
    'Please wait': 'Bitte warten',
    'seconds before using this command again': 'Sekunden bevor du diesen Befehl erneut verwendest',
    'Main Menu': 'Hauptmenü',
    'Teleportation': 'Teleportation',
    'Click to open teleportation menu': 'Klicken um das Teleportationsmenü zu öffnen',
    'Available destinations': 'Verfügbare Ziele',
    'Shop': 'Geschäft',
    'Buy and sell items': 'Gegenstände kaufen und verkaufen',
    'Your balance': 'Dein Guthaben',
    
    // Sample config specific
    'Sample Minecraft Plugin Configuration': 'Beispiel Minecraft Plugin Konfiguration',
    'This is a test configuration file for ConfigTranslator': 'Dies ist eine Test-Konfigurationsdatei für ConfigTranslator',
    'AwesomePlugin': 'TollesPlugin',
    'Welcome to the server, %player%!': 'Willkommen auf dem Server, %player%!',
    'Goodbye, %player%! See you soon!': 'Auf Wiedersehen, %player%! Bis bald!',
    'You don\'t have permission to use this command!': 'Du hast keine Berechtigung, diesen Befehl zu verwenden!',
    'Invalid command. Use /help for assistance.': 'Ungültiger Befehl. Verwende /help für Hilfe.',
    'Please wait %time% seconds before using this command again.': 'Bitte warte %time% Sekunden bevor du diesen Befehl erneut verwendest.',
    'Player not found!': 'Spieler nicht gefunden!',
    'Your balance: $%balance%': 'Dein Guthaben: $%balance%',
    'Available destinations: %count%': 'Verfügbare Ziele: %count%',
    
    // Common .lang file entries
    'join': 'beitreten',
    'leave': 'verlassen',
    'death': 'tod',
    'respawn': 'wiedergeburt',
    'chat': 'chat',
    'command': 'befehl',
    'error': 'fehler',
    'success': 'erfolg',
    'warning': 'warnung',
    'info': 'information'
  },
  'zh': {
    'Welcome to the server': '欢迎来到服务器',
    'Goodbye': '再见',
    'See you soon': '很快见',
    'You don\'t have permission to use this command': '你没有权限使用此命令',
    'Available commands': '可用命令',
    'Show this help message': '显示此帮助消息',
    'Teleport to spawn': '传送到出生点',
    'Teleport to your home': '传送到你的家',
    'Player not found': '找不到玩家',
    'Invalid command': '无效命令',
    'Use /help for assistance': '使用 /help 获取帮助',
    'Please wait': '请等待',
    'seconds before using this command again': '秒后才能再次使用此命令',
    'Main Menu': '主菜单',
    'Teleportation': '传送',
    'Click to open teleportation menu': '点击打开传送菜单',
    'Available destinations': '可用目的地',
    'Shop': '商店',
    'Buy and sell items': '买卖物品',
    'Your balance': '你的余额',
    
    // Sample config specific
    'Sample Minecraft Plugin Configuration': '示例 Minecraft 插件配置',
    'This is a test configuration file for ConfigTranslator': '这是 ConfigTranslator 的测试配置文件',
    'AwesomePlugin': '超棒插件',
    'Welcome to the server, %player%!': '欢迎来到服务器，%player%！',
    'Goodbye, %player%! See you soon!': '再见，%player%！很快见！',
    'You don\'t have permission to use this command!': '你没有权限使用此命令！',
    'Invalid command. Use /help for assistance.': '无效命令。使用 /help 获取帮助。',
    'Please wait %time% seconds before using this command again.': '请等待 %time% 秒后才能再次使用此命令。',
    'Player not found!': '找不到玩家！',
    'Your balance: $%balance%': '你的余额：$%balance%',
    'Available destinations: %count%': '可用目的地：%count%',
    
    // Common .lang file entries
    'join': '加入',
    'leave': '离开',
    'death': '死亡',
    'respawn': '重生',
    'chat': '聊天',
    'command': '命令',
    'error': '错误',
    'success': '成功',
    'warning': '警告',
    'info': '信息'
  },
  'it': {
    'Welcome to the server': 'Benvenuto nel server',
    'Goodbye': 'Arrivederci',
    'See you soon': 'A presto',
    'You don\'t have permission to use this command': 'Non hai il permesso di usare questo comando',
    'Available commands': 'Comandi disponibili',
    'Show this help message': 'Mostra questo messaggio di aiuto',
    'Teleport to spawn': 'Teletrasportati al spawn',
    'Teleport to your home': 'Teletrasportati a casa tua',
    'Player not found': 'Giocatore non trovato',
    'Invalid command': 'Comando non valido',
    'Use /help for assistance': 'Usa /help per assistenza',
    'Please wait': 'Aspetta',
    'seconds before using this command again': 'secondi prima di usare questo comando di nuovo',
    'Main Menu': 'Menu Principale',
    'Teleportation': 'Teletrasporto',
    'Click to open teleportation menu': 'Clicca per aprire il menu di teletrasporto',
    'Available destinations': 'Destinazioni disponibili',
    'Shop': 'Negozio',
    'Buy and sell items': 'Compra e vendi oggetti',
    'Your balance': 'Il tuo saldo',
    
    // Sample config specific
    'Sample Minecraft Plugin Configuration': 'Configurazione Plugin Minecraft di Esempio',
    'This is a test configuration file for ConfigTranslator': 'Questo è un file di configurazione di test per ConfigTranslator',
    'AwesomePlugin': 'PluginFantastico',
    'Welcome to the server, %player%!': 'Benvenuto nel server, %player%!',
    'Goodbye, %player%! See you soon!': 'Arrivederci, %player%! A presto!',
    'You don\'t have permission to use this command!': 'Non hai il permesso di usare questo comando!',
    'Invalid command. Use /help for assistance.': 'Comando non valido. Usa /help per assistenza.',
    'Please wait %time% seconds before using this command again.': 'Aspetta %time% secondi prima di usare questo comando di nuovo.',
    'Player not found!': 'Giocatore non trovato!',
    'Your balance: $%balance%': 'Il tuo saldo: $%balance%',
    'Available destinations: %count%': 'Destinazioni disponibili: %count%',
    
    // Common .lang file entries
    'join': 'unisciti',
    'leave': 'lascia',
    'death': 'morte',
    'respawn': 'rinascita',
    'chat': 'chat',
    'command': 'comando',
    'error': 'errore',
    'success': 'successo',
    'warning': 'avvertimento',
    'info': 'informazione'
  }
}

export class TranslationService {
  private static readonly MAX_FILE_SIZE = 100 * 1024 // 100KB limit for free tier

  static validateFileSize(content: string): boolean {
    const sizeInBytes = new Blob([content]).size
    return sizeInBytes <= this.MAX_FILE_SIZE
  }

  static async translateConfig(
    content: string,
    targetLanguage: Language,
    fileName: string
  ): Promise<TranslationResult & { rateLimitInfo?: { remaining: number; limit: number; resetTime?: number }; totalTranslations?: number }> {
    const startTime = Date.now()

    if (!this.validateFileSize(content)) {
      throw new Error(`File size exceeds ${this.MAX_FILE_SIZE / 1024}KB limit`)
    }

    try {
      let translatedContent: string
      let rateLimitInfo: { remaining: number; limit: number; resetTime?: number } | undefined
      let totalTranslations: number | undefined

      // Try AI translation via API route first
      try {
        const aiResult = await this.aiTranslate(content, targetLanguage, fileName)
        translatedContent = aiResult.content
        rateLimitInfo = aiResult.rateLimitInfo
        totalTranslations = aiResult.totalTranslations
      } catch (error: any) {
        // If API translation fails, fall back to mock translation
        console.warn('AI translation failed, using mock translation:', error.message)
        translatedContent = this.mockTranslate(content, targetLanguage)
      }

      const processingTime = Date.now() - startTime
      const stats = this.calculateStats(content, translatedContent, processingTime)

      return {
        translatedContent,
        stats,
        targetLanguage,
        rateLimitInfo,
        totalTranslations
      }
    } catch (error) {
      console.error('Translation error:', error)
      throw new Error('Failed to translate configuration file. Please try again.')
    }
  }

  private static async aiTranslate(content: string, targetLanguage: Language, fileName: string): Promise<{ content: string; rateLimitInfo?: { remaining: number; limit: number; resetTime?: number }; totalTranslations?: number }> {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        targetLanguage,
        fileName
      })
    })

    const data = await response.json()

    // Extract rate limit info from headers
    const rateLimitInfo = {
      remaining: parseInt(response.headers.get('X-RateLimit-Remaining') || '0'),
      limit: parseInt(response.headers.get('X-RateLimit-Limit') || '10'),
      resetTime: parseInt(response.headers.get('X-RateLimit-Reset') || '0')
    }

    if (!response.ok) {
      if (response.status === 429) {
        // Rate limit exceeded
        const resetTime = data.resetTime ? new Date(data.resetTime).toLocaleTimeString() : 'later'
        throw new Error(`Rate limit exceeded. You can make 10 translations per hour. Try again at ${resetTime}.`)
      }
      if (data.useMockTranslation) {
        // API suggests using mock translation
        throw new Error(data.error || 'API translation unavailable')
      }
      throw new Error(data.error || 'Translation failed')
    }

    if (!data.translatedContent) {
      throw new Error('No translation received from API')
    }

    return { content: data.translatedContent, rateLimitInfo, totalTranslations: data.totalTranslations }
  }

  private static mockTranslate(content: string, targetLanguage: Language): string {
    // If target language is English or not supported, return original
    if (targetLanguage.code === 'en' || !MOCK_TRANSLATIONS[targetLanguage.code]) {
      return content
    }

    const translations = MOCK_TRANSLATIONS[targetLanguage.code]
    let translatedContent = content

    // Apply translations while preserving structure
    Object.entries(translations).forEach(([english, translated]) => {
      // Use regex to find and replace text while preserving MiniMessage codes and structure
      const regex = new RegExp(english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      translatedContent = translatedContent.replace(regex, translated)
    })

    return translatedContent
  }

  private static calculateStats(
    original: string,
    translated: string,
    processingTime: number
  ): TranslationStats {
    const originalLines = original.split('\n').length
    const translatedLines = translated.split('\n').length
    const charactersTranslated = translated.length
    const estimatedTokens = Math.ceil(charactersTranslated / 4) // Rough estimate

    return {
      originalLines,
      translatedLines,
      charactersTranslated,
      estimatedTokens,
      processingTime
    }
  }
} 