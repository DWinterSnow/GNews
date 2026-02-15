// app.js - VERSION FINALE CORRIGÉE

// ============================================
// AUTH UI MANAGEMENT (Show/Hide buttons based on login state)
// ============================================

async function updateAuthUI() {
  const authButtons = document.getElementById('authButtons');
  const userIcons = document.getElementById('userIcons');
  
  if (!authButtons || !userIcons) return; // Elements don't exist on all pages
  
  // Check auth status from server (uses session)
  try {
    if (typeof checkAuthStatus === 'function') {
      const auth = await checkAuthStatus();
      if (auth.isLoggedIn) {
        authButtons.classList.add('hidden');
        userIcons.classList.remove('hidden');
        // Load profile picture
        loadNavProfilePicture(auth.user.id);
      } else {
        authButtons.classList.remove('hidden');
        userIcons.classList.add('hidden');
      }
      return;
    }
  } catch (e) {
    // Fallback to sessionStorage
  }

  // Fallback: check sessionStorage
  const userSession = sessionStorage.getItem('user');
  
  if (userSession) {
    authButtons.classList.add('hidden');
    userIcons.classList.remove('hidden');
    try {
      const user = JSON.parse(userSession);
      if (user && user.id) loadNavProfilePicture(user.id);
    } catch (e) {}
  } else {
    authButtons.classList.remove('hidden');
    userIcons.classList.add('hidden');
  }
}

function loadNavProfilePicture(userId) {
  const navPic = document.getElementById('navProfilePic');
  if (!navPic) return;
  
  const defaultSrc = navPic.src;
  navPic.src = '/api/users/profile-picture/' + userId;
  navPic.onerror = () => {
    navPic.src = defaultSrc;
  };
}

let currentTab = 'trending';
let currentPlatform = 'tout';
let allGames = {
    trending: [],
    upcoming: [],
    recent: []
};
let allNews = [];
let displayedNewsCount = 30;
let currentNewsFilter = 'tout';
const NEWS_INCREMENT = 12;
let isLoadingNews = false;
let isLoadingGames = false;

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 Application GNews démarrée');
    updateAuthUI();
    testAPI();
    loadFeaturedGames();
    loadGames('trending');
    loadNews();
    setupEventListeners();
});

// Tester l'API
async function testAPI() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch('/api/test-rawg', {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ API RAWG:', data.message);
            console.log('📊 Jeux disponibles:', data.total_games);
        } else {
            console.error('❌ Échec du test API:', data.error);
        }
    } catch (error) {
        console.error('❌ Erreur test API:', error);
    }
}

// Configuration des écouteurs
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
}

// Basculer entre les onglets
function switchTab(tab) {
    currentTab = tab;
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.tab-btn').classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tab}Content`).classList.add('active');
    
    currentPlatform = 'tout';
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    const firstFilter = document.querySelector('.filter-btn[data-platform="tout"]');
    if (firstFilter) firstFilter.classList.add('active');
    
    if (allGames[tab].length === 0) {
        loadGames(tab);
    } else {
        displayGames(allGames[tab], tab);
    }
}

