function setupSearchSuggestions(getAllGamesForSearch) {
    const searchInput = document.querySelector('.search-input');
    const suggestionsBox = document.querySelector('.search-suggestions');

    if (!searchInput || !suggestionsBox) return;

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();
        suggestionsBox.innerHTML = '';

        if (query.length < 2) return;

        const games = getAllGamesForSearch();

        const results = games.filter(game =>
            game.name.toLowerCase().includes(query)
        ).slice(0, 8);

        results.forEach(game => {
            const li = document.createElement('li');
            li.classList.add('suggestion-item');

            li.innerHTML = `
                <img src="${game.image}" alt="${game.name}" class="suggestion-image">
                <div class="suggestion-text">
                    <span class="suggestion-name">${game.name}</span>
                    <span class="suggestion-desc">${game.category || 'Jeu vidéo'}</span>
                </div>
            `;

            li.addEventListener('click', () => {
                window.location.href = `game.html?id=${game.id}`;
            });

            suggestionsBox.appendChild(li);
        });
    });
}
