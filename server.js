// Server.js - VERSION CORRIGÉE TRENDING & VR

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
  },
  timeout: 10000
});

// Cache pour TOUS les articles (6 heures)
const newsCache = {
  allArticles: [],
  timestamp: 0,
  duration: 6 * 60 * 60 * 1000,
  stats: {
    reddit: 0,
    rss: 0,
    guardian: 0
  }
};

// Middleware
app.use(express.static('public'));
app.use(express.json());

// ==================== ROUTES JEUX ====================

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

// ✨ TRENDING - VERSION SIMPLIFIÉE QUI FONCTIONNE
app.get('/api/games/trending', async (req, res) => {
  try {
    console.log('🔥 Récupération des jeux TRENDING...');
    
    // Approche simple : jeux populaires récents (2 dernières années)
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const dateString = twoYearsAgo.toISOString().split('T')[0];
    const todayString = new Date().toISOString().split('T')[0];
    
    const response = await axios.get(`${RAWG_BASE_URL}/games`, {
      params: {
        key: RAWG_API_KEY,
        page_size: 40,
        dates: `${dateString},${todayString}`,
        ordering: '-rating,-added', // Meilleure note + popularité
        exclude_tags: '80',
        exclude_additions: true
      },
      timeout: 10000
    });
    
    console.log(`📊 API retournée: ${response.data.results.length} jeux bruts`);
    
    // Filtrer contenu adulte
    let games = filterAdultContent(response.data.results);
    console.log(`📊 Après filtre adulte: ${games.length} jeux`);
    
    // Filtrer pour garder seulement les jeux avec un minimum de popularité
    games = games.filter(game => (game.added || 0) > 1000);
    console.log(`📊 Après filtre popularité (>1000): ${games.length} jeux`);
    
    // Calculer un score de tendance et trier
    games = games.map(game => ({
      ...game,
      trendScore: (game.rating || 0) * 1000 + Math.log10((game.added || 0) + 1) * 100 + (game.metacritic || 0)
    })).sort((a, b) => b.trendScore - a.trendScore);
    
    // Debug : afficher les 5 premiers
    if (games.length > 0) {
      console.log('🏆 Top 5 jeux tendance:');
      games.slice(0, 5).forEach((game, i) => {
        console.log(`  ${i+1}. ${game.name}`);
        console.log(`     - Rating: ${game.rating || 'N/A'}/5`);
        console.log(`     - Joueurs: ${game.added || 0}`);
        console.log(`     - Métacritique: ${game.metacritic || 'N/A'}`);
        console.log(`     - Date: ${game.released || 'N/A'}`);
      });
    } else {
      console.warn('⚠️ AUCUN jeu trouvé ! Essai de fallback...');
      
      // FALLBACK : si aucun jeu, utiliser une recherche sans filtre de date
      const fallbackResponse = await axios.get(`${RAWG_BASE_URL}/games`, {
        params: {
          key: RAWG_API_KEY,
          page_size: 40,
          ordering: '-rating,-added',
          exclude_tags: '80',
          exclude_additions: true
        },
        timeout: 10000
      });
      
      games = filterAdultContent(fallbackResponse.data.results);
      console.log(`📊 FALLBACK: ${games.length} jeux récupérés`);
    }
    
    res.json({
      count: games.length,
      results: games.slice(0, 50)
    });
    
  } catch (error) {
    console.error('❌ Erreur trending:', error.message);
    res.status(500).json({ 
      error: 'Erreur trending',
      details: error.message
    });
  }
});

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
      results: filteredGames.slice(0, 50)
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
      results: filteredGames.slice(0, 50)
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
      results: filteredGames.slice(0, 50)
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
      results: filteredGames.slice(0, 50)
    });
  } catch (error) {
    res.status(error.response?.status || 500).json({ 
      error: 'Erreur lors de la recherche'
    });
  }
});

