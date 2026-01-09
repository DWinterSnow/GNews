// Server.js - VERSION COMPLÈTE CORRIGÉE

const express = require('express');
const path = require('path');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// API Key - À mettre dans un fichier .env en production
const RAWG_API_KEY = process.env.RAWG_API_KEY || '2e68fa4d897b420682efc40faa9fbb6d';
const RAWG_BASE_URL = 'https://api.rawg.io/api';

// Vérification de la clé API au démarrage
if (!RAWG_API_KEY || RAWG_API_KEY === 'e68fa4d897b420682efc40faa9fbb6d') {
  console.error('⚠️  ERREUR: Clé API RAWG manquante ou invalide!');
  console.error('Veuillez configurer la variable d\'environnement RAWG_API_KEY');
  process.exit(1);
}

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Route de test pour vérifier l'API RAWG
app.get('/api/test-rawg', async (req, res) => {
  try {
    console.log('🔍 Test de connexion à RAWG...');
    console.log('📍 URL:', `${RAWG_BASE_URL}/games`);
    console.log('🔑 Clé API:', RAWG_API_KEY.substring(0, 10) + '...');
    
    const response = await axios.get(`${RAWG_BASE_URL}/games`, {
      params: {
        key: RAWG_API_KEY,
        page_size: 1
      }
    });
    
    res.json({
      success: true,
      message: '✅ API RAWG fonctionne correctement !',
      sample_game: response.data.results[0]?.name || 'Aucun jeu trouvé',
      total_games: response.data.count
    });
  } catch (error) {
    console.error('❌ Erreur de test RAWG:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      details: error.response?.data
    });
  }
});

// ⚠️ ROUTES SPÉCIFIQUES AVANT LA ROUTE DYNAMIQUE ⚠️

// Middleware pour filtrer le contenu adulte côté serveur
function filterAdultContent(games) {
  const blockedKeywords = [
    'hentai', 'porn', 'xxx', 'nsfw', 'nude', 'tentacle', 'ecchi',
    'lewd', 'erotic', 'adult only', '18+', 'sexual', 'sex'
  ];
  
  return games.filter(game => {
    // Vérifier le nom du jeu
    const gameName = game.name.toLowerCase();
    if (blockedKeywords.some(keyword => gameName.includes(keyword))) {
      console.log('🚫 Jeu bloqué (nom):', game.name);
      return false;
    }
    
    // Vérifier les tags
    if (game.tags) {
      const tagNames = game.tags.map(t => t.name.toLowerCase()).join(' ');
      if (blockedKeywords.some(keyword => tagNames.includes(keyword))) {
        console.log('🚫 Jeu bloqué (tags):', game.name);
        return false;
      }
    }
    
    // Vérifier ESRB rating - bloquer "Adults Only"
    if (game.esrb_rating && game.esrb_rating.name === 'Adults Only') {
      console.log('🚫 Jeu bloqué (ESRB Adults Only):', game.name);
      return false;
    }
    
    return true;
  });
}

// Route pour les jeux populaires
app.get('/api/games/popular', async (req, res) => {
  try {
    console.log('📥 Requête: Jeux populaires');
    const response = await axios.get(`${RAWG_BASE_URL}/games`, {
      params: {
        key: RAWG_API_KEY,
        page_size: 40, // Augmenté pour compenser le filtrage
        ordering: '-rating',
        dates: '2023-01-01,2025-12-31',
        exclude_tags: '80', // 80 = NSFW only
        exclude_additions: true
      },
      timeout: 10000
    });
    
    // Filtrer le contenu adulte
    const filteredGames = filterAdultContent(response.data.results);
    console.log(`✅ Jeux filtrés: ${filteredGames.length}/${response.data.results.length}`);
    
    res.json({
      ...response.data,
      results: filteredGames.slice(0, 20)
    });
  } catch (error) {
    console.error('❌ Erreur RAWG API (popular):', error.response?.status, error.message);
    console.error('🔗 URL complète:', error.config?.url);
    res.status(error.response?.status || 500).json({ 
      error: 'Erreur lors de la récupération des jeux populaires',
      details: error.response?.data?.error || error.message,
      status: error.response?.status
    });
  }
});

