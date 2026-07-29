# Tests de bout en bout (Playwright)

Le site est servi **en local** par `kit/static-server.mjs` puis parcouru dans un vrai Chromium.
La suite est donc hermétique : pas de réseau sortant, pas de dépendance à l'état de la
production. Elle teste le code de la branche courante.

## Lancer

```bash
npm install                                          # une fois
npx playwright install chromium                      # une fois
npm run test:e2e                                     # tout

E2E_MAX_PAGES=5 npm run test:e2e                     # passe rapide
E2E_BASE_URL=https://exemple.com npm run test:e2e    # contre la prod ou une preview
npx playwright test e2e/smoke.spec.ts                # une seule suite
npx playwright test --ui                             # inspection pas à pas
```

| Variable | Rôle |
|---|---|
| `E2E_BASE_URL` | Vise une URL déployée. Le serveur local n'est alors pas démarré |
| `E2E_PORT` | Port du serveur statique local (défaut `4173`) |
| `E2E_MAX_PAGES` | N'teste que les N premières pages |
| `E2E_CHROMIUM_PATH` | Utilise un Chromium déjà présent sur la machine |

## Les cinq suites

| Fichier | Ce qu'il attrape |
|---|---|
| `smoke.spec.ts` | Page qui ne charge pas, erreur JS, ressource du site en échec, page vide |
| `seo.spec.ts` | Titre absent ou trop long, description manquante, `lang` absent, H1 multiple, viewport manquant, robots.txt qui bloque tout |
| `links.spec.ts` | Lien interne mort, image cassée |
| `a11y.spec.ts` | Image sans `alt`, lien sans intitulé, `id` dupliqué, champ sans étiquette |
| `responsive.spec.ts` | Débordement horizontal en mobile, avec le sélecteur du bloc fautif |

Un test est généré **par page**, donc le rapport nomme la page en cause.

## Périmètre : ce qui n'est volontairement PAS testé

- **Les liens externes.** Ils dépendent de tiers et rendraient la suite instable.
- **Les ressources tierces** (polices, CDN, traceurs). Un CDN injoignable sur le réseau du
  moment n'est pas un défaut de ce repo. Seules les ressources servies par le site sont jugées.
- **Le contenu éditorial.** On vérifie qu'une description existe et fait la bonne longueur,
  pas qu'elle soit bien écrite.

## Le seul fichier à adapter

`site.config.ts` : dossier servi, langue, pages à exclure, seuils SEO, ou liste explicite de
routes pour une application à routage côté code. Les specs et `kit/` sont identiques dans tous
les repos du groupe : ne les modifie pas localement, sinon la mise à jour du kit écrasera le
correctif.

## Quand un test échoue

Trois issues, dans cet ordre de préférence :

1. **C'est un vrai défaut** → corrige le site. C'est le cas nominal.
2. **La règle ne colle pas à ce site** → ajuste `site.config.ts` (seuil, `ignore`).
3. **C'est du bruit de tiers** → ajoute le motif dans `BENIGN` de `kit/helpers.ts`, avec un
   commentaire qui dit pourquoi.

Ne désactive pas une suite pour verdir la CI : une suite contournée ne protège plus rien.