// 🥽 VR GAMES - VERSION OPTIMISÉE : Moins de jeux, chargement rapide
app.get('/api/games/vr-games', async (req, res) => {
  try {
    console.log('🥽 Recherche VR RAPIDE...');
    
    // Liste RÉDUITE aux 20 jeux VR les plus populaires (au lieu de 50+)
    const topVRGames = [
      // Top 10 absolus
      'Beat Saber',
      'Half-Life: Alyx',
      'VRChat',
      'Gorilla Tag',
      'Superhot VR',
      'Boneworks',
      'Pavlov VR',
      'Rec Room',
      'The Walking Dead: Saints & Sinners',
      'Resident Evil 4 VR',
      
      // Top 11-20
      'Job Simulator',
      'Pistol Whip',
      'Arizona Sunshine',
      'Blade and Sorcery',
      'Moss',
      'Population: One',
      'Into the Radius',
      'Contractors',
      'Astro Bot Rescue Mission',
      'Walkabout Mini Golf VR'
    ];
    
    const vrGames = [];
    const foundGames = new Set();
    
    console.log(`📡 Recherche de ${topVRGames.length} jeux VR...`);
    
    for (const gameName of topVRGames) {
      try {
        const response = await axios.get(`${RAWG_BASE_URL}/games`, {
          params: {
            key: RAWG_API_KEY,
            search: gameName,
            page_size: 3,
            exclude_additions: true
          },
          timeout: 5000
        });
        
        const results = response.data.results || [];
        
        // Chercher la meilleure correspondance
        let bestMatch = null;
        let bestScore = 0;
        
        for (const game of results) {
          const gameNameLower = game.name.toLowerCase().trim();
          const searchNameLower = gameName.toLowerCase().trim();
          
          let score = 0;
          if (gameNameLower === searchNameLower) {
            score = 100;
          } else if (gameNameLower.replace(/[^a-z0-9]/g, '') === searchNameLower.replace(/[^a-z0-9]/g, '')) {
            score = 95;
          } else if (gameNameLower.includes(searchNameLower.replace(' vr', ''))) {
            score = 85;
          } else if (searchNameLower.includes(gameNameLower)) {
            score = 75;
          }
          
          if (score > bestScore) {
            bestScore = score;
            bestMatch = game;
          }
        }
        
        if (bestMatch && bestScore >= 70 && !foundGames.has(bestMatch.id)) {
          vrGames.push(bestMatch);
          foundGames.add(bestMatch.id);
          console.log(`  ✅ ${bestMatch.name}`);
        }
        
        // Pause courte
        await new Promise(resolve => setTimeout(resolve, 80));
        
      } catch (err) {
        console.log(`  ⚠️ "${gameName}"`);
      }
    }
    
    // Filtrer contenu adulte
    let filteredGames = filterAdultContent(vrGames);
    
    // Blacklist des faux positifs
    const blacklist = [
      'tabletop simulator',
      'surgeon simulator',
      'pc building simulator',
      'house flipper',
      'powerwash simulator',
      'car mechanic simulator',
      'farming simulator',
      'truck simulator',
      'bus simulator',
      'train simulator',
      'flight simulator',
      'sims 4',
      'sims 3'
    ];
    
    filteredGames = filteredGames.filter(game => {
      const nameLower = game.name.toLowerCase();
      return !blacklist.some(blocked => nameLower.includes(blocked));
    });
    
    // Trier par popularité
    filteredGames.sort((a, b) => (b.added || 0) - (a.added || 0));
    
    console.log(`✅ ${filteredGames.length} jeux VR trouvés en ${((Date.now() - Date.now()) / 1000).toFixed(1)}s`);
    
    res.json({
      count: filteredGames.length,
      results: filteredGames.slice(0, 50)
    });
    
  } catch (error) {
    console.error('❌ Erreur VR:', error.message);
    res.status(500).json({ 
      error: 'Erreur VR',
      details: error.message
    });
  }
});

