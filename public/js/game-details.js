// game-details.js - VERSION AVEC PERSISTANCE DES COMMENTAIRES

// Initialize global allGames and allNews if not already defined
if (typeof allGames === 'undefined') {
    window.allGames = {
        trending: [],
        upcoming: [],
        recent: []
    };
}

if (typeof allNews === 'undefined') {
    window.allNews = [];
}

let currentGame = null;
let allMedia = [];
let currentMediaIndex = 0;
let isFollowing = false;
let isFavorite = false;

// ==================== SYSTÈME DE STOCKAGE ====================

// Structure de stockage pour les commentaires
const STORAGE_KEYS = {
    COMMENTS: 'game_comments_', // Préfixe suivi de l'ID du jeu
    USER_REVIEW: 'user_review_', // Préfixe suivi de l'ID du jeu
    VOTES: 'comment_votes_' // Préfixe suivi de l'ID du jeu
};

// Sauvegarder les commentaires d'un jeu
function saveGameComments(gameId, comments) {
    try {
        localStorage.setItem(STORAGE_KEYS.COMMENTS + gameId, JSON.stringify(comments));
        console.log(`💾 ${comments.length} commentaires sauvegardés pour le jeu ${gameId}`);
    } catch (error) {
        console.error('❌ Erreur sauvegarde commentaires:', error);
    }
}

// Charger les commentaires d'un jeu
function loadGameComments(gameId) {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.COMMENTS + gameId);
        if (saved) {
            const comments = JSON.parse(saved);
            console.log(`✅ ${comments.length} commentaires chargés pour le jeu ${gameId}`);
            return comments;
        }
        return [];
    } catch (error) {
        console.error('❌ Erreur chargement commentaires:', error);
        return [];
    }
}

// Sauvegarder l'avis de l'utilisateur
function saveUserReview(gameId, review) {
    try {
        localStorage.setItem(STORAGE_KEYS.USER_REVIEW + gameId, JSON.stringify(review));
        console.log(`💾 Avis utilisateur sauvegardé pour le jeu ${gameId}`);
    } catch (error) {
        console.error('❌ Erreur sauvegarde avis:', error);
    }
}

// Charger l'avis de l'utilisateur
function loadUserReview(gameId) {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.USER_REVIEW + gameId);
        if (saved) {
            console.log(`✅ Avis utilisateur chargé pour le jeu ${gameId}`);
            return JSON.parse(saved);
        }
        return null;
    } catch (error) {
        console.error('❌ Erreur chargement avis:', error);
        return null;
    }
}

// Sauvegarder les votes de l'utilisateur
function saveUserVotes(gameId, votes) {
    try {
        localStorage.setItem(STORAGE_KEYS.VOTES + gameId, JSON.stringify(votes));
    } catch (error) {
        console.error('❌ Erreur sauvegarde votes:', error);
    }
}

// Charger les votes de l'utilisateur
function loadUserVotes(gameId) {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.VOTES + gameId);
        if (saved) {
            return JSON.parse(saved);
        }
        return {};
    } catch (error) {
        console.error('❌ Erreur chargement votes:', error);
        return {};
    }
}

// ==================== INITIALISATION ====================

let currentUserReview = null;
let gameComments = [];
let userVotes = {};

// Au chargement de la page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎮 Page de détails chargée');
    
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('id');
    
    if (!gameId) {
        console.error('❌ Aucun ID de jeu trouvé dans l\'URL');
        showError('Aucun jeu selectionne');
        return;
    }
    
    console.log('🎯 Chargement du jeu:', gameId);
    await loadNewsForSearch();
    loadGameDetails(gameId);
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

// Configuration des ecouteurs d'evenements
function setupEventListeners() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (prevBtn) prevBtn.addEventListener('click', () => navigateMedia(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => navigateMedia(1));
    
    const followBtn = document.getElementById('followBtn');
    const favoriteBtn = document.getElementById('favoriteBtn');
    const shareBtn = document.getElementById('shareBtn');
    
    if (followBtn) followBtn.addEventListener('click', toggleFollow);
    if (favoriteBtn) favoriteBtn.addEventListener('click', toggleFavorite);
    if (shareBtn) shareBtn.addEventListener('click', shareGame);
    
    // Gestion de la recherche
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
    
    document.addEventListener('keydown', (e) => {
        const modal = document.getElementById('mediaModal');
        if (modal && modal.classList.contains('active')) {
            if (e.key === 'Escape') closeModal();
            if (e.key === 'ArrowLeft') prevMedia();
            if (e.key === 'ArrowRight') nextMedia();
        }
    });
}

// Fonction de recherche
async function performSearch() {
    const query = document.getElementById('searchInput')?.value;
    if (!query || !query.trim()) {
        return;
    }
    
    console.log('🔍 Recherche globale:', query);
    
    // Show loading state
    if (window.showSearchResults) {
        window.showSearchResults([], [], query, true);
    }
    
    // Collect all games from all sources
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
    
    // Filter games locally
    const filteredGames = searchGames.filter(game => 
        game.name.toLowerCase().includes(query.toLowerCase()) ||
        (game.genres && game.genres.some(g => g.name.toLowerCase().includes(query.toLowerCase())))
    );
    
    // Filter news
    const filteredNews = (window.allNews || []).filter(news => 
        news.title.toLowerCase().includes(query.toLowerCase()) ||
        (news.description && news.description.toLowerCase().includes(query.toLowerCase()))
    );
    
    console.log('📊 Local search - Games:', filteredGames.length, 'News:', filteredNews.length);
    
    // If no local games found, try API search
    if (filteredGames.length === 0) {
        try {
            console.log('🌐 Initiating API search for games...');
            const resp = await fetch(`/api/games/search?query=${encodeURIComponent(query)}`);
            if (resp.ok) {
                const data = await resp.json();
                const apiGames = data && data.results ? data.results : (Array.isArray(data) ? data : []);
                console.log('🌐 API search found', apiGames.length, 'games');
                
                // Show results with API games and filtered news
                if (window.showSearchResults) {
                    window.showSearchResults(apiGames, filteredNews, query);
                }
                return;
            }
        } catch (err) {
            console.error('❌ API search error:', err);
        }
    }
    
    // Show search results popup (games priority)
    if (window.showSearchResults) {
        window.showSearchResults(filteredGames, filteredNews, query);
    }
}

