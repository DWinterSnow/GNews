// jeux.js - VERSION CORRIGÉE - Gestion timeout et erreurs optimisée

// ============================================
// AUTH UI MANAGEMENT (Show/Hide buttons based on login state)
// ============================================

function updateAuthUI() {
  const authButtons = document.getElementById('authButtons');
  const userIcons = document.getElementById('userIcons');
  
  if (!authButtons || !userIcons) return; // Elements don't exist on all pages
  
  // Check if user is logged in by checking sessionStorage
  const userSession = sessionStorage.getItem('user');
  
  if (userSession) {
    // User is logged in - show user icons, hide auth buttons
    authButtons.classList.add('hidden');
    userIcons.classList.remove('hidden');
  } else {
    // User is not logged in - show auth buttons, hide user icons
    authButtons.classList.remove('hidden');
    userIcons.classList.add('hidden');
  }
}

// Use global variables from app.js if available, otherwise declare locally
if (typeof allGames === 'undefined') {
    window.allGames = {
        trending: [],
        upcoming: [],
        recent: []
    };
}

// Initialize global allNews if not already defined
if (typeof allNews === 'undefined') {
    window.allNews = [];
}

let displayedGames = [];
let newGamesInBatch = []; // Track newly fetched games for this batch
let loadCount = 0; // Track how many load attempts (for logging)
let isLoading = false;
let totalResults = 0;
let currentPage = 1; // Page courante pour la pagination
let hasMorePages = true; // Y a-t-il encore des pages ?
let discoverSeed = Math.floor(Math.random() * 1000); // Random seed per page load for variety

// Paramètres de filtrage
let filters = {
    genre: '',
    platform: '',
    sort: '',
    pegi: '',
    search: ''
};

const GAMES_PER_PAGE = 40;
const FETCH_TIMEOUT = 10000; // 10 secondes max

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎮 Page Jeux chargée');
    updateAuthUI();
    testRAWGAPI();
    loadGenres();
    await Promise.all([loadGames(), loadNewsForSearch()]);
    setupEventListeners();
});

// Load news for search functionality
async function loadNewsForSearch() {
    try {
        const response = await fetch('/api/news');
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
                window.allNews = data;
                console.log(`✅ Loaded ${data.length} news articles`);
            }
        }
    } catch (error) {
        console.error('Error loading news:', error);
    }
}

