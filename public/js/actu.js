// actualites.js - VERSION CORRIGÉE avec timeout et limitation texte

// ============================================
// AUTH UI MANAGEMENT (Show/Hide buttons based on login state)
// ============================================

async function updateAuthUI() {
  const authButtons = document.getElementById('authButtons');
  const userIcons = document.getElementById('userIcons');
  
  if (!authButtons || !userIcons) return;
  
  try {
    if (typeof checkAuthStatus === 'function') {
      const auth = await checkAuthStatus();
      if (auth.isLoggedIn) {
        authButtons.classList.add('hidden');
        userIcons.classList.remove('hidden');
        loadNavProfilePicture(auth.user.id);
      } else {
        authButtons.classList.remove('hidden');
        userIcons.classList.add('hidden');
      }
      return;
    }
  } catch (e) {}
  
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
  navPic.onerror = () => { navPic.src = defaultSrc; };
}

// Ensure globals are available on window so other pages can access them
if (typeof window.allNews === 'undefined') {
    window.allNews = [];
}
if (typeof window.filteredNews === 'undefined') {
    window.filteredNews = [];
}

let displayedCount = 30;
const INCREMENT = 12;
let currentCategory = 'tout';
let currentSource = 'tout';
let currentSort = 'recent';
let searchQuery = '';
let isLoading = false;

// Ensure a window-scoped `allGames` exists so search can read it
if (typeof window.allGames === 'undefined' || !window.allGames) {
    window.allGames = {
        trending: [],
        upcoming: [],
        recent: []
    };
}

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📰 Page Actualités chargée');
    updateAuthUI();
    await Promise.all([loadAllNews(), loadGamesForSearch()]);
    setupEventListeners();
});

// Load games for search functionality
async function loadGamesForSearch() {
    try {
        const endpoints = {
            trending: '/api/games/trending?page_size=50',
            upcoming: '/api/games/upcoming?page_size=50',
            recent: '/api/games/new-releases?page_size=50'
        };
        
        const cacheKeys = {
            trending: GNewsCache.keys.gamesTrending(),
            upcoming: GNewsCache.keys.gamesUpcoming(),
            recent: GNewsCache.keys.gamesNewReleases()
        };
        
        for (const [type, url] of Object.entries(endpoints)) {
            // Check cache first
            const cached = GNewsCache.get(cacheKeys[type]);
            if (cached && cached.results) {
                window.allGames[type] = cached.results;
                console.log(`✅ Loaded ${cached.results.length} ${type} games (cache)`);
                continue;
            }

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                if (data.results) {
                    window.allGames[type] = data.results;
                    GNewsCache.set(cacheKeys[type], data, GNewsCache.DURATIONS.GAMES_LIST);
                    console.log(`✅ Loaded ${data.results.length} ${type} games`);
                }
            }
        }
    } catch (error) {
        console.error('Error loading games:', error);
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
        
        searchInput.addEventListener('input', (e) => {
            if (e.target.value === '') {
                searchQuery = '';
                applyFilters();
            }
        });
    }
}

