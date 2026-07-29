import { expect, test } from "./kit/fixtures";
import { PAGES, site } from "./site.config";

/**
 * E2E — SEO technique de base, page par page.
 *
 * On ne juge pas la qualité éditoriale ici : on vérifie que chaque page est
 * indexable et présentable (titre, description, langue, un seul H1, canonical
 * et Open Graph si le site les exige), plus robots.txt et sitemap au niveau site.
 */

test.describe("SEO", () => {
  for (const { route } of PAGES) {
    test(`${route} : balises d'indexation`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });

      // Langue déclarée : indispensable aux lecteurs d'écran et aux moteurs.
      const lang = await page.locator("html").getAttribute("lang");
      expect(lang, `<html lang> sur ${route}`).toBeTruthy();
      expect(lang!.toLowerCase()).toContain(site.lang);

      // Titre présent, non vide, et pas à rallonge (tronqué en SERP).
      const title = (await page.title()).trim();
      expect(title.length, `titre de ${route}`).toBeGreaterThan(5);
      expect(title.length, `titre de ${route} trop long (tronqué en SERP)`).toBeLessThanOrEqual(
        site.seo.titleMax,
      );
      if (site.titlePattern) expect(title).toMatch(site.titlePattern);

      // Meta description : présente et de longueur exploitable.
      const desc = await page
        .locator('head meta[name="description"]')
        .first()
        .getAttribute("content");
      expect(desc, `meta description sur ${route}`).toBeTruthy();
      const len = desc!.trim().length;
      expect(len, `description de ${route} trop courte`).toBeGreaterThanOrEqual(
        site.seo.descriptionMin,
      );
      expect(len, `description de ${route} trop longue`).toBeLessThanOrEqual(
        site.seo.descriptionMax,
      );

      // Un seul H1 : la hiérarchie du document doit être sans ambiguïté.
      const h1 = page.locator("h1");
      expect(await h1.count(), `nombre de <h1> sur ${route}`).toBe(1);
      expect((await h1.first().innerText()).trim().length).toBeGreaterThan(2);

      // Viewport : sans lui, le site n'est pas mobile-friendly pour Google.
      await expect(page.locator('head meta[name="viewport"]')).toHaveCount(1);

      if (site.seo.requireCanonical) {
        const canonical = await page
          .locator('head link[rel="canonical"]')
          .first()
          .getAttribute("href");
        expect(canonical, `canonical sur ${route}`).toBeTruthy();
      }

      if (site.seo.requireOpenGraph) {
        for (const prop of ["og:title", "og:description", "og:image"]) {
          await expect(
            page.locator(`head meta[property="${prop}"]`),
            `${prop} sur ${route}`,
          ).toHaveCount(1);
        }
      }
    });
  }

  test("robots.txt correspond à l'intention d'indexation", async ({ request }) => {
    const r = await request.get("/robots.txt");
    test.skip(r.status() === 404, "pas de robots.txt sur ce site");
    expect(r.status()).toBe(200);
    const body = await r.text();

    // Un « Disallow: / » sous « User-agent: * » met le site hors des moteurs.
    const toutBloque = /User-agent:\s*\*[\s\S]*?Disallow:\s*\/\s*$/im.test(body);

    if (site.seo.expectIndexable) {
      expect(toutBloque, "robots.txt bloque tout le site alors qu'il doit être indexable").toBe(
        false,
      );
    } else {
      // Site de recette / miroir : la désindexation est le comportement voulu.
      // On vérifie qu'elle tient toujours, pour ne pas exposer un doublon.
      expect(
        toutBloque,
        "ce site doit rester désindexé (seo.expectIndexable = false) mais robots.txt l'autorise",
      ).toBe(true);
    }
  });

  test("le sitemap, s'il existe, référence des URLs", async ({ request }) => {
    const r = await request.get("/sitemap.xml");
    test.skip(r.status() === 404, "pas de sitemap.xml sur ce site");
    expect(r.status()).toBe(200);
    const body = await r.text();
    expect(body).toContain("<urlset");
    expect((body.match(/<loc>/g) ?? []).length).toBeGreaterThan(0);
  });
});
