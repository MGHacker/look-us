/* Look Us — interactions v2 (vanilla, zéro dépendance). */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var DIMS = [
    { k: "reach", label: "Reach", w: "15%", color: "#e9b949" },
    { k: "resonance", label: "Resonance", w: "35%", color: "#9bb46a" },
    { k: "consistency", label: "Consistency", w: "20%", color: "#d8a657" },
    { k: "momentum", label: "Momentum", w: "20%", color: "#7daea3" },
    { k: "breadth", label: "Breadth", w: "10%", color: "#c8553d" }
  ];
  var FIELDS = ["followers", "connections", "impressions30d", "reactions30d", "comments30d", "reposts30d", "activeWeeks90d", "maxGapWeeks", "channels"];
  var DEMO = { followers: 12000, connections: 0, impressions30d: 40000, reactions30d: 600, comments30d: 120, reposts30d: 40, activeWeeks90d: 13, maxGapWeeks: 0, channels: 1 };
  var lastResult = null, lastMetrics = null;

  function toast(m) { var t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("show"); }, 2800); }

  /* ---------- storage ---------- */
  function getHistory() { try { return JSON.parse(localStorage.getItem("lus_history") || "[]"); } catch (e) { return []; } }
  function pushSnapshot(snap) { var h = getHistory(); h.push(snap); if (h.length > 12) h = h.slice(-12); localStorage.setItem("lus_history", JSON.stringify(h)); return h; }
  function lastSnapshot() { var h = getHistory(); return h.length ? h[h.length - 1] : null; }

  /* ---------- read form ---------- */
  function readForm() { var m = {}; FIELDS.forEach(function (k) { var el = $('[name="' + k + '"]'); m[k] = el && el.value !== "" ? +el.value || 0 : 0; }); return m; }
  function metricsRaw(m) {
    var f = +m.followers || 0, c = +m.connections || 0, imp = +m.impressions30d || 0;
    return { reachRaw: f + 0.5 * c, er: (+m.reactions30d + 2 * +m.comments30d + 3 * +m.reposts30d) / Math.max(imp, 1) };
  }

  /* ---------- dial ---------- */
  function drawDial(score, tier) {
    var R = 58, C = 2 * Math.PI * R, arc = C * 0.75;
    var ring = $("#score-ring");
    ring.innerHTML =
      '<g transform="rotate(135 70 70)">' +
      '<circle cx="70" cy="70" r="' + R + '" fill="none" stroke="#2e2920" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + arc + ' ' + C + '"/>' +
      '<circle class="dial-fg" cx="70" cy="70" r="' + R + '" fill="none" stroke="#e9b949" stroke-width="7" stroke-linecap="round" stroke-dasharray="0 ' + C + '"/>' +
      '</g><text x="70" y="74" text-anchor="middle" font-family="Fraunces,serif" font-size="11" fill="#b7ad9c" letter-spacing="1">' + tier + '</text>';
    var fg = ring.querySelector(".dial-fg"), target = (arc * score / 100) + " " + C;
    if (document.visibilityState === "visible") requestAnimationFrame(function () { fg.setAttribute("stroke-dasharray", target); });
    else fg.setAttribute("stroke-dasharray", target); // onglet en arriere-plan : pas d'rAF, on remplit direct
    var halo = tier === "AUTHORITY" ? "0 0 60px rgba(233,185,73,.35)" : tier === "ESTABLISHED" ? "0 0 40px rgba(233,185,73,.22)" : tier === "GROWING" ? "0 0 30px rgba(155,180,106,.18)" : "none";
    $("#score-num").style.textShadow = halo;
  }

  /* ---------- radar ---------- */
  function drawRadar(d) {
    var cx = 120, cy = 120, R = 86, g = "";
    function pt(i, v) { var a = (i * 72 - 90) * Math.PI / 180; return [cx + R * v * Math.cos(a), cy + R * v * Math.sin(a)]; }
    [0.33, 0.66, 1].forEach(function (lvl) { var p = DIMS.map(function (_, i) { return pt(i, lvl).join(","); }).join(" "); g += '<polygon points="' + p + '" fill="none" stroke="#2e2920" stroke-width="1" opacity="' + (lvl === 1 ? .5 : .3) + '"/>'; });
    DIMS.forEach(function (_, i) { var e = pt(i, 1); g += '<line x1="' + cx + '" y1="' + cy + '" x2="' + e[0] + '" y2="' + e[1] + '" stroke="#2e2920" stroke-width="1" opacity=".4"/>'; });
    var pts = DIMS.map(function (dim, i) { return pt(i, Math.max(0, d[dim.k]) / 100).join(","); }).join(" ");
    g += '<polygon class="radar-poly" points="' + pts + '" fill="rgba(233,185,73,.13)" stroke="#e9b949" stroke-width="1.6"/>';
    DIMS.forEach(function (dim, i) { var e = pt(i, 1.16); g += '<text x="' + e[0] + '" y="' + e[1] + '" text-anchor="middle" dominant-baseline="middle" font-family="JetBrains Mono,monospace" font-size="9.5" fill="#8a8273">' + dim.label + '</text>'; });
    $("#radar").innerHTML = g;
  }

  /* ---------- sparkline ---------- */
  function drawSparkline(hist) {
    var wrap = $("#sparkline-wrap");
    if (hist.length < 2) { wrap.innerHTML = '<p class="spark-promise">Reviens mesurer dans 7 jours — ta trajectoire apparaîtra ici.</p>'; return; }
    var pts = hist.slice(-8), W = 600, H = 46, pad = 5;
    var scores = pts.map(function (p) { return p.score; });
    var min = Math.min.apply(null, scores) - 4, max = Math.max.apply(null, scores) + 4; if (max - min < 1) max = min + 1;
    var xy = pts.map(function (p, i) { return [pad + i * (W - 2 * pad) / (pts.length - 1), H - pad - ((p.score - min) / (max - min)) * (H - 2 * pad)]; });
    var line = xy.map(function (p) { return p.join(","); }).join(" "), last = xy[xy.length - 1];
    wrap.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none"><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9b949" stop-opacity=".16"/><stop offset="1" stop-color="#e9b949" stop-opacity="0"/></linearGradient></defs>' +
      '<polygon points="' + pad + ',' + (H - pad) + ' ' + line + ' ' + (W - pad) + ',' + (H - pad) + '" fill="url(#sg)"/>' +
      '<polyline points="' + line + '" fill="none" stroke="#e9b949" stroke-width="1.5" vector-effect="non-scaling-stroke"/>' +
      '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="3" fill="#e9b949"/></svg>';
  }

  /* ---------- .ics reminder ---------- */
  function downloadIcs() {
    var dt = new Date(Date.now() + 7 * 86400000);
    function z(n) { return ("0" + n).slice(-2); }
    function fmt(d) { return d.getUTCFullYear() + z(d.getUTCMonth() + 1) + z(d.getUTCDate()) + "T" + z(d.getUTCHours()) + z(d.getUTCMinutes()) + "00Z"; }
    var ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Look Us//FR", "BEGIN:VEVENT", "UID:" + Date.now() + "@look-us", "DTSTAMP:" + fmt(new Date()), "DTSTART:" + fmt(dt), "DURATION:PT15M", "SUMMARY:Relevé Look Us — mesurer mon autorité LinkedIn", "DESCRIPTION:Reviens noter tes chiffres pour voir l'évolution de ton score d'autorité.", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    download("look-us-rappel.ics", ics, "text/calendar"); toast("Rappel .ics téléchargé — ajoute-le à ton agenda");
  }

  /* ---------- delta ---------- */
  function renderDelta(res, prevSnap) {
    var db = $("#delta-block"); db.hidden = false;
    var weeks = Math.max(1, Math.round(getHistory().length));
    var streak = getHistory().length >= 2 ? '<span class="streak">' + getHistory().length + ' relevés de suivi</span>' : "";
    var ics = '<a class="ics-link" id="remind-btn">🔔 Rappel dans 7 jours</a>';
    if (!prevSnap) { db.innerHTML = '<span class="delta-first">Premier relevé enregistré — reviens dans 7 jours pour voir ta progression.</span>' + ics; }
    else {
      var diff = res.total - prevSnap.score, days = Math.max(1, Math.round((Date.now() - prevSnap.ts) / 86400000));
      var cls = diff > 0.05 ? "up" : diff < -0.05 ? "down" : "flat", sign = diff > 0 ? "↑ +" : diff < 0 ? "↓ −" : "→ ";
      var ds = new Date(prevSnap.ts).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
      db.innerHTML = '<span class="delta-val ' + cls + '">' + sign + Math.abs(diff).toFixed(1) + ' pts</span><span class="delta-meta">depuis le ' + ds + ' · ' + days + ' jours</span>' + streak + ics;
    }
    var rb = $("#remind-btn"); if (rb) rb.addEventListener("click", downloadIcs);
  }

  /* ---------- recos (cochables) ---------- */
  function renderRecos(d) {
    var recos = window.LookUsScoring.recommend(d), done = 0;
    $("#recos").innerHTML = recos.length ? recos.map(function (r) {
      var isDone = localStorage.getItem("lus_done_" + r.ruleId) === "1"; if (isDone) done++;
      return '<li class="reco' + (isDone ? " is-done" : "") + '" data-p="' + r.priority + '" data-rule="' + r.ruleId + '"><span class="reco-p">' + r.priority + '</span><div class="reco-body"><b>' + r.action + '</b><span class="reco-i">' + r.expectedImpact + ' · KPI : ' + r.metric + '</span></div><button class="reco-done-btn">' + (isDone ? "✓ Fait" : "Fait") + '</button></li>';
    }).join("") : '<li class="empty-reco">Rien de critique — ton autorité est solide. Continue.</li>';
    var active = recos.length - done;
    $("#coach-h").innerHTML = 'Plan d\'action <span class="coach-count">' + (recos.length ? (active + " active" + (active > 1 ? "s" : "") + (done ? " · " + done + " complétée" + (done > 1 ? "s" : "") : "")) : "—") + '</span> <span class="coach-tag">déterministe · zéro IA</span>';
  }
  $("#recos").addEventListener("click", function (e) {
    var btn = e.target.closest(".reco-done-btn"); if (!btn) return;
    var li = btn.closest(".reco"), id = li.getAttribute("data-rule"), key = "lus_done_" + id;
    var now = localStorage.getItem(key) === "1";
    if (now) { localStorage.removeItem(key); li.classList.remove("is-done"); btn.textContent = "Fait"; }
    else {
      localStorage.setItem(key, "1"); li.classList.add("is-done"); btn.textContent = "✓ Fait";
      var fb = $("#reco-feedback"); fb.hidden = false; fb.textContent = "Bien joué. Reviens dans 7 jours mesurer l'impact."; clearTimeout(renderRecos._t); renderRecos._t = setTimeout(function () { fb.hidden = true; }, 4000);
    }
    if (lastResult) { // recompute counter
      var done = $$("#recos .reco.is-done").length, total = $$("#recos .reco").length, active = total - done;
      $("#coach-count") || $("#coach-h").querySelector(".coach-count") && ($("#coach-h").querySelector(".coach-count").textContent = active + " active" + (active > 1 ? "s" : "") + (done ? " · " + done + " complétée" + (done > 1 ? "s" : "") : ""));
    }
  });

  /* ---------- render ---------- */
  function render(res, ctx) {
    ctx = ctx || {};
    var ck = $("#cockpit"); ck.hidden = false; ck.setAttribute("data-mode", ctx.demo ? "demo" : "live");
    $("#demo-banner").style.display = ctx.demo ? "" : "none";
    // score : valeur garantie ; count-up seulement si l'onglet est visible (rAF gele en arriere-plan)
    var sn = $("#score-num");
    if (document.visibilityState === "visible" && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      var s0 = null; (function step(ts) { if (!s0) s0 = ts; var p = Math.min((ts - s0) / 900, 1), e = 1 - Math.pow(1 - p, 3); sn.textContent = Math.round(res.total * e); if (p < 1) requestAnimationFrame(step); })(performance.now());
    } else { sn.textContent = Math.round(res.total); }
    $("#score-num").style.color = res.total >= 90 ? "#8b3dff" : res.total >= 70 ? "#1ed760" : res.total >= 40 ? "#e9b949" : "#c8553d";
    $("#tier-badge").textContent = res.tier;
    drawDial(res.total, res.tier);
    if (!ctx.demo) renderDelta(res, ctx.prevSnap); else $("#delta-block").hidden = true;
    drawSparkline(ctx.demo ? [] : getHistory());
    drawRadar(res.dimensions);
    // dims + levier principal
    var d = res.dimensions, lever = window.LookUsScoring.sensitivityAnalysis(d)[0].dim;
    $("#dims").innerHTML = DIMS.map(function (x) {
      var isLever = x.k === lever;
      var val = (x.k === "momentum" && !ctx.hadPrev && !ctx.demo) ? "—" : Math.round(d[x.k]);
      return '<div class="dim"><div class="dim-row"><span class="dim-name">' + (isLever ? '<span class="dim-dot"></span>' : '') + x.label + ' <em>' + x.w + '</em></span><span class="dim-val">' + val + '</span></div><div class="dim-track"><div class="dim-fill" style="background:' + x.color + '"></div></div>' + (isLever ? '<span class="dim-lever">Levier principal · +1 pt ici = +' + x.w.replace("%", "/100") + ' pt de score</span>' : '') + '</div>';
    }).join("");
    setTimeout(function () { $$(".dim-fill").forEach(function (f, i) { f.style.width = d[DIMS[i].k] + "%"; }); }, 60);
    renderRecos(d);
    refreshHistBtn();
    if (!ctx.demo) ck.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* ---------- compute ---------- */
  function compute(demo) {
    lastMetrics = demo ? Object.assign({}, DEMO) : readForm();
    var prevSnap = null, hadPrev = false;
    if (!demo) {
      var snap = lastSnapshot();
      if (snap) {
        var age = (Date.now() - snap.ts) / 86400000;
        prevSnap = snap;
        if (age >= 5 && age <= 45) { lastMetrics.prevReachRaw = snap.reachRaw; lastMetrics.prevEr = snap.er; hadPrev = true; }
      }
    }
    lastResult = window.LookUsScoring.compute(lastMetrics);
    render(lastResult, { demo: demo, prevSnap: prevSnap, hadPrev: hadPrev });
    if (!demo) {
      var raw = metricsRaw(lastMetrics);
      pushSnapshot({ ts: Date.now(), reachRaw: raw.reachRaw, er: raw.er, score: lastResult.total, dims: lastResult.dimensions });
      refreshHistBtn();
    }
  }
  $("#compute-btn").addEventListener("click", function () { compute(false); });
  $("#clear-demo").addEventListener("click", function () { $("#cockpit").hidden = true; var f = $('[name="followers"]'); if (f) f.focus(); $("#hero").scrollIntoView({ behavior: "smooth" }); });
  $$("[data-jump]").forEach(function (b) { b.addEventListener("click", function () { $("#view-capture").scrollIntoView({ behavior: "smooth" }); var f = $('[name="followers"]'); if (f) setTimeout(function () { f.focus(); }, 400); }); });

  /* ---------- history button ---------- */
  function refreshHistBtn() { var h = getHistory(), b = $("#hist-btn"); if (h.length) { b.hidden = false; $("#hist-n").textContent = h.length; } }
  $("#hist-btn").addEventListener("click", function () { var sp = $("#sparkline-wrap"); if (!$("#cockpit").hidden) sp.scrollIntoView({ behavior: "smooth", block: "center" }); toast(getHistory().length + " relevé(s) enregistré(s) sur cet appareil"); });

  /* ---------- export / import CSV ---------- */
  function download(name, text, type) { var b = new Blob([text], { type: type || "text/csv;charset=utf-8" }); var a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500); }
  var CSV_COLS = FIELDS.concat(["score", "tier", "reach", "resonance", "consistency", "momentum", "breadth", "capturedAt"]);
  $("#export-btn").addEventListener("click", function () {
    if (!lastResult || $("#cockpit").getAttribute("data-mode") === "demo") { toast("Mesure d'abord ton score"); return; }
    var d = lastResult.dimensions, row = FIELDS.map(function (k) { return lastMetrics[k]; }).concat([lastResult.total, lastResult.tier, d.reach, d.resonance, d.consistency, d.momentum, d.breadth, new Date().toISOString()]);
    download("look-us-score.csv", CSV_COLS.join(",") + "\n" + row.join(",") + "\n"); toast("CSV exporté");
  });
  $("#capture-import").addEventListener("change", function (e) {
    var f = e.target.files[0]; if (!f) return; var rd = new FileReader();
    rd.onload = function () {
      var lines = String(rd.result).split(/\r?\n/).filter(function (l) { return l.trim(); });
      if (lines.length < 2) { toast("CSV illisible"); return; }
      var head = lines[0].split(","), cells = lines[1].split(",");
      head.forEach(function (h, i) { h = h.trim(); if (FIELDS.indexOf(h) > -1) { var el = $('[name="' + h + '"]'); if (el && cells[i] != null) el.value = cells[i].trim(); } });
      compute(false); toast("CSV importé");
    }; rd.readAsText(f);
  });

  /* ---------- share ---------- */
  $("#share-btn").addEventListener("click", function () {
    if (!lastResult || $("#cockpit").getAttribute("data-mode") === "demo") { toast("Mesure d'abord ton score"); return; }
    var payload = { t: lastResult.total, tier: lastResult.tier, d: lastResult.dimensions };
    var enc = btoa(unescape(encodeURIComponent(JSON.stringify(payload)))).replace(/\+/g, "-").replace(/\//g, "_");
    var u = new URL("p/", location.href); u.hash = "v1-" + enc;
    var url = u.href, text = "Mon score d'autorité LinkedIn : " + Math.round(lastResult.total) + "/100 · " + lastResult.tier + " — mesuré sur 5 dimensions (pas un compteur de followers). Mesure le tien :";
    if (navigator.share) { navigator.share({ title: "Mon score d'autorité", text: text, url: url }).catch(function () { }); }
    else if (navigator.clipboard) { navigator.clipboard.writeText(url).then(function () { toast("Lien de partage copié"); }); }
    else { window.prompt("Copie ce lien :", url); }
  });

  /* ---------- init ---------- */
  refreshHistBtn();
  compute(true); // aperçu démo (flouté + bandeau)
})();
