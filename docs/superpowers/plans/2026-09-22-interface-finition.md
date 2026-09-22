# Finition de l’interface globale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harmoniser l’interface des quatre pages principales sans modifier les fonctionnalités métier, les appels API, le stockage ou les routes.

**Architecture:** Conserver la navbar partagée dans `navbar.js`/`navbar.css`, puis ajuster les classes et textes des quatre pages existantes par groupes cohérents. Le popup reste compact et sans navbar. Les tests de contrat verrouillent les invariants de navigation, de contenu et de structure.

**Tech Stack:** HTML statique, Tailwind CSS local, CSS partagé, JavaScript vanilla, tests Node.js, scripts PowerShell de validation.

**Spec:** `docs/superpowers/specs/2026-09-22-interface-finition-design.md`

## Global Constraints

- Ne pas ajouter de fonctionnalité métier.
- Ne pas modifier les appels API, le stockage existant ou les routes.
- Les quatre pages utilisent le même composant de navbar avec logo, nom, liens textuels et état actif.
- Le popup `popup.html` reste sans navbar.
- Conserver les accents bleu Recherche, orange Workspace, violet Récapitulatif et bleu/neutre Paramètres.
- Ne pas ajouter de bibliothèque, d’animation ou de dépendance.
- Ne pas modifier le README ni générer de captures finales.

## Review Focus

- Une navbar rendue sur une largeur réduite doit rester lisible sans déborder : couvrir dans `tests/navbar.test.js` avec les quatre pages et l’exception popup.
- Un changement de `data-page` ou de lien peut casser l’état actif : couvrir les quatre valeurs de page et les accents dans `tests/navbar.test.js`.
- Les états vides peuvent devenir trop hauts ou perdre leur action utile : couvrir les libellés et actions de `workspace.html` dans `tests/workspace.test.js`.
- Les textes du récapitulatif peuvent devenir incohérents avec les critères : couvrir les libellés de période/règles et les sections dans un test de contrat `tests/recap.test.js`.
- Les contrôles de paramètres peuvent exposer un secret ou perdre leur focus/label : couvrir les IDs de champs, le type password et les messages dans `tests/onboarding.test.js`.

### Task 1: Stabiliser la navbar commune

**Files:**
- Modify: `navbar.js`
- Modify: `navbar.css`
- Test: `tests/navbar.test.js`

**Interfaces:**
- Consumes: `document.body.dataset.page` et l’élément `#global-navbar`.
- Produces: une navbar commune avec les liens `search.html`, `workspace.html`, `recap.html` et `options.html`, l’actif déterminé par `data-page` et l’accent via `--navbar-accent`.

- [ ] **Step 1: Write the failing test**

Ajouter aux tests de navbar des assertions sur les quatre pages principales : chaque page contient `#global-navbar`, charge `navbar.js`, possède le bon `data-page`, et `navbar.js` contient les quatre liens, le logo et les quatre accents. Ajouter l’assertion que `popup.html` ne contient ni `#global-navbar` ni `navbar.js`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/navbar.test.js`

Expected: FAIL si une page ne respecte pas encore le contrat ou si le composant produit un lien/état différent.

- [ ] **Step 3: Write minimal implementation**

Harmoniser uniquement les classes communes dans `navbar.css` : hauteur minimale, padding horizontal, logo de taille constante, liens avec `:hover`, `:focus-visible` et `.is-active`, et retour à la ligne contrôlé sur petite largeur. Conserver les liens textuels et le `data-page` existants. Le résultat attendu suit ce principe :

```css
.global-navbar__link:focus-visible { outline: 2px solid var(--navbar-accent); outline-offset: 2px; }
.global-navbar__link.is-active { color: var(--navbar-accent); font-weight: 600; }
```

Ne pas ajouter la navbar au popup.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/navbar.test.js`

Expected: `navbar: 10 tests passed`.

- [ ] **Step 5: Commit**

```powershell
git add navbar.js navbar.css tests/navbar.test.js
git commit -m "style: harmoniser la navigation globale"
```

### Task 2: Finaliser Recherche Jira et Workspace

**Files:**
- Modify: `search.html`
- Modify: `workspace.html`
- Modify: `workspace.js` uniquement si les textes d’état vide nécessitent une correction
- Test: `tests/quick-access.test.js`
- Test: `tests/workspace.test.js`

**Interfaces:**
- Consumes: les IDs et événements déjà utilisés par `search.js` et `workspace.js`.
- Produces: mêmes IDs fonctionnels, mêmes liens et mêmes actions, avec une hiérarchie visuelle plus compacte et des états vides actionnables.

- [ ] **Step 1: Write the failing test**

