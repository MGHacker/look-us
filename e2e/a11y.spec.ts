import { expect, test } from "./kit/fixtures";
import { PAGES } from "./site.config";

/**
 * E2E — accessibilité : les manquements structurels, ceux qui bloquent
 * réellement un lecteur d'écran et que Google pénalise.
 *
 * Périmètre volontairement restreint aux règles vérifiables sans jugement
 * humain : alternatives d'images, noms accessibles, unicité des identifiants,
 * étiquettes de formulaire. Le confort visuel (contrastes, focus) relève d'un
 * audit dédié.
 */

test.describe("accessibilité", () => {
  for (const { route } of PAGES) {
    test(`${route} : images, liens et champs nommés`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });

      // 1. Toute image porte un attribut alt (vide si décorative, mais présent).
      const imgsSansAlt = await page.locator("img:not([alt])").evaluateAll((els) =>
        els.map((el) => (el as HTMLImageElement).getAttribute("src") ?? "(sans src)"),
      );
      expect(imgsSansAlt, `images sans attribut alt sur ${route}`).toEqual([]);

      // 2. Tout lien a un nom accessible : texte, aria-label, ou image avec alt.
      const liensMuets = await page.locator("a[href]").evaluateAll((els) =>
        els
          .filter((el) => {
            const a = el as HTMLAnchorElement;
            const texte = (a.textContent ?? "").trim();
            const aria = a.getAttribute("aria-label") ?? a.getAttribute("title") ?? "";
            const altImg = Array.from(a.querySelectorAll("img"))
              .map((i) => i.getAttribute("alt") ?? "")
              .join("");
            return !texte && !aria.trim() && !altImg.trim();
          })
          .map((el) => (el as HTMLAnchorElement).getAttribute("href") ?? "(sans href)"),
      );
      expect(liensMuets, `liens sans intitulé accessible sur ${route}`).toEqual([]);

      // 3. Identifiants uniques : un id dupliqué casse label/for et les ancres.
      const idsDupliques = await page.evaluate(() => {
        const vus = new Set<string>();
        const doublons = new Set<string>();
        for (const el of Array.from(document.querySelectorAll("[id]"))) {
          const id = el.id;
          if (!id) continue;
          if (vus.has(id)) doublons.add(id);
          vus.add(id);
        }
        return [...doublons];
      });
      expect(idsDupliques, `identifiants dupliqués sur ${route}`).toEqual([]);

      // 4. Champs de formulaire visibles : chacun doit avoir une étiquette.
      const champsSansLabel = await page
        .locator(
          "input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea",
        )
        .evaluateAll((els) =>
          els
            .filter((el) => {
              const champ = el as HTMLInputElement;
              if (champ.getAttribute("aria-label")?.trim()) return false;
              if (champ.getAttribute("aria-labelledby")?.trim()) return false;
              if (champ.closest("label")) return false;
              if (champ.id && document.querySelector(`label[for="${CSS.escape(champ.id)}"]`))
                return false;
              return true;
            })
            .map((el) => {
              const c = el as HTMLInputElement;
              return c.name || c.id || c.tagName.toLowerCase();
            }),
        );
      expect(champsSansLabel, `champs sans étiquette sur ${route}`).toEqual([]);
    });
  }
});
