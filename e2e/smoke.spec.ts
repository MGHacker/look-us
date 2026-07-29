import type { APIRequestContext, Page } from "@playwright/test";
import { expect, test } from "./kit/fixtures";
import { PAGES, site } from "./site.config";
import { watchProblems } from "./kit/helpers";

/**
 * Re-télécharge chaque script du site référencé par la page et compare la
 * taille reçue à la longueur annoncée. Sert uniquement à enrichir un message
 * d'échec : un script tronqué explique une erreur d'analyse syntaxique que le
 * message du navigateur, lui, n'explique pas.
 */
async function verifierScripts(
  page: Page,
  request: APIRequestContext,
  origin: string,
): Promise<string> {
  const srcs = await page.locator("script[src]").evaluateAll(
    (els, org) =>
      els
        .map((el) => (el as HTMLScriptElement).src)
        .filter((src) => src && src.startsWith(org)),
    origin,
  );

  if (srcs.length === 0) return "aucun script externe sur cette page";

  const lignes: string[] = [];
  for (const src of [...new Set(srcs)]) {
    try {
      const r = await request.get(src);
      const corps = await r.body();
      const annoncee = r.headers()["content-length"];
      const coherent = annoncee === undefined || Number(annoncee) === corps.byteLength;
      lignes.push(
        `${new URL(src).pathname} → HTTP ${r.status()}, ${corps.byteLength} octets` +
          (annoncee === undefined
            ? " (longueur non annoncée)"
            : coherent
              ? " (longueur cohérente)"
              : ` mais content-length annonce ${annoncee} → TRONQUÉ`),
      );
    } catch (e) {
      lignes.push(`${src} → illisible (${(e as Error).message})`);
    }
  }
  return lignes.join(" | ");
}

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

      // Une erreur d'analyse syntaxique se produit à la COMPILATION du script :
      // V8 ne fournit alors aucune pile, et le message seul (« SyntaxError:
      // Invalid or unexpected token ») ne dit ni quel fichier ni pourquoi. La
      // cause la plus vicieuse est un script servi tronqué, qui se compile
      // jusqu'au point de coupure. On vérifie donc l'intégrité des scripts du
      // site avant de rendre le verdict, et on la joint au message d'échec.
      if (problems.consoleErrors.length > 0) {
        const details = await verifierScripts(page, request, new URL(baseURL!).origin);
        expect(
          problems.consoleErrors,
          `erreurs JS sur ${route}. Intégrité des scripts : ${details}`,
        ).toEqual([]);
      }

      expect(problems.consoleErrors, `erreurs JS sur ${route}`).toEqual([]);
      expect(problems.failedRequests, `ressources en échec sur ${route}`).toEqual([]);
    });
  }
});
