// Server.js - Backend pour GNews - Jeux vidéo et actualités

require('dotenv').config();
const express = require('express');
const path = require('path');
const axios = require('axios');
const Parser = require('rss-parser');
const session = require('express-session');

// Import database & routes
const pool = require('./src/config/db');
const userRoutes = require('./src/routes/user.routes');

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'gnews_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 heures
  }
}));

// User API routes (auth, favorites, reviews)
app.use('/api/users', userRoutes);

// ==================== ROUTES JEUX ====================

app.get('/api/test-rawg', async (req, res) => {
  try {
    const response = await axios.get(`${RAWG_BASE_URL}/games`, {
      params: { key: RAWG_API_KEY, page_size: 1 }
    });
    res.json({
      success: true,
      message: 'API RAWG fonctionne correctement !',
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
    console.log('Récupération des jeux TRENDING...');
    
    // Approche simple : jeux populaires récents (6 derniers mois)
    const twoYearsAgo = new Date();
    twoYearsAgo.setMonth(twoYearsAgo.getMonth() - 6);
    const dateString = twoYearsAgo.toISOString().split('T')[0];
    const todayString = new Date().toISOString().split('T')[0];
    
    const response = await axios.get(`${RAWG_BASE_URL}/games`, {
      params: {
        key: RAWG_API_KEY,
        page_size: 40,
        dates: `${dateString},${todayString}`,
        ordering: '-added,-rating', // Popularité d'abord + meilleure note
        metacritic: '70,100', // Seulement les jeux bien notés (Metacritic 70+)
        exclude_tags: '80',
        exclude_additions: true
      },
      timeout: 10000
    });
    
    console.log(`API retournée: ${response.data.results.length} jeux bruts`);
    
    // Filtrer contenu adulte
    let games = filterAdultContent(response.data.results);
    console.log(`Après filtre adulte: ${games.length} jeux`);
    
    // Filtrer pour garder seulement les jeux populaires et bien notés
    games = games.filter(game => 
      (game.added || 0) > 5000 && 
      (game.rating || 0) >= 3.0
    );
    console.log(`Après filtre popularité (>5000) + rating (>=3.0): ${games.length} jeux`);
    
    // Calculer un score de tendance et trier
    games = games.map(game => ({
      ...game,
      trendScore: (game.metacritic || 0) * 50 + (game.rating || 0) * 1000 + Math.log10((game.added || 0) + 1) * 200
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
      console.log(`FALLBACK: ${games.length} jeux récupérés`);
    }
    
    res.json({
      count: games.length,
      results: games.slice(0, 50)
    });
    
  } catch (error) {
    console.error('Erreur trending:', error.message);
    res.status(500).json({ 
      error: 'Erreur trending',
      details: error.message
    });
  }
});

app.get('/api/games/popular', async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const dateFrom = sixMonthsAgo.toISOString().split('T')[0];
    const dateTo = new Date().toISOString().split('T')[0];

    const response = await axios.get(`${RAWG_BASE_URL}/games`, {
      params: {
        key: RAWG_API_KEY,
        page_size: 40,
        ordering: '-rating',
        dates: `${dateFrom},${dateTo}`,
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

// DISCOVER - Jeux variés avec pagination (pour la page jeux.html)
app.get('/api/games/discover', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 40;
    const genres = req.query.genres || '';
    const platforms = req.query.platforms || '';
    const sort = req.query.sort || '';
    const pegi = req.query.pegi || '';
    const seed = parseInt(req.query.seed) || 0;

    let params = {
      key: RAWG_API_KEY,
      page: page,
      page_size: pageSize,
      exclude_tags: '80',
      exclude_additions: true
    };

    // Tri et filtrage par note
    switch (sort) {
      case 'best':
        // Best Rated : jeux notés 4 à 5 étoiles (sur 5)
        params.ordering = '-rating';
        params.metacritic = '75,100';
        break;
      case 'lowest':
        // Lowest Rated : jeux mal notés (metacritic bas + populaires)
        params.ordering = '-added';
        params.metacritic = '20,49';
        break;
      case 'mixed':
        // Mixed : jeux notés entre 3 et 3.9
        params.ordering = '-added';
        params.metacritic = '50,74';
        break;
      case 'no-reviewed':
        // Sans avis : jeux récents sans score metacritic
        params.ordering = '-released';
        break;
      case '-released':
        params.ordering = '-released';
        break;
      case 'released':
        params.ordering = 'released';
        break;
      case '-added':
        params.ordering = '-added';
        break;
      default: {
        // Randomize discover results using client seed (changes on every page load)
        const defaultOrderings = ['-rating', '-added', '-metacritic', '-rating,-added', '-added,-rating'];
        params.ordering = defaultOrderings[seed % defaultOrderings.length];
        params.metacritic = '60,100';
        // Offset the RAWG page so each page load shows different games
        const pageOffset = seed % 25; // up to 25 pages offset
        params.page = page + pageOffset;
        console.log(`🎲 Default discover: ordering=${params.ordering}, seed=${seed}, rawgPage=${params.page}`);
        break;
      }
    }

    // Filtres
    if (genres) params.genres = genres;
    if (platforms) params.parent_platforms = platforms; // parent_platforms pour filtrer par famille (PlayStation, Xbox, Nintendo...)

    // PEGI → ESRB mapping (post-filtrage côté serveur car RAWG ne supporte pas le filtre en query)
    // PEGI 3 = Everyone, PEGI 7 = Everyone 10+, PEGI 12 = Teen, PEGI 16/18 = Mature
    const pegiToEsrb = {
      '3': ['everyone'],
      '7': ['everyone-10-plus'],
      '12': ['teen'],
      '16': ['mature'],
      '18': ['mature', 'adults-only']
    };
    const esrbFilter = pegi ? (pegiToEsrb[pegi] || null) : null;

    // Determine if we need post-filtering (which reduces result count)
    const needsPostFilter = ['best', 'lowest', 'mixed', 'no-reviewed'].includes(sort) || esrbFilter;
    const MIN_RESULTS = 20; // Always try to return at least 20 games
    const MAX_RAWG_PAGES = 4; // Max extra RAWG pages to fetch to fill the minimum

    // Always request 40 from RAWG when post-filtering
    if (needsPostFilter) {
      params.page_size = 40;
    }

    console.log(`Discover page ${page} (size: ${pageSize}, sort: ${sort || 'default'}, genre: ${genres || 'all'}, platform: ${platforms || 'all'}, pegi: ${pegi || 'all'})`);

    // Helper: apply all post-filters to a list of games
    function applyPostFilters(games) {
      let result = filterAdultContent(games);
      if (sort === 'best') {
        result = result.filter(g => (g.rating || 0) >= 4.0);
      } else if (sort === 'lowest') {
        result = result.filter(g => (g.ratings_count || 0) >= 5);
        result.sort((a, b) => (a.rating || 0) - (b.rating || 0));
      } else if (sort === 'mixed') {
        result = result.filter(g => (g.rating || 0) >= 3.0 && (g.rating || 0) < 4.0);
      } else if (sort === 'no-reviewed') {
        result = result.filter(g => !g.metacritic && (g.ratings_count || 0) < 10);
      }
      if (esrbFilter) {
        result = result.filter(g => {
          const slug = g.esrb_rating?.slug;
          if (!slug) return false;
          return esrbFilter.includes(slug);
        });
      }
      return result;
    }

    // Fetch first page from RAWG
    const response = await axios.get(`${RAWG_BASE_URL}/games`, {
      params,
      timeout: 10000
    });

    let allRawGames = response.data.results || [];
    let filteredGames = applyPostFilters(allRawGames);
    let totalCount = response.data.count || 0;
    let hasNext = !!response.data.next;
    let rawgPage = params.page;

    // If post-filtering leaves too few results, fetch more RAWG pages
    if (needsPostFilter && filteredGames.length < MIN_RESULTS && hasNext) {
      const seenIds = new Set(allRawGames.map(g => g.id));
      let extraFetches = 0;

      while (filteredGames.length < MIN_RESULTS && hasNext && extraFetches < MAX_RAWG_PAGES) {
        extraFetches++;
        rawgPage++;
        console.log(`Post-filter: only ${filteredGames.length} games, fetching RAWG page ${rawgPage}...`);

        try {
          const extraResponse = await axios.get(`${RAWG_BASE_URL}/games`, {
            params: { ...params, page: rawgPage },
            timeout: 10000
          });
          const extraGames = (extraResponse.data.results || []).filter(g => !seenIds.has(g.id));
          extraGames.forEach(g => seenIds.add(g.id));
          hasNext = !!extraResponse.data.next;

          const extraFiltered = applyPostFilters(extraGames);
          filteredGames = filteredGames.concat(extraFiltered);
        } catch (extraErr) {
          console.warn(`⚠️ Extra fetch page ${rawgPage} failed:`, extraErr.message);
          break;
        }
      }
      console.log(`After ${extraFetches} extra fetches: ${filteredGames.length} games total`);
    } else {
      // No post-filter, just apply adult content filter
      filteredGames = filterAdultContent(response.data.results || []);
    }

    if (esrbFilter) {
      console.log(`🔞 Filtre PEGI ${pegi}: ${filteredGames.length} jeux après filtrage ESRB`);
    }

    console.log(`Discover: ${filteredGames.length} jeux (page ${page}, total: ${totalCount})`);

    res.json({
      count: totalCount,
      page: page,
      next: hasNext,
      results: filteredGames
    });
  } catch (error) {
    console.error('Erreur discover:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Erreur lors de la récupération des jeux'
    });
  }
});

app.get('/api/games/new-releases', async (req, res) => {
  const today = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const dateString = sixMonthsAgo.toISOString().split('T')[0];
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

// VR GAMES - VERSION OPTIMISÉE : Moins de jeux, chargement rapide
// Cache pour les jeux VR (30 minutes)
const vrCache = {
  games: [],
  timestamp: 0,
  duration: 30 * 60 * 1000
};

app.get('/api/games/vr-games', async (req, res) => {
  try {
    // Vérifier le cache d'abord
    if (vrCache.games.length > 0 && (Date.now() - vrCache.timestamp) < vrCache.duration) {
      console.log('VR: réponse depuis le cache');
      return res.json({
        count: vrCache.games.length,
        results: vrCache.games
      });
    }

    console.log('Recherche jeux VR (batch parallèle)...');
    const startTime = Date.now();

    // Jeux VR confirmés — divisés en petits groupes pour recherche parallèle
    const vrBatches = [
      ['Beat Saber', 'Half-Life: Alyx', 'Boneworks', 'Superhot VR', 'Pavlov VR'],
      ['Blade and Sorcery', 'Gorilla Tag', 'Pistol Whip', 'VRChat', 'Job Simulator'],
      ['The Walking Dead: Saints & Sinners', 'Arizona Sunshine', 'Moss', 'Into the Radius', 'Population: One'],
      ['Walkabout Mini Golf', 'Contractors', 'Rec Room', 'Phasmophobia', 'Keep Talking and Nobody Explodes'],
      ['The Lab', 'Budget Cuts', 'Asgards Wrath', 'Lone Echo', 'Star Wars: Squadrons'],
      ['No Mans Sky', 'Resident Evil 4 VR', 'Skyrim VR', 'Fallout 4 VR', 'Microsoft Flight Simulator']
    ];

    const foundGames = new Map();

    // Rechercher chaque batch en parallèle (6 appels simultanés au lieu de 30 séquentiels)
    const batchPromises = vrBatches.map(async (batch) => {
      const results = [];
      for (const gameName of batch) {
        try {
          const response = await axios.get(`${RAWG_BASE_URL}/games`, {
            params: {
              key: RAWG_API_KEY,
              search: gameName,
              page_size: 3,
              search_precise: true,
              exclude_additions: true
            },
            timeout: 8000
          });

          const apiResults = response.data.results || [];
          const searchLower = gameName.toLowerCase().replace(/[^a-z0-9]/g, '');

          for (const game of apiResults) {
            const nameLower = game.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (nameLower === searchLower || nameLower.includes(searchLower) || searchLower.includes(nameLower)) {
              results.push(game);
              break;
            }
          }
          // Minimal 50ms pause inside each batch to respect rate limits
          await new Promise(r => setTimeout(r, 50));
        } catch (err) {
          console.log(`  ⚠️ Échec recherche: ${gameName}`);
        }
      }
      return results;
    });

    const batchResults = await Promise.all(batchPromises);

    // Dédupliquer les résultats
    for (const batch of batchResults) {
      for (const game of batch) {
        if (!foundGames.has(game.id)) {
          foundGames.set(game.id, game);
        }
      }
    }

    let games = Array.from(foundGames.values());
    games = filterAdultContent(games);

    // Trier par popularité
    games.sort((a, b) => (b.added || 0) - (a.added || 0));

    // Mettre en cache
    vrCache.games = games;
    vrCache.timestamp = Date.now();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`${games.length} jeux VR trouvés en ${elapsed}s`);

    res.json({
      count: games.length,
      results: games
    });

  } catch (error) {
    console.error('Erreur VR:', error.message);
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
    console.log('Redirection vers endpoint VR spécial');
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
    
    console.log(`Recherche jeux pour plateforme: ${req.params.platform} (ID: ${platformId})`);
    
    const response = await axios.get(`${RAWG_BASE_URL}/games`, {
      params: params,
      timeout: 10000
    });
    
    console.log(`API retournée: ${response.data.results.length} jeux ${req.params.platform}`);
    
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
    
    console.log(`${filteredGames.length} jeux ${req.params.platform} filtrés`);
    
    res.json({
      ...response.data,
      results: filteredGames.slice(0, 50)
    });
  } catch (error) {
    console.error(`Erreur plateforme ${req.params.platform}:`, error.message);
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
        
        console.log(`r/${sub}: ${validPosts} articles récupérés`);
        
      } catch (subError) {
        console.error(`Erreur r/${sub}:`, subError.message);
      }
    }
    
    console.log(`Reddit TOTAL: ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('Erreur Reddit globale:', error.message);
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
        let image = 'https://via.placeholder.com/400x250/10159d/fff?text=Gaming+News';
        
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
      
      console.log(`${feed.source}: ${addedCount} articles (${itemsCount} disponibles)`);
      
    } catch (error) {
      console.error(`${feed.source}: ${error.message}`);
    }
  }
  
  console.log(`RSS TOTAL: ${articles.length} articles`);
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
      image: article.fields?.thumbnail || 'https://via.placeholder.com/400x250/10159d/fff?text=Gaming+News',
      publishedAt: article.webPublicationDate,
      author: 'The Guardian',
      category: 'article'
    }));
    
    console.log(`The Guardian: ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('Erreur Guardian:', error.message);
    return [];
  }
}

async function refreshNewsCache() {
  console.log('\n═══════════════════════════════════════════════');
  console.log('RÉCUPÉRATION MAXIMALE DES ARTICLES');
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
  console.log('RÉCUPÉRATION TERMINÉE');
  console.log('═══════════════════════════════════════════════');
  console.log(`Statistiques:`);
  console.log(`   - Reddit: ${redditNews.length} articles`);
  console.log(`   - RSS: ${rssNews.length} articles`);
  console.log(`   - Guardian: ${guardianNews.length} articles`);
  console.log(`   - Brut: ${allArticles.length} articles`);
  console.log(`   - Doublons supprimés: ${allArticles.length - uniqueArticles.length}`);
  console.log(`   - Articles uniques: ${uniqueArticles.length}`);
  console.log(`Temps: ${duration}s`);
  console.log(`Cache valide: 6 heures`);
  console.log('═══════════════════════════════════════════════\n');
  
  return uniqueArticles;
}

app.get('/api/news', async (req, res) => {
  try {
    const now = Date.now();
    
    if (!newsCache.allArticles.length || (now - newsCache.timestamp) > newsCache.duration) {
      console.log('Cache expiré ou vide, rafraîchissement...');
      await refreshNewsCache();
    } else {
      const age = Math.floor((now - newsCache.timestamp) / 1000 / 60);
      console.log(`${newsCache.allArticles.length} articles servis depuis le cache (âge: ${age} min)`);
    }
    
    res.json(newsCache.allArticles);
    
  } catch (error) {
    console.error('Erreur actualités:', error);
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

// Search news for specific game names
app.get('/api/news/game/:gameName', async (req, res) => {
  try {
    const gameName = req.params.gameName;
    if (!gameName || gameName.trim().length < 2) {
      return res.json([]);
    }

    const trimmedName = gameName.trim();
    const articles = [];

    // ---- Build search variants for this game ----
    const lowerName = trimmedName.toLowerCase();
    // Remove version suffixes for flexible matching
    const nameNoVersion = lowerName.replace(/\s+(v|vi|vii|viii|ix|x|xi|xii|[0-9]+)$/i, '').trim();
    
    // Build common abbreviations (e.g. "Grand Theft Auto V" -> "GTA V", "GTA 5", "GTAV", "GTA5")
    const words = trimmedName.split(/\s+/);
    const abbreviations = [];
    if (words.length >= 2) {
      // Acronym from first letters
      const acronym = words.filter(w => !/^(v|vi|vii|viii|ix|x|xi|xii|[0-9]+|the|of|and|for|in|on|at|to)$/i.test(w))
                           .map(w => w[0]).join('').toUpperCase();
      if (acronym.length >= 2) {
        // Version suffix
        const lastWord = words[words.length - 1];
        const isVersion = /^(v|vi|vii|viii|ix|x|xi|xii|[0-9]+)$/i.test(lastWord);
        if (isVersion) {
          const romanToNum = { 'V': '5', 'VI': '6', 'VII': '7', 'VIII': '8', 'IX': '9', 'X': '10', 'XI': '11', 'XII': '12',
                               'II': '2', 'III': '3', 'IV': '4' };
          const numVersion = romanToNum[lastWord.toUpperCase()] || lastWord;
          const romanVersion = Object.entries(romanToNum).find(([, v]) => v === lastWord)?.[0] || lastWord;
          abbreviations.push(`${acronym} ${lastWord}`, `${acronym}${lastWord}`, `${acronym} ${numVersion}`, `${acronym}${numVersion}`);
          if (romanVersion !== lastWord) abbreviations.push(`${acronym} ${romanVersion}`, `${acronym}${romanVersion}`);
        } else {
          abbreviations.push(acronym);
        }
      }
    }
    // Also add the game's slug-like form (spaces -> no spaces)
    const noSpaces = trimmedName.replace(/\s+/g, '');
    if (noSpaces.toLowerCase() !== lowerName.replace(/\s+/g, '')) {
      abbreviations.push(noSpaces);
    }

    // Unique, lowercase abbreviations
    const uniqueAbbrevs = [...new Set(abbreviations.map(a => a.toLowerCase()))].filter(a => a.length >= 2 && a.toLowerCase() !== lowerName);

    // ---- Matching function ----
    const stopWords = ['the', 'and', 'for', 'with', 'from', 'that', 'this', 'game', 'edition', 'complete', 'ultimate', 'deluxe', 'remastered'];
    const significantWords = lowerName.split(/\s+/).filter(w => w.length >= 4 && !stopWords.includes(w));

    function textMentionsGame(text) {
      if (!text) return false;
      const lower = text.toLowerCase();
      // Full game name
      if (lower.includes(lowerName)) return true;
      // Name without version
      if (nameNoVersion.length >= 4 && lower.includes(nameNoVersion)) return true;
      // Check abbreviations (e.g. GTA V, GTA5, GTAV)
      for (const abbr of uniqueAbbrevs) {
        const regex = new RegExp(`\\b${abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(lower)) return true;
      }
      // ALL significant words appear
      if (significantWords.length >= 2 && significantWords.every(w => lower.includes(w))) return true;
      // Single significant word with word boundary
      if (significantWords.length === 1 && significantWords[0].length >= 5) {
        const regex = new RegExp(`\\b${significantWords[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
        if (regex.test(lower)) return true;
      }
      return false;
    }

    // ---- Build Reddit search queries ----
    // Multiple search queries: full name + abbreviations
    const searchQueries = [`"${trimmedName}"`];
    if (nameNoVersion !== lowerName && nameNoVersion.length >= 4) {
      searchQueries.push(`"${nameNoVersion}"`);
    }
    uniqueAbbrevs.slice(0, 3).forEach(abbr => searchQueries.push(abbr));

    // ---- Search Reddit with multiple queries ----
    const subreddits = ['gaming', 'Games', 'pcgaming', 'gamernews', 'PS5', 'XboxSeriesX', 'NintendoSwitch'];
    
    const redditPromises = [];
    for (const q of searchQueries) {
      const encodedQ = encodeURIComponent(q);
      for (const sub of subreddits) {
        redditPromises.push(
          axios.get(
            `https://www.reddit.com/r/${sub}/search.json?q=${encodedQ}&restrict_sr=1&sort=relevance&t=year&limit=15`,
            { headers: { 'User-Agent': REDDIT_USER_AGENT }, timeout: 8000 }
          ).catch(() => null)
        );
      }
    }

    const redditResults = await Promise.all(redditPromises);
    
    for (const response of redditResults) {
      if (!response?.data?.data?.children) continue;
      response.data.data.children.forEach(post => {
        const data = post.data;
        if (data.ups >= 2 && (textMentionsGame(data.title) || textMentionsGame(data.selftext))) {
          articles.push({
            source: 'reddit',
            title: data.title,
            description: data.selftext ? data.selftext.substring(0, 200) : '',
            url: `https://www.reddit.com${data.permalink}`,
            image: data.thumbnail && data.thumbnail.startsWith('http') ? data.thumbnail : 
                   (data.preview?.images?.[0]?.source?.url?.replace(/&amp;/g, '&') || ''),
            publishedAt: new Date(data.created_utc * 1000).toISOString(),
            author: `r/${data.subreddit}`,
            category: 'discussion',
            gameName: gameName
          });
        }
      });
    }

    // ---- Filter from cached general news ----
    if (newsCache.allArticles.length > 0) {
      newsCache.allArticles.forEach(article => {
        if (textMentionsGame(article.title) || textMentionsGame(article.description)) {
          articles.push({ ...article, gameName: gameName });
        }
      });
    }

    // ---- Deduplicate by title similarity ----
    const seen = new Set();
    const unique = articles.filter(a => {
      const key = a.title.toLowerCase().trim().replace(/[^a-z0-9]/g, '').substring(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by date
    unique.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    res.json(unique.slice(0, 30));
  } catch (error) {
    console.error('Erreur recherche news pour jeu:', error.message);
    res.json([]);
  }
});

// ==================== ROUTES GÉNÉRALES ====================

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(500).json({ 
    error: 'Erreur interne du serveur',
    message: err.message 
  });
});

// Démarrage du serveur
app.listen(PORT, async () => {
  console.log('\n═══════════════════════════════════════════════');
  console.log(`Serveur GNews démarré`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log('═══════════════════════════════════════════════');
  console.log(`API RAWG: Jeux vidéo`);
  console.log(`TRENDING: Métacritique + Rating + Popularité`);
  console.log(`VR: Recherche stricte de jeux VR confirmés`);
  console.log(`Sources actualités:`);
  console.log(`   - Reddit: 6 subreddits × ~100 posts`);
  console.log(`   - RSS: 11 sources × ~30 articles`);
  console.log(`   - Guardian: ~50 articles`);
  console.log(`Capacité totale: ~1000 articles`);
  console.log(`Cache: 6 heures`);
  console.log('═══════════════════════════════════════════════');
  
  console.log('\nPré-chargement du cache...\n');
  try {
    await refreshNewsCache();
  } catch (error) {
    console.error('Erreur lors du pré-chargement:', error.message);
  }
});