// Route pour les nouveautés
app.get('/api/games/new-releases', async (req, res) => {
  const today = new Date();
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 2);
  
  const dateString = lastMonth.toISOString().split('T')[0];
  const todayString = today.toISOString().split('T')[0];
  
  try {
    console.log('📥 Requête: Nouveautés');
    console.log(`📅 Dates: ${dateString} à ${todayString}`);
    
    const response = await axios.get(`${RAWG_BASE_URL}/games`, {
      params: {
        key: RAWG_API_KEY,
        dates: `${dateString},${todayString}`,
        ordering: '-released',
        page_size: 40, // Augmenté pour compenser le filtrage
        exclude_tags: '80',
        exclude_additions: true
      },
      timeout: 10000
    });
    
    // Filtrer le contenu adulte
    const filteredGames = filterAdultContent(response.data.results);
    console.log(`✅ Nouveautés filtrées: ${filteredGames.length}/${response.data.results.length}`);
    
    res.json({
      ...response.data,
      results: filteredGames.slice(0, 20)
    });
  } catch (error) {
    console.error('❌ Erreur RAWG API (new-releases):', error.response?.status, error.message);
    console.error('📍 URL:', error.config?.url);
    res.status(error.response?.status || 500).json({ 
      error: 'Erreur lors de la récupération des nouveautés',
      details: error.response?.data?.error || error.message,
      status: error.response?.status
    });
  }
});

// Route pour les jeux à venir - CORRIGÉE
app.get('/api/games/upcoming', async (req, res) => {
  const today = new Date();
  // Ajouter 1 jour pour commencer à partir de demain
  today.setDate(today.getDate() + 1);
  const todayString = today.toISOString().split('T')[0];
  
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 2); // Augmenté à 2 ans pour avoir plus de résultats
  const nextYearString = nextYear.toISOString().split('T')[0];
  
  try {
    console.log('📥 Requête: Jeux à venir');
    console.log(`📅 Dates: ${todayString} à ${nextYearString}`);
    
    const response = await axios.get(`${RAWG_BASE_URL}/games`, {
      params: {
        key: RAWG_API_KEY,
        dates: `${todayString},${nextYearString}`,
        ordering: 'released', // Tri par date de sortie (les plus proches en premier)
        page_size: 40,
        exclude_tags: '80',
        exclude_additions: true
      },
      timeout: 10000
    });
    
    // Filtrer le contenu adulte ET les jeux sans date de sortie
    let filteredGames = filterAdultContent(response.data.results);
    
    // Supprimer les jeux sans date de sortie valide
    filteredGames = filteredGames.filter(game => {
      if (!game.released) return false;
      const releaseDate = new Date(game.released);
      const now = new Date();
      return releaseDate > now;
    });
    
    console.log(`✅ Jeux à venir filtrés: ${filteredGames.length}/${response.data.results.length}`);
    
    res.json({
      ...response.data,
      results: filteredGames.slice(0, 20)
    });
  } catch (error) {
    console.error('❌ Erreur RAWG API (upcoming):', error.response?.status, error.message);
    console.error('📍 URL:', error.config?.url);
    res.status(error.response?.status || 500).json({ 
      error: 'Erreur lors de la récupération des jeux à venir',
      details: error.response?.data?.error || error.message,
      status: error.response?.status
    });
  }
});

// Route pour rechercher des jeux
app.get('/api/games/search', async (req, res) => {
  const { query } = req.query;
  
  if (!query || query.trim() === '') {
    return res.status(400).json({ error: 'Le paramètre de recherche est requis' });
  }
  
  try {
    console.log(`🔍 Recherche: "${query}"`);
    const response = await axios.get(`${RAWG_BASE_URL}/games`, {
      params: {
        key: RAWG_API_KEY,
        search: query,
        page_size: 40, // Augmenté pour compenser le filtrage
        exclude_tags: '80',
        exclude_additions: true
      },
      timeout: 10000
    });
    
    // Filtrer le contenu adulte
    const filteredGames = filterAdultContent(response.data.results);
    console.log(`✅ Résultats filtrés: ${filteredGames.length}/${response.data.results.length}`);
    
    res.json({
      ...response.data,
      results: filteredGames.slice(0, 20)
    });
  } catch (error) {
    console.error('❌ Erreur RAWG API (search):', error.response?.status, error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Erreur lors de la recherche',
      details: error.response?.data?.error || error.message
    });
  }
});

