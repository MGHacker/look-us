import { expect, test } from "./kit/fixtures";
import { PAGES } from "./site.config";
import { toInternalPath } from "./kit/helpers";

/**
 * E2E — intégrité des liens internes et des images.
 *
 * Le lien mort est le défaut le plus fréquent et le plus coûteux d'un site
 * statique : il survit aux relectures parce que personne ne clique tout. Ici,
 * chaque page est ouverte dans le navigateur, ses liens internes sont extraits
 * puis appelés réellement. Les liens externes sont hors périmètre (ils
 * dépendent de tiers et rendraient la suite instable).
 */

test.describe("liens", () => {
  for (const { route } of PAGES) {
    test(`${route} : aucun lien interne cassé`, async ({ page, request, baseURL }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const origin = new URL(baseURL!).origin;

      const hrefs = await page.locator("a[href]").evaluateAll((els) =>
        els.map((el) => (el as HTMLAnchorElement).getAttribute("href") ?? ""),
      );

      const targets = [...new Set(hrefs.map((h) => toInternalPath(h, origin)).filter(Boolean))];

      const broken: string[] = [];
      for (const target of targets as string[]) {
        const r = await request.get(target, { maxRedirects: 5 });
        if (r.status() >= 400) broken.push(`${target} -> HTTP ${r.status()}`);
      }

      expect(broken, `liens cassés sur ${route}`).toEqual([]);
    });

    test(`${route} : toutes les images se chargent`, async ({ page, request, baseURL }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});

      const origin = new URL(baseURL!).origin;

      // On juge sur la RÉPONSE du serveur, pas sur les dimensions décodées.
      //
      // Le réflexe `naturalWidth === 0` est trompeur : un SVG dont la racine n'a
      // que `viewBox`, sans `width` ni `height`, n'a pas de taille intrinsèque et
      // rapporte donc 0 dans Chromium — alors qu'il s'affiche parfaitement, la
      // taille venant du CSS ou des attributs de la balise `img`. Ce critère
      // signalait ces images comme cassées à tort.
      //
      // Restreint aux images du site : une image hébergée chez un tiers dépend
      // d'un réseau qu'on ne maîtrise pas et rendrait le test instable.
      const sources = await page.locator("img[src]").evaluateAll(
        (els, org) =>
          els
            .map((el) => (el as HTMLImageElement).src)
            .filter((src) => src && src.startsWith(org)),
        origin,
      );

      const broken: string[] = [];
      for (const src of [...new Set(sources)]) {
        const r = await request.get(src);
        if (r.status() >= 400) broken.push(`${src} -> HTTP ${r.status()}`);
      }

      expect(broken, `images cassées sur ${route}`).toEqual([]);
    });
  }
});