// Charger les details du jeu
async function loadGameDetails(gameId) {
    showLoading();
    
    try {
        const response = await fetch(`/api/games/${gameId}`);
        
        if (!response.ok) {
            throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }
        
        const game = await response.json();
        console.log('✅ Jeu chargé:', game.name);
        
        currentGame = game;
        await loadGameScreenshots(gameId);
        displayGameDetails(game);
        
        // Charger les données sauvegardées
        currentUserReview = loadUserReview(gameId);
        gameComments = loadGameComments(gameId);
        userVotes = loadUserVotes(gameId);
        
        // Si aucun commentaire n'existe, générer des commentaires fictifs
        if (gameComments.length === 0) {
            gameComments = generateMockComments();
            saveGameComments(gameId, gameComments);
        }
        
        // Initialiser la section commentaires
        initCommentsSection();
        
        hideLoading();
    } catch (error) {
        console.error('❌ Erreur chargement:', error);
        showError(`Impossible de charger le jeu: ${error.message}`);
    }
}

// Charger les captures d'ecran
async function loadGameScreenshots(gameId) {
    try {
        const response = await fetch(`https://api.rawg.io/api/games/${gameId}/screenshots?key=2e68fa4d897b420682efc40faa9fbb6d`);
        
        if (response.ok) {
            const data = await response.json();
            allMedia = [];
            
            if (currentGame.background_image) {
                allMedia.push({
                    type: 'image',
                    url: currentGame.background_image,
                    isMain: true
                });
            }
            
            if (data.results && data.results.length > 0) {
                data.results.forEach(screenshot => {
                    allMedia.push({
                        type: 'image',
                        url: screenshot.image,
                        isMain: false
                    });
                });
            }
            
            if (currentGame.background_image_additional) {
                allMedia.push({
                    type: 'image',
                    url: currentGame.background_image_additional,
                    isMain: false
                });
            }
            
            console.log('📸 Médias chargés:', allMedia.length);
            displayGallery();
        }
    } catch (error) {
        console.error('⚠️ Erreur chargement captures:', error);
        allMedia = [{
            type: 'image',
            url: currentGame.background_image || '/img/placeholder.svg',
            isMain: true
        }];
        displayGallery();
    }
}

// Afficher les details du jeu
function displayGameDetails(game) {
    document.title = `${game.name} - GNews`;
    document.getElementById('pageTitle').textContent = `${game.name} - GNews`;
    document.getElementById('breadcrumbGame').textContent = game.name;
    document.getElementById('gameTitle').textContent = game.name;
    
    const platforms = game.platforms ? 
        game.platforms.slice(0, 3).map(p => p.platform.name).join(', ') : 
        'Plateformes non specifiees';
    document.getElementById('gameSubtitle').textContent = `Disponible sur ${platforms}`;
    
    const headerImage = document.getElementById('headerImage');
    if (headerImage) {
        headerImage.src = game.background_image || '/img/placeholder.svg';
        headerImage.onerror = () => {
            headerImage.src = '/img/placeholder.svg';
        };
    }
    
    if (game.rating) {
        document.getElementById('ratingStars').textContent = getStarRating(game.rating);
        document.getElementById('ratingText').textContent = `${game.rating}/5`;
    } else {
        document.getElementById('ratingStars').textContent = '☆☆☆☆☆';
        document.getElementById('ratingText').textContent = 'Non note';
    }
    
    document.getElementById('ratingsCount').textContent = 
        game.ratings_count ? `${game.ratings_count.toLocaleString()} avis` : 'Aucun avis';
    
    document.getElementById('releaseDate').textContent = 
        game.released ? formatDate(game.released) : 'Date non annoncee';
    
    const developer = game.developers && game.developers.length > 0 
        ? game.developers[0].name 
        : 'Non specifie';
    document.getElementById('developer').textContent = developer;
    
    const publisher = game.publishers && game.publishers.length > 0 
        ? game.publishers[0].name 
        : 'Non specifie';
    document.getElementById('publisher').textContent = publisher;
    
    if (game.tags && game.tags.length > 0) {
        const tagsContainer = document.getElementById('gameTags');
        tagsContainer.innerHTML = game.tags.slice(0, 8).map(tag => 
            `<span class="tag">${tag.name}</span>`
        ).join('');
    }
    
    if (game.genres && game.genres.length > 0) {
        const genresContainer = document.getElementById('gameGenres');
        genresContainer.innerHTML = game.genres.map(genre => 
            `<span class="tag">${genre.name}</span>`
        ).join('');
    }
    
    const description = document.getElementById('gameDescription');
    if (game.description_raw && game.description_raw.trim() !== '') {
        const paragraphs = game.description_raw.split('\n\n');
        description.innerHTML = paragraphs
            .filter(p => p.trim() !== '')
            .map(p => `<p class="description-paragraph">${p.trim()}</p>`)
            .join('');
    } else {
        description.innerHTML = '<p class="description-paragraph">Aucune description disponible pour ce jeu.</p>';
    }
    
    displayGameStats(game);
    displayPlatforms(game);
    displayStoreLinks(game);
}

