// mes-jeux.js - Page des jeux suivis

let currentUser = null;
let followedGames = [];
let allNews = [];
let selectedGameId = null;

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async () => {
  // Check auth status
  const auth = await checkAuthStatus();

  if (auth.isLoggedIn) {
    currentUser = auth.user;
    document.getElementById('notLoggedIn').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';

    // Show user icons, hide auth buttons
    const authButtons = document.getElementById('authButtons');
    const userIcons = document.getElementById('userIcons');
    if (authButtons) authButtons.style.display = 'none';
    if (userIcons) userIcons.classList.remove('hidden');

    // Load profile picture
    loadNavProfilePicture(currentUser.id);

    // Load data
    await loadFollowedGames();
    await loadAllNews();
    filterNewsByGames();
  } else {
    document.getElementById('notLoggedIn').style.display = 'flex';
    document.getElementById('mainContent').style.display = 'none';
  }

  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await logoutUser();
      window.location.reload();
    });
  }

  // Hamburger menu
  initMobileNav();

  // Search input - Enter key
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        performSearch();
      }
    });
  }
});

// ==================== LOAD FOLLOWED GAMES ====================

async function loadFollowedGames() {
  const listEl = document.getElementById('followedGamesList');
  const noGamesEl = document.getElementById('noGamesMessage');

  try {
    const result = await getUserFavorites();

    if (result.success && result.favorites && result.favorites.length > 0) {
      followedGames = result.favorites;
      listEl.innerHTML = '';
      noGamesEl.style.display = 'none';

      // Fetch game details from RAWG for images
      for (const fav of followedGames) {
        const card = await createGameCard(fav);
        listEl.appendChild(card);
      }
    } else {
      listEl.innerHTML = '';
      noGamesEl.style.display = 'block';
    }
  } catch (error) {
    console.error('Erreur chargement favoris:', error);
    listEl.innerHTML = '<p class="loading-message">Erreur de chargement</p>';
  }
}

// ==================== CREATE GAME CARD ====================

