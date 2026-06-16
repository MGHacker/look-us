/**
 * Parité du port vanilla `assets/scoring.js` avec le moteur canonique
 * `@look-us/scoring-engine` (look-us/packages/scoring-engine).
 *
 * Le port vanilla est une COPIE manuelle du moteur TypeScript : les deux peuvent
 * dériver en silence. Ces valeurs-or rejouent celles du test canonique
 * (test/engine.test.ts) sur le cas mono-canal (LinkedIn V1). Si une formule ou
 * une pondération change d'un côté sans l'autre, ce test casse.
 *
 * Zéro dépendance : runner natif `node:test`. Le fichier scoring.js est un IIFE
 * qui s'attache à `window` → on installe un shim `window` puis on l'évalue.
 *
 *   node --test test/
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// --- charge le port vanilla dans un faux `window` ---
globalThis.window = {};
const src = readFileSync(fileURLToPath(new URL("../assets/scoring.js", import.meta.url)), "utf8");
// eslint-disable-next-line no-eval
(0, eval)(src); // eval indirect : le bare `window` du IIFE résout vers globalThis.window
const S = globalThis.window.LookUsScoring;

assert.ok(S && typeof S.compute === "function", "scoring.js doit exposer window.LookUsScoring.compute");

// helper : input mono-canal complet
function input(p) {
  return Object.assign(
    { followers: 0, connections: 0, impressions30d: 0, reactions30d: 0, comments30d: 0, reposts30d: 0, activeWeeks90d: 0, maxGapWeeks: 0, channels: 1 },
    p
  );
}
const approx = (a, b, eps = 0.05) => Math.abs(a - b) <= eps;

test("D1 Reach (log-scale) : 50k followers -> dim.reach ~= 90.9", () => {
  const r = S.compute(input({ followers: 50000, impressions30d: 1 }));
  assert.ok(approx(r.dimensions.reach, 90.9), `reach=${r.dimensions.reach}`);
});

test("D1 Reach : sous le seuil (raw=50) -> 0, plafond (>=100k) -> 100", () => {
  assert.equal(S.compute(input({ followers: 50, impressions30d: 1 })).dimensions.reach, 0);
  assert.equal(S.compute(input({ followers: 100000, impressions30d: 1 })).dimensions.reach, 100);
});

test("D2 Resonance : commentaires x2, reposts x3 (er=0.024 -> ~34.5)", () => {
  const r = S.compute(input({ impressions30d: 40000, reactions30d: 600, comments30d: 120, reposts30d: 40 }));
  assert.ok(approx(r.dimensions.resonance, 34.5), `resonance=${r.dimensions.resonance}`);
});

test("D3 Consistency : 13 semaines sans trou -> 100 ; pénalité de gap max -> ~21.5", () => {
  assert.equal(S.compute(input({ activeWeeks90d: 13, maxGapWeeks: 0, impressions30d: 1 })).dimensions.consistency, 100);
  const pen = S.compute(input({ activeWeeks90d: 4, maxGapWeeks: 9, impressions30d: 1 })).dimensions.consistency;
  assert.ok(approx(pen, 21.5, 0.2), `consistency=${pen}`);
});

test("D4 Momentum : sans relevé précédent -> neutre 50", () => {
  const r = S.compute(input({ followers: 12000, impressions30d: 40000, reactions30d: 600 }));
  assert.equal(r.dimensions.momentum, 50);
});

test("D4 Momentum : croissance -> > 50 ; déclin -> < 50", () => {
  const up = S.compute(input({ followers: 11000, impressions30d: 40000, reactions30d: 800, prevReachRaw: 10000, prevEr: 0.018 }));
  const down = S.compute(input({ followers: 9000, impressions30d: 40000, reactions30d: 480, prevReachRaw: 10000, prevEr: 0.02 }));
  assert.ok(up.dimensions.momentum > 50, `up momentum=${up.dimensions.momentum}`);
  assert.ok(down.dimensions.momentum < 50, `down momentum=${down.dimensions.momentum}`);
});

test("GOLDEN composite : expert établi engagé -> total 57.9, GROWING, dims exactes", () => {
  const r = S.compute(input({
    followers: 12000, connections: 0, impressions30d: 40000,
    reactions30d: 600, comments30d: 120, reposts30d: 40,
    activeWeeks90d: 13, maxGapWeeks: 0, channels: 1,
    prevReachRaw: 11000, prevEr: 0.022,
  }));
  assert.equal(r.total, 57.9, `total=${r.total}`);
  assert.equal(r.tier, "GROWING");
  assert.deepEqual(r.dimensions, { reach: 72.1, resonance: 34.5, consistency: 100, momentum: 59.1, breadth: 32 });
});

test("ANTI-VANITY : 50k followers + 0 engagement << petit compte très engagé", () => {
  const vanity = S.compute(input({ followers: 50000, impressions30d: 80000, activeWeeks90d: 4, maxGapWeeks: 9, channels: 1 }));
  const engaged = S.compute(input({
    followers: 1500, impressions30d: 8000, reactions30d: 320, comments30d: 90, reposts30d: 25,
    activeWeeks90d: 13, maxGapWeeks: 0, channels: 1, prevReachRaw: 1300, prevEr: 0.03,
  }));
  assert.equal(vanity.dimensions.resonance, 0, "vanity resonance doit être 0");
  assert.ok(vanity.total < engaged.total, `vanity ${vanity.total} doit être < engaged ${engaged.total}`);
  assert.equal(vanity.tier, "EMERGING");
  assert.equal(engaged.tier, "AUTHORITY");
});

test("Tiers : seuils 40/60/80 atteints par le composite", () => {
  // GROWING couvert par le golden (57.9), EMERGING + AUTHORITY par l'anti-vanity.
  // Ici on vérifie qu'aucun total ne sort de [0,100].
  for (const f of [0, 50, 1500, 12000, 50000, 5_000_000]) {
    const t = S.compute(input({ followers: f, impressions30d: 1 })).total;
    assert.ok(t >= 0 && t <= 100, `total hors bornes pour followers=${f}: ${t}`);
  }
});

test("recommend : trié par impact (gain = headroom × poids) décroissant", () => {
  const d = { reach: 72.1, resonance: 34.5, consistency: 100, momentum: 59.1, breadth: 32 };
  const recos = S.recommend(d);
  assert.ok(Array.isArray(recos) && recos.length >= 1);
  assert.equal(recos[0].ruleId, "resonance-plateau");
  // chaque reco a la forme attendue
  for (const r of recos) {
    assert.ok(r.ruleId && r.priority && r.action && r.expectedImpact && r.metric);
  }
  // tri par impact décroissant
  const impact = (k) => (100 - d[k]) * S.WEIGHTS[k];
  for (let i = 1; i < recos.length; i++) {
    assert.ok(impact(recos[i - 1].dimension) >= impact(recos[i].dimension), "recos non triées par impact");
  }
});

test("sensitivityAnalysis : levier principal = resonance, trié par gain décroissant", () => {
  const d = { reach: 72.1, resonance: 34.5, consistency: 100, momentum: 59.1, breadth: 32 };
  const s = S.sensitivityAnalysis(d);
  assert.equal(s.length, 5);
  assert.equal(s[0].dim, "resonance");
  for (let i = 1; i < s.length; i++) {
    assert.ok(s[i - 1].gain >= s[i].gain, "sensitivité non triée");
  }
});

test("déterminisme : même entrée -> même sortie", () => {
  const a = S.compute(input({ followers: 12000, impressions30d: 40000, reactions30d: 600, comments30d: 120, reposts30d: 40, activeWeeks90d: 13 }));
  const b = S.compute(input({ followers: 12000, impressions30d: 40000, reactions30d: 600, comments30d: 120, reposts30d: 40, activeWeeks90d: 13 }));
  assert.deepEqual(a, b);
});
