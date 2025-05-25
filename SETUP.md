# ConfigTranslator Setup Guide

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/NoximityCollective/configtranslator.git
   cd configtranslator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up OpenRouter API (Recommended)**
   - Sign up at [OpenRouter](https://openrouter.ai/)
   - Get your API key from the dashboard
   - Create a `.env.local` file in the project root:
   ```bash
   OPENROUTER_API_KEY=your_actual_api_key_here
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   NEXT_PUBLIC_SITE_NAME=ConfigTranslator
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open the application**
   Navigate to [http://localhost:3000](http://localhost:3000)

## AI Translation Mode

ConfigTranslator now features **real AI translation** powered by OpenRouter!

### With API Key (Recommended):
✅ **Professional AI translation** using GPT-4o-mini  
✅ **Smart context awareness** - only translates user-facing text  
✅ **Perfect preservation** of MiniMessage codes and placeholders  
✅ **High-quality results** in all supported languages  

### Demo Mode (Fallback):
If no API key is configured, the app automatically falls back to mock translations:
- 🇪🇸 Spanish
- 🇫🇷 French  
- 🇩🇪 German
- 🇨🇳 Chinese
- 🇮🇹 Italian

## Testing the Application

1. **Upload a test file**
   - Use the sample file at `public/sample-config.yml`
   - Or create your own YAML/JSON configuration file

2. **Select a target language**
   - Choose from: English, Chinese, French, Spanish, Slovenian, German, Italian

3. **Translate**
   - Click "Translate Configuration"
   - View results in the Preview tab
   - Check statistics in the Statistics tab

4. **Export**
   - Copy to clipboard
   - Download the translated file

## File Requirements

- **Maximum size**: 50KB
- **Supported formats**: .yml, .yaml, .json, .properties, .conf, .config
- **Content**: Minecraft plugin configuration files

## Features

- ✅ MiniMessage color code preservation
- ✅ YAML/JSON structure preservation
- ✅ Smart text-only translation
- ✅ Real-time progress tracking
- ✅ Translation statistics
- ✅ Copy/download functionality
- ✅ File preview
- ✅ Multi-language support

## Troubleshooting

### Demo Limitations
- Only predefined translations are available (not full AI translation)
- Limited vocabulary in mock translation dictionary
- For production use, integrate with a real translation service

### File Upload Issues
- Check file size (must be under 50KB)
- Verify file format is supported
- Ensure file contains valid configuration content

### Translation Issues
- Check browser console for any JavaScript errors
- Ensure file content matches the mock translation dictionary
- Try with the provided sample file for best results

## Development

### Tech Stack
- **Frontend**: Next.js 15, React 19
- **UI**: shadcn/ui, Radix UI, Tailwind CSS
- **Translation**: Local mock service (demo mode)
- **Language**: TypeScript

### Project Structure
```
configtranslator/
├── app/                    # Next.js app directory
├── components/             # React components
│   ├── ui/                # shadcn/ui components
│   └── config-translator.tsx
├── lib/                   # Utilities and services
├── hooks/                 # Custom React hooks
├── public/                # Static assets
└── ...
```

### Building for Production
```bash
npm run build
npm start
```

## Support

For issues or questions:
- Open an issue on GitHub
- Contact Noximity team
- Check the README.md for more details 