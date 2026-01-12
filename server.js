// Server.js - VERSION HYBRIDE avec actualités réelles - CORRIGÉE

const express = require('express');
const path = require('path');
const axios = require('axios');
const Parser = require('rss-parser');
const app = express();
const PORT = process.env.PORT || 3000;

// Configuration des APIs
const RAWG_API_KEY = process.env.RAWG_API_KEY || '2e68fa4d897b420682efc40faa9fbb6d';
const RAWG_BASE_URL = 'https://api.rawg.io/api';
const GUARDIAN_API_KEY = process.env.GUARDIAN_API_KEY || '2fc2e627-7965-45df-ac62-c6e2259ce2e7';
const REDDIT_USER_AGENT = 'GNewsApp/1.0';

// Parsers
const rssParser = new Parser({
  customFields: {
    item: ['media:content', 'media:thumbnail', 'content:encoded']
  }
});

// Cache pour les actualités (6 heures)
const newsCache = {
  data: null,
  timestamp: 0,
  duration: 6 * 60 * 60 * 1000 // 6 heures
};

// Middleware
app.use(express.static('public'));
app.use(express.json());

// ==================== ROUTES JEUX (INCHANGÉES) ====================

app.get('/api/test-rawg', async (req, res) => {
  try {
    const response = await axios.get(`${RAWG_BASE_URL}/games`, {
      params: { key: RAWG_API_KEY, page_size: 1 }
    });
    res.json({
      success: true,
      message: '✅ API RAWG fonctionne correctement !',
      sample_game: response.data.results[0]?.name || 'Aucun jeu trouvé',
      total_games: response.data.count
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

function filterAdultContent(games) {
  const blockedKeywords = [
    'hentai', 'porn', 'xxx', 'nsfw', 'nude', 'tentacle', 'ecchi',
    'lewd', 'erotic', 'adult only', '18+', 'sexual', 'sex'
  ];
  
  return games.filter(game => {
    const gameName = game.name.toLowerCase();
    if (blockedKeywords.some(keyword => gameName.includes(keyword))) {
      return false;
    }
    
    if (game.tags) {
      const tagNames = game.tags.map(t => t.name.toLowerCase()).join(' ');
      if (blockedKeywords.some(keyword => tagNames.includes(keyword))) {
        return false;
      }
    }
    
    if (game.esrb_rating && game.esrb_rating.name === 'Adults Only') {
      return false;
    }
    
    return true;
  });
}

app.get('/api/games/popular', async (req, res) => {
  try {
    const response = await axios.get(`${RAWG_BASE_URL}/games`, {
      params: {
        key: RAWG_API_KEY,
        page_size: 40,
        ordering: '-rating',
        dates: '2023-01-01,2025-12-31',
        exclude_tags: '80',
        exclude_additions: true
      },
      timeout: 10000
    });
    
    const filteredGames = filterAdultContent(response.data.results);
    res.json({
      ...response.data,
      results: filteredGames.slice(0, 20)
    });
  } catch (error) {
    res.status(error.response?.status || 500).json({ 
      error: 'Erreur lors de la récupération des jeux populaires'
    });
  }
});

app.get('/api/games/new-releases', async (req, res) => {
  const today = new Date();
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 2);
  
  const dateString = lastMonth.toISOString().split('T')[0];
  const todayString = today.toISOString().split('T')[0];
  
  try {
    const response = await axios.get(`${RAWG_BASE_URL}/games`, {
      params: {
        key: RAWG_API_KEY,
        dates: `${dateString},${todayString}`,
        ordering: '-released',
        page_size: 40,
        exclude_tags: '80',
        exclude_additions: true
      },
      timeout: 10000
    });
    
    const filteredGames = filterAdultContent(response.data.results);
    res.json({
      ...response.data,
      results: filteredGames.slice(0, 20)
    });
  } catch (error) {
    res.status(error.response?.status || 500).json({ 
      error: 'Erreur lors de la récupération des nouveautés'
    });
  }
});

app.get('/api/games/upcoming', async (req, res) => {
  const today = new Date();
  today.setDate(today.getDate() + 1);
  const todayString = today.toISOString().split('T')[0];
  
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 2);
  const nextYearString = nextYear.toISOString().split('T')[0];
  
  try {
    const response = await axios.get(`${RAWG_BASE_URL}/games`, {
      params: {
        key: RAWG_API_KEY,
        dates: `${todayString},${nextYearString}`,
        ordering: 'released',
        page_size: 40,
        exclude_tags: '80',
        exclude_additions: true
      },
      timeout: 10000
    });
    
    let filteredGames = filterAdultContent(response.data.results);
    
    filteredGames = filteredGames.filter(game => {
      if (!game.released) return false;
      const releaseDate = new Date(game.released);
      const now = new Date();
      return releaseDate > now;
    });
    
    res.json({
      ...response.data,
      results: filteredGames.slice(0, 20)
    });
  } catch (error) {
    res.status(error.response?.status || 500).json({ 
      error: 'Erreur lors de la récupération des jeux à venir'
    });
  }
});

app.get('/api/games/search', async (req, res) => {
  const { query } = req.query;
  
  if (!query || query.trim() === '') {
    return res.status(400).json({ error: 'Le paramètre de recherche est requis' });
  }
  
  try {
    const response = await axios.get(`${RAWG_BASE_URL}/games`, {
      params: {
        key: RAWG_API_KEY,
        search: query,
        page_size: 40,
        exclude_tags: '80',
        exclude_additions: true
      },
      timeout: 10000
    });
    
    const filteredGames = filterAdultContent(response.data.results);
    res.json({
      ...response.data,
      results: filteredGames.slice(0, 20)
    });
  } catch (error) {
    res.status(error.response?.status || 500).json({ 
      error: 'Erreur lors de la recherche'
    });
  }
});

app.get('/api/games/platform/:platform', async (req, res) => {
  const platformMap = {
    'pc': 4,
    'playstation': 18,
    'xbox': 1,
    'switch': 7,
    'vr': 171
  };
  
  const platformId = platformMap[req.params.platform.toLowerCase()];
  
  if (!platformId) {
    return res.status(400).json({ 
      error: 'Plateforme invalide' 
    });
  }
  
  const isUpcoming = req.query.upcoming === 'true';
  
  try {
    let params = {
      key: RAWG_API_KEY,
      platforms: platformId,
      page_size: 40,
      exclude_tags: '80',
      exclude_additions: true
    };
    
    if (isUpcoming) {
      const today = new Date();
      today.setDate(today.getDate() + 1);
      const todayString = today.toISOString().split('T')[0];
      
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 2);
      const nextYearString = nextYear.toISOString().split('T')[0];
      
      params.dates = `${todayString},${nextYearString}`;
      params.ordering = 'released';
    } else {
      params.ordering = '-rating';
      params.dates = '2023-01-01,2025-12-31';
    }
    
    const response = await axios.get(`${RAWG_BASE_URL}/games`, {
      params: params,
      timeout: 10000
    });
    
    let filteredGames = filterAdultContent(response.data.results);
    
    if (isUpcoming) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      filteredGames = filteredGames.filter(game => {
        if (!game.released) return false;
        const releaseDate = new Date(game.released);
        releaseDate.setHours(0, 0, 0, 0);
        return releaseDate > now;
      });
    }
    
    res.json({
      ...response.data,
      results: filteredGames.slice(0, 20)
    });
  } catch (error) {
    res.status(error.response?.status || 500).json({ 
      error: 'Erreur lors de la récupération des jeux'
    });
  }
});

app.get('/api/games/:id', async (req, res) => {
  try {
    const response = await axios.get(`${RAWG_BASE_URL}/games/${req.params.id}`, {
      params: { key: RAWG_API_KEY },
      timeout: 10000
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ 
      error: 'Erreur lors de la récupération du jeu'
    });
  }
});

app.get('/api/genres', async (req, res) => {
  try {
    const response = await axios.get(`${RAWG_BASE_URL}/genres`, {
      params: { key: RAWG_API_KEY },
      timeout: 10000
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ 
      error: 'Erreur lors de la récupération des genres'
    });
  }
});

// ==================== NOUVELLES ROUTES ACTUALITÉS - CORRIGÉES ====================

// Parser Reddit
async function fetchRedditNews() {
  try {
    const subreddits = ['gaming', 'Games', 'pcgaming'];
    const articles = [];
    
    for (const sub of subreddits) {
      const response = await axios.get(`https://www.reddit.com/r/${sub}/hot.json?limit=10`, {
        headers: { 'User-Agent': REDDIT_USER_AGENT },
        timeout: 5000
      });
      
      const posts = response.data.data.children;
      
      posts.forEach(post => {
        const data = post.data;
        
        // Filtrer les posts de qualité
        if (data.ups > 100 && !data.is_video && data.thumbnail !== 'self') {
          articles.push({
            source: 'reddit',
            title: data.title,
            description: data.selftext ? data.selftext.substring(0, 200) : '',
            url: `https://www.reddit.com${data.permalink}`,
            image: data.thumbnail && data.thumbnail.startsWith('http') ? data.thumbnail : data.url,
            publishedAt: new Date(data.created_utc * 1000).toISOString(),
            author: `r/${sub}`,
            category: 'discussion'
          });
        }
      });
    }
    
    console.log(`✅ Reddit: ${articles.length} articles récupérés`);
    return articles;
  } catch (error) {
    console.error('❌ Erreur Reddit:', error.message);
    return [];
  }
}

// Parser RSS Feeds - CORRIGÉ
async function fetchRSSNews() {
  const feeds = [
    { url: 'https://www.pcgamer.com/rss/', source: 'PC Gamer' },
    { url: 'https://www.gamespot.com/feeds/mashup/', source: 'GameSpot' },
    { url: 'https://kotaku.com/rss', source: 'Kotaku' },
    { url: 'https://www.destructoid.com/feed/', source: 'Destructoid' },
    { url: 'https://www.polygon.com/rss/index.xml', source: 'Polygon' }
  ];
  
  const articles = [];
  
  for (const feed of feeds) {
    try {
      const parsedFeed = await rssParser.parseURL(feed.url);
      
      parsedFeed.items.slice(0, 5).forEach(item => {
        let image = 'https://via.placeholder.com/400x250/10159d/fff?text=Gaming+News';
        
        // Recherche d'image dans plusieurs champs possibles
        if (item['media:content'] && item['media:content'].$?.url) {
          image = item['media:content'].$.url;
        } else if (item['media:thumbnail'] && item['media:thumbnail'].$?.url) {
          image = item['media:thumbnail'].$.url;
        } else if (item.enclosure?.url) {
          image = item.enclosure.url;
        } else if (item['content:encoded']) {
          // Extraire l'image du contenu HTML si disponible
          const imgMatch = item['content:encoded'].match(/<img[^>]+src="([^">]+)"/);
          if (imgMatch) image = imgMatch[1];
        }
        
        articles.push({
          source: 'rss',
          title: item.title,
          description: item.contentSnippet || item.content?.substring(0, 200) || '',
          url: item.link,
          image: image,
          publishedAt: item.isoDate || item.pubDate,
          author: feed.source,
          category: 'article'
        });
      });
      
      console.log(`✅ ${feed.source}: ${parsedFeed.items.slice(0, 5).length} articles récupérés`);
      
    } catch (error) {
      console.error(`❌ Erreur RSS ${feed.source}:`, error.message);
      // Continue avec les autres feeds même si un échoue
    }
  }
  
  return articles;
}