Ajouter aux tests de contrat les invariants suivants : `search.html` contient la recherche, filtres, états `initialState`, `loadingSpinner`, `emptyState`, `errorMessage`, résultats et pagination ; `workspace.html` contient tickets épinglés, tickets récents, recherches sauvegardées, `Nouvelle recherche`, `Rechercher`, `Copier le lien`, `Désépingler` et `Retirer de l’historique`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/quick-access.test.js; node tests/workspace.test.js`

Expected: FAIL sur tout contrat nouvellement ajouté avant l’ajustement du markup ou des libellés.

- [ ] **Step 3: Write minimal implementation**

Réduire les espaces verticaux excessifs, aligner les cartes sur les rayons/ombres communs, rendre les boutons d’action cohérents et conserver les états fonctionnels. Pour les états vides, afficher un texte court et un lien vers `search.html`. Ne pas renommer les IDs consommés par les scripts et ne pas modifier les appels Jira.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/quick-access.test.js; node tests/workspace.test.js`

Expected: les deux contrats passent sans modification du comportement JavaScript.

- [ ] **Step 5: Commit**

```powershell
git add search.html workspace.html workspace.js tests/quick-access.test.js tests/workspace.test.js
git commit -m "style: finaliser recherche et workspace"
```

### Task 3: Finaliser Récapitulatif et Paramètres

**Files:**
- Modify: `recap.html`
- Modify: `options.html`
- Modify: `options.js` uniquement si un libellé visible doit être corrigé sans modifier le flux
- Test: `tests/recap.test.js`
- Test: `tests/onboarding.test.js`

**Interfaces:**
- Consumes: IDs et événements existants de `recap.js`, `options.js`, diagnostics, feedback et suppression des données.
- Produces: sections lisibles, contrôles labellisés, états de succès/erreur et confidentialité visuellement cohérents.

- [ ] **Step 1: Write the failing test**

Créer `tests/recap.test.js` avec des assertions de présence pour la sélection de personne, période, règles, bouton de génération, synthèse, statistiques, timeline, tableau et export. Étendre `tests/onboarding.test.js` pour les sections configuration, diagnostics, confidentialité, données locales, feedback, champs password, labels et actions de confirmation.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/recap.test.js; node tests/onboarding.test.js`

Expected: `tests/recap.test.js` échoue avant sa création ou sur les contrats manquants.

- [ ] **Step 3: Write minimal implementation**

Harmoniser la hiérarchie des titres, les espacements de sections, les cartes statistiques, les tableaux, les boutons et les messages. Conserver les critères fonctionnels du récapitulatif et vérifier que les textes ne promettent pas plus que les résultats calculés. Dans Paramètres, garder le token en `type="password"`, les labels associés, les messages de diagnostic/feedback et les confirmations de suppression ; ne jamais afficher sa valeur.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/recap.test.js; node tests/onboarding.test.js`

Expected: les contrats Récapitulatif et Paramètres passent.

- [ ] **Step 5: Commit**

```powershell
git add recap.html options.html options.js tests/recap.test.js tests/onboarding.test.js
git commit -m "style: finaliser recapitulatif et parametres"
```

### Task 4: Vérification globale et revue des libellés

**Files:**
- Modify: `navbar.js`, `navbar.css`, `search.html`, `workspace.html`, `recap.html`, `options.html` et `options.js` uniquement si la revue révèle un libellé ou un état visible à corriger
- Test: tous les fichiers `tests/*.test.js`

**Interfaces:**
- Consumes: les quatre pages et les composants communs finalisés par les tâches précédentes.
- Produces: un dépôt syntaxiquement valide, sans débordement structurel évident ni régression de contrat.

- [ ] **Step 1: Run the full test suite**

Run: `Get-ChildItem tests -Filter '*.test.js' | ForEach-Object { node $_.FullName; if ($LASTEXITCODE -ne 0) { throw \"Échec : $($_.Name)\" } }`

Expected: chaque test affiche son nombre de tests passés et la commande termine avec le code 0.

- [ ] **Step 2: Run syntax and manifest validation**

Run: `./scripts/test-extension.ps1; ./scripts/validate-extension.ps1`

Expected: contrôle syntaxique réussi, tests de l’extension réussis et validation du manifeste/secrets réussie.

- [ ] **Step 3: Run whitespace and repository checks**

Run: `git diff --check; git status --short`

Expected: aucune erreur de whitespace ; le PNG non suivi reste hors de l’index si présent.

- [ ] **Step 4: Perform manual interface review**

Inspect `search.html`, `workspace.html`, `recap.html` et `options.html` à largeur normale et réduite. Vérifier que les quatre navbars sont identiques, que les accents sont distincts mais modérés, que les états vides/erreurs restent compacts, que les focus sont visibles et que le popup conserve sa barre seule.

- [ ] **Step 5: Commit final corrections**

```powershell
git add navbar.js navbar.css search.html workspace.html recap.html options.html options.js tests/navbar.test.js tests/quick-access.test.js tests/workspace.test.js tests/recap.test.js tests/onboarding.test.js
git commit -m "style: terminer la passe interface globale"
```
