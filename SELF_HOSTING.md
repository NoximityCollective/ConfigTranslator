# 🚀 Self-Hosting ConfigTranslator

This guide will help you deploy your own instance of ConfigTranslator on Cloudflare Pages with D1 database and KV storage.

## 📋 Prerequisites

- [Cloudflare account](https://cloudflare.com) (free tier works)
- [GitHub account](https://github.com) for code hosting
- [OpenRouter API key](https://openrouter.ai) for AI translations
- Basic command line knowledge

## 🛠️ Quick Setup (5 minutes)

### Step 1: Fork the Repository

1. Go to [ConfigTranslator GitHub](https://github.com/NoximityCollective/configtranslator)
2. Click **"Fork"** to create your own copy
3. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/configtranslator.git
cd configtranslator
```

### Step 2: Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Cloudflare CLI globally
npm install -g wrangler

# Authenticate with Cloudflare
wrangler auth login
```

### Step 3: Create Cloudflare Resources

```bash
# Create D1 database
wrangler d1 create configtranslator-db

# Create KV namespace
wrangler kv namespace create "RATE_LIMIT_KV"

# Apply database schema
wrangler d1 execute configtranslator-db --file=./schema.sql --remote
```

**📝 Important**: Save the IDs from the output! You'll need them in the next step.

### Step 4: Configure wrangler.toml

Edit `wrangler.toml` and replace the placeholder IDs:

```toml
# Replace with your actual IDs from Step 3
[[d1_databases]]
binding = "DB"
database_name = "configtranslator-db"
database_id = "YOUR_D1_DATABASE_ID_HERE"  # ← Replace this

[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "YOUR_KV_NAMESPACE_ID_HERE"  # ← Replace this
```

### Step 5: Deploy to Cloudflare Pages

```bash
# Deploy your application
wrangler pages deploy dist --project-name configtranslator

# Or connect to GitHub for automatic deployments
wrangler pages project create configtranslator --production-branch main
```

### Step 6: Configure Environment Variables

In your Cloudflare Pages dashboard:

1. Go to **Settings → Environment Variables**
2. Add these variables:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
NEXT_PUBLIC_SITE_URL=https://your-domain.pages.dev
NEXT_PUBLIC_SITE_NAME=ConfigTranslator
NODE_ENV=production
IP_HASH_SALT=your-unique-salt-for-ip-hashing-change-this
```

### Step 7: Set Up Bindings

In Cloudflare Pages dashboard:

1. Go to **Settings → Functions**
2. Add **D1 database binding**:
   - Variable name: `DB`
   - D1 database: Select your `configtranslator-db`
3. Add **KV namespace binding**:
   - Variable name: `RATE_LIMIT_KV`
   - KV namespace: Select your rate limiting namespace

## 🎉 You're Done!

Your ConfigTranslator instance is now live! Visit your Pages URL to start translating.

---

## 🔧 Advanced Configuration

### Custom Domain

1. In Cloudflare Pages, go to **Custom domains**
2. Add your domain (e.g., `translate.yourdomain.com`)
3. Update `NEXT_PUBLIC_SITE_URL` environment variable

### Rate Limiting Customization

Edit `lib/kv-rate-limiter.ts` to change limits:

```typescript
// Change from 10 requests per hour to your preferred limit
constructor(kvNamespace: KVNamespace, maxRequests = 20, windowMs = 60 * 60 * 1000)
```

### Supported Languages

Add more languages in `lib/languages.ts`:

```typescript
export const SUPPORTED_LANGUAGES: Language[] = [
  // Add your language here
  { code: 'your_lang', name: 'Your Language', flag: '🏴' },
  // ... existing languages
]
```

### File Size Limits

Modify limits in `app/api/translate/route.ts`:

```typescript
const MAX_FILE_SIZE = 200 * 1024 // Change to 200KB
const MAX_CHUNK_LINES = 200 // Increase chunk size
```

---

## 🚀 Local Development

### Setup Local Environment

```bash
# Copy environment template
cp .env.example .env.local

# Add your OpenRouter API key
echo "OPENROUTER_API_KEY=your_key_here" >> .env.local

# Start development server with Cloudflare bindings
wrangler pages dev --d1 DB=configtranslator-db --kv RATE_LIMIT_KV=your_kv_id
```

### Development Commands

```bash
# Start Next.js dev server (no Cloudflare bindings)
npm run dev

# Start with Cloudflare bindings
npm run dev:cf

# Build for production
npm run build

# Deploy to Cloudflare Pages
npm run deploy
```

---

## 📊 Monitoring & Management

### Database Queries

```bash
# Check translation counter
wrangler d1 execute configtranslator-db --command "SELECT * FROM translation_counter;" --remote

# View recent translations
wrangler d1 execute configtranslator-db --command "SELECT * FROM translation_history ORDER BY created_at DESC LIMIT 10;" --remote

# Get popular languages
wrangler d1 execute configtranslator-db --command "
SELECT target_language, COUNT(*) as count 
FROM translation_history 
WHERE created_at > datetime('now', '-7 days')
GROUP BY target_language 
ORDER BY count DESC;" --remote
```

### KV Management

```bash
# List rate limit entries
wrangler kv key list --namespace-id=YOUR_KV_ID

# Clear specific rate limit
wrangler kv key delete "rate_limit:IP_ADDRESS" --namespace-id=YOUR_KV_ID

# Clear all rate limits
wrangler kv key list --namespace-id=YOUR_KV_ID | jq -r '.[] | .name' | grep "rate_limit:" | xargs -I {} wrangler kv key delete {} --namespace-id=YOUR_KV_ID
```

### Analytics Dashboard

Create a simple analytics page by adding to `pages/admin.tsx`:

```typescript
// View translation stats, popular languages, etc.
// See lib/d1-service.ts getAnalytics() method
```

---

## 🔒 Security Considerations

### API Key Protection

- Never commit API keys to Git
- Use Cloudflare environment variables
- Rotate keys regularly

### Rate Limiting

- Monitor usage patterns
- Adjust limits based on your needs
- Consider implementing user authentication for higher limits

### Database Security

- D1 databases are private by default
- Only your Cloudflare account can access them
- Regular backups are handled automatically

### IP Address Privacy

- All IP addresses are hashed using SHA-256 before storage
- Uses a configurable salt for additional security
- Original IP addresses are never stored in the database
- Hashed IPs cannot be reverse-engineered to original addresses
- Set `IP_HASH_SALT` environment variable for production

---

## 🆘 Troubleshooting

### Common Issues

**"Database not found"**
```bash
# Check if database exists
wrangler d1 list

# Recreate if missing
wrangler d1 create configtranslator-db
wrangler d1 execute configtranslator-db --file=./schema.sql --remote
```

**"KV namespace not found"**
```bash
# Check existing namespaces
wrangler kv namespace list

# Create if missing
wrangler kv namespace create "RATE_LIMIT_KV"
```

**"Rate limiting not working"**
- Verify KV binding in Pages dashboard
- Check namespace ID in wrangler.toml
- Ensure environment variables are set

**"Translation counter not updating"**
- Verify D1 binding in Pages dashboard
- Check database schema is applied
- Review API logs in Cloudflare dashboard

### Getting Help

1. Check [GitHub Issues](https://github.com/NoximityCollective/configtranslator/issues)
2. Join our [Discord community](https://discord.gg/noximity)
3. Email support: [business@noximity.com](mailto:business@noximity.com)

---

## 📈 Scaling Your Instance

### High Traffic Setup

For high-traffic instances:

1. **Increase Rate Limits**: Modify KV rate limiter settings
2. **Add Caching**: Implement Redis for frequently translated content
3. **Load Balancing**: Use multiple Cloudflare regions
4. **Monitoring**: Set up alerts for API usage and errors

### Enterprise Features

Consider adding:

- User authentication and personal rate limits
- Translation history per user
- Bulk translation API
- Webhook notifications
- Custom AI model integration

---

## 💝 Contributing Back

If you make improvements to your instance:

1. Fork the main repository
2. Create a feature branch
3. Submit a pull request
4. Help the community grow!

---

## 📄 License

ConfigTranslator is MIT licensed. You're free to:
- ✅ Use commercially
- ✅ Modify and distribute
- ✅ Create derivative works
- ✅ Private use

**Attribution appreciated but not required!**

---

<div align="center">

**Happy Self-Hosting! 🚀**

*Made with ❤️ by the Minecraft community*

</div> 