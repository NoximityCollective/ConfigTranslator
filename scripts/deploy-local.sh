#!/bin/bash

# Local Deployment Script for ConfigTranslator
# This script deploys using your local wrangler.local.toml file
# Your credentials stay on your machine and are never committed to git

set -e

echo "🚀 Starting ConfigTranslator deployment..."

# Check if wrangler.local.toml exists
if [ ! -f "wrangler.local.toml" ]; then
    echo "❌ Error: wrangler.local.toml not found!"
    echo "Please create it by copying wrangler.toml and adding your credentials:"
    echo "  cp wrangler.toml wrangler.local.toml"
    echo "  # Then edit wrangler.local.toml with your actual resource IDs"
    exit 1
fi

# Check if user is authenticated with Cloudflare
if ! wrangler whoami > /dev/null 2>&1; then
    echo "❌ Error: Not authenticated with Cloudflare"
    echo "Please run: wrangler auth login"
    exit 1
fi

echo "📦 Building application..."
npm run build

echo "☁️  Deploying to Cloudflare Pages..."
wrangler pages deploy .next --config wrangler.local.toml --project-name configtranslator

echo "🔐 Setting up secrets..."
echo "Please set your OpenRouter API key:"
wrangler pages secret put OPENROUTER_API_KEY --project-name configtranslator

echo "Please set your IP hash salt:"
wrangler pages secret put IP_HASH_SALT --project-name configtranslator

echo "✅ Deployment complete!"
echo "🌐 Your site should be live at: https://configtranslator.pages.dev" 