async function createGameCard(fav) {
  const card = document.createElement('div');
  card.className = 'followed-game-card';
  card.dataset.gameId = fav.game_id;

  // Try to get game image from RAWG
  let imageUrl = '';
  try {
    const response = await fetch(`/api/games/${fav.game_id}`);
    if (response.ok) {
      const game = await response.json();
      imageUrl = game.background_image || '';
    }
  } catch (e) {
    // ignore
  }

  const dateStr = fav.added_at ? new Date(fav.added_at).toLocaleDateString('fr-FR') : '';

  card.innerHTML = `
    <img class="game-card-image" src="${imageUrl || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2250%22%3E%3Crect fill=%22%23333%22 width=%2280%22 height=%2250%22/%3E%3C/svg%3E'}" alt="${fav.game_title || 'Jeu'}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2250%22%3E%3Crect fill=%22%23333%22 width=%2280%22 height=%2250%22/%3E%3C/svg%3E'">
    <div class="game-card-info">
      <div class="game-card-title">${fav.game_title || 'Jeu #' + fav.game_id}</div>
      <div class="game-card-date">Suivi depuis le ${dateStr}</div>
    </div>
    <button class="btn-unfollow" title="Ne plus suivre" onclick="event.stopPropagation(); unfollowGame('${fav.game_id}')">Retirer</button>
  `;

  // Click to filter news by this game
  card.addEventListener('click', () => {
    // Toggle selection
    if (selectedGameId === fav.game_id) {
      selectedGameId = null;
      document.querySelectorAll('.followed-game-card').forEach(c => c.classList.remove('active'));
      filterNewsByGames(); // Show all
    } else {
      selectedGameId = fav.game_id;
      document.querySelectorAll('.followed-game-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      filterNewsByGame(fav.game_title || '');
    }
  });

  return card;
}

// ==================== UNFOLLOW GAME ====================

async function unfollowGame(gameId) {
  const result = await removeFromFavorites(gameId);
  if (result.success) {
    followedGames = followedGames.filter(g => g.game_id !== gameId);
    if (selectedGameId === gameId) {
      selectedGameId = null;
    }
    await loadFollowedGames();
    filterNewsByGames();
  }
}

// ==================== LOAD ALL NEWS ====================

async function loadAllNews() {
  try {
    const response = await fetch('/api/news');
    if (response.ok) {
      allNews = await response.json();
    }
  } catch (error) {
    console.error('Erreur chargement actualites:', error);
    allNews = [];
  }
}

// ==================== FILTER NEWS BY ALL FOLLOWED GAMES ====================

function filterNewsByGames() {
  const newsListEl = document.getElementById('relatedNewsList');
  const noNewsEl = document.getElementById('noNewsMessage');

  if (followedGames.length === 0) {
    newsListEl.innerHTML = '';
    if (noNewsEl) {
      noNewsEl.style.display = 'block';
      newsListEl.appendChild(noNewsEl);
    }
    return;
  }

  // Get game titles for matching
  const gameTitles = followedGames.map(g => (g.game_title || '').toLowerCase()).filter(t => t.length > 0);

  // Filter news that mention any followed game
  const matchedNews = allNews.filter(article => {
    const title = (article.title || '').toLowerCase();
    const desc = (article.description || '').toLowerCase();
    return gameTitles.some(gameTitle => {
      // Use individual important words from game title (at least 4 chars)
      const words = gameTitle.split(/\s+/).filter(w => w.length >= 4);
      return words.some(word => title.includes(word) || desc.includes(word));
    });
  });

  displayNews(matchedNews, gameTitles);
}

// ==================== FILTER NEWS BY SINGLE GAME ====================

function filterNewsByGame(gameTitle) {
  if (!gameTitle) return;

  const words = gameTitle.toLowerCase().split(/\s+/).filter(w => w.length >= 4);

  const matchedNews = allNews.filter(article => {
    const title = (article.title || '').toLowerCase();
    const desc = (article.description || '').toLowerCase();
    return words.some(word => title.includes(word) || desc.includes(word));
  });

  displayNews(matchedNews, [gameTitle.toLowerCase()]);
}

// ==================== DISPLAY NEWS ====================

function displayNews(articles, gameTitles) {
  const newsListEl = document.getElementById('relatedNewsList');
  newsListEl.innerHTML = '';

  if (articles.length === 0) {
    newsListEl.innerHTML = `
      <div class="no-news-message">
        <p>Aucune actualite trouvee pour vos jeux suivis.</p>
        <p style="font-size: 12px; margin-top: 8px;">Les articles seront affiches ici quand des actualites correspondent a vos jeux.</p>
      </div>
    `;
    return;
  }

  // Show max 30 articles
  articles.slice(0, 30).forEach(article => {
    const matchedGame = findMatchedGame(article, gameTitles);

    const card = document.createElement('a');
    card.className = 'news-card';
    card.href = article.url || article.link || '#';
    card.target = '_blank';
    card.rel = 'noopener noreferrer';

    const image = article.image || article.thumbnail || '';
    const date = article.date ? new Date(article.date).toLocaleDateString('fr-FR') : '';

    card.innerHTML = `
      ${image ? `<img class="news-card-image" src="${image}" alt="" onerror="this.style.display='none'">` : ''}
      <div class="news-card-content">
        <div class="news-card-title">${article.title || 'Sans titre'}</div>
        <div class="news-card-meta">${article.source || ''} ${date ? '- ' + date : ''}</div>
        ${matchedGame ? `<span class="news-card-game-tag">${matchedGame}</span>` : ''}
      </div>
    `;

    newsListEl.appendChild(card);
  });
}

// Find which followed game matches this article
function findMatchedGame(article, gameTitles) {
  const title = (article.title || '').toLowerCase();
  const desc = (article.description || '').toLowerCase();

  for (const gameTitle of gameTitles) {
    const words = gameTitle.split(/\s+/).filter(w => w.length >= 4);
    if (words.some(word => title.includes(word) || desc.includes(word))) {
      // Capitalize first letter
      return gameTitle.charAt(0).toUpperCase() + gameTitle.slice(1);
    }
  }
  return null;
}

// ==================== SEARCH ====================

async function performSearch() {
  const query = document.getElementById('searchInput')?.value?.trim();
  if (!query) return;

  console.log('🔍 Recherche:', query);

  // Show loading message
  showSearchResults([], [], query, true);

  try {
    // Search in followed games locally
    const followedSearchGames = followedGames
      .filter(game => {
        const gameTitle = (game.game_title || '').toLowerCase();
        return gameTitle.includes(query.toLowerCase());
      })
      .map(game => ({
        id: game.game_id,
        name: game.game_title || 'Jeu #' + game.game_id,
        genres: [],
        background_image: '',
        rating: 0,
        released: ''
      }));

    // Search in all news
    const searchNews = allNews.filter(article => {
      const title = (article.title || '').toLowerCase();
      const desc = (article.description || '').toLowerCase();
      return title.includes(query.toLowerCase()) || desc.includes(query.toLowerCase());
    });

    // If we have results from followed games, show them
    if (followedSearchGames.length > 0) {
      showSearchResults(followedSearchGames, searchNews, query, false);
      return;
    }

    // Otherwise, search the API for all games
    console.log('🌐 Searching API for games:', query);
    const response = await fetch(`/api/games/search?query=${encodeURIComponent(query)}`);
    
    if (response.ok) {
      const data = await response.json();
      const apiGames = data && data.results ? data.results : (Array.isArray(data) ? data : []);
      console.log(`📊 API trouvé ${apiGames.length} jeux`);
      showSearchResults(apiGames, searchNews, query, false);
    } else {
      console.warn('⚠️ API fallback failed');
      showSearchResults([], searchNews, query, false);
    }
  } catch (error) {
    console.error('❌ Erreur recherche:', error);
    showSearchResults([], [], query, false);
  }
}

// ==================== MOBILE NAV ====================

function initMobileNav() {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const mobileNav = document.getElementById('mobileNav');
  const mobileNavOverlay = document.getElementById('mobileNavOverlay');
  const mobileNavClose = document.getElementById('mobileNavClose');

  if (hamburgerBtn && mobileNav) {
    hamburgerBtn.addEventListener('click', () => {
      mobileNav.classList.add('active');
      if (mobileNavOverlay) mobileNavOverlay.classList.add('active');
    });
  }

  if (mobileNavClose && mobileNav) {
    mobileNavClose.addEventListener('click', () => {
      mobileNav.classList.remove('active');
      if (mobileNavOverlay) mobileNavOverlay.classList.remove('active');
    });
  }

  if (mobileNavOverlay && mobileNav) {
    mobileNavOverlay.addEventListener('click', () => {
      mobileNav.classList.remove('active');
      mobileNavOverlay.classList.remove('active');
    });
  }
}

function loadNavProfilePicture(userId) {
  const navPic = document.getElementById('navProfilePic');
  if (!navPic) return;
  const defaultSrc = navPic.src;
  navPic.src = '/api/users/profile-picture/' + userId;
  navPic.onerror = () => { navPic.src = defaultSrc; };
}
