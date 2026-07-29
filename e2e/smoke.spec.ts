import { expect, test } from "./kit/fixtures";
import { PAGES, site } from "./site.config";
import { watchProblems } from "./kit/helpers";

/**
 * E2E — fumée : chaque page se charge vraiment dans un navigateur.
 *
 * Une page qui répond 200 mais plante au premier script reste cassée pour le
 * visiteur. On vérifie donc le statut HTTP, le contenu minimal attendu, ET
 * l'absence d'erreur JS ou de ressource en échec (hors traceurs tiers).
 */

test.describe("fumée", () => {
  if (PAGES.length === 0) {
    test("des pages HTML sont découvertes", () => {
      throw new Error(
        `Aucune page trouvée sous « ${site.root} ». Vérifie site.config.ts (champ root).`,
      );
    });
  }

  for (const { route, file } of PAGES) {
    test(`${route} se charge sans erreur (${file})`, async ({ page, baseURL }) => {
      const problems = watchProblems(page, new URL(baseURL!).origin);

      const resp = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(resp?.status(), `statut HTTP de ${route}`).toBeLessThan(400);

      // Contenu minimal : un titre et du texte rendu.
      await expect(page).toHaveTitle(/.+/);
      const bodyText = (await page.locator("body").innerText()).trim();
      expect(bodyText.length, `${route} rend du texte`).toBeGreaterThan(50);

      // Laisse le temps aux scripts différés de lever leurs erreurs.
      await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});

      expect(problems.consoleErrors, `erreurs JS sur ${route}`).toEqual([]);
      expect(problems.failedRequests, `ressources en échec sur ${route}`).toEqual([]);
    });
  }
});