// Afficher la galerie d'images
function displayGallery() {
    if (allMedia.length === 0) return;
    
    const mainImage = document.getElementById('mainImage');
    if (mainImage) {
        mainImage.src = allMedia[currentMediaIndex].url;
        mainImage.alt = currentGame.name;
        mainImage.onclick = () => openModal(currentMediaIndex);
    }
    
    const thumbnailsContainer = document.getElementById('thumbnails');
    if (thumbnailsContainer && allMedia.length > 1) {
        thumbnailsContainer.innerHTML = allMedia.map((media, index) => `
            <div class="thumbnail ${index === currentMediaIndex ? 'active' : ''}" 
                 onclick="selectMedia(${index})">
                <img src="${media.url}" alt="Image ${index + 1}">
            </div>
        `).join('');
    }
}

// Afficher les statistiques du jeu
function displayGameStats(game) {
    const statsContainer = document.getElementById('gameStats');
    if (!statsContainer) return;
    
    const stats = [];
    
    if (game.metacritic) {
        stats.push({
            label: 'Score Metacritic',
            value: `${game.metacritic}/100`,
            icon: '🏆'
        });
    }
    
    if (game.playtime && game.playtime > 0) {
        stats.push({
            label: 'Duree moyenne',
            value: `${game.playtime}h`,
            icon: '⏱️'
        });
    }
    
    if (game.esrb_rating) {
        stats.push({
            label: 'Classification ESRB',
            value: game.esrb_rating.name,
            icon: '🔞'
        });
    }
    
    if (game.added) {
        stats.push({
            label: 'Ajoute par',
            value: `${game.added.toLocaleString()} joueurs`,
            icon: '👥'
        });
    }
    
    if (stats.length > 0) {
        statsContainer.innerHTML = `
            <h3 style="color: var(--cyan); font-size: 20px; margin-bottom: 15px;">Statistiques</h3>
            <div class="game-stats-grid">
                ${stats.map(stat => `
                    <div class="stat-item">
                        <div style="font-size: 24px; margin-bottom: 5px;">${stat.icon}</div>
                        <div style="color: rgba(255,255,255,0.6); font-size: 12px; margin-bottom: 5px;">${stat.label}</div>
                        <div style="color: var(--cyan); font-weight: 600; font-size: 16px;">${stat.value}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

// Afficher les plateformes
function displayPlatforms(game) {
    const platformsList = document.getElementById('platformsList');
    if (!platformsList) return;
    
    if (!game.platforms || game.platforms.length === 0) {
        platformsList.innerHTML = '<div style="color: rgba(255,255,255,0.6); text-align: center; padding: 10px;">Plateformes non spécifiées</div>';
        return;
    }
    
    platformsList.innerHTML = game.platforms.map(p => {
        const name = p.platform.name;
        let icon = '🎮';
        
        if (name.toLowerCase().includes('playstation')) icon = '🎮';
        else if (name.toLowerCase().includes('xbox')) icon = '🎮';
        else if (name.toLowerCase().includes('nintendo')) icon = '🎮';
        else if (name.toLowerCase().includes('pc')) icon = '💻';
        else if (name.toLowerCase().includes('ios') || name.toLowerCase().includes('iphone')) icon = '🍎';
        else if (name.toLowerCase().includes('android')) icon = '📱';
        else if (name.toLowerCase().includes('vr') || name.toLowerCase().includes('quest') || name.toLowerCase().includes('oculus')) icon = '🥽';
        
        return `<div class="platform-badge">${icon} ${name}</div>`;
    }).join('');
}

// Afficher les liens vers les stores
function displayStoreLinks(game) {
    const storeLinksCard = document.querySelector('.store-links-card');
    if (!storeLinksCard) return;
    
    console.log('========== GÉNÉRATION DES STORES ==========');
    console.log('🎮 Jeu:', game.name);
    
    const storeConfig = {
        'steam': {
            name: 'Steam',
            logo: `<svg fill="#fff" width="24" height="24" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg"><path d="m24.72 7.094c0 2.105-1.707 3.812-3.812 3.812-1.053 0-2.006-.427-2.696-1.117-.74-.697-1.201-1.684-1.201-2.778 0-2.105 1.707-3.812 3.812-3.812 1.094 0 2.08.461 2.776 1.199l.002.002c.691.669 1.12 1.605 1.12 2.641v.055-.003zm-12.033 11.593c0-.004 0-.008 0-.012 0-2.151-1.744-3.894-3.894-3.894-.004 0-.008 0-.013 0h.001c-.299 0-.59.034-.87.099l.026-.005 1.625.656c.778.303 1.387.897 1.704 1.644l.007.02c.164.356.26.772.26 1.21 0 .418-.087.816-.244 1.176l.007-.019c-.304.778-.901 1.386-1.652 1.696l-.02.007c-.355.161-.77.254-1.206.254-.422 0-.824-.088-1.188-.246l.019.007q-.328-.125-.969-.383l-.953-.383c.337.627.82 1.138 1.405 1.498l.017.01c.568.358 1.258.571 1.999.571h.034-.002.012c2.151 0 3.894-1.744 3.894-3.894 0-.004 0-.008 0-.013v.001zm12.969-11.577c-.005-2.63-2.136-4.761-4.765-4.766-2.631.002-4.763 2.135-4.763 4.766s2.134 4.766 4.766 4.766c1.313 0 2.503-.531 3.364-1.391.863-.834 1.399-2.003 1.399-3.296 0-.028 0-.056-.001-.083zm2.344 0v.001c0 3.926-3.183 7.109-7.109 7.109h-.001l-6.828 4.981c-.116 1.361-.749 2.556-1.698 3.402l-.005.004c-.914.863-2.151 1.394-3.512 1.394-.023 0-.046 0-.069 0h.004c-2.534-.002-4.652-1.777-5.181-4.152l-.007-.035-3.594-1.438v-6.703l6.08 2.453c.758-.471 1.679-.75 2.664-.75h.041-.002q.203 0 .547.031l4.438-6.359c.05-3.898 3.218-7.04 7.122-7.047h.001c3.924.006 7.104 3.185 7.11 7.109v.001z"/></svg>`,
            background: 'linear-gradient(135deg, #1b2838, #2a475e)',
            searchUrl: `https://store.steampowered.com/search/?term=${encodeURIComponent(game.name)}`,
            keywords: ['steam']
        },
        'epic-games': {
            name: 'Epic Games Store',
            logo: '🎮',
            background: 'linear-gradient(135deg, #2a2a2a, #000000)',
            searchUrl: `https://store.epicgames.com/fr/browse?q=${encodeURIComponent(game.name)}`,
            keywords: ['epic', 'epic-games']
        },
        'gog': {
            name: 'GOG.com',
            logo: '🎮',
            background: 'linear-gradient(135deg, #86328a, #b643bd)',
            searchUrl: `https://www.gog.com/games?query=${encodeURIComponent(game.name)}`,
            keywords: ['gog']
        },
        'playstation-store': {
            name: 'PlayStation Store',
            logo: '🎮',
            background: 'linear-gradient(135deg, #003791, #0070d1)',
            searchUrl: `https://store.playstation.com/fr-fr/search/${encodeURIComponent(game.name)}`,
            keywords: ['playstation', 'ps']
        },
        'xbox-store': {
            name: 'Xbox Store',
            logo: '🎮',
            background: 'linear-gradient(135deg, #107c10, #0e7a0e)',
            searchUrl: `https://www.xbox.com/fr-FR/search?q=${encodeURIComponent(game.name)}`,
            keywords: ['xbox']
        },
        'nintendo': {
            name: 'Nintendo eShop',
            logo: '🎮',
            background: 'linear-gradient(135deg, #e60012, #ff5757)',
            searchUrl: `https://www.nintendo.com/search/#q=${encodeURIComponent(game.name)}`,
            keywords: ['nintendo']
        },
        'google-play': {
            name: 'Google Play',
            logo: '📱',
            background: 'linear-gradient(135deg, #01875f, #02a66f)',
            searchUrl: `https://play.google.com/store/search?q=${encodeURIComponent(game.name)}&c=apps`,
            keywords: ['android', 'google']
        },
        'app-store': {
            name: 'App Store',
            logo: '🍎',
            background: 'linear-gradient(135deg, #147efb, #53a0fd)',
            searchUrl: `https://apps.apple.com/fr/search?term=${encodeURIComponent(game.name)}`,
            keywords: ['apple', 'ios', 'app']
        },
        'meta-quest': {
            name: 'Meta Quest Store',
            logo: '🥽',
            background: 'linear-gradient(135deg, #0081fb, #0467df)',
            searchUrl: `https://www.meta.com/experiences/search/?q=${encodeURIComponent(game.name)}`,
            keywords: ['meta', 'quest', 'oculus', 'vr']
        },
        'itch': {
            name: 'itch.io',
            logo: '🎮',
            background: 'linear-gradient(135deg, #fa5c5c, #ff0b34)',
            searchUrl: `https://itch.io/search?q=${encodeURIComponent(game.name)}`,
            keywords: ['itch']
        }
    };
    
    const addedStores = new Set();
    let storeLinksHTML = '<div class="store-links-title">🛒 Où acheter</div>';
    
    if (game.website) {
        storeLinksHTML += createStoreLink('Site officiel', '🌐', 'linear-gradient(135deg, var(--purple), var(--blue))', game.website);
        console.log('✅ Site officiel ajouté');
    }
    
    if (game.stores && game.stores.length > 0) {
        console.log('🛒 Stores API RAWG:', game.stores.map(s => s.store.slug));
        
        game.stores.forEach(storeData => {
            const storeSlug = storeData.store.slug.toLowerCase();
            const storeName = storeData.store.name.toLowerCase();
            
            for (const [key, config] of Object.entries(storeConfig)) {
                const match = config.keywords.some(keyword => 
                    storeSlug.includes(keyword) || storeName.includes(keyword)
                );
                
                if (match && !addedStores.has(config.name)) {
                    addedStores.add(config.name);
                    const url = storeData.url || config.searchUrl;
                    storeLinksHTML += createStoreLink(config.name, config.logo, config.background, url);
                    console.log('✅ Store ajouté (API):', config.name);
                    break;
                }
            }
        });
    }
    
    if (game.platforms && game.platforms.length > 0) {
        console.log('💻 Plateformes:', game.platforms.map(p => p.platform.name));
        
        const platformStoreMap = {
            'playstation': 'playstation-store',
            'ps4': 'playstation-store',
            'ps5': 'playstation-store',
            'xbox': 'xbox-store',
            'series s': 'xbox-store',
            'series x': 'xbox-store',
            'nintendo': 'nintendo',
            'switch': 'nintendo',
            'ios': 'app-store',
            'iphone': 'app-store',
            'android': 'google-play',
            'oculus': 'meta-quest',
            'quest': 'meta-quest',
            'meta': 'meta-quest'
        };
        
        game.platforms.forEach(p => {
            const platformName = p.platform.name.toLowerCase();
            
            for (const [keyword, storeKey] of Object.entries(platformStoreMap)) {
                if (platformName.includes(keyword)) {
                    const config = storeConfig[storeKey];
                    if (config && !addedStores.has(config.name)) {
                        addedStores.add(config.name);
                        storeLinksHTML += createStoreLink(config.name, config.logo, config.background, config.searchUrl);
                        console.log('✅ Store ajouté (plateforme):', config.name);
                    }
                }
            }
        });
    }
    
    const isVRGame = checkIfVRGame(game);
    if (isVRGame && !addedStores.has('Meta Quest Store')) {
        const config = storeConfig['meta-quest'];
        addedStores.add(config.name);
        storeLinksHTML += createStoreLink(config.name, config.logo, config.background, config.searchUrl);
        console.log('✅ Meta Quest ajouté (jeu VR)');
    }
    
    if (addedStores.size === 0 && !game.website) {
        storeLinksHTML += `
            <p style="text-align: center; color: rgba(255,255,255,0.6); margin-top: 15px; font-size: 14px;">
                Aucun lien d'achat disponible pour ce jeu.<br>
                Recherchez-le sur votre plateforme préférée.
            </p>
        `;
    }
    
    console.log('🎯 Total stores:', addedStores.size);
    console.log('==========================================');
    
    storeLinksCard.innerHTML = storeLinksHTML;
    
    const storeLinks = storeLinksCard.querySelectorAll('.store-link[data-url]');
    storeLinks.forEach(link => {
        link.style.cursor = 'pointer';
        link.addEventListener('click', () => {
            const url = link.getAttribute('data-url');
            if (url) window.open(url, '_blank');
        });
    });
}

function createStoreLink(name, logo, background, url) {
    return `
        <div class="store-link" data-url="${url}">
            <div class="store-info">
                <div class="store-logo" style="background: ${background};">${logo}</div>
                <div class="store-name">${name}</div>
            </div>
            <div class="store-action">→</div>
        </div>
    `;
}

function checkIfVRGame(game) {
    const gameName = game.name.toLowerCase();
    
    if (gameName.includes('vr') || gameName.includes('beat saber') || gameName.includes('vrchat')) {
        return true;
    }
    
    if (game.platforms) {
        const hasVRPlatform = game.platforms.some(p => {
            const pName = p.platform.name.toLowerCase();
            return pName.includes('vr') || pName.includes('quest') || pName.includes('oculus');
        });
        if (hasVRPlatform) return true;
    }
    
    if (game.tags) {
        const hasVRTag = game.tags.some(t => {
            const tName = t.name.toLowerCase();
            return tName.includes('vr') || tName.includes('virtual reality');
        });
        if (hasVRTag) return true;
    }
    
    return false;
}

// Navigation dans les medias
function navigateMedia(direction) {
    currentMediaIndex += direction;
    
    if (currentMediaIndex < 0) {
        currentMediaIndex = allMedia.length - 1;
    } else if (currentMediaIndex >= allMedia.length) {
        currentMediaIndex = 0;
    }
    
    displayGallery();
}

function selectMedia(index) {
    currentMediaIndex = index;
    displayGallery();
}

function openModal(index) {
    currentMediaIndex = index;
    const modal = document.getElementById('mediaModal');
    const modalImage = document.getElementById('modalImage');
    
    if (modal && modalImage) {
        modalImage.src = allMedia[currentMediaIndex].url;
        modal.classList.add('active');
    }
}

function closeModal() {
    const modal = document.getElementById('mediaModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function prevMedia() {
    navigateMedia(-1);
    document.getElementById('modalImage').src = allMedia[currentMediaIndex].url;
}

function nextMedia() {
    navigateMedia(1);
    document.getElementById('modalImage').src = allMedia[currentMediaIndex].url;
}

function toggleFollow() {
    isFollowing = !isFollowing;
    const followBtn = document.getElementById('followBtn');
    const followText = document.getElementById('followText');
    
    if (isFollowing) {
        followBtn.style.background = 'linear-gradient(135deg, var(--cyan), var(--yellow))';
        followBtn.style.color = 'var(--dark-blue)';
        followText.textContent = 'Suivi';
        showNotification('Jeu ajoute a vos suivis !');
    } else {
        followBtn.style.background = 'linear-gradient(135deg, var(--purple), var(--blue))';
        followBtn.style.color = 'white';
        followText.textContent = 'Suivre';
        showNotification('Jeu retire de vos suivis');
    }
}

function toggleFavorite() {
    isFavorite = !isFavorite;
    const favoriteBtn = document.getElementById('favoriteBtn');
    
    if (isFavorite) {
        favoriteBtn.style.background = 'var(--purple)';
        favoriteBtn.querySelector('svg').setAttribute('fill', 'currentColor');
        showNotification('Ajoute aux favoris !');
    } else {
        favoriteBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        favoriteBtn.querySelector('svg').setAttribute('fill', 'none');
        showNotification('Retire des favoris');
    }
}

function shareGame() {
    if (navigator.share && currentGame) {
        navigator.share({
            title: currentGame.name,
            text: `Decouvrez ${currentGame.name} sur GNews !`,
            url: window.location.href
        }).then(() => {
            showNotification('Partage avec succes !');
        }).catch(err => {
            console.log('Partage annule ou erreur:', err);
            copyToClipboard();
        });
    } else {
        copyToClipboard();
    }
}

function copyToClipboard() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        showNotification('Lien copie dans le presse-papier !');
    }).catch(() => {
        showNotification('Impossible de copier le lien');
    });
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.textContent = message;
    
    let gradient = 'linear-gradient(135deg, var(--purple), var(--blue))';
    let borderColor = 'var(--cyan)';
    
    if (type === 'warning') {
        gradient = 'linear-gradient(135deg, #ff9800, #ff5722)';
        borderColor = '#ff9800';
    } else if (type === 'info') {
        gradient = 'linear-gradient(135deg, #2196f3, #00bcd4)';
        borderColor = '#00bcd4';
    }
    
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${gradient};
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        border: 2px solid ${borderColor};
        max-width: 400px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function getStarRating(rating) {
    if (!rating) return '☆☆☆☆☆';
    
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

function showLoading() {
    document.getElementById('loadingScreen').style.display = 'flex';
    document.getElementById('mainContent').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
}

function showError(message) {
    hideLoading();
    const mainContent = document.getElementById('mainContent');
    mainContent.style.display = 'block';
    mainContent.innerHTML = `
        <div class="container" style="text-align: center; padding: 60px 20px;">
            <div style="font-size: 64px; margin-bottom: 20px;">⚠️</div>
            <h2 style="color: var(--yellow); margin-bottom: 20px; font-size: 32px;">${message}</h2>
            <p style="color: rgba(255,255,255,0.7); margin-bottom: 30px;">
                Le jeu demande n'a pas pu etre charge.
            </p>
            <button onclick="window.location.href='index.html'" 
                    style="padding: 15px 30px; background: linear-gradient(135deg, var(--purple), var(--blue)); 
                           color: white; border: 2px solid var(--cyan); border-radius: 15px; 
                           cursor: pointer; font-size: 16px; font-weight: 600;">
                Retour a l'accueil
            </button>
        </div>
    `;
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ==================== SYSTÈME DE COMMENTAIRES AVEC PERSISTANCE ====================

let reviewData = {
    rating: 0,
    ownGame: false,
    recommend: false,
    comment: ''
};

// Initialiser la section commentaires
function initCommentsSection() {
    setupCommentListeners();
    
    // Afficher l'avis de l'utilisateur s'il existe
    if (currentUserReview) {
        displayUserReview();
    }
    
    // Afficher tous les commentaires
    displayComments(gameComments);
}

// Configurer les écouteurs d'événements
function setupCommentListeners() {
    // Étoiles de notation
    const stars = document.querySelectorAll('.rating-star');
    stars.forEach((star, index) => {
        star.addEventListener('click', () => selectRating(index + 1));
        star.addEventListener('mouseenter', () => hoverRating(index + 1));
    });
    
    const ratingContainer = document.querySelector('.rating-stars-input');
    if (ratingContainer) {
        ratingContainer.addEventListener('mouseleave', resetHoverRating);
    }
    
    // Checkbox possession et recommandation
    const ownGameCheckbox = document.getElementById('ownGame');
    const recommendCheckbox = document.getElementById('recommend');
    
    if (ownGameCheckbox) {
        ownGameCheckbox.addEventListener('change', updateReviewData);
    }
    
    if (recommendCheckbox) {
        recommendCheckbox.addEventListener('change', updateReviewData);
    }
    
    // Compteur de caractères
    const commentTextarea = document.getElementById('reviewComment');
    const charCount = document.getElementById('charCount');
    if (commentTextarea && charCount) {
        commentTextarea.addEventListener('input', () => {
            charCount.textContent = commentTextarea.value.length;
        });
    }
    
    // Bouton de soumission
    const submitBtn = document.getElementById('submitReview');
    if (submitBtn) {
        submitBtn.addEventListener('click', submitReview);
    }
    
    // Tri des commentaires
    const sortSelect = document.getElementById('sortComments');
    if (sortSelect) {
        sortSelect.addEventListener('change', sortComments);
    }
}

// Sélectionner une note
function selectRating(rating) {
    reviewData.rating = rating;
    updateStarsDisplay(rating);
    
    const ratingValue = document.getElementById('ratingValue');
    if (ratingValue) {
        ratingValue.textContent = rating;
    }
}

// Survol des étoiles
function hoverRating(rating) {
    const stars = document.querySelectorAll('.rating-star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.textContent = '⭐';
        } else {
            star.textContent = '☆';
        }
    });
}

// Réinitialiser le survol
function resetHoverRating() {
    updateStarsDisplay(reviewData.rating);
}

// Mettre à jour l'affichage des étoiles
function updateStarsDisplay(rating) {
    const stars = document.querySelectorAll('.rating-star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.textContent = '⭐';
        } else {
            star.textContent = '☆';
        }
    });
}

