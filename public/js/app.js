// App.js - VERSION SCROLL INFINI - Affichage progressif

// État de l'application
let currentTab = 'trending';
let currentPlatform = 'tout';
let allGames = {
    trending: [],
    upcoming: [],
    recent: []
};
let allNews = []; // TOUS les articles du serveur
let displayedNewsCount = 30; // Commence à 30 articles
let currentNewsFilter = 'tout';
const NEWS_INCREMENT = 12; // Charger 12 articles de plus à chaque clic

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
        const response = await fetch('/api/test-rawg');
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ API RAWG:', data.message);
            console.log('📊 Jeux disponibles:', data.total_games);
        } else {
            console.error('❌ Échec du test API:', data.error);
            showError('API RAWG non disponible. Vérifiez votre clé API.');
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

    const newsFilters = document.querySelectorAll('.news-filters .filter-btn');
    newsFilters.forEach(btn => {
        btn.addEventListener('click', (e) => {
            newsFilters.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const filter = e.target.dataset.filter;
            filterNews(filter);
        });
    });

    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            e.target.classList.add('active');
        });
    });
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
    }
}

// Filtrer par plateforme
function filterByPlatform(platform) {
    currentPlatform = platform;
    
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    if (platform === 'tout') {
        displayGames(allGames[currentTab], currentTab);
    } else {
        const filtered = allGames[currentTab].filter(game => {
            if (!game.platforms) return false;
            return game.platforms.some(p => {
                const name = p.platform.name.toLowerCase();
                return name.includes(platform) || 
                       (platform === 'pc' && name.includes('pc')) ||
                       (platform === 'playstation' && (name.includes('playstation') || name.includes('ps'))) ||
                       (platform === 'xbox' && name.includes('xbox')) ||
                       (platform === 'switch' && name.includes('switch')) ||
                       (platform === 'vr' && (name.includes('vr') || name.includes('virtual reality')));
            });
        });
        displayGames(filtered, currentTab);
    }
}