// Filtrer par plateforme - VERSION AVEC APPEL API
async function filterByPlatform(platform) {
    currentPlatform = platform;
    
    // Mettre à jour les boutons actifs
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // "Tout" = afficher tous les jeux déjà chargés
    if (platform === 'tout') {
        console.log(`📊 Affichage de TOUS les jeux: ${allGames[currentTab].length}`);
        displayGames(allGames[currentTab], currentTab);
        return;
    }
    
    console.log(`🔍 Filtrage par plateforme: ${platform.toUpperCase()}`);
    
    // Pour VR, PC, PlayStation, Xbox, Switch : faire un appel API dédié
    if (['vr', 'pc', 'playstation', 'xbox', 'switch'].includes(platform)) {
        const containerId = `${currentTab}Games`;
        showLoading(containerId);
        
        try {
            const response = await fetch(`/api/games/platform/${platform}?upcoming=${currentTab === 'upcoming'}`);
            
            if (!response.ok) {
                throw new Error('Erreur API plateforme');
            }
            
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                console.log(`✅ ${data.results.length} jeux ${platform.toUpperCase()} récupérés de l'API`);
                displayGames(data.results, currentTab);
            } else {
                document.getElementById(containerId).innerHTML = `
                    <p style="color: var(--yellow); padding: 40px; text-align: center; width: 100%;">
                        Aucun jeu ${platform.toUpperCase()} disponible
                    </p>
                `;
            }
        } catch (error) {
            console.error(`❌ Erreur chargement ${platform}:`, error);
            document.getElementById(containerId).innerHTML = `
                <p style="color: var(--yellow); padding: 40px; text-align: center;">
                    Erreur de chargement
                </p>
            `;
        }
        return;
    }
    
    // Sinon, filtrage côté client (fallback)
    console.log(`📊 Filtrage côté client pour: ${platform}`);
    const platformMatches = {
        'pc': ['pc', 'windows', 'linux', 'macos', 'mac os'],
        'playstation': ['playstation', 'ps5', 'ps4', 'ps3', 'ps2', 'ps vita', 'psp', 'ps '],
        'xbox': ['xbox', 'xbox one', 'xbox 360', 'xbox series'],
        'switch': ['nintendo switch', 'switch'],
        'vr': ['playstation vr', 'psvr', 'ps vr', 'oculus', 'meta quest', 'htc vive', 'valve index', 'vr', 'virtual reality', 'playstation vr2']
    };
    
    const keywords = platformMatches[platform] || [platform];
    
    const filtered = allGames[currentTab].filter(game => {
        if (!game.platforms || !Array.isArray(game.platforms) || game.platforms.length === 0) {
            return false;
        }
        
        const gamePlatforms = game.platforms.map(p => p.platform.name.toLowerCase());
        
        return gamePlatforms.some(platformName => {
            return keywords.some(keyword => platformName.includes(keyword));
        });
    });
    
    console.log(`✅ ${filtered.length} jeux trouvés pour ${platform.toUpperCase()}`);
    displayGames(filtered, currentTab);
}

// Charger les articles en vedette (3 dernières actualités)
async function loadFeaturedGames() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        console.log('📰 Chargement des articles en vedette');
        const response = await fetch('/api/news', {
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error('Erreur lors du chargement des actualités');
        }
        
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
            // Filtrer les articles avec une image valide, puis prendre les 3 plus récents
            const articlesWithImages = data.filter(a => a.image && a.image.startsWith('http'));
            const topArticles = articlesWithImages.slice(0, 3);
            displayFeaturedArticles(topArticles);
        }
    } catch (error) {
        console.error('❌ Erreur articles en vedette:', error);
        const container = document.getElementById('featuredArticles');
        if (container) {
            container.innerHTML = `
                <p style="grid-column: 1/-1; text-align: center; color: var(--yellow); padding: 40px;">
                    Erreur de chargement des actualités
                </p>
            `;
        }
    }
}

