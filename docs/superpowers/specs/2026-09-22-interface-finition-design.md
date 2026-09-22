# Finition de l’interface globale — Design

## Objectif

Rendre l’interface de Jira Quick Search cohérente et présentable sur les quatre pages principales : Recherche Jira, Workspace, Récapitulatif et Paramètres. Cette passe ne doit ajouter aucune fonctionnalité métier et ne doit modifier ni les appels API, ni le stockage, ni les routes existantes.

Le popup de recherche reste une exception volontaire : il demeure compact et sans navbar, conformément au choix produit validé précédemment.

## Périmètre

Les ajustements porteront prioritairement sur :

- `navbar.js` et `navbar.css` pour le composant partagé ;
- `search.html`, `workspace.html`, `recap.html` et `options.html` pour la structure et les classes visuelles ;
- les scripts de page uniquement si un libellé ou un état généré doit être rendu cohérent ;
- les tests de contrat existants pour verrouiller les invariants visibles.

Le logo existant du dépôt et les couleurs d’accent actuelles sont conservés : bleu pour la recherche, orange pour le Workspace, violet pour le récapitulatif et bleu/neutre pour les paramètres.

## Architecture visuelle

Les quatre pages utilisent le même composant de navbar : logo à gauche, nom `Jira Quick Search`, liens textuels vers les quatre pages et état actif identifiable. La navbar doit garder une hauteur, des espacements et des comportements focus/hover communs. Elle doit rester utilisable sur les largeurs réduites ; le popup n’est pas concerné.

Les cartes, champs, boutons, bordures, rayons et ombres seront harmonisés à partir des styles existants, sans nouvelle bibliothèque ni refonte complète des classes Tailwind. Les accents de page seront appliqués seulement aux éléments importants.

## Finition par page

- Recherche : hiérarchie claire entre recherche, filtres, actions, résultats, chargement, erreur et absence de résultat ; contrôles et icônes compréhensibles.
- Workspace : présentation orientée usage quotidien, états vides compacts et actions explicites pour les tickets et recherches.
- Récapitulatif : cohérence des contrôles, statistiques, timeline, tableau et exports ; libellés compatibles avec les critères sélectionnés.
- Paramètres : séparation lisible de la configuration, diagnostics, confidentialité/données locales et feedback ; secrets toujours masqués.

## Accessibilité et responsive

Les labels existants seront vérifiés, les focus clavier conservés ou rendus visibles, les textes alternatifs du logo contrôlés et les zones interactives vérifiées. Les pages seront inspectées en largeur large, largeur réduite et avec des textes/états longs afin de détecter les débordements ou contenus coupés.

## Validation

La validation comprend :

1. tests de contrat et tests unitaires existants ;
2. contrôle de syntaxe et validation du manifeste ;
3. vérification des quatre pages, états vides, erreurs et navigation ;
4. contrôle `git diff --check` ;
5. exécution de la commande de build si le dépôt en fournit une.

Le README et les captures finales sont explicitement hors périmètre de cette étape.
