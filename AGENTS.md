# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Extension Chrome pour la recherche rapide de tickets Jira Cloud. Architecture Manifest V3 avec interface Tailwind CSS + Flowbite.

## Architecture

### Structure des fichiers
- `manifest.json` - Configuration Chrome Extension (Manifest V3)
- `background.js` - Service Worker : gère le clic sur l'icône et la première installation
- `search.html`, `workspace.html`, `recap.html`, `options.html`, `popup.html` - Points d’entrée HTML
- `src/pages/` - Scripts propres aux pages
- `src/components/navigation/` - Navbar globale et styles
- `src/services/` - API Jira et diagnostics
- `src/utils/` - Filtres, workspace, rapports et feedbacks
- `src/assets/icons/` - Icônes de l’extension

### Flux de données
1. **Configuration** : Les credentials (jiraUrl, jiraEmail, jiraToken) et les règles d’activité sont stockés dans `chrome.storage.sync`; les préférences et données d’espace de travail sont dans `chrome.storage.local`
2. **Authentification** : Basic Auth via `btoa(email:token)` dans les headers
3. **API Jira** :
   - REST API v3 (`/rest/api/3/`)
   - Endpoint de recherche : `/rest/api/3/search/jql` (POST) - Recherche de tickets avec JQL
   - Endpoint de test : `/rest/api/3/myself` (GET) - Validation des credentials
   - Endpoint users : `/rest/api/3/users` (GET) - Liste des utilisateurs du workspace
   - Endpoint changelog : `/rest/api/3/issue/{key}/changelog` (GET) - Historique des modifications d'un ticket

### Composants clés

#### `src/pages/search/search.js`
- **JQL Builder** : Construit les requêtes dynamiques (lignes 54-68)
  - Recherche textuelle : `text ~ "query*" OR summary ~ "query*" OR description ~ "query*"`
  - Filtres : Tasks/Epics via les checkboxes `filterTasks` et `filterEpics`
  - Tri : `ORDER BY updated DESC`
- **Affichage des résultats** : Grid Tailwind avec cards (fonction `createIssueCard`)
- **Status colors** : Fonction `getStatusColor()` pour mapper les statuts Jira aux couleurs Tailwind
- **Multi-sélection** : Checkboxes + FAB (Floating Action Button) pour ouvrir plusieurs tickets
- **Tri par key** : `sortIssuesByKey()` trie par numéro décroissant (PROJ-123 → 123)

#### `src/pages/recap/recap.js`
- **Chargement des utilisateurs** : Récupère la liste des users via `/rest/api/3/users?maxResults=100`
- **Récapitulatif hebdomadaire** : Fonction `fetchWeeklyActivities(assigneeId, days)`
  - JQL : `updated >= -Xd ORDER BY updated DESC` (X = 7, 14 ou 30 jours)
  - Filtre optionnel par assignee
  - Enrichissement des données : Pour chaque ticket, récupère le changelog et compte les commentaires de la période
- **Affichage tableau** : Présente les tickets en format tableau avec colonnes : Ticket, Résumé, Modifié par, Date, Commentaires, Statut
- **Statistiques** : Calcule et affiche 3 métriques
  - Total tickets modifiés
  - Répartition par personne (top 5)
  - Tickets par statut
- **Export** :
  - CSV : Génère un fichier téléchargeable `recap-jira-YYYY-MM-DD.csv`
  - Texte : Copie en format markdown dans le presse-papiers

#### `src/pages/settings/options.js`
- **Test de connexion** : Appel à `/rest/api/3/myself` pour valider les credentials
- **Gestion des messages** : Fonction `showMessage()` avec SVG icons dynamiques
- **Accordéon** : Gestion manuelle (Flowbite JS non initialisé automatiquement)

#### background.js
- Ouvre `search.html` au clic sur l'icône
- Au premier lancement (`onInstalled`) : vérifie la config, redirige vers options si vide

## Stack technique

- **UI Framework** : Tailwind CSS (CDN) + Flowbite 2.3.0 (composants)
- **Icons** : SVG Heroicons inline (pas de library externe)
- **API** : Jira REST API v3
- **Storage** : `chrome.storage.sync` pour la configuration/règles d’activité, `chrome.storage.local` pour les préférences, tickets récents, tickets épinglés et recherches sauvegardées
- **Permissions** : `storage` + `https://*.atlassian.net/*`

## Développement

### Tester l'extension localement
1. Ouvrir Chrome → `chrome://extensions/`
2. Activer "Mode développeur"
3. "Charger l'extension non empaquetée" → sélectionner le dossier du projet
4. Configurer l'extension (URL Jira, email, token API)
5. Cliquer sur l'icône pour ouvrir la recherche

### Debugging
- **Console** : DevTools sur `search.html` ou `options.html` (clic droit → Inspecter)
- **Background** : Extensions → "Service Worker" (affiche les logs de `background.js`)
- **Storage** : DevTools → Application → Storage → Chrome Extension

### Patterns de code importants

1. **Chargement de config** :
```javascript
const config = await chrome.storage.sync.get(['jiraUrl', 'jiraEmail', 'jiraToken']);
```

2. **Appel API Jira** :
```javascript
const response = await fetch(`${config.jiraUrl}/rest/api/3/search/jql`, {
  method: 'POST',
  headers: {
    'Authorization': 'Basic ' + btoa(`${config.jiraEmail}:${config.jiraToken}`),
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ jql, maxResults: 50, fields: [...] })
});
```

3. **Ouvrir des onglets Chrome** :
```javascript
chrome.tabs.create({ url: issueUrl, active: false });
```

## Contraintes et conventions

- **Language** : Interface en français
- **URL Jira** : Format strict `https://votre-site.atlassian.net` (sans slash final)
- **Champs Jira** : Les fields retournés sont configurables dans le body de la requête (`fields: [...]`)
- **Couleurs de statut** : Mapping manuel dans `getStatusColor()` (vert=done, bleu=en cours, violet=review, rouge=bloqué, gris=à faire)
- **Limite de résultats** : `maxResults: 50` (hardcodé dans `src/pages/search/search.js`)

## Notes spécifiques

- **Tailwind** : Utilisé via CDN (pas de build), classes utilisées directement dans le HTML
- **Flowbite** : Composants pré-stylés (accordéon, spinners), mais initialisé manuellement dans `src/pages/settings/options.js`
- **Pas de node_modules** : Aucune dépendance NPM, tout est chargé via CDN
- **Event delegation** : Les checkboxes des cartes utilisent l’event delegation dans `src/pages/search/search.js`
- **FAB (Floating Action Button)** : Affiché uniquement quand au moins 1 ticket est sélectionné
