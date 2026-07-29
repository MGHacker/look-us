import { test as base, expect } from "@playwright/test";

/**
 * Le `test` utilisé par toutes les specs du kit : identique à celui de
 * Playwright, mais avec les requêtes tierces coupées.
 *
 * Pourquoi couper ? Le kit ne juge déjà que les ressources servies par le site
 * (voir `helpers.ts`). Or un script tiers placé dans le `<head>` retarde le
 * `DOMContentLoaded` jusqu'à son propre échec : sur un réseau qui filtre les
 * traceurs, chaque page mettait plus de dix secondes à se déclarer prête. En
 * les interrompant tout de suite, on gagne un ordre de grandeur et la suite
 * devient réellement hermétique : elle donne le même résultat en ligne, hors
 * ligne, et derrière un proxy d'entreprise.
 *
 * Ce que cela ne change pas : le HTML, le CSS, le JS et les images du site sont
 * bien chargés et exécutés. Ce sont eux qu'on teste.
 *
 * Pour observer le site avec ses tiers (débogage d'une intégration Calendly,
 * d'un pixel…) : `E2E_ALLOW_THIRD_PARTY=1 npm run test:e2e`.
 */
export const test = base.extend({
  page: async ({ page, baseURL }, use) => {
    if (!process.env.E2E_ALLOW_THIRD_PARTY && baseURL) {
      const origin = new URL(baseURL).origin;

      // Le filtre est dans le prédicat d'URL, pas dans le gestionnaire : ainsi
      // les requêtes du site ne sont PAS interceptées du tout.
      //
      // La version naïve (`page.route("**/*", …)` puis `route.continue()` pour
      // l'interne) marche la plupart du temps, mais fait repasser chaque
      // ressource par la couche d'interception. Sous exécution parallèle, ça
      // s'est traduit par un « SyntaxError: Invalid or unexpected token »
      // intermittent au chargement d'un module ES : un run vert, le suivant
      // rouge, sur le même commit. On ne touche donc plus qu'aux requêtes
      // qu'on veut réellement couper.
      await page.route(
        (url) => {
          const href = url.href;
          if (href.startsWith(origin)) return false;
          return !/^(data|blob|about):/.test(href);
        },
        (route) => route.abort(),
      );
    }
    await use(page);
  },
});

export { expect };