// Afficher les articles en vedette
function displayFeaturedArticles(articles) {
    const container = document.getElementById('featuredArticles');
    if (!container) return;
    
    container.innerHTML = articles.map((article, index) => {
        let title = (article.title || 'Sans titre').replace(/\s+/g, ' ').trim();
        if (title.length > 90) title = title.substring(0, 90) + '...';
        
        const sourceIcon = article.source === 'reddit' ? '💬' : article.source === 'guardian' ? '🗞️' : '📰';
        
        return `
            <div class="featured-card ${index === 0 ? 'large' : ''}" onclick="window.open('${article.url}', '_blank')">
                <img src="${article.image || '/img/placeholder.svg'}" 
                     alt="${title}" 
                     class="featured-image"
                     onerror="this.src='/img/placeholder.svg'">
                <div class="featured-content">
                    <h3 class="featured-title">${title}</h3>
                    <div class="genre-tags">
                        <span class="genre-tag">${sourceIcon} ${article.author || article.source}</span>
                        <span class="genre-tag">📅 ${formatDate(article.publishedAt)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Charger les jeux
async function loadGames(type) {
    if (isLoadingGames) {
        console.log('⚠️ Chargement de jeux déjà en cours');
        return;
    }
    
    const endpoints = {
        trending: '/api/games/trending',
        upcoming: '/api/games/upcoming',
        recent: '/api/games/new-releases'
    };
    
    const containerId = `${type}Games`;
    showLoading(containerId);
    isLoadingGames = true;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        console.log('📥 Chargement des jeux:', type);
        const response = await fetch(endpoints[type], {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.details || errorData.error || 'Erreur API');
        }
        
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            allGames[type] = data.results;
            console.log(`✅ ${type} chargés:`, data.results.length);
            displayGames(data.results, type);
        } else {
            console.warn(`⚠️ Aucun jeu trouvé pour ${type}`);
            document.getElementById(containerId).innerHTML = `
                <p style="color: var(--yellow); padding: 40px; text-align: center; width: 100%; margin: auto;">
                    Aucun jeu disponible
                </p>
            `;
        }
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('❌ Erreur chargement:', error);
        document.getElementById(containerId).innerHTML = `
            <p style="color: var(--yellow); padding: 40px; text-align: center;">
                ${error.name === 'AbortError' ? 'Timeout - Le serveur ne répond pas' : `Erreur: ${error.message}`}
            </p>
        `;
    } finally {
        isLoadingGames = false;
    }
}

// Afficher la grille de jeux
function displayGames(games, type) {
    const container = document.getElementById(`${type}Games`);
    if (!container) return;
    
    if (!games || games.length === 0) {
        container.innerHTML = '<p style="color: var(--yellow); padding: 40px; text-align: center; width: 100%;">Aucun jeu trouvé</p>';
        return;
    }

    container.innerHTML = games.slice(0, 20).map(game => `
        <div class="game-card" onclick="viewGame(${game.id})">
            <img src="${game.background_image || '/img/placeholder.svg'}" 
                 alt="${game.name}" 
                 class="game-card-image"
                 onerror="this.src='/img/placeholder.svg'">
            <div class="game-card-title">${game.name.length > 30 ? game.name.substring(0, 30) + '...' : game.name}</div>
            ${game.released ? `
                <div class="game-card-date">
                    📅 ${formatDate(game.released)}
                </div>
            ` : ''}
            ${game.rating ? `
                <div class="game-card-rating">
                    ${getStarRating(game.rating)}
                    <span class="rating-value">${game.rating}</span>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// Détection de catégorie
function detectArticleCategory(article) {
    const title = article.title.toLowerCase();
    const description = (article.description || '').toLowerCase();
    const content = title + ' ' + description;
    
    const categories = {
        'e-sport': ['esport', 'tournament', 'championship', 'competitive', 'pro', 'team', 'league'],
        'patch': ['patch', 'update', 'hotfix', 'fix', 'bug', 'changelog'],
        'teste': ['review', 'test', 'critique', 'impression', 'hands-on'],
        'guide': ['guide', 'how to', 'tutorial', 'walkthrough', 'tips', 'tricks']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => content.includes(keyword))) {
            return category;
        }
    }
    
    return article.source === 'reddit' ? 'discussion' : 'article';
}

function getCategoryBadgeStyled(category) {
    const badges = {
        'guide': { icon: '📖', label: 'Guide', color: '#4CAF50', bgColor: 'rgba(76, 175, 80, 0.2)' },
        'teste': { icon: '⭐', label: 'Test', color: '#FF9800', bgColor: 'rgba(255, 152, 0, 0.2)' },
        'patch': { icon: '🔧', label: 'Patch', color: '#2196F3', bgColor: 'rgba(33, 150, 243, 0.2)' },
        'e-sport': { icon: '🏆', label: 'E-Sport', color: '#F44336', bgColor: 'rgba(244, 67, 54, 0.2)' },
        'article': { icon: '📰', label: 'Article', color: '#9C27B0', bgColor: 'rgba(156, 39, 176, 0.2)' },
        'discussion': { icon: '💬', label: 'Discussion', color: '#00BCD4', bgColor: 'rgba(0, 188, 212, 0.2)' }
    };
    
    const badge = badges[category] || badges['article'];
    
    return `
        <span class="category-badge" style="
            display: inline-flex;
            align-items: center;
            gap: 5px;
            background: ${badge.bgColor};
            color: ${badge.color};
            padding: 5px 12px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: 700;
            border: 1.5px solid ${badge.color};
        ">
            <span style="font-size: 14px;">${badge.icon}</span>
            ${badge.label}
        </span>
    `;
}

// Charger TOUS les articles
async function loadNews() {
    if (isLoadingNews) {
        console.log('⚠️ Chargement de news déjà en cours');
        return;
    }
    
    showLoading('newsList');
    isLoadingNews = true;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    try {
        console.log('📰 Chargement de TOUS les articles...');
        const response = await fetch('/api/news', {
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!Array.isArray(data)) {
            throw new Error('Format de données invalide');
        }
        
        allNews = data.map(article => ({
            ...article,
            detectedCategory: detectArticleCategory(article)
        }));
        
        console.log(`✅ ${allNews.length} articles chargés`);
        
        displayedNewsCount = 30;
        displayNews();
        
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('❌ Erreur actualités:', error);
        const container = document.getElementById('newsList');
        if (container) {
            container.innerHTML = `
                <p style="text-align: center; padding: 40px; color: var(--yellow); grid-column: 1 / -1;">
                    ${error.name === 'AbortError' ? 'Timeout - Le serveur ne répond pas' : `Erreur: ${error.message}`}
                    <br><br>
                    <button onclick="loadNews()" style="padding: 12px 24px; background: var(--purple); color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 600;">
                        Réessayer
                    </button>
                </p>
            `;
        }
    } finally {
        isLoadingNews = false;
    }
}

// Filtrer par catégorie
function filterNews(filter) {
    currentNewsFilter = filter;
    displayedNewsCount = 30;
    
    document.querySelectorAll('.news-filters .filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    displayNews();
}

// Charger plus d'articles
function loadMoreNews() {
    displayedNewsCount += NEWS_INCREMENT;
    console.log(`📄 Affichage de ${displayedNewsCount} articles`);
    displayNews();
}

// Afficher les actualités
function displayNews() {
    const container = document.getElementById('newsList');
    if (!container) return;
    
    if (!allNews || allNews.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--yellow); width: 100%; grid-column: 1 / -1;">Aucune actualité disponible</p>';
        return;
    }
    
    let newsToShow = allNews;
    if (currentNewsFilter !== 'tout') {
        newsToShow = allNews.filter(article => article.detectedCategory === currentNewsFilter);
    }
    
    if (newsToShow.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--yellow); width: 100%; grid-column: 1 / -1;">Aucun article dans cette catégorie</p>';
        return;
    }
    
    const articlesToDisplay = newsToShow.slice(0, displayedNewsCount);
    const hasMore = newsToShow.length > displayedNewsCount;
    
    const articlesHTML = articlesToDisplay.map(article => {
        const sourceIcon = getSourceIcon(article.source);
        const categoryBadge = getCategoryBadgeStyled(article.detectedCategory);
        
        let description = article.description || '';
        description = description.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        const shortDescription = description.length > 100 
            ? description.substring(0, 100) + '...' 
            : description;
        
        let title = article.title || 'Sans titre';
        title = title.replace(/\s+/g, ' ').trim();
        const shortTitle = title.length > 80 
            ? title.substring(0, 80) + '...' 
            : title;
        
        return `
            <div class="news-card" onclick="window.open('${article.url}', '_blank')">
                <img src="${article.image}" 
                     alt="${shortTitle}" 
                     class="news-image"
                     onerror="this.src='/img/placeholder.svg'">
                <div class="news-content">
                    <div style="display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap;">
                        <span class="source-badge">${sourceIcon} ${article.author}</span>
                        ${categoryBadge}
                    </div>
                    <h3 class="news-title">${shortTitle}</h3>
                    ${shortDescription ? `<p style="color: rgba(255,255,255,0.7); font-size: 13px; line-height: 1.5; margin-top: 8px;">${shortDescription}</p>` : ''}
                    <p style="margin-top: auto; padding-top: 10px; color: var(--cyan); font-size: 12px;">
                        📅 ${formatDate(article.publishedAt)}
                    </p>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = articlesHTML;
    
    if (hasMore) {
        const loadMoreDiv = document.createElement('div');
        loadMoreDiv.className = 'load-more-container';
        loadMoreDiv.innerHTML = `
            <button onclick="loadMoreNews()" class="load-more-btn">
                <span style="font-size: 20px;">📰</span>
                Charger plus
            </button>
        `;
        container.appendChild(loadMoreDiv);
    } else if (newsToShow.length > 30) {
        const endDiv = document.createElement('div');
        endDiv.className = 'load-more-container';
        endDiv.innerHTML = '<p style="color: var(--cyan); font-size: 16px; font-weight: 600;">✅ Tous les articles affichés</p>';
        container.appendChild(endDiv);
    }
}

function getSourceIcon(source) {
    const icons = { 'reddit': '💬', 'rss': '📰', 'guardian': '🗞️' };
    return icons[source] || '📰';
}

async function performSearch() {
    const query = document.getElementById('searchInput')?.value;
    if (!query || !query.trim()) {
        return;
    }
    
    console.log('🔍 Recherche globale:', query);
    
    // Collect all games from all categories
    let searchGames = [];
    searchGames = searchGames.concat(allGames.trending || []);
    searchGames = searchGames.concat(allGames.upcoming || []);
    searchGames = searchGames.concat(allGames.recent || []);
    
    // Remove duplicates by ID
    const uniqueGamesMap = new Map();
    searchGames.forEach(game => {
        if (game.id && !uniqueGamesMap.has(game.id)) {
            uniqueGamesMap.set(game.id, game);
        }
    });
    searchGames = Array.from(uniqueGamesMap.values());
    
    // Filter games from local cache
    const filteredGames = searchGames.filter(game => 
        game.name.toLowerCase().includes(query.toLowerCase()) ||
        (game.genres && game.genres.some(g => g.name.toLowerCase().includes(query.toLowerCase())))
    );
    
    // Filter news
    const filteredNews = allNews.filter(news => 
        news.title.toLowerCase().includes(query.toLowerCase()) ||
        (news.description && news.description.toLowerCase().includes(query.toLowerCase()))
    );
    
    // If games found locally or have enough results, show immediately
    if (filteredGames.length > 0 || filteredNews.length > 0) {
        showSearchResults(filteredGames, filteredNews, query);
        // Also fetch from API to get more results
        if (filteredGames.length < 10) {
            await searchGamesFromAPI(query, filteredNews);
        }
    } else {
        // If no results found locally, try API search
        showSearchResults([], filteredNews, query, true);
        await searchGamesFromAPI(query, filteredNews);
    }
}

async function searchGamesFromAPI(query, existingNews = []) {
    try {
        console.log('🌐 Recherche API RAWG pour:', query);
        const response = await fetch(`/api/games/search?query=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('API search failed');
        
        const data = await response.json();
        if (data.results && data.results.length > 0) {
            console.log(`✅ ${data.results.length} jeux trouvés via API`);
            const modal = document.getElementById('searchModal');
            if (modal && modal.style.display === 'flex') {
                // Merge with existing news from modal
                showSearchResults(data.results, existingNews || [], query);
            }
        } else {
            console.log('❌ Aucun jeu trouvé via API pour:', query);
        }
    } catch (error) {
        console.error('❌ Erreur recherche API:', error);
    }
}

function showSearchResults(games, news, query, isLoading = false) {
    // Create or get modal
    let modal = document.getElementById('searchModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'searchModal';
        modal.className = 'search-modal';
        document.body.appendChild(modal);
    }
    
    const totalResults = games.length + news.length;
    
    if (totalResults === 0 && !isLoading) {
        modal.innerHTML = `
            <div class="search-modal-content">
                <div class="search-modal-header">
                    <h2>Résultats de recherche pour "<strong>${query}</strong>"</h2>
                    <button class="search-modal-close" onclick="closeSearchResults()">✕</button>
                </div>
                <div class="search-modal-body">
                    <p style="text-align: center; color: var(--yellow); padding: 40px;">
                        Aucun résultat trouvé pour "<strong>${query}</strong>"
                    </p>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
        return;
    }
    
    if (isLoading) {
        modal.innerHTML = `
            <div class="search-modal-content">
                <div class="search-modal-header">
                    <h2>Recherche de "<strong>${query}</strong>"...</h2>
                    <button class="search-modal-close" onclick="closeSearchResults()">✕</button>
                </div>
                <div class="search-modal-body">
                    <p style="text-align: center; color: var(--cyan); padding: 40px; font-size: 18px;">
                        ⏳ Recherche en cours...
                    </p>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
        return;
    }
    
    // Build games HTML
    let gamesHTML = '';
    if (games.length > 0) {
        gamesHTML = `
            <div class="search-results-games">
                ${games.map(game => createSearchGameCard(game)).join('')}
            </div>
        `;
    } else {
        gamesHTML = '<p style="text-align: center; color: var(--yellow); padding: 40px;">Aucun jeu trouvé</p>';
    }
    
    // Build news HTML - sort by date descending
    let newsHTML = '';
    if (news.length > 0) {
        const sortedNews = [...news].sort((a, b) => {
            const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
            const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
            return dateB - dateA;
        });
        
        newsHTML = `
            <div class="search-results-news">
                ${sortedNews.slice(0, 10).map(article => createSearchNewsCard(article)).join('')}
            </div>
        `;
    } else {
        newsHTML = '<p style="text-align: center; color: var(--yellow); padding: 40px;">Aucune actualité trouvée</p>';
    }
    
    // Build tabs
    const gamesTab = games.length > 0 ? 'active' : '';
    const newsTab = news.length > 0 && games.length === 0 ? 'active' : '';
    
    modal.innerHTML = `
        <div class="search-modal-content">
            <div class="search-modal-header">
                <h2>Résultats de recherche: "<strong>${query}</strong>" (${totalResults} résultats)</h2>
                <button class="search-modal-close" onclick="closeSearchResults()">✕</button>
            </div>
            <div class="search-tabs">
                <button class="search-tab-btn ${gamesTab}" onclick="switchSearchTab('games')">
                    🎮 Jeux (${games.length})
                </button>
                <button class="search-tab-btn ${newsTab}" onclick="switchSearchTab('news')">
                    📰 Actualités (${news.length})
                </button>
            </div>
            <div class="search-modal-body">
                <div id="games-tab-content" class="search-tab-content ${gamesTab}">
                    ${gamesHTML}
                </div>
                <div id="news-tab-content" class="search-tab-content ${newsTab}">
                    ${newsHTML}
                </div>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
    
    // Close on background click
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeSearchResults();
        }
    };
}

function switchSearchTab(tab) {
    // Hide all tabs
    document.querySelectorAll('.search-tab-content').forEach(el => {
        el.classList.remove('active');
    });
    
    // Remove active from all buttons
    document.querySelectorAll('.search-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const selectedContent = document.getElementById(tab + '-tab-content');
    if (selectedContent) {
        selectedContent.classList.add('active');
    }
    
    // Mark button as active
    event.target.classList.add('active');
}

function createSearchGameCard(game) {
    const genres = game.genres ? game.genres.slice(0, 2).map(g => g.name).join(', ') : 'N/A';
    return `
        <div class="search-result-item search-game-item" onclick="viewGame(${game.id})">
            <div class="search-result-image">
                <img src="${game.background_image || '/img/placeholder.svg'}" 
                     alt="${game.name}"
                     onerror="this.src='/img/placeholder.svg'">
                ${game.rating ? `<div class="search-result-rating">⭐ ${game.rating}</div>` : ''}
            </div>
            <div class="search-result-info">
                <h4 class="search-result-title">${game.name}</h4>
                <p class="search-result-meta">${genres}</p>
                ${game.released ? `<p class="search-result-date">📅 ${formatDate(game.released)}</p>` : ''}
            </div>
        </div>
    `;
}

function createSearchNewsCard(article) {
    const newsLink = article.link || article.url || '#';
    const publishDate = article.pubDate ? new Date(article.pubDate).toLocaleDateString('fr-FR') : '';
    const clickHandler = newsLink && newsLink !== '#' ? `window.open('${newsLink.replace(/'/g, "\\'")}', '_blank')` : 'return false';
    
    return `
        <div class="search-result-item search-news-item" onclick="${clickHandler}" style="cursor: ${newsLink && newsLink !== '#' ? 'pointer' : 'default'}">
            <div class="search-result-image">
                 <img src="${article.image || '/img/placeholder.svg'}" 
                     alt="${article.title}"
                     onerror="this.src='/img/placeholder.svg'">
            </div>
            <div class="search-result-info">
                <h4 class="search-result-title">${article.title}</h4>
                <p class="search-result-meta">${article.source || 'Article'}</p>
                ${publishDate ? `<p class="search-result-date">📅 ${publishDate}</p>` : ''}
                <p class="search-result-desc">${article.description?.substring(0, 100) || ''}...</p>
            </div>
        </div>
    `;
}

function closeSearchResults() {
    const modal = document.getElementById('searchModal');
    if (modal) {
        modal.style.display = 'none';
    }
    // Clear search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
}

function viewGame(id) {
    window.location.href = `game-details.html?id=${id}`;
}

function getStarRating(rating) {
    if (!rating) return '';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    for (let i = 0; i < fullStars; i++) stars += '⭐';
    if (hasHalfStar) stars += '✨';
    for (let i = 0; i < emptyStars; i++) stars += '☆';
    return stars;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="loading" style="grid-column: 1 / -1; text-align: center; padding: 60px;">
                <div style="font-size: 48px; margin-bottom: 20px;">⏳</div>
                <div style="font-size: 20px; color: var(--cyan);">Chargement...</div>
            </div>
        `;
    }
}

// ============================================
// MOBILE NAV HAMBURGER MENU
// ============================================

function initMobileNav() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const mobileNav = document.getElementById('mobileNav');
    const mobileNavOverlay = document.getElementById('mobileNavOverlay');
    const mobileNavClose = document.getElementById('mobileNavClose');

    if (!hamburgerBtn || !mobileNav) return;

    function openMobileNav() {
        mobileNav.classList.add('active');
        if (mobileNavOverlay) mobileNavOverlay.classList.add('active');
        hamburgerBtn.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeMobileNav() {
        mobileNav.classList.remove('active');
        if (mobileNavOverlay) mobileNavOverlay.classList.remove('active');
        hamburgerBtn.classList.remove('active');
        document.body.style.overflow = '';
    }

    hamburgerBtn.addEventListener('click', function() {
        if (mobileNav.classList.contains('active')) {
            closeMobileNav();
        } else {
            openMobileNav();
        }
    });

    if (mobileNavClose) {
        mobileNavClose.addEventListener('click', closeMobileNav);
    }

    if (mobileNavOverlay) {
        mobileNavOverlay.addEventListener('click', closeMobileNav);
    }

    // Close on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && mobileNav.classList.contains('active')) {
            closeMobileNav();
        }
    });
}

// Initialize mobile nav on DOM ready
document.addEventListener('DOMContentLoaded', initMobileNav);