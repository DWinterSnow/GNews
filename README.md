🎮 GNews - Site d'Actualités Gaming avec API RAWG
Site web d'actualités gaming moderne avec intégration de l'API RAWG, utilisant Node.js, Express, HTML, CSS et JavaScript.

🎨 Palette de Couleurs
Le design utilise une palette vibrante et moderne :

{
    --purple: #914eff; #  Couleur principale
    --yellow: #ffce38; # Accents et highlights
    --cyan: #25f4ee; # Éléments interactifs
    --blue: #10159d; # Arrière-plans secondaires
    --dark-blue: #0a1e64; # Arrière-plans principaux
    --light-blue: #7694ff; # Éléments légers
}

Structure du Projet

gnews/
│
├── server.js                # Serveur Node.js Express avec API RAWG
├── package.json             # Configuration npm
│
├── public/                  # Fichiers publics
│   ├── index.html           # Page d'accueil
│   │
│   ├── css/
│   │   └── style.css        # Styles CSS avec palette de couleurs
│   │
│   └── js/
│       └── app.js           # JavaScript frontend + intégration RAWG
│
└── README.md                # Ce fichier

📦 Installation

1. Obtenir une clé API RAWG (GRATUIT)

Allez sur https://rawg.io/apidocs
Créez un compte gratuit
Obtenez votre clé API dans la section "Get API Key"

2. Configurer votre clé API

Ouvrez server.js et remplacez :
javascriptconst RAWG_API_KEY = 'VOTRE_CLE_API_RAWG';
Par votre vraie clé API obtenue sur RAWG.

3. Installer les dépendances

bashnpm install
🎮 Lancement du Site
Mode Production
bashnpm start
Mode Développement (avec auto-reload)
bashnpm run dev
Le site sera accessible sur : http://localhost:3000
🎯 Fonctionnalités
✅ Intégration API RAWG

Jeux populaires : Top jeux les mieux notés
Nouveautés : Dernières sorties du mois
Prochaines sorties : Jeux à venir
Filtrage par plateforme : PC, PlayStation, Xbox, Switch, VR
Recherche : Recherche en temps réel dans la base RAWG
Détails des jeux : Note, genres, plateformes, description

🎨 Design Moderne

Gradients dynamiques : Utilisation de la palette de couleurs
Effets hover : Animations et transitions fluides
Cartes interactives : Transformation au survol
Responsive : Adaptation mobile, tablette, desktop
Backdrop blur : Effets de profondeur modernes

🚀 Performance

Chargement asynchrone : API calls non-bloquantes
Gestion d'erreurs : Messages clairs et réessai possible
Images optimisées : Fallback pour images manquantes
Cache navigateur : Fichiers statiques cachés

🎯 API Endpoints Disponibles

EndpointDescriptionParamètresGET /api/games/popularJeux les mieux notés-GET /api/games/new-releasesSorties du dernier mois-GET /api/games/upcomingJeux à venir-GET /api/games/platform/:platformJeux par plateformepc, playstation, xbox, switch, vrGET /api/games/searchRechercher des jeuxquery=nom_du_jeuGET /api/games/:idDétails d'un jeuid du jeuGET /api/genresListe des genres-

🎨 Personnalisation des Couleurs

Pour modifier la palette de couleurs, éditez les variables CSS dans public/css/style.css :
css:root {
    --purple: #914eff;
    --yellow: #ffce38;
    --cyan: #25f4ee;
    --blue: #10159d;
    --dark-blue: #0a1e64;
    --light-blue: #7694ff;
}

🔧 Technologies Utilisées

Backend : Node.js + Express
API externe : RAWG Video Games Database
Frontend : HTML5, CSS3 (Grid, Flexbox, Gradients)
JavaScript : Vanilla JS (Async/Await, Fetch API)
HTTP Client : Axios

📱 Responsive Design
Le site s'adapte à toutes les tailles d'écran :

📱 Mobile : < 640px (2 colonnes)
📱 Tablette : 640px - 968px (3 colonnes)
💻 Desktop : > 968px (6 colonnes)

🚀 Évolutions Possibles

 Système de favoris (localStorage)
 Pagination des résultats
 Filtres avancés (par genre, note, année)
 Page de détails complète pour chaque jeu
 Système d'authentification utilisateur
 Sauvegarde des jeux en favoris (backend)
 Comparateur de jeux
 Section vidéos/trailers
 Mode sombre/clair
 Partage sur réseaux sociaux

📝 Notes Importantes
Limites API RAWG (plan gratuit)

20,000 requêtes par mois
Pas de clé API requise pour tests (limitée)
Attribution requise : Mentionner RAWG sur votre site

Images
Les images proviennent directement de l'API RAWG. Si une image n'est pas disponible, un placeholder s'affiche automatiquement.
CORS
Le serveur Express gère automatiquement les requêtes API. Pas de problème CORS.
🐛 Résolution de Problèmes
Erreur "Impossible de charger les jeux"

Vérifiez que votre clé API RAWG est correcte
Vérifiez votre connexion internet
Consultez la console du navigateur (F12)

Les images ne s'affichent pas

Normal si l'API RAWG ne fournit pas d'image
Un placeholder s'affiche automatiquement

Le serveur ne démarre pas
bash# Vérifiez que les dépendances sont installées
npm install

# Vérifiez que le port 3000 est libre
lsof -ti:3000 | xargs kill -9  # Mac/Linux
👨‍💻 Développement
Pour ajouter de nouvelles fonctionnalités :

Backend/API : Modifiez server.js
Structure HTML : Modifiez public/index.html
Styles : Modifiez public/css/style.css
Interactivité : Modifiez public/js/app.js

📚 Documentation RAWG
Documentation complète de l'API : https://api.rawg.io/docs/

🎮 Exemples d'Utilisation
Rechercher un jeu
javascriptconst response = await fetch('/api/games/search?query=minecraft');
const data = await response.json();
Obtenir les jeux PC
javascriptconst response = await fetch('/api/games/platform/pc');
const data = await response.json();