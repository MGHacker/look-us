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

      // Une page peut être volontairement exclue de l'index (mentions légales,
      // page de remerciement, copie intérimaire d'un autre site…).
      const robotsMeta = page.locator('head meta[name="robots"]');
      const robots =
        (await robotsMeta.count()) > 0
          ? ((await robotsMeta.first().getAttribute("content")) ?? "")
          : "";
      const indexable = !/noindex/i.test(robots);

      // Meta description : présente et de longueur exploitable, sur les pages
      // indexables seulement.
      //
      // Cette balise n'a qu'un consommateur : l'extrait affiché en résultat de
      // recherche. Une page en `noindex` n'apparaît jamais dans ces résultats,
      // donc ni sa présence ni sa longueur n'y changent quoi que ce soit. Juger
      // une page 404 ou des mentions légales désindexées sur ce critère revient
      // à demander de modifier le site pour faire plaisir au test.
      //
      // Le `count()` avant `getAttribute()` n'est pas cosmétique : sur une page
      // sans balise, `getAttribute` attend la fin du timeout puis échoue sur un
      // message opaque (« locator.getAttribute: Test timeout of 45000ms »), et
      // l'assertion suivante, celle qui nomme le vrai défaut, n'est jamais
      // atteinte. Constaté sur le /404 de poke-piece : 45 secondes perdues pour
      // un diagnostic illisible.
      if (indexable) {
        const descMeta = page.locator('head meta[name="description"]');
        const desc =
          (await descMeta.count()) > 0 ? await descMeta.first().getAttribute("content") : null;
        expect(desc, `meta description sur ${route}`).toBeTruthy();
        const len = desc!.trim().length;
        expect(len, `description de ${route} trop courte`).toBeGreaterThanOrEqual(
          site.seo.descriptionMin,
        );
        expect(len, `description de ${route} trop longue`).toBeLessThanOrEqual(
          site.seo.descriptionMax,
        );
      }

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