// Charger les jeux en vedette
async function loadFeaturedGames() {
    try {
        console.log('📥 Chargement des jeux en vedette');
        const response = await fetch('/api/games/popular');
        
        if (!response.ok) {
            throw new Error('Erreur lors du chargement des jeux en vedette');
        }
        
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            displayFeaturedGames(data.results.slice(0, 3));
        }
    } catch (error) {
        console.error('❌ Erreur featured games:', error);
        document.getElementById('featuredArticles').innerHTML = `
            <p style="grid-column: 1/-1; text-align: center; color: var(--yellow);">
                Erreur de chargement des jeux en vedette
            </p>
        `;
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
    const endpoints = {
        trending: '/api/games/popular',
        upcoming: '/api/games/upcoming',
        recent: '/api/games/new-releases'
    };
    
    const containerId = `${type}Games`;
    showLoading(containerId);

    try {
        console.log('📥 Chargement des jeux:', type);
        const response = await fetch(endpoints[type]);
        
        if (!response.ok) {
            const errorData = await response.json();
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
        console.error('❌ Erreur chargement:', error);
        document.getElementById(containerId).innerHTML = `
            <p style="color: var(--yellow); padding: 40px; text-align: center;">
                Erreur: ${error.message}
            </p>
        `;
    }
}

// Afficher la grille de jeux
function displayGames(games, type) {
    const container = document.getElementById(`${type}Games`);
    if (!container) return;
    
    if (!games || games.length === 0) {
        container.innerHTML = '<p style="color: var(--yellow); padding: 40px; text-align: center;">Aucun jeu trouvé</p>';
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

// ==================== CATÉGORIES ====================

function detectArticleCategory(article) {
    const title = article.title.toLowerCase();
    const description = (article.description || '').toLowerCase();
    const content = title + ' ' + description;
    
    const guideKeywords = ['guide', 'how to', 'tutorial', 'walkthrough', 'tips', 'tricks', 'beginner', 
                          'advanced', 'strategy', 'build', 'best', 'top 10', 'explained', 'conseil'];
    
    const reviewKeywords = ['review', 'test', 'critique', 'impression', 'hands-on', 'preview', 
                           'tested', 'verdict', 'rating', 'score', 'analysis', 'évaluation'];
    
    const patchKeywords = ['patch', 'update', 'hotfix', 'fix', 'bug', 'changelog', 'notes', 
                          'version', 'release', 'mise à jour', 'correctif', 'balance'];
    
    const esportKeywords = ['esport', 'tournament', 'championship', 'competitive', 'pro', 'team', 
                           'league', 'finals', 'winner', 'prize', 'competition', 'match', 'compétition'];
    
    if (esportKeywords.some(keyword => content.includes(keyword))) return 'e-sport';
    if (patchKeywords.some(keyword => content.includes(keyword))) return 'patch';
    if (reviewKeywords.some(keyword => content.includes(keyword))) return 'teste';
    if (guideKeywords.some(keyword => content.includes(keyword))) return 'guide';
    if (article.source === 'reddit') return 'discussion';
    return 'article';
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
            text-transform: uppercase;
            letter-spacing: 0.5px;
        ">
            <span style="font-size: 14px;">${badge.icon}</span>
            ${badge.label}
        </span>
    `;
}

// ==================== ACTUALITÉS - SCROLL INFINI ====================

// Charger TOUS les articles du serveur
async function loadNews() {
    showLoading('newsList');
    
    try {
        console.log('📰 Chargement de TOUS les articles depuis le serveur...');
        const response = await fetch('/api/news');
        
        if (!response.ok) {
            throw new Error('Erreur lors du chargement des actualités');
        }
        
        const data = await response.json();
        
        // Ajouter la catégorie détectée
        allNews = data.map(article => ({
            ...article,
            detectedCategory: detectArticleCategory(article)
        }));
        
        console.log(`✅ ${allNews.length} articles chargés au total`);
        
        // Afficher les 30 premiers
        displayedNewsCount = 30;
        displayNews();
        
    } catch (error) {
        console.error('❌ Erreur actualités:', error);
        document.getElementById('newsList').innerHTML = `
            <p style="text-align: center; padding: 40px; color: var(--yellow);">
                Erreur: ${error.message}
                <br><br>
                <button onclick="loadNews()" style="padding: 12px 24px; background: var(--purple); color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 600;">
                    Réessayer
                </button>
            </p>
        `;
    }
}

// Filtrer par catégorie
function filterNews(filter) {
    currentNewsFilter = filter;
    displayedNewsCount = 30; // Reset à 30
    displayNews();
}

// Charger plus d'articles (scroll infini)
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
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--yellow); width: 100%;">Aucune actualité disponible</p>';
        return;
    }
    
    // Filtrer par catégorie
    let newsToShow = allNews;
    if (currentNewsFilter !== 'tout') {
        newsToShow = allNews.filter(article => article.detectedCategory === currentNewsFilter);
    }
    
    if (newsToShow.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--yellow); width: 100%;">Aucun article dans cette catégorie</p>';
        return;
    }
    
    // Afficher jusqu'à displayedNewsCount articles
    const articlesToDisplay = newsToShow.slice(0, displayedNewsCount);
    const hasMore = newsToShow.length > displayedNewsCount;
    
    container.innerHTML = articlesToDisplay.map(article => {
        const sourceIcon = getSourceIcon(article.source);
        const categoryBadge = getCategoryBadgeStyled(article.detectedCategory);
        
        const shortDescription = article.description 
            ? article.description.substring(0, 100) + (article.description.length > 100 ? '...' : '')
            : '';
        
        return `
            <div class="news-card" onclick="window.open('${article.url}', '_blank')">
                <img src="${article.image}" 
                     alt="${article.title}" 
                     class="news-image"
                     onerror="this.src='https://via.placeholder.com/800x250/10159d/fff?text=Gaming+News'">
                <div class="news-content">
                    <div style="display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; align-items: center;">
                        <span class="source-badge">${sourceIcon} ${article.author}</span>
                        ${categoryBadge}
                    </div>
                    <h3 class="news-title">${article.title}</h3>
                    ${shortDescription ? `
                        <p style="color: rgba(255,255,255,0.7); font-size: 13px; line-height: 1.5; margin-top: 8px;">
                            ${shortDescription}
                        </p>
                    ` : ''}
                    <p style="margin-top: auto; padding-top: 10px; color: var(--cyan); font-size: 12px;">
                        📅 ${formatDate(article.publishedAt)}
                    </p>
                </div>
            </div>
        `;
    }).join('');
    
    // Bouton "Charger plus" - Simple et élégant
    if (hasMore) {
        container.innerHTML += `
            <div style="width: 100%; display: flex; justify-content: center; padding: 20px; grid-column: 1 / -1;">
                <button onclick="loadMoreNews()" class="load-more-btn">
                    <span style="font-size: 20px; margin-right: 10px;">📰</span>
                    Charger plus d'articles
                </button>
            </div>
        `;
    } else if (newsToShow.length > 30) {
        container.innerHTML += `
            <div style="width: 100%; text-align: center; padding: 20px; color: var(--cyan); grid-column: 1 / -1;">
                <p style="font-size: 16px;">✅ Vous avez tout vu !</p>
            </div>
        `;
    }
}

function getSourceIcon(source) {
    const icons = { 'reddit': '💬', 'rss': '📰', 'guardian': '🗞️' };
    return icons[source] || '📰';
}

// Recherche
async function performSearch() {
    const query = document.getElementById('searchInput').value;
    
    if (!query.trim()) {
        displayedNewsCount = 30;
        displayNews();
        return;
    }
    
    const filtered = allNews.filter(news => 
        news.title.toLowerCase().includes(query.toLowerCase()) ||
        news.description.toLowerCase().includes(query.toLowerCase())
    );
    
    if (filtered.length > 0) {
        displayedNewsCount = 30;
        allNews = filtered;
        displayNews();
    } else {
        showLoading('newsList');
        
        try {
            const response = await fetch(`/api/games/search?query=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error('Erreur recherche');
            
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                const gamesAsNews = data.results.map(game => ({
                    source: 'rawg',
                    title: game.name,
                    description: `Note: ${game.rating}/5 • Sortie: ${game.released}`,
                    url: `game-details.html?id=${game.id}`,
                    image: game.background_image,
                    publishedAt: game.released,
                    author: 'RAWG',
                    category: 'game',
                    detectedCategory: 'article'
                }));
                
                allNews = gamesAsNews;
                displayedNewsCount = 30;
                displayNews();
            } else {
                allNews = [];
                displayNews();
            }
        } catch (error) {
            console.error('❌ Erreur recherche:', error);
            allNews = [];
            displayNews();
        }
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
            <div style="text-align: center; padding: 60px 20px; color: var(--cyan); font-size: 18px;">
                <div class="loading">⏳ Chargement en cours...</div>
            </div>
        `;
    }
}

function showError(message) {
    const containers = ['featuredArticles', 'trendingGames', 'upcomingGames', 'recentGames', 'newsList'];
    containers.forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--yellow);">
                    <p style="font-size: 24px; margin-bottom: 20px;">⚠️</p>
                    <p style="font-size: 18px; margin-bottom: 10px;">${message}</p>
                    <button onclick="location.reload()" 
                            style="margin-top: 20px; padding: 12px 25px; background: var(--purple); 
                                   color: white; border: none; border-radius: 10px; cursor: pointer; 
                                   font-weight: 600; font-size: 16px;">
                        Réessayer
                    </button>
                </div>
            `;
        }
    });
}