// Test de l'API RAWG au démarrage
async function testRAWGAPI() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch('/api/test-rawg', {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ API RAWG:', data.message || 'OK');
        } else {
            console.warn('⚠️ API RAWG: statut', response.status);
        }
    } catch (error) {
        console.error('❌ Test API échoué:', error.message);
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

// Charger les genres pour le filtre
async function loadGenres() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    try {
        const response = await fetch('/api/genres', {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const genreSelect = document.getElementById('genreFilter');
        
        if (genreSelect && data.results) {
            data.results.forEach(genre => {
                const option = document.createElement('option');
                option.value = genre.id;
                option.textContent = genre.name;
                genreSelect.appendChild(option);
            });
            console.log(`✅ ${data.results.length} genres chargés`);
        }
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('❌ Erreur chargement genres:', error.message);
    }
}

// Charger les jeux avec les filtres actifs
async function loadGames(append = false) {
    if (isLoading) {
        console.log('⚠️ Chargement déjà en cours, ignoré');
        return;
    }
    
    isLoading = true;
    
    if (!append) {
        loadCount = 0;
        displayedGames = [];
        currentPage = 1;
        hasMorePages = true;
    } else {
        currentPage++;
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        console.warn('⏱️ Timeout atteint, annulation de la requête');
        controller.abort();
    }, FETCH_TIMEOUT);
    
    try {
        loadCount++;
        console.log(`📥 Chargement des jeux (page ${currentPage}, mode append=${append})...`);
        
        // Construction de l'URL
        let endpoint = '/api/games/discover';
        const params = new URLSearchParams();
        
        // Pagination
        params.append('page', currentPage);
        params.append('page_size', GAMES_PER_PAGE);
        
        console.log(`🔢 Page ${currentPage} (page_size: ${GAMES_PER_PAGE})`);
        
        // Si recherche active, utiliser l'endpoint de recherche
        if (filters.search && filters.search.trim() !== '') {
            endpoint = '/api/games/search';
            params.append('query', filters.search.trim());
            console.log('🔍 Recherche:', filters.search);
        }
        
        // Appliquer les filtres
        if (filters.genre) params.append('genres', filters.genre);
        if (filters.platform) params.append('platforms', filters.platform);
        if (filters.sort) params.append('sort', filters.sort);
        // Send random seed so the server can vary results on each page load
        params.append('seed', discoverSeed);
        if (filters.pegi) {
            params.append('pegi', filters.pegi);
        }
        
        const url = `${endpoint}?${params.toString()}`;
        console.log('📡 URL complète:', url);
        
        const response = await fetch(url, {
            signal: controller.signal,
            headers: { 
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        clearTimeout(timeoutId);
        
        // Vérifier le statut de la réponse
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Réponse serveur:', response.status, errorText);
            throw new Error(`Erreur serveur: ${response.status} ${response.statusText}`);
        }
        
        // Parser le JSON
        let data;
        try {
            data = await response.json();
        } catch (parseError) {
            console.error('❌ Erreur parsing JSON:', parseError);
            throw new Error('Réponse invalide du serveur');
        }
        
        // Valider la structure des données
        if (!data || !Array.isArray(data.results)) {
            console.error('❌ Structure de données invalide:', data);
            throw new Error('Format de données incorrect');
        }
        
        totalResults = data.count || data.results.length;
        
        console.log(`📊 Réponse API: ${data.results.length} jeux (chargement #${loadCount}, total: ${totalResults})`);
        
        if (append) {
            // Deduplicate - avoid adding games that are already displayed
            const existingIds = new Set(displayedGames.map(g => g.id));
            newGamesInBatch = data.results.filter(g => !existingIds.has(g.id));
            console.log(`📋 Batch #${loadCount}: IDs reçus:`, data.results.map(g => `${g.id}(${g.name.substring(0, 15)})`).join(', '));
            console.log(`✨ Nouveaux jeux #${loadCount}: ${newGamesInBatch.length}/${data.results.length} (après déduplication)`);
            if (newGamesInBatch.length > 0) {
                console.log(`🎮 Premiers nouveaux jeux:`, newGamesInBatch.slice(0, 3).map(g => g.name));
            }
            displayedGames = [...displayedGames, ...newGamesInBatch];
            console.log(`📊 Total affiché: ${displayedGames.length} jeux`);
        } else {
            console.log(`🎮 Premiers jeux chargés au chargement:`, data.results.slice(0, 3).map(g => g.name));
            newGamesInBatch = data.results; // First load, all are new
            displayedGames = data.results;
            console.log(`📊 Première charge: ${displayedGames.length} jeux`);
        }
        
        // Afficher les jeux
        displayGames(append);
        updateResultsCount();
        
        // Mettre à jour si on peut encore charger
        hasMorePages = data.next !== false && data.results.length > 0;

        // Gérer le bouton "Charger plus"
        const loadMoreContainer = document.getElementById('loadMoreContainer');
        if (loadMoreContainer) {
            if (hasMorePages) {
                loadMoreContainer.style.display = 'flex';
                console.log(`📊 Bouton "Charger plus" visible (page ${currentPage}, ${displayedGames.length} jeux affichés)`);
            } else {
                loadMoreContainer.style.display = 'none';
                console.log('✅ Toutes les pages chargées');
            }
        }
        
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('❌ Erreur lors du chargement des jeux:', error);
        
        const container = document.getElementById('gamesList');
        if (container && !append) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                    <div style="font-size: 64px; margin-bottom: 20px;">⚠️</div>
                    <h3 style="font-size: 24px; color: var(--yellow); margin-bottom: 15px;">Erreur de chargement</h3>
                    <p style="color: rgba(255,255,255,0.8); margin-bottom: 30px; font-size: 16px;">
                        Impossible de charger les jeux. Vérifiez votre connexion et réessayez.
                    </p>
                    <button onclick="location.reload()" style="
                        padding: 12px 24px;
                        background: linear-gradient(45deg, var(--purple), var(--cyan));
                        color: white;
                        border: none;
                        border-radius: 10px;
                        font-weight: 600;
                        cursor: pointer;
                    ">🔄 Recharger</button>
                </div>
            `;
        }
    } finally {
        isLoading = false;
    }
}

// Afficher les jeux
function displayGames(append = false) {
    const container = document.getElementById('gamesList');
    if (!container) {
        console.error('❌ Container #gamesList introuvable');
        return;
    }
    
    try {
        if (!append && displayedGames.length === 0) {
            // No games on initial load
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                    <div style="font-size: 64px; margin-bottom: 20px;">🎮</div>
                    <h3 style="font-size: 24px; color: var(--cyan); margin-bottom: 10px;">Aucun jeu trouvé</h3>
                    <p style="color: rgba(255,255,255,0.7);">Essayez de modifier vos filtres de recherche</p>
                    <button onclick="resetFilters()" style="
                        margin-top: 20px;
                        padding: 12px 24px;
                        background: linear-gradient(45deg, var(--purple), var(--cyan));
                        color: white;
                        border: none;
                        border-radius: 10px;
                        font-weight: 600;
                        cursor: pointer;
                    ">Réinitialiser les filtres</button>
                </div>
            `;
            return;
        }
        
        if (append) {
            // Only render NEW games when appending
            if (newGamesInBatch.length === 0) {
                console.log('⚠️ Aucun nouveau jeu à ajouter (tous les jeux étaient des doublons)');
                return;
            }
            const newGamesHTML = newGamesInBatch.map(game => createGameCard(game)).join('');
            const placeholder = container.querySelector('.loading');
            if (placeholder) {
                placeholder.remove();
            }
            container.innerHTML += newGamesHTML;
            console.log(`✅ ${newGamesInBatch.length} nouveaux jeux ajoutés (${displayedGames.length} au total)`);
        } else {
            // Initial load: render all games
            if (displayedGames.length === 0) {
                container.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                        <div style="font-size: 64px; margin-bottom: 20px;">🎮</div>
                        <h3 style="font-size: 24px; color: var(--cyan); margin-bottom: 10px;">Aucun jeu trouvé</h3>
                        <p style="color: rgba(255,255,255,0.7);">Essayez de modifier vos filtres de recherche</p>
                    </div>
                `;
                return;
            }
            const gamesHTML = displayedGames.map(game => createGameCard(game)).join('');
            container.innerHTML = gamesHTML;
            console.log(`✅ ${displayedGames.length} jeux affichés au chargement`);
        }
    } catch (error) {
        console.error('❌ Erreur lors de l\'affichage des jeux:', error);
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                <div style="font-size: 64px; margin-bottom: 20px;">⚠️</div>
                <h3 style="font-size: 24px; color: var(--yellow); margin-bottom: 10px;">Erreur d'affichage</h3>
                <p style="color: rgba(255,255,255,0.8);">${error.message}</p>
            </div>
        `;
    }
}

// Créer une carte de jeu
function createGameCard(game) {
    // Get platform names (not just icons)
    const platformNames = game.platforms ? 
        game.platforms.slice(0, 3).map(p => p.platform.name).filter(name => name) : [];
    
    const platformBadges = platformNames.length > 0 ? 
        platformNames.map(name => `<span class="platform-badge">${name}</span>`).join('') : '';
    
    return `
        <div class="game-card-large" onclick="viewGame(${game.id})">
            <img src="${game.background_image || '/img/placeholder.svg'}" 
                 alt="${game.name}" 
                 class="game-card-large-image"
                 onerror="this.src='/img/placeholder.svg'">
            
            <div style="padding: 20px; z-index: 3; position: relative;">
                <div class="game-card-large-title">
                    ${game.name.length > 50 ? game.name.substring(0, 50) + '...' : game.name}
                </div>
                
                <div class="game-card-large-platforms" style="margin-bottom: 12px;">
                    ${platformBadges}
                </div>
                
                ${game.rating ? `
                    <div class="game-card-large-rating">
                        <span>⭐</span>
                        <span class="rating-value">${game.rating.toFixed(2)}/5</span>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Icône de plateforme
function getPlatformIcon(platformName) {
    const name = platformName.toLowerCase();
    if (name.includes('pc')) return '💻';
    if (name.includes('playstation') || name.includes('ps')) return '🎮';
    if (name.includes('xbox')) return '🎯';
    if (name.includes('switch')) return '🕹️';
    if (name.includes('ios') || name.includes('android')) return '📱';
    if (name.includes('vr')) return '🥽';
    return '🎮';
}

// Appliquer les filtres
function applyFilters() {
    filters.genre = document.getElementById('genreFilter')?.value || '';
    filters.platform = document.getElementById('platformFilter')?.value || '';
    filters.sort = document.getElementById('sortFilter')?.value || '';
    filters.pegi = document.getElementById('pegiFilter')?.value || '';
    
    console.log('🎯 Filtres appliqués:', filters);
    updateResultsTitle();
    loadGames(false);
}

// Réinitialiser les filtres
function resetFilters() {
    document.getElementById('genreFilter').value = '';
    document.getElementById('platformFilter').value = '';
    document.getElementById('sortFilter').value = '';
    document.getElementById('pegiFilter').value = '';
    document.getElementById('searchInput').value = '';
    
    filters = {
        genre: '',
        platform: '',
        sort: '',
        pegi: '',
        search: ''
    };
    
    // New random seed so reset shows different games
    discoverSeed = Math.floor(Math.random() * 1000);
    
    updateResultsTitle();
    loadGames(false);
}

// Recherche
async function performSearch() {
    const query = document.getElementById('searchInput')?.value;
    if (!query || !query.trim()) return;

    console.log('🔍 Recherche globale:', query);

    // Collect all games from all sources
    let searchGames = [];
    if (window.allGames) {
        searchGames = searchGames.concat(window.allGames.trending || []);
        searchGames = searchGames.concat(window.allGames.upcoming || []);
        searchGames = searchGames.concat(window.allGames.recent || []);
    } else if (window.displayedGames) {
        searchGames = window.displayedGames;
    }

    // Deduplicate
    const uniqueGamesMap = new Map();
    searchGames.forEach(game => {
        if (game && game.id && !uniqueGamesMap.has(game.id)) uniqueGamesMap.set(game.id, game);
    });
    searchGames = Array.from(uniqueGamesMap.values());

    // Filter games locally
    const filteredGames = searchGames.filter(game => 
        (game.name && game.name.toLowerCase().includes(query.toLowerCase())) ||
        (game.genres && game.genres.some(g => g.name.toLowerCase().includes(query.toLowerCase())))
    );

    // Filter news
    const filteredNews = (window.allNews || []).filter(news => 
        (news.title && news.title.toLowerCase().includes(query.toLowerCase())) ||
        (news.description && news.description.toLowerCase().includes(query.toLowerCase()))
    );

    console.log('🔎 searchGames:', searchGames.length, 'filteredGames:', filteredGames.length, 'availableNews:', (window.allNews || []).length, 'filteredNews:', filteredNews.length);

    // If no local games available, fallback to API search
    if ((!searchGames || searchGames.length === 0) || filteredGames.length === 0) {
        if (window.showSearchResults) window.showSearchResults([], filteredNews, query, true);

        try {
            // Prefer canonical app-level API helper if present
                    if (window.searchGamesFromAPI) {
                        // The app-level helper shows results itself; call it with the current news
                        await window.searchGamesFromAPI(query, filteredNews);
                        return;
                    }

            // Otherwise call the server search endpoint directly
            const resp = await fetch(`/api/games/search?query=${encodeURIComponent(query)}`);
            if (resp.ok) {
                const data = await resp.json();
                const apiGames = data && data.results ? data.results : (Array.isArray(data) ? data : []);
                console.log('🌐 API fallback fetched', apiGames.length, 'games');
                if (window.showSearchResults) window.showSearchResults(apiGames, filteredNews, query, false);
                return;
            } else {
                console.warn('🌐 API fallback failed, status', resp.status);
                if (window.showSearchResults) window.showSearchResults([], filteredNews, query, false);
                return;
            }
        } catch (err) {
            console.error('❌ API fallback error:', err);
            if (window.showSearchResults) window.showSearchResults([], filteredNews, query, false);
            return;
        }
    }

    // Show local filtered results
    if (window.showSearchResults) window.showSearchResults(filteredGames, filteredNews, query, false);
}

// Charger plus de jeux
function loadMoreGames() {
    const btn = event.target.closest('.load-more-btn');
    
    if (isLoading) {
        console.log('⚠️ Chargement déjà en cours');
        return;
    }
    
    console.log(`📄 Chargement de nouveaux jeux aléatoires (actuellement: ${displayedGames.length} jeux)`);
    
    // Disable button and show loading state
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span style="font-size: 20px; margin-right: 10px;">⏳</span>Chargement...';
        btn.style.opacity = '0.7';
    }
    
    loadGames(true).finally(() => {
        // Re-enable button
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span style="font-size: 20px; margin-right: 10px;">🎮</span>Charger plus de jeux';
            btn.style.opacity = '1';
        }
    });
}

// Mettre à jour le compteur de résultats
function updateResultsCount() {
    const resultsCount = document.getElementById('resultsCount');
    if (resultsCount) {
        if (totalResults > 0) {
            resultsCount.textContent = `${displayedGames.length} / ${totalResults.toLocaleString()} jeux`;
        } else {
            resultsCount.textContent = `${displayedGames.length} jeux`;
        }
    }
}

// Mettre à jour le titre des résultats
function updateResultsTitle() {
    const resultsTitle = document.getElementById('resultsTitle');
    if (!resultsTitle) return;
    
    if (filters.search) {
        resultsTitle.textContent = `Résultats pour "${filters.search}"`;
    } else if (filters.sort) {
        const sortSelect = document.getElementById('sortFilter');
        const sortName = sortSelect?.options[sortSelect.selectedIndex]?.text || 'Tous les jeux';
        resultsTitle.textContent = sortName;
    } else if (filters.genre) {
        const genreSelect = document.getElementById('genreFilter');
        const genreName = genreSelect?.options[genreSelect.selectedIndex]?.text || 'Genre';
        resultsTitle.textContent = `Jeux ${genreName}`;
    } else if (filters.platform) {
        const platformSelect = document.getElementById('platformFilter');
        const platformName = platformSelect?.options[platformSelect.selectedIndex]?.text || 'Plateforme';
        resultsTitle.textContent = `Jeux ${platformName}`;
    } else if (filters.year) {
        resultsTitle.textContent = `Jeux de ${filters.year}`;
    } else {
        resultsTitle.textContent = 'Tous les Jeux';
    }
}

// Voir les détails d'un jeu
function viewGame(id) {
    window.location.href = `game-details.html?id=${id}`;
}

// Formater la date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}