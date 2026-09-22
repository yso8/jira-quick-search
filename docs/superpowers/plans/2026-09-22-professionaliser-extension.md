# Professionnaliser Jira Quick Search — Implementation Plan

**Goal:** Rendre l’extension présentable sur GitHub, plus cohérente, plus sûre et vérifiable, sans changer son objectif fonctionnel.

**Architecture:** Conserver l’extension Chrome Manifest V3 sans dépendance NPM obligatoire. Centraliser les utilitaires partagés dans un module JavaScript chargé par les pages, puis ajouter des contrôles locaux simples et reproductibles.

**Tech Stack:** Chrome Manifest V3, JavaScript vanilla, HTML, Tailwind CSS CDN, Flowbite CDN, PowerShell.

## Global Constraints

- Aucun push distant.
- Un commit par lot fonctionnel.
- Interface et documentation en français.
- Ne pas exposer de token Jira dans le dépôt.
- Préserver la compatibilité avec Chrome Manifest V3.

## Review Focus

- README cohérent avec les technologies réellement utilisées.
- Tous les fichiers référencés par le manifeste existent.
- Les données Jira affichées dans le HTML ne sont pas interprétées comme du HTML arbitraire.
- La validation d’URL n’autorise que les sites Jira Cloud attendus.
- Les scripts de validation fonctionnent sans installation NPM.

### Lot 1 — Documentation et présentation

- Remplacer le README incomplet et contradictoire.
- Ajouter `LICENSE`, `.gitignore`, `CONTRIBUTING.md`, `SECURITY.md`.
- Ajouter une documentation de structure et de test local.
- Ajouter le plan lui-même.
- Vérifier le manifeste et créer un commit `docs: professionnaliser la présentation du projet`.

### Lot 2 — Utilitaires et nettoyage

- Créer `jira-api.js` pour la configuration, l’authentification, les URLs et les erreurs API.
- Charger ce module avant les scripts de page.
- Remplacer les lectures de configuration et headers dupliqués.
- Supprimer les logs de debug.
- Créer un commit `refactor: centraliser la configuration et les appels Jira`.

### Lot 3 — Validation et sécurité d’affichage

- Ajouter une validation stricte de l’URL Jira.
- Ajouter un échappement HTML partagé.
- Utiliser cet échappement sur les valeurs provenant de Jira injectées dans le DOM.
- Améliorer les erreurs visibles pour les cas API courants.
- Créer un commit `fix: renforcer la validation et la sécurité côté extension`.

### Lot 4 — Contrôles qualité

- Créer des scripts PowerShell de validation du manifeste, des références et de la syntaxe.
- Ajouter une workflow GitHub Actions non publiant.
- Documenter l’exécution locale.
- Exécuter les contrôles, inspecter le diff et créer un commit `ci: ajouter les contrôles qualité de l’extension`.