app.get('/api/games/platform/:platform', async (req, res) => {
  const platformMap = {
    'pc': 4,
    'playstation': 18,
    'xbox': 1,
    'switch': 7,
    'vr': 'vr'  // Cas spécial
  };
  
  const platformId = platformMap[req.params.platform.toLowerCase()];
  
  if (!platformId) {
    return res.status(400).json({ 
      error: 'Plateforme invalide' 
    });
  }
  
  // Pour VR, utiliser l'endpoint spécial
  if (req.params.platform.toLowerCase() === 'vr') {
    console.log('🥽 Redirection vers endpoint VR spécial');
    return res.redirect('/api/games/vr-games');
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
      // Pour les jeux tendance, trier par popularité
      params.ordering = '-added';
    }
    
    console.log(`🎮 Recherche jeux pour plateforme: ${req.params.platform} (ID: ${platformId})`);
    
    const response = await axios.get(`${RAWG_BASE_URL}/games`, {
      params: params,
      timeout: 10000
    });
    
    console.log(`📊 API retournée: ${response.data.results.length} jeux ${req.params.platform}`);
    
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
    
    console.log(`✅ ${filteredGames.length} jeux ${req.params.platform} filtrés`);
    
    res.json({
      ...response.data,
      results: filteredGames.slice(0, 50)
    });
  } catch (error) {
    console.error(`❌ Erreur plateforme ${req.params.platform}:`, error.message);
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

// ==================== ACTUALITÉS - VERSION OPTIMISÉE ====================

async function fetchRedditNews() {
  try {
    const subreddits = ['gaming', 'Games', 'pcgaming', 'truegaming', 'gamernews', 'IndieGaming'];
    const articles = [];
    
    for (const sub of subreddits) {
      try {
        const response = await axios.get(`https://www.reddit.com/r/${sub}/hot.json?limit=100`, {
          headers: { 'User-Agent': REDDIT_USER_AGENT },
          timeout: 10000
        });
        
        const posts = response.data.data.children;
        let validPosts = 0;
        
        posts.forEach(post => {
          const data = post.data;
          
          if (data.ups > 20 && !data.is_video && data.thumbnail !== 'self') {
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
            validPosts++;
          }
        });
        
        console.log(`✅ r/${sub}: ${validPosts} articles récupérés`);
        
      } catch (subError) {
        console.error(`❌ Erreur r/${sub}:`, subError.message);
      }
    }
    
    console.log(`✅ Reddit TOTAL: ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('❌ Erreur Reddit globale:', error.message);
    return [];
  }
}

async function fetchRSSNews() {
  const feeds = [
    { url: 'https://www.pcgamer.com/rss/', source: 'PC Gamer' },
    { url: 'https://www.gamespot.com/feeds/mashup/', source: 'GameSpot' },
    { url: 'https://kotaku.com/rss', source: 'Kotaku' },
    { url: 'https://www.destructoid.com/feed/', source: 'Destructoid' },
    { url: 'https://www.polygon.com/rss/index.xml', source: 'Polygon' },
    { url: 'https://feeds.feedburner.com/ign/all', source: 'IGN' },
    { url: 'https://www.eurogamer.net/?format=rss', source: 'Eurogamer' },
    { url: 'https://www.rockpapershotgun.com/feed', source: 'Rock Paper Shotgun' },
    { url: 'https://www.gamesradar.com/all-platforms/news/rss/', source: 'GamesRadar' },
    { url: 'https://www.vg247.com/feed', source: 'VG247' },
    { url: 'https://www.escapistmagazine.com/feed/', source: 'Escapist Magazine' }
  ];
  
  const articles = [];
  
  for (const feed of feeds) {
    try {
      const parsedFeed = await rssParser.parseURL(feed.url);
      const itemsCount = parsedFeed.items.length;
      let addedCount = 0;
      
      parsedFeed.items.slice(0, 30).forEach(item => {
        let image = '/img/placeholder.svg';
        
        if (item['media:content'] && item['media:content'].$?.url) {
          image = item['media:content'].$.url;
        } else if (item['media:thumbnail'] && item['media:thumbnail'].$?.url) {
          image = item['media:thumbnail'].$.url;
        } else if (item.enclosure?.url) {
          image = item.enclosure.url;
        } else if (item['content:encoded']) {
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
        addedCount++;
      });
      
      console.log(`✅ ${feed.source}: ${addedCount} articles (${itemsCount} disponibles)`);
      
    } catch (error) {
      console.error(`❌ ${feed.source}: ${error.message}`);
    }
  }
  
  console.log(`✅ RSS TOTAL: ${articles.length} articles`);
  return articles;
}

async function fetchGuardianNews() {
  try {
    const response = await axios.get('https://content.guardianapis.com/search', {
      params: {
        'api-key': GUARDIAN_API_KEY,
        'section': 'games',
        'show-fields': 'thumbnail,trailText',
        'page-size': 50,
        'order-by': 'newest'
      },
      timeout: 10000
    });
    
    const articles = response.data.response.results.map(article => ({
      source: 'guardian',
      title: article.webTitle,
      description: article.fields?.trailText || '',
      url: article.webUrl,
      image: article.fields?.thumbnail || '/img/placeholder.svg',
      publishedAt: article.webPublicationDate,
      author: 'The Guardian',
      category: 'article'
    }));
    
    console.log(`✅ The Guardian: ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('❌ Erreur Guardian:', error.message);
    return [];
  }
}

async function refreshNewsCache() {
  console.log('\n═══════════════════════════════════════════════');
  console.log('📥 RÉCUPÉRATION MAXIMALE DES ARTICLES');
  console.log('═══════════════════════════════════════════════\n');
  
  const startTime = Date.now();
  
  const [redditNews, rssNews, guardianNews] = await Promise.all([
    fetchRedditNews(),
    fetchRSSNews(),
    fetchGuardianNews()
  ]);
  
  let allArticles = [...redditNews, ...rssNews, ...guardianNews];
  
  const uniqueArticles = [];
  const seenTitles = new Set();
  
  allArticles.forEach(article => {
    const normalizedTitle = article.title.toLowerCase().trim();
    if (!seenTitles.has(normalizedTitle)) {
      seenTitles.add(normalizedTitle);
      uniqueArticles.push(article);
    }
  });
  
  uniqueArticles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  
  newsCache.allArticles = uniqueArticles;
  newsCache.timestamp = Date.now();
  newsCache.stats = {
    reddit: redditNews.length,
    rss: rssNews.length,
    guardian: guardianNews.length
  };
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n═══════════════════════════════════════════════');
  console.log('✅ RÉCUPÉRATION TERMINÉE');
  console.log('═══════════════════════════════════════════════');
  console.log(`📊 Statistiques:`);
  console.log(`   - Reddit: ${redditNews.length} articles`);
  console.log(`   - RSS: ${rssNews.length} articles`);
  console.log(`   - Guardian: ${guardianNews.length} articles`);
  console.log(`   - Brut: ${allArticles.length} articles`);
  console.log(`   - Doublons supprimés: ${allArticles.length - uniqueArticles.length}`);
  console.log(`   - Articles uniques: ${uniqueArticles.length}`);
  console.log(`⏱️  Temps: ${duration}s`);
  console.log(`💾 Cache valide: 6 heures`);
  console.log('═══════════════════════════════════════════════\n');
  
  return uniqueArticles;
}

app.get('/api/news', async (req, res) => {
  try {
    const now = Date.now();
    
    if (!newsCache.allArticles.length || (now - newsCache.timestamp) > newsCache.duration) {
      console.log('🔄 Cache expiré ou vide, rafraîchissement...');
      await refreshNewsCache();
    } else {
      const age = Math.floor((now - newsCache.timestamp) / 1000 / 60);
      console.log(`✅ ${newsCache.allArticles.length} articles servis depuis le cache (âge: ${age} min)`);
    }
    
    res.json(newsCache.allArticles);
    
  } catch (error) {
    console.error('❌ Erreur actualités:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des actualités',
      details: error.message
    });
  }
});

app.get('/api/news/refresh', async (req, res) => {
  try {
    await refreshNewsCache();
    res.json({ 
      success: true, 
      message: 'Cache rafraîchi avec succès',
      stats: newsCache.stats,
      totalArticles: newsCache.allArticles.length
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Erreur lors du rafraîchissement',
      details: error.message
    });
  }
});

app.get('/api/news/status', (req, res) => {
  const now = Date.now();
  const age = now - newsCache.timestamp;
  const remaining = Math.max(0, newsCache.duration - age);
  
  res.json({
    cached: newsCache.allArticles.length > 0,
    stats: newsCache.stats,
    totalArticles: newsCache.allArticles.length,
    cacheAge: Math.floor(age / 1000 / 60) + ' minutes',
    cacheRemaining: Math.floor(remaining / 1000 / 60) + ' minutes',
    cacheDuration: '6 heures',
    nextRefresh: new Date(newsCache.timestamp + newsCache.duration).toLocaleString('fr-FR'),
    lastUpdate: new Date(newsCache.timestamp).toLocaleString('fr-FR')
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

// Démarrage du serveur
app.listen(PORT, async () => {
  console.log('\n═══════════════════════════════════════════════');
  console.log(`🚀 Serveur GNews démarré`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log('═══════════════════════════════════════════════');
  console.log(`🎮 API RAWG: Jeux vidéo`);
  console.log(`🔥 TRENDING: Métacritique + Rating + Popularité`);
  console.log(`🥽 VR: Recherche stricte de jeux VR confirmés`);
  console.log(`📰 Sources actualités:`);
  console.log(`   - Reddit: 6 subreddits × ~100 posts`);
  console.log(`   - RSS: 11 sources × ~30 articles`);
  console.log(`   - Guardian: ~50 articles`);
  console.log(`📊 Capacité totale: ~1000 articles`);
  console.log(`💾 Cache: 6 heures`);
  console.log('═══════════════════════════════════════════════');
  
  console.log('\n🔄 Pré-chargement du cache...\n');
  try {
    await refreshNewsCache();
  } catch (error) {
    console.error('❌ Erreur lors du pré-chargement:', error.message);
  }
});