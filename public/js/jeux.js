// jeux.js - Gestion de la page Jeux Vidéo

let allGames = [];
let displayedGames = [];
let currentPage = 1;
const GAMES_PER_PAGE = 20;
let currentFilters = {
    genre: '',
    platform: '',
    sort: '-rating',
    year: '',
    search: ''
};

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 Page Jeux chargée');
    loadGenres();
    loadGames();
});

// Charger les genres depuis l'API
async function loadGenres() {
    try {
        const response = await fetch('/api/genres');
        const data = await response.json();
        
        const genreSelect = document.getElementById('genreFilter');
        if (data.results && genreSelect) {
            data.results.forEach(genre => {
                const option = document.createElement('option');
                option.value = genre.id;
                option.textContent = genre.name;
                genreSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('❌ Erreur chargement genres:', error);
    }
}

// Charger les jeux
async function loadGames() {
    showLoading();
    
    try {
        let url = '/api/games/popular';
        const params = new URLSearchParams();
        
        params.append('ordering', currentFilters.sort);
        params.append('page_size', '40');
        
        if (currentFilters.genre) {
            params.append('genres', currentFilters.genre);
        }
        
        if (currentFilters.platform) {
            url = `/api/games/platform/${getPlatformSlug(currentFilters.platform)}`;
        }
        
        if (currentFilters.year) {
            const yearStart = `${currentFilters.year}-01-01`;
            const yearEnd = `${currentFilters.year}-12-31`;
            params.append('dates', `${yearStart},${yearEnd}`);
        }
        
        if (currentFilters.search) {
            url = '/api/games/search';
            params.append('query', currentFilters.search);
        }
        
        const fullUrl = `${url}?${params.toString()}`;
        console.log('📥 Chargement:', fullUrl);
        
        const response = await fetch(fullUrl);
        
        if (!response.ok) {
            throw new Error('Erreur lors du chargement des jeux');
        }
        
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            allGames = data.results;
            currentPage = 1;
            displayGames();
            updateResultsCount(data.count || data.results.length);
        } else {
            showNoResults();
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error);
        showError(error.message);
    }
}

// Afficher les jeux
function displayGames() {
    const container = document.getElementById('gamesList');
    const loadMoreBtn = document.getElementById('loadMoreContainer');
    
    if (!container) return;
    
    const startIndex = 0;
    const endIndex = currentPage * GAMES_PER_PAGE;
    displayedGames = allGames.slice(startIndex, endIndex);
    
    container.innerHTML = displayedGames.map(game => createGameCard(game)).join('');
    
    // Afficher/masquer le bouton "Charger plus"
    if (loadMoreBtn) {
        if (endIndex < allGames.length) {
            loadMoreBtn.style.display = 'flex';
        } else {
            loadMoreBtn.style.display = 'none';
        }
    }
}

// Créer une carte de jeu
function createGameCard(game) {
    const platforms = game.platforms 
        ? game.platforms.slice(0, 3).map(p => p.platform.name).join(', ')
        : 'N/A';
    
    const genres = game.genres
        ? game.genres.slice(0, 3).map(g => `<span class="genre-tag">${g.name}</span>`).join('')
        : '';
    
    return `
        <div class="news-card" onclick="viewGame(${game.id})" style="cursor: pointer;">
            <img src="${game.background_image || 'https://via.placeholder.com/400x250/10159d/fff?text=No+Image'}" 
                 alt="${game.name}" 
                 class="news-image"
                 onerror="this.src='https://via.placeholder.com/400x250/10159d/fff?text=No+Image'">
            <div class="news-content">
                <h3 class="news-title">${game.name}</h3>
                
                <div style="display: flex; gap: 8px; margin: 10px 0; flex-wrap: wrap;">
                    ${genres}
                </div>
                
                <p style="color: rgba(255,255,255,0.7); font-size: 13px; margin: 8px 0;">
                    🎮 ${platforms}
                </p>
                
                ${game.released ? `
                    <p style="color: var(--cyan); font-size: 12px; margin: 5px 0;">
                        📅 ${formatDate(game.released)}
                    </p>
                ` : ''}
                
                ${game.rating ? `
                    <div class="news-rating" style="margin-top: auto; padding-top: 10px;">
                        ${getStarRating(game.rating)} <strong>${game.rating}/5</strong>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Charger plus de jeux
function loadMoreGames() {
    currentPage++;
    displayGames();
    
    // Scroll smooth vers les nouveaux jeux
    const container = document.getElementById('gamesList');
    if (container) {
        const lastRow = container.children[displayedGames.length - GAMES_PER_PAGE];
        if (lastRow) {
            lastRow.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}

// Appliquer les filtres
function applyFilters() {
    currentFilters.genre = document.getElementById('genreFilter').value;
    currentFilters.platform = document.getElementById('platformFilter').value;
    currentFilters.sort = document.getElementById('sortFilter').value;
    currentFilters.year = document.getElementById('yearFilter').value;
    
    updateResultsTitle();
    loadGames();
}

// Recherche
function performSearch() {
    const searchInput = document.getElementById('searchInput');
    currentFilters.search = searchInput.value.trim();
    
    updateResultsTitle();
    loadGames();
}

// Mettre à jour le titre des résultats
function updateResultsTitle() {
    const titleElement = document.getElementById('resultsTitle');
    if (!titleElement) return;
    
    let title = 'Tous les Jeux';
    
    if (currentFilters.search) {
        title = `Résultats pour "${currentFilters.search}"`;
    } else if (currentFilters.genre) {
        const genreSelect = document.getElementById('genreFilter');
        const selectedOption = genreSelect.options[genreSelect.selectedIndex];
        title = `Jeux ${selectedOption.text}`;
    } else if (currentFilters.platform) {
        const platformSelect = document.getElementById('platformFilter');
        const selectedOption = platformSelect.options[platformSelect.selectedIndex];
        title = `Jeux ${selectedOption.text}`;
    } else if (currentFilters.year) {
        title = `Jeux de ${currentFilters.year}`;
    }
    
    titleElement.textContent = title;
}

// Mettre à jour le compteur de résultats
function updateResultsCount(count) {
    const countElement = document.getElementById('resultsCount');
    if (countElement) {
        countElement.textContent = `${count.toLocaleString()} jeux trouvés`;
    }
}

// Obtenir le slug de la plateforme
function getPlatformSlug(platformId) {
    const platformMap = {
        '4': 'pc',
        '18': 'playstation',
        '1': 'xbox',
        '7': 'switch',
        '171': 'vr'
    };
    return platformMap[platformId] || 'pc';
}

// Rediriger vers la page détails
function viewGame(id) {
    window.location.href = `game-details.html?id=${id}`;
}

// Générer les étoiles
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

// Formater la date
function formatDate(dateString) {
    if (!dateString) return 'Date inconnue';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// Afficher le chargement
function showLoading() {
    const container = document.getElementById('gamesList');
    if (container) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--cyan); font-size: 18px;">
                <div class="loading">⏳ Chargement des jeux...</div>
            </div>
        `;
    }
}

// Afficher "Aucun résultat"
function showNoResults() {
    const container = document.getElementById('gamesList');
    if (container) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                <p style="font-size: 48px; margin-bottom: 20px;">🎮</p>
                <p style="font-size: 24px; color: var(--yellow); margin-bottom: 15px;">
                    Aucun jeu trouvé
                </p>
                <p style="font-size: 16px; color: rgba(255,255,255,0.7); margin-bottom: 30px;">
                    Essayez de modifier vos critères de recherche
                </p>
                <button onclick="resetFilters()" 
                        style="padding: 15px 35px; background: linear-gradient(135deg, var(--purple), var(--blue)); 
                               color: white; border: 2px solid var(--cyan); border-radius: 25px; 
                               cursor: pointer; font-weight: 600; font-size: 16px; transition: all 0.3s;">
                    Réinitialiser les filtres
                </button>
            </div>
        `;
    }
    
    const loadMoreBtn = document.getElementById('loadMoreContainer');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = 'none';
    }
}

// Afficher une erreur
function showError(message) {
    const container = document.getElementById('gamesList');
    if (container) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                <p style="font-size: 48px; margin-bottom: 20px;">⚠️</p>
                <p style="font-size: 24px; color: var(--yellow); margin-bottom: 15px;">
                    Erreur de chargement
                </p>
                <p style="font-size: 16px; color: rgba(255,255,255,0.7); margin-bottom: 30px;">
                    ${message}
                </p>
                <button onclick="loadGames()" 
                        style="padding: 15px 35px; background: linear-gradient(135deg, var(--purple), var(--blue)); 
                               color: white; border: 2px solid var(--cyan); border-radius: 25px; 
                               cursor: pointer; font-weight: 600; font-size: 16px; transition: all 0.3s;">
                    Réessayer
                </button>
            </div>
        `;
    }
}

// Réinitialiser les filtres
function resetFilters() {
    document.getElementById('genreFilter').value = '';
    document.getElementById('platformFilter').value = '';
    document.getElementById('sortFilter').value = '-rating';
    document.getElementById('yearFilter').value = '';
    document.getElementById('searchInput').value = '';
    
    currentFilters = {
        genre: '',
        platform: '',
        sort: '-rating',
        year: '',
        search: ''
    };
    
    updateResultsTitle();
    loadGames();
}

// Gestion de la recherche avec Enter
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
});