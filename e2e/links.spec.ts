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

    test(`${route} : toutes les images se chargent`, async ({ page, baseURL }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});

      const origin = new URL(baseURL!).origin;

      // naturalWidth === 0 après chargement = image cassée (404, chemin faux…).
      // Restreint aux images du site : une image hébergée chez un tiers dépend
      // d'un réseau qu'on ne maîtrise pas et rendrait le test instable.
      const broken = await page.locator("img").evaluateAll(
        (els, org) =>
          els
            .filter((el) => {
              const img = el as HTMLImageElement;
              if (!img.currentSrc && !img.src) return false;
              if (!(img.src || "").startsWith(org)) return false;
              // Les images en lazy hors écran ne sont pas encore décodées : on
              // ne juge que celles que le navigateur a réellement tenté de charger.
              return img.complete && img.naturalWidth === 0;
            })
            .map((el) => (el as HTMLImageElement).getAttribute("src") ?? "(sans src)"),
        origin,
      );

      expect(broken, `images cassées sur ${route}`).toEqual([]);
    });
  }
});
