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
      await page.route("**/*", (route) => {
        const url = route.request().url();
        const interne =
          url.startsWith(origin) ||
          url.startsWith("data:") ||
          url.startsWith("blob:") ||
          url.startsWith("about:");
        return interne ? route.continue() : route.abort();
      });
    }
    await use(page);
  },
});

export { expect };
