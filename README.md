GNews — Guide d'installation (FR)

Prérequis
- Node.js : https://nodejs.org/
- MySQL Server : https://dev.mysql.com/downloads/mysql/
- MySQL Workbench (GUI) : https://dev.mysql.com/downloads/workbench/
- Git (optionnel) : https://git-scm.com/

Étapes d'installation (sur votre ordinateur local)

1) Récupérer le projet et installer les dépendances

```bash
git clone <url-de-votre-repo>
cd GNews
npm install
```

2) Créer le fichier `.env` local

- À la racine du projet, créez un fichier nommé `.env` (sur votre ordinateur local) et ajoutez-y les variables suivantes en remplaçant les valeurs par les vôtres :

```

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=votre_mot_de_passe_mysql
DB_NAME=gnews_db

PORT=3000
NODE_ENV=development

RAWG_API_KEY=votre_cle_rawg
GUARDIAN_API_KEY=votre_cle_guardian

SESSION_SECRET=votre_secret_de_session

```

- Important : ne commitez jamais votre `.env` contenant de vraies clés ou mots de passe.
- Le fichier `.env` doit rester local sur votre machine.

3) Obtenir les clés API

- RAWG : créez un compte ou demandez une clé sur https://rawg.io/apidocs — copiez la valeur dans `RAWG_API_KEY`.
- The Guardian : inscrivez-vous sur https://open-platform.theguardian.com/ et ajoutez la clé dans `GUARDIAN_API_KEY`.

4) Importer la base de données

- Avec MySQL Workbench : connectez-vous à votre instance MySQL -> Server > Data Import -> Import from Self-Contained File -> sélectionnez `database.sql` -> choisissez / créez le schéma `gnews_db` -> Start Import.
- Ou via la ligne de commande :

```bash
mysql -u root -p
CREATE DATABASE gnews_db;
exit
mysql -u root -p gnews_db < database.sql
```

5) Démarrer l'application

```bash
node server.js
# ou si `package.json` définit un script start :
npm start
```

Conseils et remarques
- Sur les serveurs Linux (système de fichiers sensible à la casse) : vérifiez que `public/index.html` est bien en minuscules.
- Si vous utilisez une base distante ou un conteneur (Docker), mettez à jour `DB_HOST` et `DB_PORT` dans `.env`.
- Un fichier d'exemple `.env.example` est fourni pour servir de modèle sans exposer vos clés.

Liens utiles
- Node.js : https://nodejs.org/
- MySQL Server : https://dev.mysql.com/downloads/mysql/
- MySQL Workbench : https://dev.mysql.com/downloads/workbench/
- RAWG API docs : https://rawg.io/apidocs
- The Guardian Open Platform : https://open-platform.theguardian.com/

Fichiers importants
- [server.js](server.js)
- [database.sql](database.sql)
- Les fichiers statiques sont dans le dossier `public/` (vérifier `public/index.html`).