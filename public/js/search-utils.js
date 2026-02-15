// search-utils.js - Shared search functions for all pages

function showSearchResults(games, news, query, isLoading = false) {
    let modal = document.getElementById('searchModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'searchModal';
        modal.className = 'search-modal';
        document.body.appendChild(modal);
    }
    
    if (isLoading) {
        modal.innerHTML = `
            <div class="search-modal-content">
                <div class="search-modal-header">
                    <h2>⏳ Recherche en cours...</h2>
                    <button class="search-modal-close" onclick="closeSearchResults()">✕</button>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
        return;
    }
    
    const gamesHTML = (games || []).map(game => createSearchGameCard(game)).join('');
    const newsHTML = (news || []).map(article => createSearchNewsCard(article)).join('');
    
    const gamesTab = games && games.length > 0 ? 'active' : '';
    const newsTab = (!games || games.length === 0) && news && news.length > 0 ? 'active' : '';
    
    modal.innerHTML = `
        <div class="search-modal-content">
            <div class="search-modal-header">
                <h2>Résultats de recherche: <strong>"${query}"</strong> (${(games?.length || 0) + (news?.length || 0)} résultats)</h2>
                <button class="search-modal-close" onclick="closeSearchResults()">✕</button>
            </div>
            <div class="search-tabs">
                <button class="search-tab-btn ${gamesTab}" onclick="switchSearchTab('games', event)">
                    🎮 Jeux (${games?.length || 0})
                </button>
                <button class="search-tab-btn ${newsTab}" onclick="switchSearchTab('news', event)">
                    📰 Actualités (${news?.length || 0})
                </button>
            </div>
            <div class="search-modal-body">
                <div id="games-tab-content" class="search-tab-content ${gamesTab}">
                    ${gamesHTML}
                </div>
                <div id="news-tab-content" class="search-tab-content ${newsTab}">
                    ${newsHTML}
                </div>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
    modal.className = 'search-modal';
    
    // Close on background click
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeSearchResults();
        }
    };
}

function switchSearchTab(tab, evt) {
    // Hide all tabs
    document.querySelectorAll('.search-tab-content').forEach(el => {
        el.classList.remove('active');
    });
    
    // Remove active from all buttons
    document.querySelectorAll('.search-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const selectedContent = document.getElementById(tab + '-tab-content');
    if (selectedContent) {
        selectedContent.classList.add('active');
    }
    
    // Mark button as active - use event parameter or find the button that was clicked
    if (evt && evt.target) {
        evt.target.classList.add('active');
    } else {
        // Fallback: find the button with data-tab attribute or by position
        const allButtons = document.querySelectorAll('.search-tab-btn');
        allButtons.forEach((btn, index) => {
            if ((tab === 'games' && index === 0) || (tab === 'news' && index === 1)) {
                btn.classList.add('active');
            }
        });
    }
}

function createSearchGameCard(game) {
    const genres = game.genres ? game.genres.slice(0, 2).map(g => g.name).join(', ') : 'N/A';
    return `
        <div class="search-result-item search-game-item" onclick="viewGame(${game.id})">
            <div class="search-result-image">
                <img src="${game.background_image || '/img/placeholder.svg'}" 
                     alt="${game.name}"
                     onerror="this.src='/img/placeholder.svg'">
                ${game.rating ? `<div class="search-result-rating">⭐ ${game.rating}</div>` : ''}
            </div>
            <div class="search-result-info">
                <h4 class="search-result-title">${game.name}</h4>
                <p class="search-result-meta">${genres}</p>
                ${game.released ? `<p class="search-result-date">📅 ${formatDate(game.released)}</p>` : ''}
            </div>
        </div>
    `;
}

function createSearchNewsCard(article) {
    const newsLink = article.link || article.url || '#';
    const publishDate = article.pubDate ? new Date(article.pubDate).toLocaleDateString('fr-FR') : '';
    const clickHandler = newsLink && newsLink !== '#' ? `window.open('${newsLink.replace(/'/g, "\\'")}', '_blank')` : 'return false';
    
    return `
        <div class="search-result-item search-news-item" onclick="${clickHandler}" style="cursor: ${newsLink && newsLink !== '#' ? 'pointer' : 'default'}">
            <div class="search-result-image">
                 <img src="${article.image || '/img/placeholder.svg'}" 
                     alt="${article.title}"
                     onerror="this.src='/img/placeholder.svg'">
            </div>
            <div class="search-result-info">
                <h4 class="search-result-title">${article.title}</h4>
                <p class="search-result-meta">${article.source || 'Article'}</p>
                ${publishDate ? `<p class="search-result-date">📅 ${publishDate}</p>` : ''}
                <p class="search-result-desc">${article.description?.substring(0, 100) || ''}...</p>
            </div>
        </div>
    `;
}

function closeSearchResults() {
    const modal = document.getElementById('searchModal');
    if (modal) {
        modal.style.display = 'none';
    }
    // Clear search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
}

// Fetch game-specific news using the top game results' names
// Merges with any text-filtered news and deduplicates
async function fetchGameSpecificNews(games, textFilteredNews) {
    if (!games || games.length === 0) return textFilteredNews || [];
    
    // Take the top 3 game names to search news for
    const topGames = games.slice(0, 3);
    const newsPromises = topGames.map(game => 
        fetch(`/api/news/game/${encodeURIComponent(game.name)}`)
            .then(r => r.ok ? r.json() : [])
            .catch(() => [])
    );

    const results = await Promise.all(newsPromises);
    
    // Merge all news: text-filtered + game-specific
    const allResults = [...(textFilteredNews || [])];
    results.flat().forEach(article => allResults.push(article));
    
    // Deduplicate by title
    const seen = new Set();
    const unique = allResults.filter(a => {
        const key = (a.title || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '').substring(0, 60);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    
    // Sort by date
    unique.sort((a, b) => new Date(b.publishedAt || b.pubDate || 0) - new Date(a.publishedAt || a.pubDate || 0));
    
    return unique;
}

function viewGame(id) {
    window.location.href = `game-details.html?id=${id}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}
