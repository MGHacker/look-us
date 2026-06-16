# Look Us — l'instrument de mesure de l'autorité

App web **responsive** (desktop + mobile) qui mesure l'autorité d'un expert B2B sur **5 dimensions** (anti-vanity, pas un compteur de followers), la capture en **CSV** sur mobile, et l'achemine vers un **FTP / CRM / base de données** depuis la console desktop.

- 📱 **Capture** (mobile) : saisie des métriques ou import de l'export LinkedIn → score d'autorité + plan d'action → export CSV.
- 🖥️ **Console** (desktop) : import du CSV → aperçu → destination FTP / CRM / base de données.
- **Moteur** : port vanilla de `@look-us/scoring-engine` (lib pure testée — 48 tests). Reach 15 · Resonance 35 · Consistency 20 · Momentum 20 · Breadth 10.

Design : « The Authority Instrument » — éditorial, encre + or, serif à fort contraste (Fraunces).

## Lancer en local
Site 100 % statique, **aucune build**. Sers le dossier :
```bash
npx serve .
# ou : python -m http.server
```

## Déploiement (Netlify)
Statique, `publish = "."` (cf. `netlify.toml`). Connecter ce repo GitHub dans Netlify → déploiement auto à chaque push.

> Note : l'envoi réel vers FTP/CRM/DB nécessite une **fonction serverless** (le navigateur ne peut pas ouvrir une connexion FTP). L'UI génère le payload ; la fonction d'acheminement est le prochain incrément.
