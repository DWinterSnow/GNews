// ============================================
// GNews Cache Utilities
// localStorage-based API response caching
// ============================================

const GNewsCache = {
  // Cache duration defaults (in milliseconds)
  DURATIONS: {
    NEWS: 10 * 60 * 1000,          // 10 minutes for news
    GAMES_LIST: 15 * 60 * 1000,    // 15 minutes for game lists (trending, upcoming...)
    GAME_DETAIL: 30 * 60 * 1000,   // 30 minutes for individual game details
    GAME_NEWS: 10 * 60 * 1000,     // 10 minutes for game-specific news
    GENRES: 60 * 60 * 1000,        // 1 hour for genres (rarely change)
    SEARCH: 5 * 60 * 1000,         // 5 minutes for search results
    RAWG_STATUS: 30 * 60 * 1000    // 30 minutes for RAWG API status
  },

  PREFIX: 'gnews_cache_',

  // ---- Core Methods ----

  /**
   * Get cached data if still valid
   * @param {string} key - Cache key
   * @returns {any|null} Cached data or null if expired/missing
   */
  get(key) {
    try {
      const raw = localStorage.getItem(this.PREFIX + key);
      if (!raw) return null;

      const entry = JSON.parse(raw);
      const now = Date.now();

      if (now - entry.timestamp > entry.duration) {
        // Expired - remove it
        localStorage.removeItem(this.PREFIX + key);
        return null;
      }

      return entry.data;
    } catch (e) {
      // Corrupted cache entry
      localStorage.removeItem(this.PREFIX + key);
      return null;
    }
  },

  /**
   * Store data in cache with duration
   * @param {string} key - Cache key
   * @param {any} data - Data to cache (must be JSON-serializable)
   * @param {number} duration - Cache duration in ms
   */
  set(key, data, duration) {
    try {
      const entry = {
        data: data,
        timestamp: Date.now(),
        duration: duration
      };
      localStorage.setItem(this.PREFIX + key, JSON.stringify(entry));
    } catch (e) {
      // localStorage full - clear old cache entries and retry
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        this.clearExpired();
        try {
          const entry = { data, timestamp: Date.now(), duration };
          localStorage.setItem(this.PREFIX + key, JSON.stringify(entry));
        } catch (e2) {
          // Still full - clear all cache
          this.clearAll();
        }
      }
    }
  },

  /**
   * Remove a specific cache entry
   */
  remove(key) {
    localStorage.removeItem(this.PREFIX + key);
  },

  /**
   * Clear all expired cache entries
   */
  clearExpired() {
    const now = Date.now();
    const keysToRemove = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.PREFIX)) {
        try {
          const entry = JSON.parse(localStorage.getItem(key));
          if (now - entry.timestamp > entry.duration) {
            keysToRemove.push(key);
          }
        } catch (e) {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    return keysToRemove.length;
  },

  /**
   * Clear all GNews cache entries
   */
  clearAll() {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    return keysToRemove.length;
  },

  /**
   * Get cache statistics
   */
  getStats() {
    let count = 0;
    let totalSize = 0;
    let expired = 0;
    const now = Date.now();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.PREFIX)) {
        count++;
        const raw = localStorage.getItem(key);
        totalSize += raw.length * 2; // UTF-16 = 2 bytes per char
        try {
          const entry = JSON.parse(raw);
          if (now - entry.timestamp > entry.duration) expired++;
        } catch (e) { expired++; }
      }
    }

    return {
      entries: count,
      expired: expired,
      sizeKB: Math.round(totalSize / 1024),
      sizeMB: (totalSize / (1024 * 1024)).toFixed(2)
    };
  },

  // ---- Smart Fetch with Cache ----

  /**
   * Fetch with automatic caching
   * @param {string} url - API URL to fetch
   * @param {string} cacheKey - Cache key to use
   * @param {number} duration - Cache duration in ms
   * @param {object} options - Fetch options (headers, etc.)
   * @returns {Promise<any>} Parsed JSON response
   */
  async fetchWithCache(url, cacheKey, duration, options = {}) {
    // Check cache first
    const cached = this.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Fetch from network
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Cache the response
    this.set(cacheKey, data, duration);

    return data;
  },

  // ---- Pre-built Cache Keys ----

  keys: {
    news: () => 'news_all',
    newsForGame: (game) => `news_game_${game.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    gamesTrending: () => 'games_trending',
    gamesUpcoming: () => 'games_upcoming',
    gamesNewReleases: () => 'games_new_releases',
    gamesPlatform: (platform, tab) => `games_platform_${platform}_${tab}`,
    gameDetail: (id) => `game_detail_${id}`,
    gameSearch: (query) => `game_search_${query.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    gamesDiscover: (params) => `games_discover_${params}`,
    genres: () => 'genres',
    rawgStatus: () => 'rawg_status'
  }
};

// ---- Service Worker Registration ----
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('[Cache] Service Worker enregistré, scope:', registration.scope);

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Check every hour
      })
      .catch(error => {
        console.warn('[Cache] Service Worker non supporté:', error);
      });
  });
}

// Clean up expired cache on page load
window.addEventListener('load', () => {
  const cleared = GNewsCache.clearExpired();
  if (cleared > 0) {
    console.log(`[Cache] ${cleared} entrées expirées nettoyées`);
  }
});
