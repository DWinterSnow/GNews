// app.js - VERSION FINALE CORRIGÉE

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

// Charger les jeux en vedette
async function loadFeaturedGames() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        console.log('📥 Chargement des jeux en vedette');
        const response = await fetch('/api/games/trending', {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error('Erreur lors du chargement des jeux en vedette');
        }
        
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            displayFeaturedGames(data.results.slice(0, 3));
        }
    } catch (error) {
        console.error('❌ Erreur featured games:', error);
        const container = document.getElementById('featuredArticles');
        if (container) {
            container.innerHTML = `
                <p style="grid-column: 1/-1; text-align: center; color: var(--yellow); padding: 40px;">
                    Erreur de chargement des jeux en vedette
                </p>
            `;
        }
    }
}

// Afficher les jeux en vedette
function displayFeaturedGames(games) {
    const container = document.getElementById('featuredArticles');
    if (!container) return;
    
    container.innerHTML = games.map((game, index) => `
        <div class="featured-card ${index === 0 ? 'large' : ''}" onclick="viewGame(${game.id})">
            <img src="${game.background_image || 'https://via.placeholder.com/400x250/10159d/fff?text=No+Image'}" 
                 alt="${game.name}" 
                 class="featured-image"
                 onerror="this.src='https://via.placeholder.com/400x250/10159d/fff?text=No+Image'">
            <div class="featured-content">
                <h3 class="featured-title">${game.name}</h3>
                <div class="genre-tags">
                    ${game.genres ? game.genres.slice(0, 3).map(g => 
                        `<span class="genre-tag">${g.name}</span>`
                    ).join('') : ''}
                    ${game.platforms ? game.platforms.slice(0, 2).map(p => 
                        `<span class="genre-tag">${p.platform.name}</span>`
                    ).join('') : ''}
                </div>
                ${game.rating ? `
                    <div class="news-rating">
                        ${getStarRating(game.rating)} ${game.rating}/5
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
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
            <img src="${game.background_image || 'https://via.placeholder.com/200x180'}" 
                 alt="${game.name}" 
                 class="game-card-image"
                 onerror="this.src='https://via.placeholder.com/200x180'">
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
                     onerror="this.src='https://via.placeholder.com/800x250/10159d/fff?text=Gaming+News'">
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
                Charger plus (${newsToShow.length - displayedNewsCount} restants)
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
        displayedNewsCount = 30;
        displayNews();
        return;
    }
    
    const filtered = allNews.filter(news => 
        news.title.toLowerCase().includes(query.toLowerCase()) ||
        (news.description && news.description.toLowerCase().includes(query.toLowerCase()))
    );
    
    if (filtered.length > 0) {
        displayedNewsCount = 30;
        allNews = filtered;
        displayNews();
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