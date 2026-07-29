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
