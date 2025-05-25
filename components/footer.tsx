import { Heart, Github, Globe } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">ConfigTranslator</h3>
            <p className="text-sm text-muted-foreground">
              AI-powered Minecraft plugin configuration translator made with love by Noximity.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Heart className="h-4 w-4 text-red-500" />
              <span>Free & Open Source</span>
            </div>
          </div>

          {/* Links Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Resources</h4>
            <div className="space-y-2 text-sm">
              <div>
                <a 
                  href="https://github.com/NoximityCollective" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </a>
              </div>
              <div>
                <a 
                  href="https://ko-fi.com/noximitycollective" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                >
                  <Heart className="h-4 w-4" />
                  Support Us
                </a>
              </div>
              <div>
                <a 
                  href="mailto:business@noximity.com"
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                >
                  <Globe className="h-4 w-4" />
                  Contact
                </a>
              </div>

            </div>
          </div>

          {/* Features Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Features</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div>✨ AI-Powered Translation</div>
              <div>🎨 MiniMessage Support</div>
              <div>📁 Multiple File Formats</div>
              <div>🚀 Free to Use</div>
              <div>🌍 7 Languages Supported</div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground">
              © 2025 Noximity Collective. Made with ❤️ for the Minecraft community.
            </div>
            <div className="text-sm text-muted-foreground">
              Rate limited to 10 translations per hour • Max 100KB file size
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
} 