// Article Service - Business logic for article persistence
const ArticleModel = require('../models/article.model');

class ArticleService {
  
  // Initialize: ensure table exists
  static async initialize() {
    try {
      await ArticleModel.ensureTable();
      console.log('✅ Table articles prête');
      
      const count = await ArticleModel.count();
      console.log(`📊 ${count} articles en base de données`);
      
      return count;
    } catch (error) {
      console.error('❌ Erreur initialisation articles:', error.message);
      return 0;
    }
  }

  // Enrich articles that have no game metadata in the DB (runs in background)
  static async enrichNewArticlesInBackground() {
    try {
      // Find articles in DB without game metadata
      const unenriched = await ArticleModel.getUnenriched(100);
      if (unenriched.length === 0) {
        console.log('🎮 Tous les articles sont déjà enrichis');
        return 0;
      }
      
      console.log(`🎮 Enrichissement en cours: ${unenriched.length} articles sans métadonnées jeu...`);
      
      let enriched = 0;
      const batchSize = 5;
      
      for (let i = 0; i < unenriched.length; i += batchSize) {
        const batch = unenriched.slice(i, i + batchSize);
        
        const promises = batch.map(async (article) => {
          try {
            const metadata = await ArticleModel.detectGameFromTitle(article.title);
            if (metadata) {
              await ArticleModel.updateGameMetadata(article.id, metadata.name, metadata.publisher, metadata.developer);
              enriched++;
            } else {
              // Mark as processed (no game found) to avoid re-processing
              await ArticleModel.markAsProcessed(article.id);
            }
          } catch (err) {
            // Skip silently
          }
        });
        
        await Promise.all(promises);
        
        // Small delay between batches
        if (i + batchSize < unenriched.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      console.log(`🎮 Enrichissement terminé: ${enriched}/${unenriched.length} articles enrichis (cache: ${ArticleModel.getMetadataCacheSize()} jeux)`);
      return enriched;
    } catch (error) {
      console.error('❌ Erreur enrichissement articles:', error.message);
      return 0;
    }
  }

  // Save articles fetched from APIs to the database, then enrich in background
  static async saveArticles(articles) {
    if (!articles || articles.length === 0) return { inserted: 0, skipped: 0 };
    
    try {
      const result = await ArticleModel.bulkInsert(articles);
      console.log(`💾 Articles sauvegardés: ${result.inserted} nouveaux, ${result.skipped} déjà existants`);
      
      // Enrich new articles in background (don't await - fire and forget)
      if (result.inserted > 0) {
        this.enrichNewArticlesInBackground().catch(err => {
          console.error('⚠️ Erreur enrichissement background:', err.message);
        });
      }
      
      return result;
    } catch (error) {
      console.error('❌ Erreur sauvegarde articles:', error.message);
      return { inserted: 0, skipped: 0 };
    }
  }

  // Get all articles from database, formatted for the frontend
  static async getAllArticles(limit = 1000) {
    try {
      const rows = await ArticleModel.getAll(limit);
      return rows.map(row => this.formatForFrontend(row));
    } catch (error) {
      console.error('❌ Erreur récupération articles:', error.message);
      return [];
    }
  }

  // Search articles related to a specific game
  static async getArticlesForGame(gameName, limit = 30) {
    try {
      const rows = await ArticleModel.searchByGame(gameName, limit);
      return rows.map(row => this.formatForFrontend(row));
    } catch (error) {
      console.error('❌ Erreur recherche articles pour jeu:', error.message);
      return [];
    }
  }

  // Get database stats
  static async getStats() {
    try {
      return await ArticleModel.getStats();
    } catch (error) {
      console.error('❌ Erreur stats articles:', error.message);
      return { total: 0, bySource: {} };
    }
  }

  // Format a DB row into the frontend article format
  static formatForFrontend(row) {
    return {
      source: row.source,
      title: row.title,
      description: row.description || '',
      url: row.url,
      image: row.image || '',
      publishedAt: row.published_at ? new Date(row.published_at).toISOString() : '',
      author: row.author || '',
      category: row.category || 'article',
      keywords: row.keywords || '',
      gameName: row.game_title || undefined,
      publisher: row.publisher || undefined,
      developer: row.developer || undefined
    };
  }
}

module.exports = ArticleService;
