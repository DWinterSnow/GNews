// État de l'application
let allNews = [];
let filteredNews = [];
let displayedCount = 30;
const INCREMENT = 12;
let currentCategory = 'tout';
let currentSource = 'tout';
let currentSort = 'recent';
let searchQuery = '';

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    console.log('📰 Page Actualités chargée');
    loadAllNews();
    setupEventListeners();
});

// Configuration des écouteurs
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
        
        searchInput.addEventListener('input', (e) => {
            if (e.target.value === '') {
                searchQuery = '';
                applyFilters();
            }
        });
    }
}

// Charger TOUTES les actualités
async function loadAllNews() {
    showLoading();
    
    try {
        console.log('📥 Chargement de toutes les actualités...');
        const response = await fetch('/api/news');
        
        if (!response.ok) {
            throw new Error('Erreur lors du chargement des actualités');
        }
        
        const data = await response.json();
        
        allNews = data.map(article => ({
            ...article,
            detectedCategory: detectArticleCategory(article)
        }));
        
        console.log(`✅ ${allNews.length} articles chargés`);
        
        updateStats();
        applyFilters();
        
    } catch (error) {
        console.error('❌ Erreur:', error);
        showError(error.message);
    }
}

// Actualiser les news
async function refreshNews() {
    const btn = event.target;
    btn.textContent = '🔄 Actualisation...';
    btn.disabled = true;
    
    try {
        await fetch('/api/news/refresh');
        await loadAllNews();
    } catch (error) {
        console.error('❌ Erreur refresh:', error);
    } finally {
        btn.textContent = '🔄 Actualiser';
        btn.disabled = false;
    }
}

// Détection de catégorie
function detectArticleCategory(article) {
    const title = article.title.toLowerCase();
    const description = (article.description || '').toLowerCase();
    const content = title + ' ' + description;
    
    const categories = {
        'e-sport': ['esport', 'tournament', 'championship', 'competitive', 'pro', 'team', 'league', 'finals', 'winner', 'prize', 'competition', 'match', 'compétition'],
        'patch': ['patch', 'update', 'hotfix', 'fix', 'bug', 'changelog', 'notes', 'version', 'release', 'mise à jour', 'correctif', 'balance'],
        'teste': ['review', 'test', 'critique', 'impression', 'hands-on', 'preview', 'tested', 'verdict', 'rating', 'score', 'analysis', 'évaluation'],
        'guide': ['guide', 'how to', 'tutorial', 'walkthrough', 'tips', 'tricks', 'beginner', 'advanced', 'strategy', 'build', 'best', 'top 10', 'explained', 'conseil']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => content.includes(keyword))) {
            return category;
        }
    }
    
    return article.source === 'reddit' ? 'discussion' : 'article';
}

// Filtrer par catégorie
function filterByCategory(category) {
    currentCategory = category;
    displayedCount = 30;
    
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    applyFilters();
}

