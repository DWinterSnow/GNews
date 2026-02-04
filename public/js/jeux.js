// jeux.js - VERSION CORRIGÉE - Gestion timeout et erreurs optimisée

let allGames = [];
let displayedGames = [];
let currentPage = 1;
let isLoading = false;
let totalResults = 0;

// Paramètres de filtrage
let filters = {
    genre: '',
    platform: '',
    sort: '-rating',
    year: '',
    search: ''
};

const GAMES_PER_PAGE = 20;
const FETCH_TIMEOUT = 10000; // 10 secondes max

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 Page Jeux chargée');
    testRAWGAPI();
    loadGenres();
    loadGames();
    setupEventListeners();
});

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
        showLoading();
        currentPage = 1;
        displayedGames = [];
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        console.warn('⏱️ Timeout atteint, annulation de la requête');
        controller.abort();
    }, FETCH_TIMEOUT);
    
    try {
        console.log(`📥 Chargement des jeux (page ${currentPage})...`);
        
        // Construction de l'URL
        let endpoint = '/api/games/popular';
        const params = new URLSearchParams();
        
        // Paramètres de base
        params.append('page_size', GAMES_PER_PAGE);
        
        // Si recherche active, utiliser l'endpoint de recherche
        if (filters.search && filters.search.trim() !== '') {
            endpoint = '/api/games/search';
            params.append('query', filters.search.trim());
            console.log('🔍 Recherche:', filters.search);
        }
        
        // Appliquer les filtres
        if (filters.genre) params.append('genres', filters.genre);
        if (filters.platform) params.append('platforms', filters.platform);
        if (filters.year) {
            params.append('dates', `${filters.year}-01-01,${filters.year}-12-31`);
        }
        
        const url = `${endpoint}?${params.toString()}`;
        console.log('📡 URL:', url);
        
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
        
        if (append) {
            displayedGames = [...displayedGames, ...data.results];
        } else {
            displayedGames = data.results;
        }
        
        console.log(`✅ ${data.results.length} jeux chargés (total: ${displayedGames.length})`);
        
        // Afficher les jeux
        displayGames();
        updateResultsCount();
        
        // Gérer le bouton "Charger plus"
        const loadMoreContainer = document.getElementById('loadMoreContainer');
        if (loadMoreContainer) {
            if (displayedGames.length < totalResults && data.results.length === GAMES_PER_PAGE) {
                loadMoreContainer.style.display = 'flex';
            } else {
                loadMoreContainer.style.display = 'none';
            }
        }
        
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('❌ Erreur lors du chargement des jeux:', error);
        
        let errorMessage = error.message;
        if (error.name === 'AbortError') {
            errorMessage = 'La requête a pris trop de temps. Vérifiez votre connexion ou réessayez.';
        }
        
        showError(errorMessage);
    } finally {
        isLoading = false;
    }
}

