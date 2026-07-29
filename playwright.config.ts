import { defineConfig, devices } from "@playwright/test";
import { site } from "./e2e/site.config";

/**
 * Suite E2E (navigateur réel, headless) — Look Us — cockpit d'autorité.
 *
 * Par défaut, les tests tournent contre le site servi EN LOCAL par
 * `e2e/kit/static-server.mjs` : la suite est donc hermétique, sans réseau, et
 * teste bien le code de la branche courante plutôt que la prod du moment.
 *
 * Pour viser un environnement déployé (preview ou production) :
 *   E2E_BASE_URL=https://exemple.com npm run test:e2e
 * Le serveur local n'est alors pas démarré.
 */
const PORT = Number(process.env.E2E_PORT ?? 4173);
const EXTERNE = process.env.E2E_BASE_URL;
const BASE_URL = EXTERNE ?? `http://127.0.0.1:${PORT}`;

/**
 * Chromium à utiliser. Par défaut celui que Playwright gère lui-même
 * (`npx playwright install chromium`). `E2E_CHROMIUM_PATH` permet de pointer un
 * binaire déjà présent sur la machine — utile sur un poste qui a déjà Chrome,
 * ou dans un conteneur où les navigateurs sont préinstallés à une autre version.
 */
const CHROMIUM = process.env.E2E_CHROMIUM_PATH;

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(CHROMIUM ? { launchOptions: { executablePath: CHROMIUM } } : {}),
      },
    },
  ],

  // Serveur statique local : démarré seulement si l'on ne vise pas une URL externe.
  webServer: EXTERNE
    ? undefined
    : {
        command: `node e2e/kit/static-server.mjs ${site.root} ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
      },
});
