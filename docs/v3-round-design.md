# Look Us — round d'amélioration v3 (design)

> Suite de `look-us/docs/improve-plan.md` (v2, 11 améliorations, livré dans `bd57491`).
> Décision utilisateur : « tout » → décomposé en 4 lots, ordonnés par levier × ce qui ship sans dépendance externe.

## Contexte

- **`look-us-web/`** — app statique (Netlify, repo github `MGHacker/look-us`). v2 entièrement livré. C'est la surface déployable, **zéro build**.
- **`look-us/`** — monorepo (NON versionné en propre : le git root remonte au home, sans commits). `scoring-engine` + `connectors` solides ; `apps/web` (Next 16 / Clerk / Stripe / Prisma) bloqué sur les clés de Mehdi.

## Lot A — Solidité + page Historique *(non bloqué)*

**A1.** Réécrire `look-us-web/README.md` : il décrit encore la Console FTP/CRM/DB **supprimée en v2**. Nouveau récit : capture → score → trajectoire → partage.

**A2.** Verrouiller le moteur vanilla `assets/scoring.js` contre la dérive du moteur canonique (`look-us/packages/scoring-engine`). Harnais de test **zéro dépendance** (`node:test` + `node:assert`, shim `window`). Valeurs-or rejouées du test canonique :
- `reachScore` 50k followers → dim.reach `90.9`
- Exemple expert établi (followers 12000, imp 40000, re 600, co 120, rp 40, weeks 13, gap 0, ch 1, prevReachRaw 11000, prevEr 0.022) → **total `57.9`**, tier `GROWING`, dims `{reach 72.1, resonance 34.5, consistency 100, momentum 59.1, breadth 32}`.
- Anti-vanity : 50k followers / 0 engagement → resonance `0`, total < petit compte très engagé.
- Momentum sans `prev` → `50`.
- Tiers : 40→GROWING, 60→ESTABLISHED, 80→AUTHORITY.
- `recommend` + `sensitivityAnalysis` : forme + tri par gain.

**A3.** Fiabiliser `app.js` :
- Réécrire proprement la maj live du compteur `coach-count` (le code actuel s'appuie sur un `$("#coach-count")` qui ne matche rien + un `||` fragile).
- Purger les clés `localStorage` `lus_done_*` dont la règle ne se déclenche plus au calcul courant (évite l'accumulation + reflète la progression).

**A4.** **Vue Historique** (exploite enfin les snapshots `lus_history`). Bouton « Historique (N) » → ouvre une section/panneau :
- sparkline pleine largeur (réutilise le rendu existant, plus grand),
- tableau des relevés : date, score, tier, Δ vs précédent, 5 dimensions,
- « Exporter tout l'historique » (CSV multi-lignes),
- « Réinitialiser l'historique » (avec confirmation).
- Accessible clavier, ferme à l'`Esc`/clic backdrop, respecte `prefers-reduced-motion`.

## Lot B — Viralité / acquisition *(non bloqué)*

**Vérité technique** : l'OG dynamique par score est **impossible** ici — le score voyage dans le `#hash` (jamais envoyé au serveur) et les crawlers LinkedIn n'exécutent pas le JS. Donc on ne fait PAS d'OG dynamique.

**B1.** **Carte de partage téléchargeable** (PNG via `<canvas>`, rendu client) : score, tier, cadran, 5 dimensions, watermark « Look Us ». Bouton « Télécharger ma carte ». Le consultant la poste nativement (les posts image surperforment les posts lien sur LinkedIn). Disponible sur le cockpit (état live) et sur `/p`.

**B2.** Polish copy + SEO : titres/meta de `/` et `/p`, `lang`, OG statiques cohérents, micro-copy de partage.

## Lot C — Vrai produit (monorepo) *(partiellement bloqué)*

Sans clés, je : (1) vérifie les 46 tests `scoring-engine`+`connectors`, (2) revois `apps/web/prisma/schema.prisma`, (3) documente précisément les 3 fournitures de Mehdi dans `look-us/docs/c-blockers.md`. Le branchement live reste côté Mehdi.

## Lot D — Phase 2 multi-plateformes *(spec seulement)*

Le moteur canonique agrège **déjà** plusieurs canaux (`channels[]`, `breadthScore` multi). La Phase 2 = exposer ça côté produit (X / YouTube / Newsletter). Livrable de ce round : **spec design** `look-us/docs/phase2-multiplatform-spec.md` (modèle d'entrée par canal, normalisation, UI multi-canal, impact sur le port vanilla). Code au round suivant.

## Vérification & livraison

- `node --test` vert sur `look-us-web/test/`.
- Monorepo : `npm test` vert (46) sur les 2 packages purs.
- Sanity check manuel du cockpit (démo floutée, calcul, historique, carte).
- **Commit** sur `look-us-web` (branche dédiée — `main` y est le défaut). **Pas de push** (= déploiement Netlify) sans accord explicite de Mehdi.