// Charger TOUTES les actualités avec TIMEOUT
async function loadAllNews() {
    if (isLoading) {
        console.log('⚠️ Chargement déjà en cours');
        return;
    }
    
    isLoading = true;
    showLoading();
    
    // TIMEOUT de 20 secondes
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    
    try {
        console.log('📥 Chargement de toutes les actualités...');
        
        // Check cache first
        const cached = GNewsCache.get(GNewsCache.keys.news());
        if (cached && Array.isArray(cached) && cached.length > 0) {
            window.allNews = cached.map(article => ({
                ...article,
                detectedCategory: detectArticleCategory(article)
            }));
            console.log(`✅ ${window.allNews.length} articles (cache)`);
            updateStats();
            applyFilters();
            isLoading = false;
            return;
        }

        const response = await fetch('/api/news', {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        
        if (!Array.isArray(data)) {
            throw new Error('Format de données invalide (attendu: array)');
        }
        
        // Cache the news data
        GNewsCache.set(GNewsCache.keys.news(), data, GNewsCache.DURATIONS.NEWS);
        
        window.allNews = data.map(article => ({
            ...article,
            detectedCategory: detectArticleCategory(article)
        }));
        
        console.log(`✅ ${window.allNews.length} articles chargés avec succès`);
        
        if (window.allNews.length === 0) {
            showEmptyState('Aucun article disponible. Le serveur n\'a retourné aucune donnée.');
            return;
        }
        
        updateStats();
        applyFilters();
        
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('❌ Erreur chargement:', error);
        
        if (error.name === 'AbortError') {
            showError('⏱️ Délai d\'attente dépassé (20s). Le serveur met trop de temps à répondre. Vérifiez que le serveur est démarré.');
        } else if (error.message.includes('Failed to fetch')) {
            showError('🔌 Impossible de se connecter au serveur. Vérifiez que le serveur est démarré sur http://localhost:3000');
        } else {
            showError(`Erreur: ${error.message}`);
        }
    } finally {
        isLoading = false;
    }
}

// Actualiser les news
async function refreshNews() {
    if (isLoading) return;
    
    const btn = event?.target;
    if (btn) {
        btn.textContent = '🔄 Actualisation...';
        btn.disabled = true;
    }
    
    try {
        // Clear news cache before refresh
        GNewsCache.remove(GNewsCache.keys.news());
        
        // Forcer le rafraîchissement côté serveur
        const refreshResponse = await fetch('/api/news/refresh', {
            headers: { 'Accept': 'application/json' }
        });
        
        if (refreshResponse.ok) {
            console.log('✅ Cache serveur rafraîchi');
        }
        
        // Recharger les données
        window.allNews = [];
        window.filteredNews = [];
        await loadAllNews();
        
    } catch (error) {
        console.error('❌ Erreur refresh:', error);
        showError('Erreur lors du rafraîchissement');
    } finally {
        if (btn) {
            btn.textContent = '🔄 Actualiser';
            btn.disabled = false;
        }
    }
}

// Détection de catégorie
function detectArticleCategory(article) {
    const title = article.title.toLowerCase();
    const description = (article.description || '').toLowerCase();
    const content = title + ' ' + description;
    
    const categories = {
        'e-sport': ['esport', 'tournament', 'championship', 'competitive', 'pro', 'team', 'league', 'finals', 'winner', 'prize', 'competition', 'match', 'compétition'],
        'patch': ['patch', 'update', 'hotfix', 'fix', 'bug', 'changelog', 'notes', 'version', 'release', 'mise à jour', 'correctif', 'balance'],
        'teste': ['review', 'test', 'critique', 'impression', 'hands-on', 'preview', 'tested', 'verdict', 'rating', 'score', 'analysis', 'évaluation'],
        'guide': ['guide', 'how to', 'tutorial', 'walkthrough', 'tips', 'tricks', 'beginner', 'advanced', 'strategy', 'build', 'best', 'top 10', 'explained', 'conseil']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => content.includes(keyword))) {
            return category;
        }
    }
    
    return article.source === 'reddit' ? 'discussion' : 'article';
}

// Filtrer par catégorie
function filterByCategory(category) {
    currentCategory = category;
    displayedCount = 30;
    
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    applyFilters();
}

