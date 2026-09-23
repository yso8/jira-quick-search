# Politique de confidentialité — Jira Quick Search

Dernière mise à jour : 23 septembre 2026

## 1. Présentation

Jira Quick Search est une extension Chrome qui permet de rechercher et de consulter des tickets Jira Cloud depuis le navigateur.

L’extension fonctionne directement dans Chrome et ne possède pas de serveur backend propre.

## 2. Données utilisées

Selon les fonctionnalités utilisées, l’extension manipule les données suivantes :

- l’URL de l’instance Jira configurée ;
- l’adresse e-mail Atlassian ;
- le token API Jira ;
- les résultats et métadonnées des tickets accessibles au compte Jira ;
- les tickets récemment consultés ;
- les tickets épinglés ;
- les recherches sauvegardées ;
- les règles et préférences du récapitulatif ;
- les préférences de diagnostic, notamment l’activation des logs locaux et la date du dernier diagnostic ;
- des informations techniques non sensibles lorsque l’utilisateur choisit de les inclure dans un brouillon de feedback.

## 3. Utilisation des données

Ces données sont utilisées uniquement pour :

- authentifier l’utilisateur auprès de l’instance Jira configurée ;
- effectuer les recherches demandées ;
- afficher les tickets et leurs informations ;
- générer les récapitulatifs d’activité ;
- conserver les préférences et l’espace de travail de l’utilisateur ;
- préparer un brouillon de feedback lorsque l’utilisateur le demande.

Jira Quick Search ne vend, ne loue et ne partage pas ces données à des fins publicitaires ou d’analytics.

## 4. Stockage

- L’URL Jira, l’adresse e-mail et le token API sont stockés dans `chrome.storage.sync`.
- Les tickets récents, tickets épinglés, recherches sauvegardées et préférences locales sont stockés dans `chrome.storage.local`.
- Les règles d’activité du récapitulatif sont stockées dans `chrome.storage.sync`.
- L’extension ne chiffre pas elle-même le token API. `chrome.storage.sync` ne doit pas être considéré comme un coffre-fort ou comme un chiffrement applicatif.
- Aucune donnée n’est stockée dans un serveur appartenant au projet Jira Quick Search.
- Les données stockées par l’extension peuvent être supprimées depuis la page Paramètres.

## 5. Transmission des données

Les requêtes Jira sont envoyées directement vers l’instance configurée. Jira Quick Search ne possède aucun serveur intermédiaire et ne transmet aucune donnée à sa propre infrastructure. Les données placées dans `chrome.storage.sync` peuvent toutefois être synchronisées par Chrome selon la configuration du navigateur.

Aucun outil d’analytics ou de tracking n’est intégré à l’extension. Aucun feedback n’est envoyé automatiquement.

Lorsqu’un utilisateur choisit une action de feedback, l’extension prépare un brouillon d’issue GitHub contenant le titre, la description et, si l’utilisateur l’a demandé, des informations techniques non sensibles. L’utilisateur peut vérifier et modifier ce brouillon avant toute publication sur GitHub.

## 6. Token API

Le token API sert à authentifier les appels effectués auprès de Jira Cloud.

- Il est masqué dans l’interface.
- Il n’est pas écrit dans les logs de diagnostic ; les champs sensibles sont masqués lorsqu’ils sont journalisés.
- Il n’est pas inclus dans les détails de diagnostic copiables.
- Il n’est pas ajouté automatiquement aux brouillons de feedback.

L’utilisateur doit utiliser un token dédié et le révoquer immédiatement en cas d’exposition. L’utilisateur reste responsable de la gestion de son token Atlassian.

## 7. Permissions Chrome

L’extension déclare les permissions suivantes dans `manifest.json` :

- `storage` : enregistrer et relire la configuration Jira, les préférences et les données de l’espace de travail ;
- `host_permissions` — `https://*.atlassian.net/*` : autorise les appels réseau directs vers les instances Jira Cloud configurées.

Ces permissions sont nécessaires au fonctionnement de la configuration, de la recherche, des diagnostics et des récapitulatifs.

## 8. Services tiers

- **Atlassian Jira Cloud** : accès direct aux tickets, métadonnées, utilisateurs et historiques autorisés par le compte configuré.
- **GitHub** : utilisé uniquement lorsqu’un utilisateur choisit de préparer un feedback. GitHub ne reçoit pas automatiquement les données de l’extension.

## 9. Suppression des données

Pour supprimer les données stockées par Jira Quick Search :

1. Ouvrez la page **Paramètres** de l’extension.
2. Utilisez **Supprimer toutes les données locales**.
3. Si nécessaire, supprimez ensuite l’extension depuis Chrome afin de retirer les données d’extension restantes gérées par Chrome.
4. Révoquez séparément le token API depuis votre compte Atlassian.

La révocation du token Atlassian et la suppression d’éventuelles données déjà publiées sur GitHub ne sont pas effectuées par Jira Quick Search.

## 10. Modifications de cette politique

Cette politique pourra être mise à jour si le fonctionnement de l’extension ou ses traitements de données évoluent. La date de dernière mise à jour sera modifiée en conséquence.

## 11. Contact

Pour toute question ou remarque, utilisez le dépôt GitHub du projet :

<https://github.com/yso8/jira-quick-search>
