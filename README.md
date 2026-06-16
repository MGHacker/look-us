# Look Us — l'instrument de mesure de l'autorité

App web **responsive** (desktop + mobile) qui mesure l'autorité d'un expert B2B sur **5 dimensions** (anti-vanity, pas un compteur de followers), suit sa **trajectoire** semaine après semaine, et la rend **partageable** comme preuve.

- 📊 **Mesure** : saisis tes stats LinkedIn (30 j) ou importe un CSV Look Us → score d'autorité /100 + tier + plan d'action déterministe.
- 📈 **Trajectoire** : chaque calcul est enregistré localement (rien ne quitte ton appareil) → Momentum réel, delta « +X pts depuis J-7 », sparkline, page Historique, rappel `.ics`.
- ⧉ **Preuve** : carte de score **téléchargeable** (PNG) à poster sur LinkedIn + lien de partage `/p/#…` (le score voyage dans l'URL, lecture seule).

**Moteur** : port vanilla de `@look-us/scoring-engine` (lib pure, monorepo `../look-us/`). Pondérations : Reach 15 · Resonance 35 · Consistency 20 · Momentum 20 · Breadth 10. Le port est **verrouillé par des tests de parité** (`test/scoring.test.mjs`) qui rejouent les valeurs-or du moteur canonique — il ne peut pas dériver en silence.

Design : « The Authority Instrument » — éditorial, encre + or, serif à fort contraste (Fraunces). Cadran SVG + radar des 5 dimensions.

## Lancer en local
Site 100 % statique, **aucune build**. Sers le dossier :
```bash
npx serve .
# ou : python -m http.server
# ou : node _serve.mjs
```

## Tester le moteur
Zéro dépendance (test runner natif de Node ≥ 18) :
```bash
npm test     # = node --test (runner natif, découvre test/*.test.mjs)
```

## Déploiement (Netlify)
Statique, `publish = "."` (cf. `netlify.toml`). Le repo GitHub est connecté à Netlify → **un `git push` déploie en production**.

## Architecture (rappel)
`saisie / import CSV → score (scoring.js, lib pure) → snapshot localStorage (lus_history) → cockpit + trajectoire + coach → carte PNG / lien de partage`

- Tout le calcul et tout le stockage sont **côté client** : aucune donnée n'est envoyée à un serveur.
- **Pas d'OG dynamique par score** (choix assumé) : le score est dans le `#hash` de l'URL, jamais transmis au serveur, et les crawlers sociaux n'exécutent pas le JS. La preuve partageable passe donc par la **carte PNG**, pas par un aperçu de lien.
- V1 = **LinkedIn-only**. Le moteur canonique agrège déjà plusieurs canaux ; l'extension X / YouTube / Newsletter est spécifiée dans `../look-us/docs/phase2-multiplatform-spec.md` (Phase 2).