// Route pour récupérer les jeux par plateforme
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
      error: 'Plateforme invalide. Utilisez: pc, playstation, xbox, switch, ou vr' 
    });
  }
  
  // Vérifier si c'est pour les jeux à venir ou populaires
  const isUpcoming = req.query.upcoming === 'true';
  
  try {
    console.log(`📥 Requête: Jeux ${isUpcoming ? 'à venir' : 'populaires'} pour ${req.params.platform}`);
    
    let params = {
      key: RAWG_API_KEY,
      platforms: platformId,
      page_size: 40,
      exclude_tags: '80',
      exclude_additions: true
    };
    
    // Configurer les paramètres selon le type de recherche
    if (isUpcoming) {
      const today = new Date();
      today.setDate(today.getDate() + 1);
      const todayString = today.toISOString().split('T')[0];
      
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 2);
      const nextYearString = nextYear.toISOString().split('T')[0];
      
      params.dates = `${todayString},${nextYearString}`;
      params.ordering = 'released';
      
      console.log(`📅 Filtrage dates: ${todayString} à ${nextYearString}`);
    } else {
      params.ordering = '-rating';
      params.dates = '2023-01-01,2025-12-31';
    }
    
    const response = await axios.get(`${RAWG_BASE_URL}/games`, {
      params: params,
      timeout: 10000
    });
    
    console.log(`📦 Réponse API: ${response.data.results.length} jeux`);
    
    // Filtrer le contenu adulte
    let filteredGames = filterAdultContent(response.data.results);
    
    // Si upcoming, DOUBLE FILTRAGE très strict pour les jeux déjà sortis
    if (isUpcoming) {
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Réinitialiser l'heure pour comparaison correcte
      
      filteredGames = filteredGames.filter(game => {
        if (!game.released) {
          console.log(`⚠️ Jeu sans date: ${game.name}`);
          return false;
        }
        
        const releaseDate = new Date(game.released);
        releaseDate.setHours(0, 0, 0, 0);
        
        const isFuture = releaseDate > now;
        
        if (!isFuture) {
          console.log(`🚫 Jeu déjà sorti filtré: ${game.name} (${game.released})`);
        } else {
          console.log(`✅ Jeu à venir gardé: ${game.name} (${game.released})`);
        }
        
        return isFuture;
      });
    }
    
    console.log(`✅ Jeux filtrés par plateforme: ${filteredGames.length}/${response.data.results.length}`);
    
    if (filteredGames.length === 0) {
      return res.json({
        count: 0,
        results: [],
        message: 'Aucun jeu à venir trouvé pour cette plateforme'
      });
    }
    
    res.json({
      ...response.data,
      results: filteredGames.slice(0, 20)
    });
  } catch (error) {
    console.error('❌ Erreur RAWG API (platform):', error.response?.status, error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Erreur lors de la récupération des jeux',
      details: error.response?.data?.error || error.message
    });
  }
});

// ⚠️ ROUTE DYNAMIQUE À LA FIN ⚠️
// Route pour récupérer les détails d'un jeu
app.get('/api/games/:id', async (req, res) => {
  try {
    console.log(`📥 Requête: Détails du jeu ${req.params.id}`);
    const response = await axios.get(`${RAWG_BASE_URL}/games/${req.params.id}`, {
      params: {
        key: RAWG_API_KEY
      },
      timeout: 10000
    });
    console.log('✅ Succès: Détails du jeu récupérés');
    res.json(response.data);
  } catch (error) {
    console.error('❌ Erreur RAWG API (details):', error.response?.status, error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Erreur lors de la récupération du jeu',
      details: error.response?.data?.error || error.message
    });
  }
});

// Route pour les genres
app.get('/api/genres', async (req, res) => {
  try {
    console.log('📥 Requête: Genres');
    const response = await axios.get(`${RAWG_BASE_URL}/genres`, {
      params: {
        key: RAWG_API_KEY
      },
      timeout: 10000
    });
    console.log('✅ Succès: Genres récupérés');
    res.json(response.data);
  } catch (error) {
    console.error('❌ Erreur RAWG API (genres):', error.response?.status, error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Erreur lors de la récupération des genres',
      details: error.response?.data?.error || error.message
    });
  }
});

// Route principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err);
  res.status(500).json({ 
    error: 'Erreur interne du serveur',
    message: err.message 
  });
});

// Route de debug pour voir toutes les routes enregistrées
app.get('/api/debug/routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    }
  });
  res.json({ routes });
});

app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════');
  console.log(`🚀 Serveur de jeux démarré sur http://localhost:${PORT}`);
  console.log(`📡 API RAWG configurée avec succès`);
  console.log(`🔑 Clé API: ${RAWG_API_KEY.substring(0, 10)}...`);
  console.log(`🧪 Test l'API ici: http://localhost:${PORT}/api/test-rawg`);
  console.log(`🔍 Debug routes: http://localhost:${PORT}/api/debug/routes`);
  console.log('═══════════════════════════════════════════════');
}); 