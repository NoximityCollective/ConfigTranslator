@echo off
REM ConfigTranslator Self-Hosting Setup Script for Windows
REM This script automates the setup process for deploying your own ConfigTranslator instance

echo 🚀 ConfigTranslator Self-Hosting Setup
echo ======================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found! Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is available
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm not found! Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js and npm found

REM Install wrangler if not present
wrangler --version >nul 2>&1
if errorlevel 1 (
    echo 📦 Installing Wrangler CLI...
    npm install -g wrangler
    if errorlevel 1 (
        echo ❌ Failed to install Wrangler CLI
        pause
        exit /b 1
    )
    echo ✅ Wrangler CLI installed
)

REM Check authentication
echo 🔐 Checking Cloudflare authentication...
wrangler whoami >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Not authenticated with Cloudflare
    echo Please authenticate with Cloudflare:
    wrangler auth login
    if errorlevel 1 (
        echo ❌ Authentication failed
        pause
        exit /b 1
    )
)

echo ✅ Authenticated with Cloudflare
echo.

REM Create D1 database
echo 📊 Creating D1 database...
wrangler d1 create configtranslator-db > temp_d1.txt 2>&1
if errorlevel 1 (
    echo ❌ Failed to create D1 database
    type temp_d1.txt
    del temp_d1.txt
    pause
    exit /b 1
)

REM Extract D1 ID (simplified for Windows)
echo ✅ D1 database created - check temp_d1.txt for ID

REM Create KV namespace
echo 🗂️  Creating KV namespace...
wrangler kv namespace create "RATE_LIMIT_KV" > temp_kv.txt 2>&1
if errorlevel 1 (
    echo ❌ Failed to create KV namespace
    type temp_kv.txt
    del temp_kv.txt
    pause
    exit /b 1
)

echo ✅ KV namespace created - check temp_kv.txt for ID

REM Create .env.local template
echo 📄 Creating .env.local template...
(
echo # ConfigTranslator Environment Variables
echo # Copy this file and add your actual values
echo.
echo # OpenRouter API Key ^(required for AI translations^)
echo OPENROUTER_API_KEY=your_openrouter_api_key_here
echo.
echo # Site Configuration
echo NEXT_PUBLIC_SITE_URL=http://localhost:3000
echo NEXT_PUBLIC_SITE_NAME=ConfigTranslator
echo.
echo # Development
echo NODE_ENV=development
) > .env.local

echo ✅ .env.local template created

echo.
echo 🎉 Setup Complete!
echo ==================
echo.
echo 📝 Next Steps:
echo    1. Check temp_d1.txt and temp_kv.txt for your resource IDs
echo    2. Update wrangler.toml with your actual IDs
echo    3. Add your OpenRouter API key to .env.local
echo    4. Run 'npm run deploy' to deploy to Cloudflare Pages
echo    5. Set up bindings in Cloudflare Pages dashboard
echo.
echo 📖 See SELF_HOSTING.md for detailed instructions
echo.
echo 🚀 Happy self-hosting!

REM Clean up temp files
del temp_d1.txt temp_kv.txt

pause 