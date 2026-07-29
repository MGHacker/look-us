import { resolve } from "node:path";
import { discoverPages, type PageRoute } from "./kit/pages";

/**
 * Réglages E2E de CE site. C'est le seul fichier à adapter d'un repo à l'autre :
 * les specs et le kit restent identiques partout.
 */
export const site = {
  /** Nom affiché dans les rapports. */
  name: "Look Us — cockpit d'autorité",

  /** Dossier servi par le serveur statique, relatif à la racine du repo. */
  root: ".",

  /** Langue attendue dans <html lang="…">. */
  lang: "fr",

  /** Motif attendu dans <title> (marque). `null` = pas de contrôle. */
  titlePattern: null as RegExp | null,

  /** Pages à exclure en plus des exclusions par défaut (fragments `_*.html`). */
  ignore: [] as RegExp[],

  /** Longueurs SEO conseillées (avertissement au-delà, jamais bloquant seul). */
  seo: {
    titleMax: 70,
    descriptionMin: 50,
    descriptionMax: 175,
    /** Exiger une balise canonical sur chaque page. */
    requireCanonical: false,
    /** Exiger les balises Open Graph (partage social). */
    requireOpenGraph: false,
    /**
     * Ce site doit-il être indexable par les moteurs ?
     *
     * Passer à `false` pour un environnement de recette ou un miroir désindexé
     * volontairement (`Disallow: /` assumé, pour éviter le duplicate content
     * avec le site de production). Le test vérifie alors que la désindexation
     * est bien en place, au lieu de la signaler comme un défaut.
     */
    expectIndexable: true,
  },

  /** Tolérance de débordement horizontal en mobile, en pixels. */
  mobileOverflowTolerance: 2,
};

/** Racine absolue du site servi. */
export const SITE_ROOT = resolve(process.cwd(), site.root);

/**
 * Pages testées. `E2E_MAX_PAGES` permet d'échantillonner sur un gros site
 * (ex. `E2E_MAX_PAGES=10 npm run test:e2e` pour une passe rapide).
 */
export const PAGES: PageRoute[] = (() => {
  const all = discoverPages(SITE_ROOT, site.ignore);
  const cap = Number(process.env.E2E_MAX_PAGES ?? 0);
  return cap > 0 ? all.slice(0, cap) : all;
})();