// Mettre à jour les données de l'avis
function updateReviewData() {
    const ownGameCheckbox = document.getElementById('ownGame');
    const recommendCheckbox = document.getElementById('recommend');
    
    reviewData.ownGame = ownGameCheckbox ? ownGameCheckbox.checked : false;
    reviewData.recommend = recommendCheckbox ? recommendCheckbox.checked : false;
}

// Soumettre un avis
function submitReview() {
    const commentTextarea = document.getElementById('reviewComment');
    const comment = commentTextarea ? commentTextarea.value.trim() : '';
    
    if (reviewData.rating === 0) {
        showNotification('⚠️ Veuillez sélectionner une note', 'warning');
        return;
    }
    
    if (comment.length < 10) {
        showNotification('⚠️ Votre commentaire doit contenir au moins 10 caractères', 'warning');
        return;
    }
    
    reviewData.comment = comment;
    
    // Créer l'avis avec un ID unique
    const review = {
        id: 'user_' + Date.now(),
        userName: 'Vous',
        userAvatar: '👤',
        rating: reviewData.rating,
        ownGame: reviewData.ownGame,
        recommend: reviewData.recommend,
        comment: reviewData.comment,
        date: new Date().toISOString(),
        likes: 0,
        dislikes: 0,
        userVote: null,
        isCurrentUser: true
    };
    
    // Sauvegarder l'avis
    currentUserReview = review;
    saveUserReview(currentGame.id, review);
    
    // Réinitialiser le formulaire
    resetReviewForm();
    
    // Afficher l'avis
    displayUserReview();
    
    showNotification('✅ Votre avis a été publié avec succès !');
    
    console.log('💾 Avis sauvegardé:', review);
}

