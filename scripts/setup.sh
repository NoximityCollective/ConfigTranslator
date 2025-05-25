#!/bin/bash

# ConfigTranslator Self-Hosting Setup Script
# This script automates the setup process for deploying your own ConfigTranslator instance

set -e  # Exit on any error

echo "🚀 ConfigTranslator Self-Hosting Setup"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Wrangler CLI not found!${NC}"
    echo "Installing Wrangler CLI..."
    npm install -g wrangler
    echo -e "${GREEN}✅ Wrangler CLI installed${NC}"
fi

# Check if user is authenticated
echo "🔐 Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not authenticated with Cloudflare${NC}"
    echo "Please authenticate with Cloudflare:"
    wrangler auth login
fi

echo -e "${GREEN}✅ Authenticated with Cloudflare${NC}"
echo ""

# Create D1 database
echo "📊 Creating D1 database..."
D1_OUTPUT=$(wrangler d1 create configtranslator-db 2>&1)
D1_ID=$(echo "$D1_OUTPUT" | grep -o 'database_id = "[^"]*"' | cut -d'"' -f2)

if [ -z "$D1_ID" ]; then
    echo -e "${RED}❌ Failed to create D1 database${NC}"
    echo "Output: $D1_OUTPUT"
    exit 1
fi

echo -e "${GREEN}✅ D1 database created with ID: $D1_ID${NC}"

# Create KV namespace
echo "🗂️  Creating KV namespace..."
KV_OUTPUT=$(wrangler kv namespace create "RATE_LIMIT_KV" 2>&1)
KV_ID=$(echo "$KV_OUTPUT" | grep -o 'id = "[^"]*"' | cut -d'"' -f2)

if [ -z "$KV_ID" ]; then
    echo -e "${RED}❌ Failed to create KV namespace${NC}"
    echo "Output: $KV_OUTPUT"
    exit 1
fi

echo -e "${GREEN}✅ KV namespace created with ID: $KV_ID${NC}"

# Update wrangler.toml with actual IDs
echo "📝 Updating wrangler.toml configuration..."
sed -i.bak "s/YOUR_D1_DATABASE_ID_HERE/$D1_ID/g" wrangler.toml
sed -i.bak "s/YOUR_KV_NAMESPACE_ID_HERE/$KV_ID/g" wrangler.toml
rm wrangler.toml.bak

echo -e "${GREEN}✅ wrangler.toml updated${NC}"

# Update package.json dev:cf script
echo "📝 Updating package.json scripts..."
sed -i.bak "s/YOUR_KV_NAMESPACE_ID_HERE/$KV_ID/g" package.json
rm package.json.bak

echo -e "${GREEN}✅ package.json updated${NC}"

# Apply database schema
echo "🗄️  Applying database schema..."
if wrangler d1 execute configtranslator-db --file=./schema.sql --remote; then
    echo -e "${GREEN}✅ Database schema applied${NC}"
else
    echo -e "${RED}❌ Failed to apply database schema${NC}"
    exit 1
fi

# Create .env.local template
echo "📄 Creating .env.local template..."
cat > .env.local << EOF
# ConfigTranslator Environment Variables
# Copy this file and add your actual values

# OpenRouter API Key (required for AI translations)
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=ConfigTranslator

# Development
NODE_ENV=development
EOF

echo -e "${GREEN}✅ .env.local template created${NC}"

# Create deployment info file
echo "📋 Creating deployment information..."
cat > DEPLOYMENT_INFO.md << EOF
# Your ConfigTranslator Deployment

## 🆔 Resource IDs

- **D1 Database ID**: \`$D1_ID\`
- **KV Namespace ID**: \`$KV_ID\`
- **Database Name**: \`configtranslator-db\`
- **KV Namespace Name**: \`RATE_LIMIT_KV\`

## 🚀 Next Steps

1. **Get OpenRouter API Key**:
   - Visit [OpenRouter](https://openrouter.ai)
   - Sign up and generate an API key
   - Add it to your \`.env.local\` file

2. **Deploy to Cloudflare Pages**:
   \`\`\`bash
   npm run deploy
   \`\`\`

3. **Set up Pages bindings**:
   - Go to Cloudflare Pages dashboard
   - Add D1 binding: \`DB\` → \`configtranslator-db\`
   - Add KV binding: \`RATE_LIMIT_KV\` → your KV namespace

4. **Configure environment variables**:
   - Add \`OPENROUTER_API_KEY\`
   - Add \`NEXT_PUBLIC_SITE_URL\`
   - Add \`NODE_ENV=production\`

## 🛠️ Management Commands

\`\`\`bash
# Check translation stats
npm run db:query -- --command "SELECT * FROM translation_counter;"

# View rate limits
npm run kv:list -- --namespace-id=$KV_ID

# Deploy updates
npm run deploy

# View logs
npm run logs
\`\`\`

## 📊 Database Schema Applied

Your database now has these tables:
- \`translation_counter\` - Global translation count
- \`rate_limits\` - IP-based rate limiting (legacy, now using KV)
- \`translation_history\` - Detailed analytics

## 🎉 You're Ready!

Your ConfigTranslator instance is configured and ready to deploy!
EOF

echo -e "${GREEN}✅ Deployment info saved to DEPLOYMENT_INFO.md${NC}"

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo -e "   D1 Database ID: ${GREEN}$D1_ID${NC}"
echo -e "   KV Namespace ID: ${GREEN}$KV_ID${NC}"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "   1. Add your OpenRouter API key to .env.local"
echo "   2. Run 'npm run deploy' to deploy to Cloudflare Pages"
echo "   3. Set up bindings in Cloudflare Pages dashboard"
echo "   4. Configure environment variables in Pages"
echo ""
echo -e "${BLUE}📖 Documentation:${NC}"
echo "   - See DEPLOYMENT_INFO.md for detailed instructions"
echo "   - See SELF_HOSTING.md for complete guide"
echo ""
echo -e "${GREEN}🚀 Happy self-hosting!${NC}" 