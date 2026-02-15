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
    await loadNewsForFollowedGames();
  } else {
    document.getElementById('notLoggedIn').style.display = 'flex';
    document.getElementById('mainContent').style.display = 'none';
  }

  // Logout is handled by profile-menu.js (shows confirmation modal)

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

      // Create all game cards (images load async in background)
      const cards = await Promise.all(followedGames.map(fav => createGameCard(fav)));
      cards.forEach(card => listEl.appendChild(card));
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
  const item = document.createElement('button');
  item.className = 'library-game-item';
  item.dataset.gameId = fav.game_id;
  item.dataset.gameTitle = fav.game_title || '';

  const defaultImg = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22%3E%3Crect fill=%22%23222%22 width=%2240%22 height=%2240%22 rx=%228%22/%3E%3Ctext x=%2250%25%22 y=%2255%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23555%22 font-size=%2216%22%3E🎮%3C/text%3E%3C/svg%3E';

  item.innerHTML = `
    <div class="library-game-icon">
      <img src="${defaultImg}" alt="${fav.game_title || 'Jeu'}">
    </div>
    <span class="library-game-name">${fav.game_title || 'Jeu #' + fav.game_id}</span>
    <div class="library-game-actions">
      <button class="btn-unfollow-icon" title="Retirer" onclick="event.stopPropagation(); unfollowGame('${fav.game_id}')">✕</button>
    </div>
  `;

  // Load game image asynchronously
  const imgEl = item.querySelector('.library-game-icon img');
  fetch(`/api/games/${fav.game_id}`)
    .then(r => r.ok ? r.json() : null)
    .then(game => {
      if (game && game.background_image) {
        imgEl.src = game.background_image;
      }
    })
    .catch(() => {});

  // Click to select this game and filter news
  item.addEventListener('click', () => {
    selectGame(fav.game_id, fav.game_title || '');
  });

  return item;
}

// ==================== GAME SELECTION (Library Sidebar) ====================

function selectGame(gameId, gameTitle) {
  selectedGameId = gameId;

  // Update active state in sidebar
  document.querySelectorAll('.library-game-item').forEach(el => el.classList.remove('active'));
  const target = document.querySelector(`.library-game-item[data-game-id="${gameId}"]`);
  if (target) target.classList.add('active');

  // Update content header
  const titleEl = document.getElementById('libraryContentTitle');
  if (titleEl) titleEl.textContent = gameTitle || 'Actualités';

  // Filter news for this game
  filterNewsByGame(gameTitle);
}

function selectAllGames() {
  selectedGameId = null;

  // Update active state
  document.querySelectorAll('.library-game-item').forEach(el => el.classList.remove('active'));
  const allBtn = document.getElementById('libraryAllBtn');
  if (allBtn) allBtn.classList.add('active');

  // Update content header
  const titleEl = document.getElementById('libraryContentTitle');
  if (titleEl) titleEl.textContent = 'Toutes les actualités';

  // Show all news
  displayNews(allNews);
}

// ==================== UNFOLLOW GAME ====================

async function unfollowGame(gameId) {
  const result = await removeFromFavorites(gameId);
  if (result.success) {
    followedGames = followedGames.filter(g => g.game_id !== gameId);
    if (selectedGameId === gameId) {
      selectAllGames();
    }
    await loadFollowedGames();
    // Re-filter news (remove unfollowed game's articles)
    allNews = allNews.filter(a => {
      const gameFav = followedGames.find(g => 
        g.game_title && a.gameName && 
        g.game_title.toLowerCase() === a.gameName.toLowerCase()
      );
      return gameFav !== undefined;
    });
    if (selectedGameId) {
      const game = followedGames.find(g => g.game_id === selectedGameId);
      if (game) filterNewsByGame(game.game_title);
      else selectAllGames();
    } else {
      displayNews(allNews);
    }
  }
}

// ==================== LOAD NEWS FOR FOLLOWED GAMES ====================

async function loadNewsForFollowedGames() {
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

  // Show loading
  newsListEl.innerHTML = '<div class="loading-message">Chargement des actualités...</div>';

  allNews = [];

  // Fetch news for each followed game in parallel
  const promises = followedGames.map(async (fav) => {
    const gameTitle = fav.game_title || '';
    if (!gameTitle) return [];
    try {
      const response = await fetch(`/api/news/game/${encodeURIComponent(gameTitle)}`);
      if (response.ok) {
        const articles = await response.json();
        return articles;
      }
    } catch (e) {
      console.warn(`Erreur chargement actualités pour ${gameTitle}:`, e);
    }
    return [];
  });

  const results = await Promise.all(promises);
  
  // Merge and deduplicate
  const seen = new Set();
  results.flat().forEach(article => {
    const key = (article.title || '').toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      allNews.push(article);
    }
  });

  // Sort by date
  allNews.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  displayNews(allNews);
}

// ==================== FILTER NEWS BY SINGLE GAME (on card click) ====================

function filterNewsByGame(gameTitle) {
  if (!gameTitle) return;
  const lowerTitle = gameTitle.toLowerCase();
  const filtered = allNews.filter(a => 
    a.gameName && a.gameName.toLowerCase() === lowerTitle
  );
  displayNews(filtered);
}