// Filtrer par source
function filterBySource(source) {
    currentSource = source;
    displayedCount = 30;
    
    document.querySelectorAll('.source-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    applyFilters();
}

// Trier les actualités
function sortNews(sortType) {
    currentSort = sortType;
    
    document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    applyFilters();
}

// Appliquer tous les filtres
function applyFilters() {
    let result = [...(window.allNews || [])];
    
    if (searchQuery) {
        result = result.filter(article =>
            article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (article.description && article.description.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }
    
    if (currentCategory !== 'tout') {
        result = result.filter(article => article.detectedCategory === currentCategory);
    }
    
    if (currentSource !== 'tout') {
        result = result.filter(article => article.source === currentSource);
    }
    
    if (currentSort === 'recent') {
        result.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    } else if (currentSort === 'oldest') {
        result.sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));
    }
    
    window.filteredNews = result;
    displayedCount = 30;
    displayNews();
    updateStats();
}

// Recherche
async function performSearch() {
    const query = document.getElementById('searchInput')?.value;
    if (!query || !query.trim()) {
        return;
    }
    
    console.log('🔍 Recherche globale:', query);
    
    // Use window objects to access global data
    let searchGames = [];
    if (window.allGames) {
        searchGames = searchGames.concat(window.allGames.trending || []);
        searchGames = searchGames.concat(window.allGames.upcoming || []);
        searchGames = searchGames.concat(window.allGames.recent || []);
    }
    
    // Remove duplicates by ID
    const uniqueGamesMap = new Map();
    searchGames.forEach(game => {
        if (game.id && !uniqueGamesMap.has(game.id)) {
            uniqueGamesMap.set(game.id, game);
        }
    });
    searchGames = Array.from(uniqueGamesMap.values());
    
    // Filter games
    let filteredGames = searchGames.filter(game => 
        game.name.toLowerCase().includes(query.toLowerCase()) ||
        (game.genres && game.genres.some(g => g.name.toLowerCase().includes(query.toLowerCase())))
    );
    
    // Filter news by text
    const allNewsData = window.allNews || [];
    let filteredNews = allNewsData.filter(news => 
        news.title.toLowerCase().includes(query.toLowerCase()) ||
        (news.description && news.description.toLowerCase().includes(query.toLowerCase()))
    );

    // Show loading state
    if (window.showSearchResults) {
        window.showSearchResults([], [], query, true);
    }

    // If no local games, fetch from API
    if (filteredGames.length === 0) {
        try {
            const resp = await fetch(`/api/games/search?query=${encodeURIComponent(query)}`);
            if (resp.ok) {
                const data = await resp.json();
                filteredGames = data && data.results ? data.results : (Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('API search fallback failed', err);
        }
    }

    // Enrich news with game-specific results
    if (typeof fetchGameSpecificNews === 'function' && filteredGames.length > 0) {
        filteredNews = await fetchGameSpecificNews(filteredGames, filteredNews);
    }

    // Show final results
    if (window.showSearchResults) {
        window.showSearchResults(filteredGames, filteredNews, query);
    }
}

// Charger plus d'articles
function loadMoreNews() {
    displayedCount += INCREMENT;
    displayNews();
}

// Afficher les actualités
function displayNews() {
    const container = document.getElementById('newsGrid');
    if (!container) {
        console.error('❌ Container #newsGrid introuvable');
        return;
    }
    
    const filtered = window.filteredNews || [];
    if (filtered.length === 0) {
        showEmptyState('Aucune actualité trouvée avec ces filtres');
        return;
    }
    
    const newsToShow = filtered.slice(0, displayedCount);
    const hasMore = filtered.length > displayedCount;
    
    const articlesHTML = newsToShow.map(article => {
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
                <span style="font-size: 24px;">📰</span>
                Charger plus d'articles
            </button>
        `;
        container.appendChild(loadMoreDiv);
    } else if (filtered.length > 30) {
        const endDiv = document.createElement('div');
        endDiv.className = 'load-more-container';
        endDiv.innerHTML = '<p style="color: var(--cyan); font-size: 16px; font-weight: 600;">✅ Tous les articles affichés</p>';
        container.appendChild(endDiv);
    }
    
    updateStats();
    
    console.log(`✅ Affichage de ${newsToShow.length} articles sur ${filtered.length}`);
}

// Créer une carte d'actualité
function createNewsCard(article) {
    const categoryBadge = getCategoryBadge(article.detectedCategory);
    const sourceIcon = getSourceIcon(article.source);
    
    // Nettoyer et limiter la description à 120 caractères MAX
    let description = article.description || '';
    description = description.replace(/<[^>]*>/g, ''); // Supprimer les balises HTML
    description = description.replace(/\s+/g, ' ').trim(); // Normaliser les espaces
    const shortDescription = description.length > 120 
        ? description.substring(0, 120) + '...' 
        : description;
    
    // Limiter le titre à 80 caractères pour éviter les débordements
    let title = article.title || 'Sans titre';
    title = title.replace(/\s+/g, ' ').trim(); // Normaliser les espaces
    const shortTitle = title.length > 80 
        ? title.substring(0, 80) + '...' 
        : title;
    
    // Échapper les caractères spéciaux pour éviter les erreurs HTML
    const safeTitle = shortTitle.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const safeDescription = shortDescription.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const safeUrl = article.url.replace(/'/g, '&#39;');
    
    return `
        <div class="news-card" onclick="window.open('${safeUrl}', '_blank')">
              <img src="${article.image || '/img/placeholder.svg'}" 
                  alt="${safeTitle}" 
                  class="news-image"
                  onerror="this.src='/img/placeholder.svg'">
            <div class="news-content">
                <div class="news-meta">
                    <span class="source-badge">${sourceIcon} ${article.author}</span>
                    ${categoryBadge}
                </div>
                <h3 class="news-title">${shortTitle}</h3>
                ${shortDescription ? `<p class="news-description">${safeDescription}</p>` : '<p class="news-description"></p>'}
                <div class="news-footer">
                    <span class="news-date">📅 ${formatDate(article.publishedAt)}</span>
                </div>
            </div>
        </div>
    `;
}

// Badge de catégorie
function getCategoryBadge(category) {
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
            background: ${badge.bgColor};
            color: ${badge.color};
            border: 1.5px solid ${badge.color};
        ">
            <span style="font-size: 14px;">${badge.icon}</span>
            ${badge.label}
        </span>
    `;
}

// Icône de source
function getSourceIcon(source) {
    const icons = {
        'reddit': '💬',
        'rss': '📰',
        'guardian': '🗞️'
    };
    return icons[source] || '📰';
}

// Badge de catégorie stylisé
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

// Mettre à jour les statistiques
function updateStats() {
    const totalEl = document.getElementById('totalArticles');
    const displayedEl = document.getElementById('displayedArticles');
    
    if (totalEl) {
        animateNumber(totalEl, (window.filteredNews || []).length);
    }
    
    if (displayedEl) {
        const displayed = Math.min(displayedCount, (window.filteredNews || []).length);
        animateNumber(displayedEl, displayed);
    }
}

// Animation des nombres
function animateNumber(element, target) {
    const duration = 500;
    const start = parseInt(element.textContent) || 0;
    const increment = (target - start) / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= target) || (increment < 0 && current <= target)) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.round(current);
    }, 16);
}

// Formater la date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (hours < 1) return 'À l\'instant';
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    
    return date.toLocaleDateString('fr-FR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// Afficher le chargement
function showLoading() {
    const container = document.getElementById('newsGrid');
    if (container) {
        container.innerHTML = `
            <div class="loading" style="grid-column: 1 / -1; text-align: center; padding: 80px 20px;">
                <div style="font-size: 64px; margin-bottom: 20px; animation: pulse 2s ease-in-out infinite;">⏳</div>
                <div style="font-size: 24px; color: var(--cyan); font-weight: 600; margin-bottom: 15px;">
                    Chargement des actualités...
                </div>
                <div style="color: rgba(255,255,255,0.6); font-size: 14px;">
                    Récupération depuis Reddit, RSS et The Guardian
                </div>
                <div style="margin-top: 20px; color: rgba(255,255,255,0.5); font-size: 12px;">
                    Si le chargement prend plus de 20 secondes, vérifiez que le serveur est démarré
                </div>
            </div>
            <style>
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.1); }
                }
            </style>
        `;
    }
}

// Afficher état vide
function showEmptyState(message) {
    const container = document.getElementById('newsGrid');
    if (container) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                <div class="empty-icon" style="font-size: 64px; margin-bottom: 20px;">🔍</div>
                <h3 class="empty-title" style="font-size: 24px; color: var(--cyan); margin-bottom: 15px;">
                    Aucune actualité trouvée
                </h3>
                <p class="empty-description" style="color: rgba(255,255,255,0.7); font-size: 16px; margin-bottom: 30px;">
                    ${message}
                </p>
                <button onclick="loadAllNews()" style="
                    padding: 12px 30px;
                    background: linear-gradient(45deg, var(--purple), var(--cyan));
                    color: white;
                    border: none;
                    border-radius: 10px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 0.3s;
                " onmouseover="this.style.transform='scale(1.05)'" 
                   onmouseout="this.style.transform='scale(1)'">
                    🔄 Réessayer
                </button>
            </div>
        `;
    }
}

// Afficher une erreur
function showError(message) {
    const container = document.getElementById('newsGrid');
    if (container) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                <div class="empty-icon" style="font-size: 64px; margin-bottom: 20px;">⚠️</div>
                <h3 class="empty-title" style="font-size: 24px; color: var(--yellow); margin-bottom: 15px;">
                    Erreur de chargement
                </h3>
                <p class="empty-description" style="color: rgba(255,255,255,0.8); font-size: 16px; margin-bottom: 10px; max-width: 600px; margin-left: auto; margin-right: auto;">
                    ${message}
                </p>
                <div style="margin: 20px 0; padding: 15px; background: rgba(255,193,7,0.1); border-radius: 10px; max-width: 600px; margin-left: auto; margin-right: auto;">
                    <p style="color: var(--yellow); font-size: 14px; margin: 0;">
                        💡 <strong>Conseil:</strong> Vérifiez que le serveur est démarré avec <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">node server.js</code>
                    </p>
                </div>
                <button onclick="loadAllNews()" class="refresh-btn" style="
                    margin-top: 20px;
                    padding: 15px 35px;
                    background: linear-gradient(45deg, var(--purple), var(--cyan));
                    color: white;
                    border: none;
                    border-radius: 10px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 0.3s;
                " onmouseover="this.style.transform='scale(1.05)'" 
                   onmouseout="this.style.transform='scale(1)'">
                    🔄 Réessayer
                </button>
            </div>
        `;
    }
}