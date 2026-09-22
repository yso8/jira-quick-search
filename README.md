# Jira Quick Search

Extension Chrome Manifest V3 pour rechercher rapidement des tickets Jira Cloud et consulter un récapitulatif d’activité.

![Chrome](https://img.shields.io/badge/Chrome-Manifest%20V3-green)
![License](https://img.shields.io/badge/license-MIT-orange)

---

## Fonctionnalités

- Recherche Jira par texte, type de ticket et date de mise à jour.
- Pagination des résultats et ouverture de plusieurs tickets.
- Récapitulatif d’activité par période et par utilisateur.
- Export CSV ou copie du récapitulatif en Markdown.
- Configuration d’un site Jira Cloud, d’un email Atlassian et d’un token API.
- Interface en français basée sur Tailwind CSS et Flowbite chargés depuis CDN.

---

## Installation locale

### Mode Développeur (Installation manuelle)

1. Télécharger ou cloner ce dépôt.
2. Ouvrir `chrome://extensions/` dans Chrome.
3. Activer le **Mode développeur**.
4. Cliquer sur **Charger l’extension non empaquetée**.
5. Sélectionner le dossier du dépôt.
6. Ouvrir les options de l’extension et renseigner les informations Jira.

L’extension cible les sites Jira Cloud dont le domaine se termine par `atlassian.net`.

## Configuration Jira

Le token API se crée depuis la page de sécurité du compte Atlassian :
<https://id.atlassian.com/manage-profile/security/api-tokens>

Les identifiants sont enregistrés dans `chrome.storage.sync`, le stockage synchronisé de Chrome. Ne copiez jamais un token réel dans le code, une capture ou un ticket GitHub. Révoquez immédiatement tout token exposé.

## Développement et vérification

Le projet ne nécessite pas `node_modules`. Avant un commit, lancer depuis PowerShell :

```powershell
.\scripts\validate-extension.ps1
.\scripts\test-extension.ps1
```

Pour tester manuellement : configurer l’extension, effectuer une recherche, changer de page, ouvrir le récapitulatif et tester les deux exports.

## Structure

| Fichier | Rôle |
| --- | --- |
| `manifest.json` | Configuration Chrome Manifest V3 |
| `background.js` | Ouverture de la recherche et contrôle initial de configuration |
| `search.html` / `search.js` | Recherche et affichage des tickets |
| `recap.html` / `recap.js` | Récapitulatif et exports |
| `options.html` / `options.js` | Configuration et test de connexion |
| `jira-api.js` | Utilitaires de configuration, authentification et appels Jira |
| `scripts/` | Contrôles locaux du dépôt |

## Limites connues

- L’extension fonctionne avec Jira Cloud et l’API REST Jira v3.
- Les autorisations d’accès restent celles du compte Atlassian configuré.
- Tailwind CSS et Flowbite sont chargés depuis CDN.

## Contribution

Consulter [CONTRIBUTING.md](CONTRIBUTING.md) et [SECURITY.md](SECURITY.md).

## Licence

Ce projet est distribué sous licence MIT. Voir [LICENSE](LICENSE).