// Filtrer par source
function filterBySource(source) {
    currentSource = source;
    displayedCount = 30;
    
    document.querySelectorAll('.source-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    applyFilters();
}

// Trier les actualités
function sortNews(sortType) {
    currentSort = sortType;
    
    document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    applyFilters();
}

// Appliquer tous les filtres
function applyFilters() {
    let result = [...allNews];
    
    // Filtre de recherche
    if (searchQuery) {
        result = result.filter(article =>
            article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (article.description && article.description.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }
    
    // Filtre de catégorie
    if (currentCategory !== 'tout') {
        result = result.filter(article => article.detectedCategory === currentCategory);
    }
    
    // Filtre de source
    if (currentSource !== 'tout') {
        result = result.filter(article => article.source === currentSource);
    }
    
    // Tri
    if (currentSort === 'recent') {
        result.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    } else if (currentSort === 'popular') {
        result.sort((a, b) => {
            const scoreA = (a.ups || 0) + (a.rating || 0);
            const scoreB = (b.ups || 0) + (b.rating || 0);
            return scoreB - scoreA;
        });
    }
    
    filteredNews = result;
    displayedCount = 30;
    displayNews();
    updateStats();
}

// Recherche
function performSearch() {
    searchQuery = document.getElementById('searchInput').value.trim();
    displayedCount = 30;
    applyFilters();
}

// Charger plus d'articles
function loadMoreNews() {
    displayedCount += INCREMENT;
    displayNews();
}

// Afficher les actualités
function displayNews() {
    const container = document.getElementById('newsGrid');
    if (!container) return;
    
    if (filteredNews.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <h3 class="empty-title">Aucune actualité trouvée</h3>
                <p class="empty-description">Essayez de modifier vos filtres ou votre recherche</p>
            </div>
        `;
        return;
    }
    
    const newsToShow = filteredNews.slice(0, displayedCount);
    const hasMore = filteredNews.length > displayedCount;
    
    const newsHTML = newsToShow.map(article => createNewsCard(article)).join('');
    container.innerHTML = newsHTML;
    
    if (hasMore) {
        const loadMoreHTML = `
            <div class="load-more-container">
                <button onclick="loadMoreNews()" class="load-more-btn">
                    <span style="font-size: 24px;">📰</span>
                    Charger plus d'articles (${filteredNews.length - displayedCount} restants)
                </button>
            </div>
        `;
        container.innerHTML += loadMoreHTML;
    } else if (filteredNews.length > 30) {
        container.innerHTML += `
            <div class="load-more-container">
                <p style="color: var(--cyan); font-size: 18px; font-weight: 600;">
                    ✅ Tous les articles affichés (${filteredNews.length} au total)
                </p>
            </div>
        `;
    }
    
    updateStats();
}

// Créer une carte d'actualité
function createNewsCard(article) {
    const categoryBadge = getCategoryBadge(article.detectedCategory);
    const sourceIcon = getSourceIcon(article.source);
    
    const shortDescription = article.description 
        ? article.description.substring(0, 150) + (article.description.length > 150 ? '...' : '')
        : '';
    
    return `
        <div class="news-card" onclick="window.open('${article.url}', '_blank')">
            <img src="${article.image}" 
                 alt="${article.title}" 
                 class="news-image"
                 onerror="this.src='https://via.placeholder.com/800x250/10159d/fff?text=Gaming+News'">
            <div class="news-content">
                <div class="news-meta">
                    <span class="source-badge">${sourceIcon} ${article.author}</span>
                    ${categoryBadge}
                </div>
                <h3 class="news-title">${article.title}</h3>
                ${shortDescription ? `<p class="news-description">${shortDescription}</p>` : ''}
                <div class="news-footer">
                    <span class="news-date">📅 ${formatDate(article.publishedAt)}</span>
                </div>
            </div>
        </div>
    `;
}

// Badge de catégorie
function getCategoryBadge(category) {
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
            background: ${badge.bgColor};
            color: ${badge.color};
            border: 1.5px solid ${badge.color};
        ">
            <span style="font-size: 14px;">${badge.icon}</span>
            ${badge.label}
        </span>
    `;
}

// Icône de source
function getSourceIcon(source) {
    const icons = {
        'reddit': '💬',
        'rss': '📰',
        'guardian': '🗞️'
    };
    return icons[source] || '📰';
}

// Mettre à jour les statistiques
function updateStats() {
    const totalEl = document.getElementById('totalArticles');
    const displayedEl = document.getElementById('displayedArticles');
    
    if (totalEl) {
        totalEl.textContent = filteredNews.length;
        animateNumber(totalEl, filteredNews.length);
    }
    
    if (displayedEl) {
        const displayed = Math.min(displayedCount, filteredNews.length);
        displayedEl.textContent = displayed;
        animateNumber(displayedEl, displayed);
    }
}

// Animation des nombres
function animateNumber(element, target) {
    const duration = 500;
    const start = parseInt(element.textContent) || 0;
    const increment = (target - start) / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= target) || (increment < 0 && current <= target)) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.round(current);
    }, 16);
}

// Formater la date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (hours < 1) {
        return 'À l\'instant';
    } else if (hours < 24) {
        return `Il y a ${hours}h`;
    } else if (days < 7) {
        return `Il y a ${days}j`;
    } else {
        return date.toLocaleDateString('fr-FR', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
}

// Afficher le chargement
function showLoading() {
    const container = document.getElementById('newsGrid');
    if (container) {
        container.innerHTML = '<div class="loading">⏳ Chargement des actualités...</div>';
    }
}

// Afficher une erreur
function showError(message) {
    const container = document.getElementById('newsGrid');
    if (container) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h3 class="empty-title">Erreur de chargement</h3>
                <p class="empty-description">${message}</p>
                <button onclick="loadAllNews()" class="refresh-btn" style="margin-top: 20px;">
                    🔄 Réessayer
                </button>
            </div>
        `;
    }
}