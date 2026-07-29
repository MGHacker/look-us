import { expect, test } from "./kit/fixtures";
import { PAGES, site } from "./site.config";

/**
 * E2E — rendu mobile.
 *
 * Le défaut classique du site statique : un bloc trop large (tableau, image en
 * largeur fixe, code non wrappé) fait déborder la page horizontalement sur
 * téléphone. Invisible au bureau, catastrophique sur le trafic réel, qui est
 * majoritairement mobile.
 */

// Gabarit iPhone 13 décrit à la main plutôt que via `devices[...]` : le
// descripteur tout fait impose aussi son moteur (WebKit), ce qui sortirait du
// projet Chromium configuré. Seule la géométrie de l'écran nous intéresse ici.
test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});

test.describe("mobile", () => {
  for (const { route } of PAGES) {
    test(`${route} : pas de débordement horizontal`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));

      const debordement = scrollWidth - clientWidth;
      if (debordement > site.mobileOverflowTolerance) {
        // Nomme les coupables pour rendre l'échec directement actionnable.
        const coupables = await page.evaluate((largeur) => {
          const out: string[] = [];
          for (const el of Array.from(document.body.querySelectorAll("*"))) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            if (r.right > largeur + 2) {
              const e = el as HTMLElement;
              const id = e.id ? `#${e.id}` : "";
              const cls = e.className && typeof e.className === "string"
                ? `.${e.className.trim().split(/\s+/).slice(0, 2).join(".")}`
                : "";
              out.push(`${e.tagName.toLowerCase()}${id}${cls} (droite: ${Math.round(r.right)}px)`);
            }
          }
          return [...new Set(out)].slice(0, 8);
        }, clientWidth);

        expect(
          debordement,
          `${route} déborde de ${debordement}px en mobile. Éléments en cause : ${coupables.join(" | ") || "non identifiés"}`,
        ).toBeLessThanOrEqual(site.mobileOverflowTolerance);
      }
    });
  }
});
