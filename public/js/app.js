// App.js - VERSION COMPLÈTE avec 3 onglets

// État de l'application
let currentTab = 'trending';
let currentPlatform = 'tout';
let allGames = {
    trending: [],
    upcoming: [],
    recent: []
};

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 Application GNews démarrée');
    testAPI();
    loadFeaturedGames();
    loadGames('trending');
    loadNews();
    setupEventListeners();
});

// Tester la connexion à l'API
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

// Configuration des écouteurs d'événements
function setupEventListeners() {
    // Recherche - Enter key
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }

    // Filtres de catégorie d'actualités
    const newsFilters = document.querySelectorAll('.news-filters .filter-btn');
    newsFilters.forEach(btn => {
        btn.addEventListener('click', (e) => {
            newsFilters.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
    });

    // Navigation
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
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.tab-btn').classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tab}Content`).classList.add('active');
    
    // Reset platform filter
    currentPlatform = 'tout';
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    const firstFilter = document.querySelector('.filter-btn[data-platform="tout"]');
    if (firstFilter) firstFilter.classList.add('active');
    
    // Load games if not already loaded
    if (allGames[tab].length === 0) {
        loadGames(tab);
    }
}

// Filtrer par plateforme
function filterByPlatform(platform) {
    currentPlatform = platform;
    
    // Update button states
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Filter and display games
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

// Charger les jeux selon le type
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

// Charger les actualités
async function loadNews() {
    showLoading('newsList');
    
    try {
        console.log('📥 Chargement des actualités');
        const response = await fetch('/api/games/new-releases');
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || errorData.error || 'Erreur API');
        }
        
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            console.log('✅ Actualités chargées:', data.results.length);
            displayNews(data.results);
        } else {
            console.warn('⚠️ Aucune actualité trouvée');
            displayNews([]);
        }
    } catch (error) {
        console.error('❌ Erreur actualités:', error);
        document.getElementById('newsList').innerHTML = `
            <p style="text-align: center; padding: 40px; color: var(--yellow);">
                Erreur: ${error.message}
            </p>
        `;
    }
}

// Afficher les actualités
function displayNews(games) {
    const container = document.getElementById('newsList');
    if (!container) return;
    
    if (games.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--yellow);">Aucune actualité disponible</p>';
        return;
    }
    
    container.innerHTML = games.map(game => `
        <div class="news-card" onclick="viewGame(${game.id})">
            <img src="${game.background_image || 'https://via.placeholder.com/800x250/10159d/fff?text=No+Image'}" 
                 alt="${game.name}" 
                 class="news-image"
                 onerror="this.src='https://via.placeholder.com/800x250/10159d/fff?text=No+Image'">
            <div class="news-content">
                <h3 class="news-title">${game.name}</h3>
                <div class="genre-tags">
                    ${game.genres ? game.genres.slice(0, 4).map(g => 
                        `<span class="genre-tag">${g.name}</span>`
                    ).join('') : ''}
                </div>
                ${game.rating ? `
                    <div class="news-rating">
                        ${getStarRating(game.rating)} ${game.rating}/5 • ${game.ratings_count || 0} avis
                    </div>
                ` : ''}
                ${game.released ? `
                    <p style="margin-top: 10px; color: var(--cyan);">📅 Sortie: ${formatDate(game.released)}</p>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Rechercher des jeux
async function performSearch() {
    const query = document.getElementById('searchInput').value;
    
    if (!query.trim()) {
        loadGames(currentTab);
        loadNews();
        return;
    }
    
    showLoading('newsList');
    
    try {
        console.log('🔍 Recherche:', query);
        const response = await fetch(`/api/games/search?query=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || errorData.error || 'Erreur recherche');
        }
        
        const data = await response.json();
        
        if (data.results) {
            console.log('✅ Résultats:', data.results.length);
            displayNews(data.results);
        }
    } catch (error) {
        console.error('❌ Erreur recherche:', error);
        document.getElementById('newsList').innerHTML = `
            <p style="text-align: center; padding: 40px; color: var(--yellow);">
                Erreur: ${error.message}
            </p>
        `;
    }
}

// Rediriger vers la page de détails du jeu
function viewGame(id) {
    console.log('🎮 Ouverture du jeu:', id);
    window.location.href = `game-details.html?id=${id}`;
}

// Fonction pour générer les étoiles de notation
function getStarRating(rating) {
    if (!rating) return '';
    
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    
    for (let i = 0; i < fullStars; i++) {
        stars += '⭐';
    }
    
    if (hasHalfStar) {
        stars += '✨';
    }
    
    for (let i = 0; i < emptyStars; i++) {
        stars += '☆';
    }
    
    return stars;
}

// Formater une date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// Afficher un loader
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

// Afficher une erreur
function showError(message) {
    const containers = ['featuredArticles', 'trendingGames', 'upcomingGames', 'recentGames', 'newsList'];
    containers.forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--yellow);">
                    <p style="font-size: 24px; margin-bottom: 20px;">⚠️</p>
                    <p style="font-size: 18px; margin-bottom: 10px;">${message}</p>
                    <p style="font-size: 14px; color: rgba(255,255,255,0.6); margin-bottom: 20px;">
                        Vérifiez votre clé API RAWG ou testez avec /api/test-rawg
                    </p>
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