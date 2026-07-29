# Instructions projet (Claude)

## Politique de merge & déploiement automatique (Claude)

Autorisation permanente de Mehdi (fondateur), valable pour toutes les sessions et tous les repos :

- Toute pull request ouverte par Claude est **mergée automatiquement, sans demander confirmation, dès que TOUS les checks CI / deploy-preview sont au vert**. Concrètement : passer la PR en « Ready for review » puis merger (squash) sur la branche par défaut.
- **Ne jamais merger** si un check est rouge, en échec ou encore en attente : corriger d'abord (rebase, fix, re-run le job). En cas de conflit avec la branche par défaut, le résoudre ; si la résolution est ambiguë ou à fort impact, escalader à Mehdi.
- Le merge sur la branche par défaut peut déclencher un **déploiement en production** : c'est autorisé tant que les checks sont verts.
- Committer et pusher le travail **automatiquement**, sans demander.
