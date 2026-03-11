// Article Model - Database operations for articles
const pool = require('../config/db');
const crypto = require('crypto');
const axios = require('axios');

// RAWG API config for game detection
const RAWG_API_KEY = process.env.RAWG_API_KEY || '2e68fa4d897b420682efc40faa9fbb6d';
const RAWG_BASE_URL = 'https://api.rawg.io/api';

// Cache of game metadata to avoid repeated RAWG API calls
// { 'game name lowercase': { name, publisher, developer } }
const gameMetadataCache = new Map();

class ArticleModel {
  // Generate a consistent hash from a title for deduplication
  static hashTitle(title) {
    const normalized = title.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 64);
  }

  // Create the articles table if it doesn't exist
  static async ensureTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS articles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        title_hash VARCHAR(64) NOT NULL,
        description TEXT,
        url VARCHAR(1000),
        image VARCHAR(1000),
        source VARCHAR(50) NOT NULL,
        author VARCHAR(255),
        category VARCHAR(50) DEFAULT 'article',
        published_at DATETIME NOT NULL,
        keywords VARCHAR(500),
        game_title VARCHAR(255),
        publisher VARCHAR(255),
        developer VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_article (title_hash),
        INDEX idx_published_at (published_at),
        INDEX idx_source (source),
        INDEX idx_category (category),
        INDEX idx_game_title (game_title),
        INDEX idx_publisher (publisher),
        INDEX idx_developer (developer),
        INDEX idx_created_at (created_at)
      )
    `;
    await pool.query(sql);

    // Add publisher/developer columns if they don't exist (migration for existing tables)
    try {
      await pool.query('ALTER TABLE articles ADD COLUMN publisher VARCHAR(255) DEFAULT NULL, ADD INDEX idx_publisher (publisher)');
    } catch (e) { /* column already exists */ }
    try {
      await pool.query('ALTER TABLE articles ADD COLUMN developer VARCHAR(255) DEFAULT NULL, ADD INDEX idx_developer (developer)');
    } catch (e) { /* column already exists */ }
  }

  // Check if an article already exists by title hash
  static async exists(titleHash) {
    const [rows] = await pool.query(
      'SELECT id FROM articles WHERE title_hash = ?',
      [titleHash]
    );
    return rows.length > 0;
  }

  // Insert a single article (skip if duplicate) - with retry logic
  static async insertIfNotExists(article, retries = 3) {
    const titleHash = this.hashTitle(article.title);
    
    const sql = `
      INSERT IGNORE INTO articles 
        (title, title_hash, description, url, image, source, author, category, published_at, keywords, game_title, publisher, developer)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const publishedAt = article.publishedAt 
      ? new Date(article.publishedAt) 
      : new Date();
    
    // Extract keywords from title
    const keywords = this.extractKeywords(article.title);
    
    // Use detected game metadata
    const gameTitle = article.gameName || null;
    const publisher = article.publisher || null;
    const developer = article.developer || null;
    
    const params = [
      article.title.substring(0, 500),
      titleHash,
      (article.description || '').substring(0, 65000),
      (article.url || '').substring(0, 1000),
      (article.image || '').substring(0, 1000),
      (article.source || 'unknown').substring(0, 50),
      (article.author || '').substring(0, 255),
      (article.category || 'article').substring(0, 50),
      publishedAt,
      keywords.substring(0, 500),
      gameTitle ? gameTitle.substring(0, 255) : null,
      publisher ? publisher.substring(0, 255) : null,
      developer ? developer.substring(0, 255) : null
    ];
    
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const [result] = await pool.query(sql, params);
        return result.affectedRows > 0; // true = inserted, false = duplicate
      } catch (error) {
        lastError = error;
        // Retry on connection errors
        if (attempt < retries && (error.code === 'PROTOCOL_CONNECTION_LOST' || 
            error.code === 'PROTOCOL_SEQUENCE_TIMEOUT' || 
            error.message.includes('Connection lost'))) {
          const delayMs = 100 * attempt; // Exponential backoff: 100ms, 200ms, 300ms
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
          throw error; // Don't retry on other errors
        }
      }
    }
    throw lastError; // All retries exhausted
  }

  // Bulk insert articles (skip duplicates) - with batching to prevent pool exhaustion
  static async bulkInsert(articles) {
    let inserted = 0;
    let skipped = 0;
    const batchSize = 5; // Process articles in batches to avoid connection pool exhaustion
    
    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize);
      
      // Process batch serially (not in parallel) to prevent connection pool exhaustion
      for (const article of batch) {
        try {
          const wasInserted = await this.insertIfNotExists(article);
          if (wasInserted) {
            inserted++;
          } else {
            skipped++;
          }
        } catch (error) {
          // Log but don't stop on individual article errors
          if (!error.message.includes('Duplicate')) {
            console.error(`   ⚠️ Erreur insertion article: ${error.message}`);
          }
          skipped++;
        }
      }
      
      // Small delay between batches to let connections recover
      if (i + batchSize < articles.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return { inserted, skipped };
  }

  // Get all articles from the database, sorted by publication date
  static async getAll(limit = 1000) {
    const [rows] = await pool.query(
      'SELECT * FROM articles ORDER BY published_at DESC LIMIT ?',
      [limit]
    );
    return rows;
  }

  // Get articles by source
  static async getBySource(source, limit = 100) {
    const [rows] = await pool.query(
      'SELECT * FROM articles WHERE source = ? ORDER BY published_at DESC LIMIT ?',
      [source, limit]
    );
    return rows;
  }

  // Search articles by game title, publisher, or developer (strict matching)
  static async searchByGame(gameName, limit = 30) {
    const exactTerm = gameName.trim();
    const [rows] = await pool.query(
      `SELECT * FROM articles 
       WHERE game_title = ? 
             OR publisher = ? 
             OR developer = ?
       ORDER BY published_at DESC LIMIT ?`,
      [exactTerm, exactTerm, exactTerm, limit]
    );
    return rows;
  }

  // Verify a game name appears in a text using word-boundary matching
  static gameNameAppearsInText(gameName, text) {
    if (!gameName || !text) return false;
    const escaped = gameName.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[\\s\\-_:,."\'!?()\\[\\]])${escaped}(?:[\\s\\-_:,."\'!?()\\[\\]]|$)`, 'i');
    return regex.test(text);
  }

  // Detect game name in article title using RAWG API and return metadata
  static async detectGameFromTitle(title) {
    if (!title || title.length < 10) return null;
    
    const titleLower = title.toLowerCase();
    
    // Extract potential game names: quoted strings, or capitalized multi-word sequences
    const candidates = [];
    
    // 1. Quoted game names (e.g., 'GTA 5' in quotes)
    const quotedMatches = title.match(/["']([^"']{2,50})["']/g);
    if (quotedMatches) {
      quotedMatches.forEach(m => candidates.push(m.replace(/["']/g, '').trim()));
    }
    
    // 2. Text before common separators like " - ", " : ", " | "
    const beforeSep = title.split(/\s*[-:|]\s*/)[0].trim();
    if (beforeSep.length >= 3 && beforeSep.length <= 50) {
      candidates.push(beforeSep);
    }
    
    // 3. Capitalized sequences (potential game titles) - at least 2 words
    const capMatches = title.match(/(?:[A-Z][a-zA-Z0-9']*(?:\s+(?:[A-Z][a-zA-Z0-9']*|[0-9]+|of|the|and|for|in|on|at|to|&))+)/g);
    if (capMatches) {
      capMatches.filter(m => m.length >= 5 && m.split(/\s+/).length <= 6)
                .forEach(m => candidates.push(m.trim()));
    }
    
    // Filter out generic gaming words/phrases that aren't game names
    const genericWords = new Set([
      'breaking', 'update', 'review', 'preview', 'trailer', 'news',
      'gaming', 'games', 'game', 'video', 'best', 'worst', 'top',
      'new', 'free', 'play', 'release', 'launch', 'announce',
      'steam', 'xbox', 'playstation', 'nintendo', 'switch', 'pc',
      'reddit', 'discussion', 'opinion', 'exclusive', 'rumor',
      'confirmed', 'leak', 'deal', 'sale', 'discount', 'patch',
      'dlc', 'mod', 'season', 'pass', 'report', 'feature',
      'should', 'could', 'would', 'every', 'always', 'never',
      'really', 'actually', 'probably', 'honestly', 'anyone',
      'everyone', 'someone', 'thought', 'think', 'what', 'when',
      'where', 'which', 'these', 'those', 'about', 'after'
    ]);
    
    const genericPhrases = [
      'what do you think', 'does anyone', 'am i the only',
      'i just finished', 'i love this', 'why is', 'how to',
      'this game', 'my favorite', 'the best', 'the worst',
      'looking for', 'need help', 'first time', 'just started'
    ];
    
    const uniqueCandidates = [...new Set(
      candidates
        .filter(c => {
          const cl = c.toLowerCase();
          if (c.length < 3) return false;
          if (genericWords.has(cl)) return false;
          const words = cl.split(/\s+/);
          if (words.every(w => genericWords.has(w) || w.length < 3)) return false;
          if (genericPhrases.some(p => cl.includes(p))) return false;
          return true;
        })
        .sort((a, b) => b.length - a.length)
    )].slice(0, 2);
    
    for (const candidate of uniqueCandidates) {
      const cacheKey = candidate.toLowerCase();
      
      // Check cache first
      if (gameMetadataCache.has(cacheKey)) {
        const cached = gameMetadataCache.get(cacheKey);
        if (cached === null) continue;
        return cached;
      }
      
      try {
        const response = await axios.get(`${RAWG_BASE_URL}/games`, {
          params: {
            key: RAWG_API_KEY,
            search: candidate,
            page_size: 5,
            search_precise: true
          },
          timeout: 5000
        });
        
        const results = response.data.results || [];
        if (results.length > 0) {
          // Common English words that happen to be game names - reject these
          const commonWords = new Set([
            'changed', 'wanted', 'inside', 'limbo', 'journey', 'nature',
            'control', 'prey', 'rage', 'flow', 'rush', 'lost', 'gone',
            'alone', 'below', 'above', 'beyond', 'hidden', 'rise', 'fall',
            'david', 'direct', 'contact', 'reach', 'move', 'watch',
            'chinese', 'new', 'year', 'fire', 'water', 'air', 'earth',
            'bound', 'beans', 'accident', 'party', 'happy'
          ]);
          
          // STRICT: The RAWG game name must actually appear in the article title
          let bestMatch = null;
          
          for (const game of results) {
            const gameLower = game.name.toLowerCase();
            const gameClean = gameLower.replace(/[^a-z0-9\s]/g, '').trim();
            
            // Skip very short game names or common English words
            if (gameClean.length < 4) continue;
            if (commonWords.has(gameClean)) continue;
            const gameWords = gameClean.split(/\s+/);
            if (gameWords.length <= 2 && gameWords.every(w => commonWords.has(w))) continue;
            
            // STRICT CHECK: The RAWG game name must appear in the title with word boundaries
            if (this.gameNameAppearsInText(gameLower, title)) {
              bestMatch = game;
              break;
            }
            // Try main name without subtitle (e.g. "Baldur's Gate III" -> "Baldur's Gate")
            const mainName = gameLower.split(/[:\-\u2013]/)[0].trim();
            if (mainName.length >= 5 && this.gameNameAppearsInText(mainName, title)) {
              bestMatch = game;
              break;
            }
          }
          
          if (bestMatch) {
            // Fetch full details to get publisher & developer
            try {
              const detailResponse = await axios.get(`${RAWG_BASE_URL}/games/${bestMatch.id}`, {
                params: { key: RAWG_API_KEY },
                timeout: 5000
              });
              
              const detail = detailResponse.data;
              const metadata = {
                name: detail.name,
                publisher: (detail.publishers && detail.publishers.length > 0) 
                  ? detail.publishers.map(p => p.name).join(', ') : null,
                developer: (detail.developers && detail.developers.length > 0) 
                  ? detail.developers.map(d => d.name).join(', ') : null
              };
              
              gameMetadataCache.set(cacheKey, metadata);
              return metadata;
            } catch (detailErr) {
              const metadata = { name: bestMatch.name, publisher: null, developer: null };
              gameMetadataCache.set(cacheKey, metadata);
              return metadata;
            }
          }
        }
        
        // Cache negative result
        gameMetadataCache.set(cacheKey, null);
      } catch (err) {
        // API error, skip this candidate
      }
    }
    
    return null;
  }

  // Get the game metadata cache size (for stats)
  static getMetadataCacheSize() {
    return gameMetadataCache.size;
  }

  // Get articles that haven't been processed for game detection yet
  static async getUnenriched(limit = 100) {
    const [rows] = await pool.query(
      `SELECT id, title FROM articles 
       WHERE game_title IS NULL AND publisher IS NULL AND developer IS NULL
             AND keywords NOT LIKE '%_no_game_detected_%'
       ORDER BY created_at DESC LIMIT ?`,
      [limit]
    );
    return rows;
  }

  // Update game metadata for an existing article
  static async updateGameMetadata(id, gameName, publisher, developer) {
    await pool.query(
      `UPDATE articles SET game_title = ?, publisher = ?, developer = ? WHERE id = ?`,
      [gameName || null, publisher || null, developer || null, id]
    );
  }

  // Mark article as processed (no game detected) to avoid re-processing
  static async markAsProcessed(id) {
    await pool.query(
      `UPDATE articles SET keywords = CONCAT(IFNULL(keywords, ''), ',_no_game_detected_') WHERE id = ?`,
      [id]
    );
  }

  // Get article count
  static async count() {
    const [rows] = await pool.query('SELECT COUNT(*) as total FROM articles');
    return rows[0].total;
  }

  // Get stats
  static async getStats() {
    const [rows] = await pool.query(`
      SELECT 
        source,
        COUNT(*) as count,
        MIN(published_at) as oldest,
        MAX(published_at) as newest
      FROM articles 
      GROUP BY source
    `);
    
    const total = await this.count();
    
    return {
      total,
      bySource: rows.reduce((acc, row) => {
        acc[row.source] = {
          count: row.count,
          oldest: row.oldest,
          newest: row.newest
        };
        return acc;
      }, {})
    };
  }

  // Extract keywords from article title
  static extractKeywords(title) {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
      'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
      'it', 'its', 'he', 'she', 'they', 'we', 'you', 'your', 'my', 'our',
      'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'ou',
      'est', 'sont', 'dans', 'sur', 'pour', 'par', 'avec', 'qui', 'que',
      'ce', 'se', 'sa', 'son', 'ses', 'au', 'aux', 'en', 'ne', 'pas',
      'plus', 'new', 'now', 'just', 'how', 'why', 'what', 'when', 'where',
      'all', 'get', 'got', 'not', 'out', 'up', 'about'
    ]);
    
    const words = title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿçœæ\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length >= 3 && !stopWords.has(w));
    
    return [...new Set(words)].slice(0, 20).join(',');
  }
}

module.exports = ArticleModel;
