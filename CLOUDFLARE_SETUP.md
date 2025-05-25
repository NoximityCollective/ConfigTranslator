# Cloudflare D1 & KV Setup Guide for ConfigTranslator

This guide will help you set up Cloudflare D1 database and KV storage for ConfigTranslator's translation counter and rate limiting.

## Prerequisites

- Cloudflare account
- Cloudflare Pages project set up
- `wrangler` CLI installed and authenticated

## 1. D1 Database Setup

### Create D1 Database

```bash
# Create the D1 database
wrangler d1 create configtranslator-db

# Note the database ID from the output (e.g., 3ed4ae1d-8bbc-45bd-a0ba-89374f7399fc)
```

### Initialize Database Schema

```bash
# Apply the schema to your database
wrangler d1 execute configtranslator-db --file=./schema.sql
```

### Bind D1 to Your Pages Project

In your Cloudflare Pages dashboard:

1. Go to your ConfigTranslator project
2. Navigate to **Settings** → **Functions**
3. Add a **D1 database binding**:
   - Variable name: `DB`
   - D1 database: Select your `configtranslator-db`

Or via `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "configtranslator-db"
database_id = "3ed4ae1d-8bbc-45bd-a0ba-89374f7399fc"
```

## 2. KV Namespace Setup

### Create KV Namespace

```bash
# Create the KV namespace for rate limiting
wrangler kv:namespace create "RATE_LIMIT_KV"

# Note the namespace ID from the output (e.g., 1d4d5e34ffad418ba5c26888b3c2def9)
```

### Bind KV to Your Pages Project

In your Cloudflare Pages dashboard:

1. Go to your ConfigTranslator project
2. Navigate to **Settings** → **Functions**
3. Add a **KV namespace binding**:
   - Variable name: `RATE_LIMIT_KV`
   - KV namespace: Select your rate limiting namespace

Or via `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "1d4d5e34ffad418ba5c26888b3c2def9"
```

## 3. Environment Variables

Make sure these environment variables are set in your Cloudflare Pages project:

```env
# Required
OPENROUTER_API_KEY=your_openrouter_api_key_here
NEXT_PUBLIC_SITE_URL=https://configtranslator.noximity.com
NEXT_PUBLIC_SITE_NAME=ConfigTranslator

# Optional
NODE_ENV=production
```

## 4. Local Development Setup

For local development, create a `wrangler.toml` file:

```toml
name = "configtranslator"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "configtranslator-db"
database_id = "3ed4ae1d-8bbc-45bd-a0ba-89374f7399fc"

[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "1d4d5e34ffad418ba5c26888b3c2def9"
```

Then run:

```bash
# Start local development with D1 and KV
wrangler pages dev --d1 DB=configtranslator-db --kv RATE_LIMIT_KV=1d4d5e34ffad418ba5c26888b3c2def9
```

## 5. Database Management

### View Translation Stats

```bash
# Check translation counter
wrangler d1 execute configtranslator-db --command "SELECT * FROM translation_counter;"

# View recent translations
wrangler d1 execute configtranslator-db --command "SELECT * FROM translation_history ORDER BY created_at DESC LIMIT 10;"

# Get analytics
wrangler d1 execute configtranslator-db --command "
SELECT 
  target_language, 
  COUNT(*) as count,
  AVG(processing_time) as avg_time
FROM translation_history 
WHERE created_at > datetime('now', '-7 days')
GROUP BY target_language 
ORDER BY count DESC;
"
```

### View Rate Limit Data

```bash
# List rate limit entries
wrangler kv:key list --namespace-id=1d4d5e34ffad418ba5c26888b3c2def9

# View specific rate limit
wrangler kv:key get "rate_limit:IP_ADDRESS" --namespace-id=1d4d5e34ffad418ba5c26888b3c2def9

# Clear rate limit for specific IP
wrangler kv:key delete "rate_limit:IP_ADDRESS" --namespace-id=1d4d5e34ffad418ba5c26888b3c2def9
```

## 6. Monitoring & Analytics

### D1 Analytics Queries

```sql
-- Total translations by day
SELECT 
  DATE(created_at) as date,
  COUNT(*) as translations,
  COUNT(DISTINCT ip_address) as unique_users
FROM translation_history 
GROUP BY DATE(created_at) 
ORDER BY date DESC;

-- Most popular languages
SELECT 
  target_language,
  COUNT(*) as count,
  ROUND(AVG(processing_time), 2) as avg_processing_time_ms
FROM translation_history 
WHERE created_at > datetime('now', '-30 days')
GROUP BY target_language 
ORDER BY count DESC;

-- Success rate
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total,
  SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful,
  ROUND(SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as success_rate
FROM translation_history 
GROUP BY DATE(created_at) 
ORDER BY date DESC;
```

## 7. Troubleshooting

### Common Issues

1. **"Database not found" error**
   - Verify the database ID in your binding
   - Ensure the database exists: `wrangler d1 list`

2. **"KV namespace not found" error**
   - Check the namespace ID in your binding
   - Verify namespace exists: `wrangler kv:namespace list`

3. **Rate limiting not working**
   - Check KV binding is correctly configured
   - Verify the namespace ID matches

4. **Translation counter not updating**
   - Ensure D1 binding is working
   - Check database schema is applied correctly

### Reset Everything

```bash
# Clear all rate limits
wrangler kv:key list --namespace-id=1d4d5e34ffad418ba5c26888b3c2def9 | jq -r '.[] | .name' | xargs -I {} wrangler kv:key delete {} --namespace-id=1d4d5e34ffad418ba5c26888b3c2def9

# Reset translation counter
wrangler d1 execute configtranslator-db --command "UPDATE translation_counter SET total_translations = 0 WHERE id = 1;"

# Clear translation history
wrangler d1 execute configtranslator-db --command "DELETE FROM translation_history;"
```

## 8. Production Deployment

1. Ensure all bindings are configured in Cloudflare Pages
2. Deploy your application
3. Test the translation counter and rate limiting
4. Monitor the D1 and KV usage in Cloudflare dashboard

Your ConfigTranslator should now have:
- ✅ Persistent translation counter across deployments
- ✅ IP-based rate limiting with KV storage
- ✅ Translation analytics and history
- ✅ Live translation counter display
- ✅ Unlimited translations in local development 