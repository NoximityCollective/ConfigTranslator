-- ConfigTranslator D1 Database Schema

-- Table to store global translation counter
CREATE TABLE IF NOT EXISTS translation_counter (
  id INTEGER PRIMARY KEY,
  total_translations INTEGER NOT NULL DEFAULT 0,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial counter row
INSERT OR IGNORE INTO translation_counter (id, total_translations) VALUES (1, 0);

-- Table to store IP-based rate limiting (LEGACY - now using KV)
-- Note: ip_address field now stores hashed IPs for privacy protection
CREATE TABLE IF NOT EXISTS rate_limits (
  ip_address TEXT PRIMARY KEY, -- Stores SHA-256 hashed IP addresses
  request_count INTEGER NOT NULL DEFAULT 0,
  window_start DATETIME NOT NULL,
  last_request DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient cleanup of expired entries
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_last_request ON rate_limits(last_request);

-- Table to store translation history (for analytics)
-- Note: ip_address field stores hashed IPs for privacy protection
CREATE TABLE IF NOT EXISTS translation_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address TEXT NOT NULL, -- Stores SHA-256 hashed IP addresses for privacy
  source_language TEXT DEFAULT 'en',
  target_language TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  lines_count INTEGER,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT,
  processing_time INTEGER, -- in milliseconds
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_translation_history_created_at ON translation_history(created_at);
CREATE INDEX IF NOT EXISTS idx_translation_history_target_language ON translation_history(target_language);
CREATE INDEX IF NOT EXISTS idx_translation_history_success ON translation_history(success); 