// Afficher les jeux
function displayGames() {
    const container = document.getElementById('gamesList');
    if (!container) {
        console.error('❌ Container #gamesList introuvable');
        return;
    }
    
    if (displayedGames.length === 0) {
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
    
    const gamesHTML = displayedGames.map(game => createGameCard(game)).join('');
    container.innerHTML = gamesHTML;
}

// Créer une carte de jeu
function createGameCard(game) {
    const platforms = game.platforms ? 
        game.platforms.slice(0, 3).map(p => getPlatformIcon(p.platform.name)).join(' ') : '';
    
    const genres = game.genres ? 
        game.genres.slice(0, 2).map(g => `<span class="genre-tag">${g.name}</span>`).join('') : '';
    
    return `
        <div class="game-card" onclick="viewGame(${game.id})" style="
            background: linear-gradient(135deg, rgba(145, 78, 255, 0.2), rgba(16, 21, 157, 0.2));
            border: 2px solid rgba(37, 244, 238, 0.2);
            border-radius: 20px;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.3s;
            position: relative;
        " onmouseover="this.style.transform='translateY(-5px)'; this.style.borderColor='var(--cyan)'; this.style.boxShadow='0 10px 30px rgba(37, 244, 238, 0.3)'" 
           onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='rgba(37, 244, 238, 0.2)'; this.style.boxShadow='none'">
            
            <div style="position: relative; overflow: hidden; height: 200px;">
                <img src="${game.background_image || 'https://via.placeholder.com/400x200/10159d/fff?text=No+Image'}" 
                     alt="${game.name}" 
                     style="width: 100%; height: 100%; object-fit: cover;"
                     onerror="this.src='https://via.placeholder.com/400x200/10159d/fff?text=No+Image'">
                
                ${game.rating ? `
                    <div style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.8); padding: 8px 15px; border-radius: 10px; backdrop-filter: blur(10px);">
                        <span style="color: var(--yellow); font-weight: 700; font-size: 16px;">
                            ⭐ ${game.rating}
                        </span>
                    </div>
                ` : ''}
            </div>
            
            <div style="padding: 20px;">
                <h3 style="font-size: 18px; font-weight: 700; color: white; margin-bottom: 10px; line-height: 1.3;">
                    ${game.name.length > 40 ? game.name.substring(0, 40) + '...' : game.name}
                </h3>
                
                <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
                    ${genres}
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <div style="color: var(--cyan); font-size: 14px;">
                        ${platforms || '🎮'}
                    </div>
                    
                    ${game.released ? `
                        <div style="color: rgba(255,255,255,0.7); font-size: 13px;">
                            📅 ${formatDate(game.released)}
                        </div>
                    ` : ''}
                </div>
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
    filters.sort = document.getElementById('sortFilter')?.value || '-rating';
    filters.year = document.getElementById('yearFilter')?.value || '';
    
    updateResultsTitle();
    currentPage = 1;
    loadGames(false);
}

// Réinitialiser les filtres
function resetFilters() {
    document.getElementById('genreFilter').value = '';
    document.getElementById('platformFilter').value = '';
    document.getElementById('sortFilter').value = '-rating';
    document.getElementById('yearFilter').value = '';
    document.getElementById('searchInput').value = '';
    
    filters = {
        genre: '',
        platform: '',
        sort: '-rating',
        year: '',
        search: ''
    };
    
    updateResultsTitle();
    loadGames(false);
}

// Recherche
function performSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    filters.search = searchInput.value.trim();
    
    console.log('🔍 Recherche:', filters.search);
    currentPage = 1;
    updateResultsTitle();
    loadGames(false);
}

// Charger plus de jeux
function loadMoreGames() {
    if (isLoading) {
        console.log('⚠️ Chargement déjà en cours');
        return;
    }
    currentPage++;
    loadGames(true);
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

// Afficher le chargement
function showLoading() {
    const container = document.getElementById('gamesList');
    if (container) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 80px 20px;">
                <div style="font-size: 64px; margin-bottom: 20px; animation: spin 2s linear infinite;">🎮</div>
                <div style="font-size: 24px; color: var(--cyan); font-weight: 600; margin-bottom: 10px;">
                    Chargement des jeux...
                </div>
                <div style="color: rgba(255,255,255,0.6);">
                    Récupération depuis RAWG API
                </div>
            </div>
            <style>
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            </style>
        `;
    }
}

// Afficher une erreur
function showError(message) {
    const container = document.getElementById('gamesList');
    if (container) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                <div style="font-size: 64px; margin-bottom: 20px;">⚠️</div>
                <h3 style="font-size: 24px; color: var(--yellow); margin-bottom: 15px;">Erreur de chargement</h3>
                <p style="color: rgba(255,255,255,0.8); margin-bottom: 30px; font-size: 16px; max-width: 600px; margin-left: auto; margin-right: auto;">
                    ${message}
                </p>
                <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                    <button onclick="loadGames()" style="
                        padding: 15px 30px;
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
                    <button onclick="resetFilters()" style="
                        padding: 15px 30px;
                        background: rgba(255, 255, 255, 0.1);
                        color: white;
                        border: 2px solid var(--cyan);
                        border-radius: 10px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: transform 0.3s;
                    " onmouseover="this.style.transform='scale(1.05)'" 
                       onmouseout="this.style.transform='scale(1)'">
                        🔄 Réinitialiser
                    </button>
                </div>
            </div>
        `;
    }
}