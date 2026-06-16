/* Look Us — moteur de score (port vanilla de @look-us/scoring-engine, spec v1.1 §6).
   Lib pure : memes formules, memes ponderations (15/35/20/20/10), meme coach. */
(function (global) {
  "use strict";
  var LOG_MIN = Math.log10(50), LOG_MAX = Math.log10(100000);
  var ER_MIN = 0.005, ER_MAX = 0.06, MOM_BOUND = 0.5, MAX_CHANNELS = 4;
  var W = { reach: 0.15, resonance: 0.35, consistency: 0.2, momentum: 0.2, breadth: 0.1 };
  var clamp = function (x, lo, hi) { return Math.max(lo, Math.min(hi, x)); };
  var r1 = function (x) { return Math.round(x * 10) / 10; };

  function reachScore(followers, connections) {
    var raw = Math.max(0, followers || 0) + 0.5 * Math.max(0, connections || 0);
    var r = Math.log10(Math.max(raw, 1));
    return clamp((r - LOG_MIN) / (LOG_MAX - LOG_MIN), 0, 1) * 100;
  }
  function engagementRate(re, co, rp, imp) {
    return (Math.max(0, re) + 2 * Math.max(0, co) + 3 * Math.max(0, rp)) / Math.max(imp, 1);
  }
  function resonanceScore(er) { return clamp((er - ER_MIN) / (ER_MAX - ER_MIN), 0, 1) * 100; }
  function consistencyScore(activeWeeks, maxGap) {
    var ratio = clamp(activeWeeks || 0, 0, 13) / 13;
    var pen = Math.min(Math.max(0, maxGap || 0) * 0.05, 0.3);
    return clamp(ratio * (1 - pen), 0, 1) * 100;
  }
  function momentumScore(prevReachRaw, curReachRaw, prevEr, curEr) {
    if (prevReachRaw == null || prevEr == null) return 50;
    var dR = (curReachRaw - prevReachRaw) / Math.max(prevReachRaw, 1);
    var dE = (curEr - prevEr) / Math.max(prevEr, ER_MIN);
    return clamp((0.6 * dR + 0.4 * dE + MOM_BOUND) / (2 * MOM_BOUND), 0, 1) * 100;
  }
  function breadthScore(quality, n) {
    n = clamp(n || 1, 1, MAX_CHANNELS);
    var div = Math.log2(Math.max(n, 1)) / Math.log2(MAX_CHANNELS);
    return clamp(0.4 * div + 0.6 * (quality / 100), 0, 1) * 100;
  }
  function tierFor(t) {
    return t >= 80 ? "AUTHORITY" : t >= 60 ? "ESTABLISHED" : t >= 40 ? "GROWING" : "EMERGING";
  }

  function compute(m) {
    var f = +m.followers || 0, c = +m.connections || 0, imp = +m.impressions30d || 0;
    var re = +m.reactions30d || 0, co = +m.comments30d || 0, rp = +m.reposts30d || 0;
    var reach = reachScore(f, c);
    var er = engagementRate(re, co, rp, imp);
    var resonance = resonanceScore(er);
    var consistency = consistencyScore(+m.activeWeeks90d, +m.maxGapWeeks);
    var momentum = momentumScore(m.prevReachRaw, f + 0.5 * c, m.prevEr, er);
    var breadth = breadthScore((reach + resonance) / 2, +m.channels || 1);
    var total = W.reach * reach + W.resonance * resonance + W.consistency * consistency + W.momentum * momentum + W.breadth * breadth;
    var t = r1(total);
    return {
      total: t, tier: tierFor(t),
      dimensions: { reach: r1(reach), resonance: r1(resonance), consistency: r1(consistency), momentum: r1(momentum), breadth: r1(breadth) }
    };
  }

  var RULES = [
    { id: "consistency-critical", dim: "consistency", when: function (d) { return d.consistency < 40; }, p: "critical", action: "Publie 4 posts cette semaine pour sortir de la zone rouge.", impact: "+10 à +15 pts de Consistency en 4 semaines.", metric: "postsLast28d" },
    { id: "consistency-gap", dim: "consistency", when: function (d) { return d.consistency >= 40 && d.consistency < 65; }, p: "high", action: "Reprends une cadence régulière : 1 à 2 publications par semaine.", impact: "+8 pts de Consistency en 30 jours.", metric: "activeWeeks90d" },
    { id: "resonance-low", dim: "resonance", when: function (d) { return d.resonance < 30; }, p: "high", action: "Termine tes posts par une question ouverte pour déclencher des commentaires.", impact: "+10 à +12 pts de Resonance en 14 jours.", metric: "engagementRate" },
    { id: "resonance-plateau", dim: "resonance", when: function (d) { return d.resonance >= 30 && d.resonance < 55; }, p: "medium", action: "Teste un nouveau format (carrousel, prise de position) pour relancer l'engagement.", impact: "+6 pts de Resonance.", metric: "engagementRate" },
    { id: "momentum-declining", dim: "momentum", when: function (d) { return d.momentum < 35; }, p: "high", action: "Ta trajectoire ralentit : une publication aujourd'hui suffit à inverser la tendance.", impact: "Momentum repasse au-dessus de 50.", metric: "momentum30d" },
    { id: "reach-small", dim: "reach", when: function (d) { return d.reach < 25 && d.resonance > 55; }, p: "medium", action: "Engagement excellent mais base petite : lance une campagne de connexions ciblées (+50/sem.).", impact: "+5 à +8 pts de Reach par mois.", metric: "followers" },
    { id: "breadth-mono", dim: "breadth", when: function (d) { return d.breadth < 60; }, p: "medium", action: "Ton autorité repose sur un seul canal. Diversifier (newsletter, X) la rendra plus résiliente.", impact: "+15 à +20 pts de Breadth.", metric: "activeChannels" }
  ];
  function recommend(d, limit) {
    var fired = [], seen = {};
    RULES.forEach(function (r) { if (r.when(d) && !seen[r.dim]) { seen[r.dim] = 1; fired.push(r); } });
    fired.sort(function (a, b) { return (100 - d[b.dim]) * W[b.dim] - (100 - d[a.dim]) * W[a.dim]; });
    var out = fired.map(function (r) { return { ruleId: r.id, dimension: r.dim, priority: r.p, action: r.action, expectedImpact: r.impact, metric: r.metric }; });
    return limit ? out.slice(0, limit) : out;
  }

  global.LookUsScoring = { compute: compute, recommend: recommend };
})(window);