// Show all news again (when deselecting a card)
function filterNewsByGames() {
  displayNews(allNews);
}

// ==================== DISPLAY NEWS ====================

function displayNews(articles) {
  const newsListEl = document.getElementById('relatedNewsList');
  const countEl = document.getElementById('libraryContentCount');
  newsListEl.innerHTML = '';

  if (countEl) {
    countEl.textContent = articles.length > 0 ? `${articles.length} article${articles.length > 1 ? 's' : ''}` : '';
  }

  if (articles.length === 0) {
    newsListEl.innerHTML = `
      <div class="no-news-message">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5">
          <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"/>
        </svg>
        <p>Aucune actualité trouvée pour ${selectedGameId ? 'ce jeu' : 'vos jeux suivis'}.</p>
      </div>
    `;
    return;
  }

  // Show max 30 articles
  articles.slice(0, 30).forEach(article => {
    const card = document.createElement('a');
    card.className = 'news-card';
    card.href = article.url || article.link || '#';
    card.target = '_blank';
    card.rel = 'noopener noreferrer';

    const image = article.image || article.thumbnail || '';
    const gameTag = article.gameName || '';
    const sourceIcon = getNewsSourceIcon(article.source || article.author || '');
    const authorLabel = article.author || article.source || '';
    const categoryBadge = getNewsCategoryBadge(article.category || article.detectedCategory || 'article');
    
    // Clean description
    let desc = (article.description || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (desc.length > 120) desc = desc.substring(0, 120) + '...';
    
    // Clean title
    let title = (article.title || 'Sans titre').replace(/\s+/g, ' ').trim();
    if (title.length > 80) title = title.substring(0, 80) + '...';

    // Format date
    const dateStr = article.publishedAt ? formatNewsDate(article.publishedAt) : '';

    card.innerHTML = `
      <img class="news-card-image" src="${image || '/img/placeholder.svg'}" alt="" onerror="this.src='/img/placeholder.svg'">
      <div class="news-card-content">
        <div class="news-card-meta">
          <span class="source-badge">${sourceIcon} ${authorLabel}</span>
          ${categoryBadge}
        </div>
        <div class="news-card-title">${title}</div>
        ${desc ? `<p class="news-card-description">${desc}</p>` : ''}
        <div class="news-card-footer">
          <span class="news-card-date">${dateStr ? '📅 ' + dateStr : ''}</span>
          ${gameTag ? `<span class="news-card-game-tag">${gameTag}</span>` : ''}
        </div>
      </div>
    `;

    newsListEl.appendChild(card);
  });
}

// ==================== NEWS HELPER FUNCTIONS ====================

function getNewsSourceIcon(source) {
  const s = (source || '').toLowerCase();
  if (s.includes('reddit') || s.startsWith('r/')) return '💬';
  if (s.includes('guardian')) return '🗞️';
  return '📰';
}

function getNewsCategoryBadge(category) {
  const badges = {
    'guide': { icon: '📖', label: 'Guide', color: '#4CAF50', bg: 'rgba(76, 175, 80, 0.2)' },
    'teste': { icon: '⭐', label: 'Test', color: '#FF9800', bg: 'rgba(255, 152, 0, 0.2)' },
    'patch': { icon: '🔧', label: 'Patch', color: '#2196F3', bg: 'rgba(33, 150, 243, 0.2)' },
    'e-sport': { icon: '🏆', label: 'E-Sport', color: '#F44336', bg: 'rgba(244, 67, 54, 0.2)' },
    'article': { icon: '📰', label: 'Article', color: '#9C27B0', bg: 'rgba(156, 39, 176, 0.2)' },
    'discussion': { icon: '💬', label: 'Discussion', color: '#00BCD4', bg: 'rgba(0, 188, 212, 0.2)' }
  };
  const b = badges[category] || badges['article'];
  return `<span class="category-badge" style="background:${b.bg};color:${b.color};border:1.5px solid ${b.color};">
    <span style="font-size:13px;">${b.icon}</span> ${b.label}
  </span>`;
}

function formatNewsDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'À l\'instant';
  if (diffMin < 60) return `Il y a ${diffMin}min`;
  if (diffH < 24) return `Il y a ${diffH}h`;
  if (diffD < 7) return `Il y a ${diffD}j`;
  return date.toLocaleDateString('fr-FR');
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

    // Search in all news by text
    let searchNews = allNews.filter(article => {
      const title = (article.title || '').toLowerCase();
      const desc = (article.description || '').toLowerCase();
      return title.includes(query.toLowerCase()) || desc.includes(query.toLowerCase());
    });

    // If we have results from followed games, show them
    if (followedSearchGames.length > 0) {
      // Enrich news with game-specific results
      if (typeof fetchGameSpecificNews === 'function') {
        searchNews = await fetchGameSpecificNews(followedSearchGames, searchNews);
      }
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
      // Enrich news with game-specific results
      if (typeof fetchGameSpecificNews === 'function' && apiGames.length > 0) {
        searchNews = await fetchGameSpecificNews(apiGames, searchNews);
      }
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
