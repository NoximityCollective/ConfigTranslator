# OpenRouter API Setup Guide

To enable **real AI translation** in ConfigTranslator, follow these simple steps:

## 1. Get Your API Key

1. Visit [OpenRouter.ai](https://openrouter.ai/)
2. Sign up for a free account
3. Go to your dashboard and generate an API key
4. Copy the API key

## 2. Configure Your Environment

Create a file named `.env.local` in the project root directory:

```bash
OPENROUTER_API_KEY=your_actual_api_key_here
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=ConfigTranslator
```

Replace `your_actual_api_key_here` with your real API key from OpenRouter.

## 3. Restart the Server

```bash
npm run dev
```

## 4. Enjoy AI Translation!

Your ConfigTranslator will now use GPT-4o-mini for professional-quality translations that:

- ✅ Understand Minecraft plugin context
- ✅ Preserve MiniMessage color codes perfectly
- ✅ Keep placeholders intact (%player%, %time%, etc.)
- ✅ Maintain YAML/JSON structure
- ✅ Only translate user-facing text
- ✅ Secure server-side API calls (API key never exposed to browser)
- ✅ Automatic fallback to demo mode if API fails

## Cost Information

OpenRouter offers competitive pricing for GPT-4o-mini. Check their [pricing page](https://openrouter.ai/models) for current rates.

## Troubleshooting

- **Still seeing demo mode?** Make sure your `.env.local` file is in the project root and restart the server
- **Translation errors?** Check that your API key is valid and you have credits in your OpenRouter account
- **Need help?** Open an issue on GitHub or contact the Noximity team 