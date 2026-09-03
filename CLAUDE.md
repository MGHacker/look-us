# Instructions projet (Claude)

## Politique de merge & déploiement automatique (Claude)

Autorisation permanente de Mehdi (fondateur), valable pour toutes les sessions et tous les repos :

- Toute pull request ouverte par Claude est **mergée automatiquement, sans demander confirmation, dès que TOUS les checks CI / deploy-preview sont au vert**. Concrètement : passer la PR en « Ready for review » puis merger (squash) sur la branche par défaut.
- **Ne jamais merger** si un check est rouge, en échec ou encore en attente : corriger d'abord (rebase, fix, re-run le job). En cas de conflit avec la branche par défaut, le résoudre ; si la résolution est ambiguë ou à fort impact, escalader à Mehdi.
- Le merge sur la branche par défaut peut déclencher un **déploiement en production** : c'est autorisé tant que les checks sont verts.
- Committer et pusher le travail **automatiquement**, sans demander.

## MCP Chrome DevTools (vérifier au lieu de deviner)

Le repo déclare le serveur MCP `chrome-devtools` dans `.mcp.json`. Claude Code pilote un vrai
Chrome : DOM, console, requêtes réseau, traces de performance, screenshots, audit Lighthouse.
Concrètement, on ne suppose plus qu'une page marche, on va la regarder.

- **Prérequis** : Node LTS et Chrome installés. Rien d'autre, `npx` récupère le serveur.
- **Activation** : au premier lancement, Claude Code demande d'approuver le serveur du projet.
  `/mcp` affiche l'état de la connexion et la liste des outils.
- **Profil isolé** : `--isolated` crée un profil Chrome temporaire, supprimé à la fermeture.
  Le Chrome personnel, ses onglets et ses sessions ne sont jamais touchés.
- **Usage type** : lancer le serveur de dev, puis demander d'ouvrir l'URL locale et de relever
  les erreurs console, les requêtes en échec, les régressions de perf ou un rendu mobile.
- **Sans interface** (CI, session Claude Code distante) : ajouter à `args`
  `--headless`, `--executablePath <chemin/vers/chrome>` et `--chrome-arg=--no-sandbox`.
- **Vie privée** : le serveur expose le contenu du navigateur au client MCP. Ne pas l'ouvrir sur
  des onglets contenant des données sensibles. Les statistiques d'usage Google sont désactivées
  (`--no-usage-statistics`).

## Règles de code (d'après Andrej Karpathy)

Quatre règles pour éviter les erreurs classiques d'un modèle qui code. Elles privilégient la
prudence à la vitesse : sur une tâche triviale, garder le jugement.
Source : https://github.com/multica-ai/andrej-karpathy-skills

### 1. Réfléchir avant de coder

**Ne rien supposer. Ne pas cacher une confusion. Exposer les compromis.**

Avant d'implémenter :
- Énoncer ses hypothèses explicitement. En cas de doute, demander.
- S'il existe plusieurs interprétations, les présenter, sans en choisir une en silence.
- S'il existe une approche plus simple, le dire. Contester quand c'est justifié.
- Si quelque chose n'est pas clair, s'arrêter, nommer ce qui bloque, demander.

### 2. La simplicité d'abord

**Le minimum de code qui résout le problème. Rien de spéculatif.**

- Aucune fonctionnalité au-delà de ce qui est demandé.
- Aucune abstraction pour du code à usage unique.
- Aucune « flexibilité » ni « configurabilité » que personne n'a demandée.
- Aucune gestion d'erreur pour des scénarios impossibles.
- 200 lignes qui pourraient en faire 50 : réécrire.

Se demander : « Un ingénieur senior dirait-il que c'est trop compliqué ? » Si oui, simplifier.

### 3. Modifications chirurgicales

**Ne toucher qu'au nécessaire. Ne nettoyer que son propre désordre.**

En modifiant du code existant :
- Ne pas « améliorer » le code, les commentaires ou le formatage voisins.
- Ne pas refactorer ce qui n'est pas cassé.
- Respecter le style en place, même si on ferait autrement.
- Du code mort sans rapport avec la tâche : le signaler, pas le supprimer.

Quand la modification crée des orphelins :
- Supprimer les imports, variables et fonctions que SES changements ont rendus inutiles.
- Ne pas supprimer le code mort préexistant sans demande explicite.

Le test : chaque ligne modifiée doit remonter directement à la demande.

### 4. Exécution pilotée par l'objectif

**Définir le critère de succès. Boucler jusqu'à vérification.**

Transformer la tâche en objectif vérifiable :
- « Ajouter une validation » devient « écrire les tests des entrées invalides, puis les faire passer ».
- « Corriger le bug » devient « écrire un test qui le reproduit, puis le faire passer ».
- « Refactorer X » devient « les tests passent avant et après ».

Pour une tâche en plusieurs étapes, annoncer un plan bref : chaque étape, puis la vérification
qui prouve qu'elle est faite. Un critère fort permet de boucler en autonomie. Un critère faible
(« fais marcher ») impose des allers-retours permanents.

Ces règles fonctionnent si : les diffs contiennent moins de changements inutiles, il y a moins de
réécritures pour cause de surcomplication, et les questions de clarification arrivent avant
l'implémentation plutôt qu'après l'erreur.