// Parser The Guardian
async function fetchGuardianNews() {
  try {
    const response = await axios.get('https://content.guardianapis.com/search', {
      params: {
        'api-key': GUARDIAN_API_KEY,
        'section': 'games',
        'show-fields': 'thumbnail,trailText',
        'page-size': 10
      },
      timeout: 5000
    });
    
    const articles = response.data.response.results.map(article => ({
      source: 'guardian',
      title: article.webTitle,
      description: article.fields?.trailText || '',
      url: article.webUrl,
      image: article.fields?.thumbnail || 'https://via.placeholder.com/400x250/10159d/fff?text=Gaming+News',
      publishedAt: article.webPublicationDate,
      author: 'The Guardian',
      category: 'article'
    }));
    
    console.log(`✅ The Guardian: ${articles.length} articles récupérés`);
    return articles;
  } catch (error) {
    console.error('❌ Erreur Guardian:', error.message);
    return [];
  }
}

// Route principale pour les actualités avec cache
app.get('/api/news', async (req, res) => {
  try {
    const now = Date.now();
    
    // Vérifier le cache
    if (newsCache.data && (now - newsCache.timestamp) < newsCache.duration) {
      console.log('✅ Actualités servies depuis le cache');
      return res.json(newsCache.data);
    }
    
    console.log('📥 Récupération des actualités depuis les sources...');
    
    // Récupérer de toutes les sources en parallèle
    const [redditNews, rssNews, guardianNews] = await Promise.all([
      fetchRedditNews(),
      fetchRSSNews(),
      fetchGuardianNews()
    ]);
    
    // Combiner et trier par date
    let allNews = [...redditNews, ...rssNews, ...guardianNews];
    
    allNews.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    
    // Limiter à 30 articles
    allNews = allNews.slice(0, 30);
    
    // Mettre en cache
    newsCache.data = allNews;
    newsCache.timestamp = now;
    
    console.log(`✅ ${allNews.length} actualités récupérées et mises en cache`);
    res.json(allNews);
    
  } catch (error) {
    console.error('❌ Erreur actualités:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des actualités',
      details: error.message
    });
  }
});

