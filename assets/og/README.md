# Image Open Graph (`og-home.png`)

Carte 1200×630 affichée quand un lien Look Us est partagé sur LinkedIn / X / Slack
(l'« unfurl »). Charte encre + or, radar des 5 dimensions — cohérente avec la carte
de partage `assets/share-card.js`.

## Régénérer l'image

La source est **`_og-home.html`** (statique, sans JS runtime → rendu déterministe).
Le préfixe `_` l'exclut de la découverte de pages E2E (voir `e2e/kit/pages.ts`).

Après toute modif de `_og-home.html`, régénère le PNG avec un navigateur headless
(PowerShell, Windows) :

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 `
  --window-size=1200,630 --virtual-time-budget=4500 `
  --screenshot="assets\og\og-home.png" `
  "file:///$((Resolve-Path assets\og\_og-home.html).Path -replace '\\','/')"
```

(`msedge.exe` fonctionne à l'identique si Chrome n'est pas installé.)

## Câblage

Les balises `og:image` / `twitter:image` sont **absolues** (LinkedIn et X exigent une
URL d'image absolue) et pointent sur le déploiement live GitHub Pages, dans le `<head>`
de `index.html` et `p/index.html`. **Un seul endroit à changer en cas de domaine custom :**
les 3 URLs `https://mghacker.github.io/look-us/...` de ces deux fichiers.
