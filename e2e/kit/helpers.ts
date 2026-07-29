import type { Page, Response } from "@playwright/test";

/**
 * Outils partagés par les specs : collecte des erreurs console et des requêtes
 * en échec, avec une liste de bruits connus à ignorer.
 */

/**
 * Bruit attendu en environnement de test, à ne pas confondre avec un vrai bug :
 * traceurs et widgets tiers bloqués ou absents hors production.
 */
const BENIGN = [
  /google-analytics|googletagmanager|gtag|analytics\.js/i,
  /facebook\.net|fbevents|connect\.facebook/i,
  /hotjar|clarity\.ms|segment\.(io|com)/i,
  /doubleclick|adservice|adsbygoogle/i,
  /calendly|hs-scripts|hubspot|crisp\.chat|tawk\.to/i,
  /favicon\.ico/i,
  /ERR_BLOCKED_BY_CLIENT|net::ERR_INTERNET_DISCONNECTED/i,
  /Failed to load resource: the server responded with a status of 4\d\d.*(analytics|pixel|track)/i,
];

export function isBenign(message: string): boolean {
  return BENIGN.some((re) => re.test(message));
}

export type PageProblems = {
  consoleErrors: string[];
  failedRequests: string[];
};

/** Vrai si l'URL appartient au site testé (et non à un tiers). */
function sameOrigin(url: string, origin: string): boolean {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}

/**
 * Branche les écouteurs sur la page AVANT navigation et renvoie l'accumulateur.
 *
 * Deux filtres, pour que la suite reste stable partout (poste hors ligne, CI
 * sans accès sortant, réseau d'entreprise filtrant) :
 *
 * 1. **Même domaine uniquement.** Une police Google ou un CDN qui ne répond pas
 *    n'est pas un défaut de notre code, et son sort varie d'un réseau à l'autre.
 *    On ne juge que les ressources que le repo contrôle vraiment.
 * 2. **Bruit connu** (`BENIGN`) : traceurs et widgets, même en première partie.
 *
 * Les vraies erreurs JS (`pageerror`) sont conservées quelle qu'en soit
 * l'origine : un script tiers qui casse la page casse la page.
 */
export function watchProblems(page: Page, origin: string): PageProblems {
  const problems: PageProblems = { consoleErrors: [], failedRequests: [] };

  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    // Les échecs de chargement sont déjà couverts, avec l'URL exacte, par les
    // écouteurs réseau ci-dessous. Ici on ne garde que les erreurs de code.
    if (/^Failed to load resource/i.test(text)) return;
    if (!isBenign(text)) problems.consoleErrors.push(text);
  });

  page.on("pageerror", (err) => {
    const text = `${err.name}: ${err.message}`;
    if (!isBenign(text)) problems.consoleErrors.push(text);
  });

  page.on("requestfailed", (req) => {
    if (!sameOrigin(req.url(), origin)) return;
    const text = `${req.url()} (${req.failure()?.errorText ?? "échec"})`;
    if (!isBenign(text)) problems.failedRequests.push(text);
  });

  page.on("response", (resp: Response) => {
    if (resp.status() < 400) return;
    if (!sameOrigin(resp.url(), origin)) return;
    const text = `${resp.url()} -> HTTP ${resp.status()}`;
    if (!isBenign(text)) problems.failedRequests.push(text);
  });

  return problems;
}

/** Normalise une URL en chemin interne, ou null si externe / non navigable. */
export function toInternalPath(href: string, origin: string): string | null {
  if (!href) return null;
  if (/^(mailto:|tel:|javascript:|data:|#)/i.test(href)) return null;
  let url: URL;
  try {
    url = new URL(href, origin);
  } catch {
    return null;
  }
  if (url.origin !== origin) return null; // lien externe : hors périmètre
  return url.pathname + url.search;
}
