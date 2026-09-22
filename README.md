# Jira Quick Search

Extension Chrome Manifest V3 pour rechercher rapidement des tickets Jira Cloud et suivre l’activité d’une équipe.

![Chrome](https://img.shields.io/badge/Chrome-Manifest%20V3-green)
![Jira Cloud](https://img.shields.io/badge/Jira-Cloud-blue)
![License](https://img.shields.io/badge/license-MIT-orange)

## Pourquoi cette extension ?

Jira est puissant, mais retrouver rapidement un ticket ou vérifier l’activité d’une équipe demande souvent plusieurs manipulations. Jira Quick Search propose une interface légère pour :

- rechercher un ticket en quelques secondes ;
- filtrer les résultats avec les métadonnées Jira accessibles ;
- ouvrir plusieurs tickets simultanément ;
- produire un récapitulatif d’activité configurable sur une période donnée.

## Fonctionnalités

### Recherche Jira

- recherche par texte dans le ticket, le résumé et la description ;
- filtres dynamiques pour le projet, l’assigné, le type, l’état et la priorité ;
- prise en charge des champs personnalisés de type sélection lorsqu’ils sont accessibles ;
- filtres Tâches et Epics ;
- génération de JQL restreint avec tri par date de mise à jour ;
- copie du JQL généré ;
- pagination par curseur Jira ;
- ouverture d’un ticket ou de plusieurs tickets dans de nouveaux onglets ;
- affichage du projet, du statut, du type, de la priorité, de l’assigné et des dates du ticket.

### Récapitulatif d’activité

- périodes prédéfinies : semaine actuelle, semaine dernière, deux dernières semaines et mois actuel ;
- filtre par personne assignée ;
- règles configurables pour définir ce qu’est un ticket traité : ticket mis à jour, commentaire ajouté, statut modifié, assignation modifiée, priorité modifiée, résumé ou description modifié ;
- mode « au moins une règle » ou « toutes les règles » ;
- sauvegarde automatique de la dernière configuration dans le stockage synchronisé de Chrome ;
- statistiques par personne et par statut ;
- export CSV ;
- copie du récapitulatif au format Markdown.

### Configuration et diagnostic

- configuration de l’URL Jira, de l’adresse email Atlassian et du token API ;
- test de connexion depuis la page de configuration ;
- logs de diagnostic activables ou désactivables ;
- gestion des erreurs Jira sans bloquer les filtres standards ;
- styles Tailwind CSS et Flowbite embarqués localement pour respecter la politique de sécurité des extensions Chrome.

La section « Connexion et diagnostics » vérifie l’URL Jira, l’accès à l’instance, l’authentification et la disponibilité de la recherche sans afficher de secret ni de réponse API complète. Le bouton « Supprimer toutes les données locales » efface la configuration synchronisée, les préférences, les tickets récents et épinglés, les recherches sauvegardées et les règles d’activité, après confirmation.

## Installation

### Installation manuelle dans Chrome

1. Télécharger ou cloner ce dépôt.
2. Ouvrir `chrome://extensions/` dans Chrome.
3. Activer le **Mode développeur**.
4. Cliquer sur **Charger l’extension non empaquetée**.
5. Sélectionner le dossier du dépôt.
6. Ouvrir la page de configuration de l’extension.
7. Renseigner l’URL Jira, l’adresse email Atlassian et le token API.

L’extension cible les sites Jira Cloud dont le domaine se termine par `atlassian.net`.

## Configuration Jira

Le token API peut être créé depuis la page de sécurité du compte Atlassian :

<https://id.atlassian.com/manage-profile/security/api-tokens>

Les identifiants sont enregistrés dans `chrome.storage.sync` et ne sont pas chiffrés par l’extension. Ils ne sont pas écrits dans le dépôt et ne doivent jamais être ajoutés dans une capture d’écran, un ticket ou un commit. Les préférences de logs, tickets récents, tickets épinglés et recherches sauvegardées sont enregistrés dans `chrome.storage.local`; les règles d’activité sont synchronisées dans `chrome.storage.sync`.

L’extension appelle uniquement l’API REST Jira v3 de l’instance configurée pour l’authentification, la recherche, les filtres et le récapitulatif. Elle n’utilise aucun serveur tiers, analytics ou tracking. Elle ne collecte ni token en dehors du stockage de l’extension, ni historique distant, ni données personnelles supplémentaires.

Les permissions Jira restent celles du compte utilisé. Certains champs personnalisés et leurs options peuvent être inaccessibles sans droits d’administration ; ils sont alors ignorés sans empêcher la recherche standard.

## Architecture

| Fichier | Rôle |
| --- | --- |
| `manifest.json` | Configuration de l’extension Chrome Manifest V3 |
| `background.js` | Ouverture de la recherche et contrôle de la première installation |
| `search.html` / `search.js` | Recherche, filtres, résultats et pagination |
| `recap.html` / `recap.js` | Récapitulatif, règles d’activité et exports |
| `options.html` / `options.js` | Configuration Jira, test de connexion et diagnostic |
| `jira-api.js` | Authentification, appels REST Jira et métadonnées |
| `filter-utils.js` | Construction et échappement du JQL |
| `debug-logger.js` | Journalisation de diagnostic contrôlée par la configuration |
| `vendor/` | Ressources CSS locales Tailwind et Flowbite |
| `scripts/` | Scripts de validation et de test du dépôt |

## Développement

Le projet ne nécessite pas `node_modules`. Les ressources nécessaires à l’extension sont déjà présentes dans le dépôt.

Avant chaque commit, lancer depuis PowerShell :

```powershell
.\scripts\validate-extension.ps1
.\scripts\test-extension.ps1
```

Pour tester manuellement :

1. charger ou recharger l’extension depuis `chrome://extensions/` ;
2. ouvrir la page de configuration et tester la connexion ;
3. effectuer une recherche avec et sans filtres ;
4. tester la pagination et la copie du JQL ;
5. générer un récapitulatif avec différentes règles d’activité ;
6. vérifier les exports CSV et Markdown.

## Limites connues

- l’extension fonctionne avec Jira Cloud et l’API REST Jira v3 ;
- les résultats et les métadonnées dépendent des permissions du compte Jira ;
- l’analyse des règles d’activité s’appuie sur le changelog accessible pour chaque ticket ;
- la récupération du changelog peut augmenter le temps de génération d’un récapitulatif volumineux ;
- les champs personnalisés dont les contextes sont protégés par Jira ne peuvent pas toujours fournir leurs options.

## Sécurité

Consulter [SECURITY.md](SECURITY.md) pour signaler un problème de sécurité.

Ne partagez jamais votre token API. En cas d’exposition, révoquez-le immédiatement depuis Atlassian.

## Contribution

Les contributions sont les bienvenues. Consultez [CONTRIBUTING.md](CONTRIBUTING.md) avant de proposer une modification.

## Licence

Ce projet est distribué sous licence MIT. Voir [LICENSE](LICENSE).