// Réinitialiser le formulaire
function resetReviewForm() {
    reviewData = {
        rating: 0,
        ownGame: false,
        recommend: false,
        comment: ''
    };
    
    updateStarsDisplay(0);
    
    const ratingValue = document.getElementById('ratingValue');
    if (ratingValue) ratingValue.textContent = '0';
    
    const ownGameCheckbox = document.getElementById('ownGame');
    if (ownGameCheckbox) ownGameCheckbox.checked = false;
    
    const recommendCheckbox = document.getElementById('recommend');
    if (recommendCheckbox) recommendCheckbox.checked = false;
    
    const commentTextarea = document.getElementById('reviewComment');
    if (commentTextarea) commentTextarea.value = '';
    
    const charCount = document.getElementById('charCount');
    if (charCount) charCount.textContent = '0';
}

// Afficher l'avis de l'utilisateur
function displayUserReview() {
    const container = document.getElementById('userReviewDisplay');
    if (!container || !currentUserReview) return;
    
    container.innerHTML = `
        <div class="user-review-posted">
            <div class="review-header-posted">
                <h3>✅ Votre avis</h3>
                <button class="btn-edit-review" onclick="editReview()">✏️ Modifier</button>
            </div>
            <div class="comment-card">
                <div class="comment-header">
                    <div class="comment-user">
                        <div class="user-avatar">${currentUserReview.userAvatar}</div>
                        <div class="user-info">
                            <div class="user-name">${currentUserReview.userName}</div>
                            <div class="comment-meta">
                                <span>${getStarDisplay(currentUserReview.rating)}</span>
                                ${currentUserReview.ownGame ? '<span class="badge-own">✓ Possède le jeu</span>' : ''}
                                ${currentUserReview.recommend ? '<span class="badge-recommend">👍 Recommande</span>' : ''}
                            </div>
                        </div>
                    </div>
                    <div class="comment-date">${formatCommentDate(currentUserReview.date)}</div>
                </div>
                <div class="comment-text">${escapeHtml(currentUserReview.comment)}</div>
            </div>
        </div>
    `;
    
    // Masquer le formulaire
    const form = document.querySelector('.review-form-container');
    if (form) form.style.display = 'none';
}

