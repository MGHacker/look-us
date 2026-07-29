// Serveur statique zéro-dépendance pour les tests E2E.
//
// Usage : node static-server.mjs [racine] [port] [--spa]
//
// Sert le dossier passé en 1er argument (défaut : racine du repo) sur le port
// donné en 2e argument (défaut : 4173). Reproduit le comportement des hébergeurs
// statiques utilisés en prod (Netlify / Vercel / GitHub Pages) :
//   /            -> index.html
//   /methode     -> methode.html      (clean URLs)
//   /blog/       -> blog/index.html
//   inconnu      -> 404.html si présent, sinon 404 texte
//
// Avec `--spa`, une route inconnue renvoie `index.html` en 200 : c'est le
// comportement attendu d'une application à routage côté client, où `/login`
// n'existe pas sur le disque mais est une vraie page pour l'utilisateur.
//
// Aucune dépendance npm : il tourne tel quel en CI, hors ligne.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";

const ARGS = process.argv.slice(2);
const SPA = ARGS.includes("--spa");
const POSITIONAL = ARGS.filter((a) => !a.startsWith("--"));

const ROOT = resolve(POSITIONAL[0] ?? ".");
const PORT = Number(POSITIONAL[1] ?? 4173);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
};

/**
 * Règles de `_redirects`, au format Netlify : `depuis  vers  [statut]`.
 *
 * Sans elles, le serveur de test répondait 404 sur toute URL qui n'existe que
 * grâce à une redirection — un lien parfaitement valide en production était
 * alors signalé comme mort. Sur growth-consult-site, ce fichier compte 239
 * règles : les ignorer, c'est ne pas tester le site réel.
 *
 * Couvre l'essentiel : correspondance exacte, joker de fin `/*` avec `:splat`,
 * et les statuts 301/302 (redirection) comme 200 (réécriture servie sur place).
 */
function chargerRedirections(root) {
  const f = join(root, "_redirects");
  if (!existsSync(f)) return [];
  const regles = [];
  for (const ligne of readFileSync(f, "utf8").split("\n")) {
    const nette = ligne.trim();
    if (!nette || nette.startsWith("#")) continue;
    const [depuis, vers, statutBrut] = nette.split(/\s+/);
    if (!depuis || !vers) continue;
    regles.push({
      depuis,
      vers,
      statut: Number(statutBrut ?? 301) || 301,
      joker: depuis.endsWith("/*"),
      prefixe: depuis.endsWith("/*") ? depuis.slice(0, -2) : depuis,
    });
  }
  return regles;
}

const REDIRECTIONS = chargerRedirections(ROOT);

/** Première règle qui correspond au chemin, ou null. */
function trouverRedirection(pathname) {
  for (const r of REDIRECTIONS) {
    if (r.joker) {
      if (pathname === r.prefixe || pathname.startsWith(r.prefixe + "/")) {
        const splat = pathname.slice(r.prefixe.length).replace(/^\//, "");
        return { ...r, cible: r.vers.replace(":splat", splat) };
      }
    } else if (pathname === r.depuis) {
      return { ...r, cible: r.vers };
    }
  }
  return null;
}

/** Chemin absolu sûr : interdit toute sortie de ROOT (path traversal). */
function safeJoin(root, urlPath) {
  const clean = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, "");
  const full = resolve(join(root, clean));
  return full === root || full.startsWith(root + sep) ? full : null;
}

async function firstExisting(candidates) {
  for (const c of candidates) {
    if (!c) continue;
    try {
      const s = await stat(c);
      if (s.isFile()) return c;
    } catch {
      /* candidat suivant */
    }
  }
  return null;
}

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  const base = safeJoin(ROOT, pathname);

  if (!base) {
    res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    return res.end("403 Forbidden");
  }

  // Ordre de résolution : fichier exact, puis index de dossier, puis clean URL.
  const file = await firstExisting([
    pathname.endsWith("/") ? null : base,
    join(base, "index.html"),
    extname(base) ? null : `${base}.html`,
  ]);

  if (!file) {
    // Aucun fichier : les règles de `_redirects` prennent le relais, comme le
    // fait l'hébergeur. Le fichier existant gagne toujours sur la règle, ce qui
    // reproduit la précédence de Netlify hors redirection forcée.
    const redir = trouverRedirection(pathname);
    if (redir) {
      if (redir.statut === 200) {
        // Réécriture : on sert la cible sans changer l'URL.
        const cible = safeJoin(ROOT, redir.cible);
        const reecrit = await firstExisting([
          cible,
          cible ? join(cible, "index.html") : null,
          cible && !extname(cible) ? `${cible}.html` : null,
        ]);
        if (reecrit) {
          const body = await readFile(reecrit);
          res.writeHead(200, {
            "content-type": MIME[extname(reecrit).toLowerCase()] ?? "application/octet-stream",
            "content-length": body.byteLength,
            "cache-control": "no-store",
          });
          return res.end(body);
        }
      } else {
        res.writeHead(redir.statut, { location: redir.cible, "content-length": 0 });
        return res.end();
      }
    }

    // Application à routage client : toute route non résolue sur disque est
    // rendue par le squelette, qui décidera lui-même quoi afficher.
    // On exclut les requêtes d'assets (extension présente) : un .js manquant
    // doit rester un 404, sinon le test de ressources cassées ne verrait rien.
    if (SPA && !extname(pathname)) {
      const shell = await firstExisting([join(ROOT, "index.html")]);
      if (shell) {
        const body = await readFile(shell);
        res.writeHead(200, {
          "content-type": MIME[".html"],
          "content-length": body.byteLength,
          "cache-control": "no-store",
        });
        return res.end(body);
      }
    }

    const notFound = await firstExisting([join(ROOT, "404.html")]);
    if (notFound) {
      const body = await readFile(notFound);
      res.writeHead(404, {
        "content-type": MIME[".html"],
        "content-length": body.byteLength,
      });
      return res.end(body);
    }
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    return res.end("404 Not Found");
  }

  try {
    const body = await readFile(file);
    res.writeHead(200, {
      "content-type": MIME[extname(file).toLowerCase()] ?? "application/octet-stream",
      // `content-length` explicite : sans lui, Node répond en chunked. Le
      // navigateur ne peut alors pas distinguer une réponse complète d'une
      // réponse coupée, et un module JS tronqué se manifeste par un
      // « SyntaxError: Invalid or unexpected token » au point de coupure,
      // sans indiquer qu'il s'agit d'un problème de transport.
      "content-length": body.byteLength,
      "cache-control": "no-store",
      // Pas de réutilisation de connexion : un serveur de test n'a rien à
      // gagner du keep-alive, et ça retire une source de confusion de plus
      // quand plusieurs contextes de navigateur tapent la même URL en parallèle.
      connection: "close",
    });
    res.end(body);
  } catch {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end("500 Internal Server Error");
  }
});

server.listen(PORT, () => {
  console.log(`[e2e] statique${SPA ? " (SPA)" : ""} : ${ROOT} -> http://127.0.0.1:${PORT}`);
});