// Route pour forcer le refresh du cache
app.get('/api/news/refresh', async (req, res) => {
  newsCache.timestamp = 0; // Invalider le cache
  res.redirect('/api/news');
});

// Route pour vérifier l'état du cache
app.get('/api/news/status', (req, res) => {
  const age = Date.now() - newsCache.timestamp;
  const remaining = newsCache.duration - age;
  
  res.json({
    cached: !!newsCache.data,
    articles: newsCache.data?.length || 0,
    age: Math.floor(age / 1000 / 60) + ' minutes',
    remaining: Math.floor(remaining / 1000 / 60) + ' minutes',
    nextRefresh: new Date(newsCache.timestamp + newsCache.duration).toLocaleString()
  });
});

// ==================== ROUTES GÉNÉRALES ====================

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err);
  res.status(500).json({ 
    error: 'Erreur interne du serveur',
    message: err.message 
  });
});

app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════');
  console.log(`🚀 Serveur GNews démarré sur http://localhost:${PORT}`);
  console.log(`📡 API RAWG: Jeux vidéo`);
  console.log(`📰 Sources actualités: Reddit + RSS (5 sources) + The Guardian`);
  console.log(`💾 Cache actualités: 6 heures`);
  console.log(`🧪 Test: http://localhost:${PORT}/api/test-rawg`);
  console.log(`📰 Test actualités: http://localhost:${PORT}/api/news`);
  console.log(`📊 État cache: http://localhost:${PORT}/api/news/status`);
  console.log('═══════════════════════════════════════════════');
});