// Modifier l'avis
function editReview() {
    if (!currentUserReview) return;
    
    // Afficher le formulaire
    const form = document.querySelector('.review-form-container');
    if (form) form.style.display = 'block';
    
    // Masquer l'avis affiché
    const display = document.getElementById('userReviewDisplay');
    if (display) display.innerHTML = '';
    
    // Pré-remplir le formulaire
    reviewData = {
        rating: currentUserReview.rating,
        ownGame: currentUserReview.ownGame,
        recommend: currentUserReview.recommend,
        comment: currentUserReview.comment
    };
    
    updateStarsDisplay(currentUserReview.rating);
    
    const ratingValue = document.getElementById('ratingValue');
    if (ratingValue) ratingValue.textContent = currentUserReview.rating;
    
    const ownGameCheckbox = document.getElementById('ownGame');
    if (ownGameCheckbox) ownGameCheckbox.checked = currentUserReview.ownGame;
    
    const recommendCheckbox = document.getElementById('recommend');
    if (recommendCheckbox) recommendCheckbox.checked = currentUserReview.recommend;
    
    const commentTextarea = document.getElementById('reviewComment');
    if (commentTextarea) {
        commentTextarea.value = currentUserReview.comment;
        document.getElementById('charCount').textContent = currentUserReview.comment.length;
    }
    
    // Scroll vers le formulaire
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Générer des commentaires fictifs (uniquement si aucun commentaire n'existe)
function generateMockComments() {
    const names = ['Alexandre', 'Sophie', 'Thomas', 'Marie', 'Lucas', 'Emma', 'Nicolas', 'Léa', 'Maxime', 'Chloé'];
    const avatars = ['😎', '🎮', '🔥', '⚡', '🌟', '💜', '🎯', '🚀', '👾', '🎨'];
    
    const comments = [];
    const numComments = Math.floor(Math.random() * 6) + 3; // 3-8 commentaires
    
    for (let i = 0; i < numComments; i++) {
        const rating = Math.floor(Math.random() * 3) + 3; // 3-5 étoiles
        const ownGame = Math.random() > 0.3;
        const recommend = rating >= 4;
        
        comments.push({
            id: 'mock_' + Date.now() + '_' + i,
            userName: names[Math.floor(Math.random() * names.length)],
            userAvatar: avatars[Math.floor(Math.random() * avatars.length)],
            rating: rating,
            ownGame: ownGame,
            recommend: recommend,
            comment: generateRandomComment(rating),
            date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            likes: Math.floor(Math.random() * 50),
            dislikes: Math.floor(Math.random() * 5),
            userVote: null,
            isCurrentUser: false
        });
    }
    
    return comments.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Générer un commentaire aléatoire
function generateRandomComment(rating) {
    const positiveComments = [
        "Excellent jeu ! Je le recommande vivement à tous les fans du genre.",
        "Une expérience incroyable du début à la fin. Les graphismes sont magnifiques.",
        "Gameplay addictif et histoire captivante. Je ne peux plus m'arrêter d'y jouer !",
        "Un des meilleurs jeux que j'ai joués cette année. Vraiment impressionnant.",
        "Superbe réalisation, je suis totalement immergé dans cet univers.",
    ];
    
    const neutralComments = [
        "Bon jeu dans l'ensemble, quelques petits bugs mais rien de grave.",
        "Intéressant mais pourrait être amélioré sur certains aspects.",
        "Pas mal, correspond à ce que j'attendais sans plus.",
        "Divertissant mais pas révolutionnaire. Ça reste un bon moment.",
    ];
    
    const negativeComments = [
        "Décevant par rapport à mes attentes. Beaucoup de bugs.",
        "Le jeu manque cruellement d'optimisation.",
        "Gameplay répétitif qui devient vite ennuyeux.",
    ];
    
    if (rating >= 4) {
        return positiveComments[Math.floor(Math.random() * positiveComments.length)];
    } else if (rating === 3) {
        return neutralComments[Math.floor(Math.random() * neutralComments.length)];
    } else {
        return negativeComments[Math.floor(Math.random() * negativeComments.length)];
    }
}

// Afficher les commentaires
function displayComments(comments) {
    const container = document.getElementById('commentsList');
    if (!container) return;
    
    if (comments.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">
                <div style="font-size: 48px; margin-bottom: 15px;">💬</div>
                <p>Aucun commentaire pour le moment.</p>
                <p style="font-size: 14px; margin-top: 10px;">Soyez le premier à donner votre avis !</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = comments.map(comment => `
        <div class="comment-card" data-comment-id="${comment.id}">
            <div class="comment-header">
                <div class="comment-user">
                    <div class="user-avatar">${comment.userAvatar}</div>
                    <div class="user-info">
                        <div class="user-name">${comment.userName}</div>
                        <div class="comment-meta">
                            <span>${getStarDisplay(comment.rating)}</span>
                            ${comment.ownGame ? '<span class="badge-own">✓ Possède le jeu</span>' : ''}
                            ${comment.recommend ? '<span class="badge-recommend">👍 Recommande</span>' : ''}
                        </div>
                    </div>
                </div>
                <div class="comment-date">${formatCommentDate(comment.date)}</div>
            </div>
            <div class="comment-text">${escapeHtml(comment.comment)}</div>
            <div class="comment-actions">
                <button class="vote-btn ${userVotes[comment.id] === 'like' ? 'active' : ''}" 
                        onclick="voteComment('${comment.id}', 'like')">
                    👍 <span>${comment.likes}</span>
                </button>
                <button class="vote-btn ${userVotes[comment.id] === 'dislike' ? 'active' : ''}" 
                        onclick="voteComment('${comment.id}', 'dislike')">
                    👎 <span>${comment.dislikes}</span>
                </button>
            </div>
        </div>
    `).join('');
}

// Voter sur un commentaire
function voteComment(commentId, voteType) {
    const comment = gameComments.find(c => c.id === commentId);
    if (!comment) return;
    
    const currentVote = userVotes[commentId];
    
    // Retirer le vote actuel
    if (currentVote === 'like') {
        comment.likes--;
    } else if (currentVote === 'dislike') {
        comment.dislikes--;
    }
    
    // Ajouter le nouveau vote si différent
    if (currentVote !== voteType) {
        if (voteType === 'like') {
            comment.likes++;
            userVotes[commentId] = 'like';
        } else {
            comment.dislikes++;
            userVotes[commentId] = 'dislike';
        }
    } else {
        // Retirer le vote si on clique à nouveau
        delete userVotes[commentId];
    }
    
    // Sauvegarder
    saveGameComments(currentGame.id, gameComments);
    saveUserVotes(currentGame.id, userVotes);
    
    // Réafficher
    displayComments(gameComments);
}

// Trier les commentaires
function sortComments() {
    const sortSelect = document.getElementById('sortComments');
    if (!sortSelect) return;
    
    const sortValue = sortSelect.value;
    
    const sortedComments = [...gameComments].sort((a, b) => {
        if (sortValue === 'recent') {
            return new Date(b.date) - new Date(a.date);
        } else if (sortValue === 'helpful') {
            return (b.likes - b.dislikes) - (a.likes - a.dislikes);
        } else if (sortValue === 'rating-high') {
            return b.rating - a.rating;
        } else if (sortValue === 'rating-low') {
            return a.rating - b.rating;
        }
    });
    
    displayComments(sortedComments);
}

// Afficher les étoiles
function getStarDisplay(rating) {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
}

// Formater la date du commentaire
function formatCommentDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0 || diffDays === 1) {
        return "Aujourd'hui";
    } else if (diffDays === 2) {
        return "Hier";
    } else if (diffDays < 7) {
        return `Il y a ${diffDays} jours`;
    } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `Il y a ${weeks} semaine${weeks > 1 ? 's' : ''}`;
    } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `Il y a ${months} mois`;
    } else {
        return date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
    }
}

// Fonction utilitaire pour échapper le HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}