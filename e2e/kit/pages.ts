import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * Découverte des pages à tester.
 *
 * La liste est construite au chargement du fichier de spec (donc de façon
 * synchrone) : Playwright peut ainsi générer un test par page au moment de la
 * collecte, et le rapport nomme chaque page individuellement.
 */

/** Pages toujours exclues : fragments, gabarits et pages de travail. */
const DEFAULT_IGNORE = [
  /(^|\/)_/, // _navigation.html, _qa.html… : fragments inclus ailleurs
  /(^|\/)node_modules\//,
  /(^|\/)\./, // dossiers cachés
];

export type PageRoute = {
  /** Route servie, ex. "/methode" ou "/" pour l'accueil. */
  route: string;
  /** Chemin du fichier source, relatif à la racine du site. */
  file: string;
};

function walk(dir: string, root: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    let s;
    try {
      s = statSync(full);
    } catch {
      continue; // lien cassé : on ignore
    }
    if (s.isDirectory()) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      walk(full, root, out);
    } else if (entry.endsWith(".html")) {
      out.push(relative(root, full).split(sep).join("/"));
    }
  }
}

/**
 * Liste les pages HTML d'un site statique, converties en routes propres.
 *
 * @param siteRoot Racine du site (dossier servi).
 * @param ignore   Motifs supplémentaires à exclure.
 */
export function discoverPages(siteRoot: string, ignore: RegExp[] = []): PageRoute[] {
  if (!existsSync(siteRoot)) return [];
  const files: string[] = [];
  walk(siteRoot, siteRoot, files);

  const filters = [...DEFAULT_IGNORE, ...ignore];
  const retenues = files
    .filter((f) => !filters.some((re) => re.test(f)))
    .map((file) => ({ file, route: toRoute(file) }))
    .sort((a, b) => a.route.localeCompare(b.route));

  return dedupeRoutes(retenues);
}

/**
 * Une route ne peut correspondre qu'à une page.
 *
 * Deux fichiers peuvent pourtant viser la même URL : `sigmagia.html` et
 * `sigmagia/index.html` répondent tous deux à `/sigmagia`. Ce n'est pas un cas
 * théorique, et c'est ambigu pour de vrai : selon l'hébergeur, l'un ou l'autre
 * est servi. On tranche comme le fait `static-server.mjs` (l'index de dossier
 * gagne) et on le signale, pour que l'ambiguïté soit vue plutôt que subie.
 */
function dedupeRoutes(pages: PageRoute[]): PageRoute[] {
  const parRoute = new Map<string, PageRoute[]>();
  for (const p of pages) {
    const liste = parRoute.get(p.route);
    if (liste) liste.push(p);
    else parRoute.set(p.route, [p]);
  }

  const out: PageRoute[] = [];
  for (const [route, candidats] of parRoute) {
    if (candidats.length === 1) {
      out.push(candidats[0]);
      continue;
    }
    // Même priorité que le serveur : `X/index.html` avant `X.html`.
    const gagnant =
      candidats.find((c) => c.file.endsWith("/index.html")) ?? candidats[0];
    const perdants = candidats.filter((c) => c !== gagnant).map((c) => c.file);
    console.warn(
      `[e2e] ${route} est servi par plusieurs fichiers : ${gagnant.file} est ` +
        `testé, ${perdants.join(", ")} ignoré(s). À clarifier dans le repo.`,
    );
    out.push(gagnant);
  }

  return out.sort((a, b) => a.route.localeCompare(b.route));
}

/** "index.html" -> "/", "blog/index.html" -> "/blog", "methode.html" -> "/methode". */
export function toRoute(file: string): string {
  if (file === "index.html") return "/";
  if (file.endsWith("/index.html")) return "/" + file.slice(0, -"/index.html".length);
  return "/" + file.replace(/\.html$/, "");
}
