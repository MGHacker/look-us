/* Look Us — interactions (vanilla, zero dependance). */
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
  var lastResult = null, lastMetrics = null;

  function toast(msg) {
    var t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("show"); }, 2400);
  }

  /* ---------- modes ---------- */
  function setMode(mode) {
    $$(".mode-tab").forEach(function (b) {
      var on = b.dataset.mode === mode;
      b.classList.toggle("is-active", on); b.setAttribute("aria-selected", on);
    });
    var cap = $("#view-capture"), con = $("#view-console");
    cap.hidden = mode !== "capture"; cap.classList.toggle("is-active", mode === "capture");
    con.hidden = mode !== "console"; con.classList.toggle("is-active", mode === "console");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  $$(".mode-tab").forEach(function (b) { b.addEventListener("click", function () { setMode(b.dataset.mode); }); });
  $$("[data-jump]").forEach(function (b) { b.addEventListener("click", function () { setMode(b.dataset.jump === "console" ? "console" : "capture"); if (b.dataset.jump === "capture") setTimeout(compute, 120); }); });

  /* ---------- read form ---------- */
  function readForm() {
    var m = {}; FIELDS.forEach(function (k) { var el = $('[name="' + k + '"]'); m[k] = el ? +el.value || 0 : 0; });
    return m;
  }

  /* ---------- render cockpit ---------- */
  function animateNum(el, to) {
    var from = 0, start = null, dur = 900;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1), e = 1 - Math.pow(1 - p, 3);
      el.textContent = (from + (to - from) * e).toFixed(0);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function render(res) {
    var ck = $("#cockpit"); ck.hidden = false;
    animateNum($("#score-num"), res.total);
    $("#tier-badge").textContent = res.tier;
    var ring = $("#score-ring"); ring.style.setProperty("--p", res.total); ring.setAttribute("data-tier", res.tier);
    var d = res.dimensions;
    $("#dims").innerHTML = DIMS.map(function (x) {
      var v = d[x.k];
      return '<div class="dim"><div class="dim-row"><span class="dim-name">' + x.label + ' <em>' + x.w + '</em></span><span class="dim-val">' + v.toFixed(0) + '</span></div><div class="dim-track"><div class="dim-fill" style="background:' + x.color + '"></div></div></div>';
    }).join("");
    setTimeout(function () { $$(".dim-fill").forEach(function (f, i) { f.style.width = d[DIMS[i].k] + "%"; }); }, 60);
    var recos = window.LookUsScoring.recommend(d);
    $("#recos").innerHTML = recos.length ? recos.map(function (r) {
      return '<li class="reco" data-p="' + r.priority + '"><span class="reco-p">' + r.priority + '</span><div><b>' + r.action + '</b><span class="reco-i">' + r.expectedImpact + ' · KPI : ' + r.metric + '</span></div></li>';
    }).join("") : '<li class="empty-reco">Rien de critique — ton autorité est solide. Continue.</li>';
    ck.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function compute() {
    lastMetrics = readForm();
    lastResult = window.LookUsScoring.compute(lastMetrics);
    render(lastResult);
  }
  $("#compute-btn").addEventListener("click", compute);

  /* ---------- CSV ---------- */
  var CSV_COLS = FIELDS.concat(["score", "tier", "reach", "resonance", "consistency", "momentum", "breadth", "capturedAt"]);
  function buildCsv() {
    if (!lastResult) compute();
    var d = lastResult.dimensions;
    var row = FIELDS.map(function (k) { return lastMetrics[k]; })
      .concat([lastResult.total, lastResult.tier, d.reach, d.resonance, d.consistency, d.momentum, d.breadth, new Date().toISOString()]);
    return CSV_COLS.join(",") + "\n" + row.join(",") + "\n";
  }
  function download(name, text, type) {
    var blob = new Blob([text], { type: type || "text/csv;charset=utf-8" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
  }
  $("#export-btn").addEventListener("click", function () { download("look-us-score.csv", buildCsv()); toast("CSV exporté"); });
  $("#to-console-btn").addEventListener("click", function () {
    loadCsvText(buildCsv()); setMode("console"); toast("Score chargé dans la console");
  });

  function parseCsv(text) {
    var lines = text.split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (!lines.length) return null;
    var head = lines[0].split(",").map(function (s) { return s.trim(); });
    var rows = lines.slice(1).map(function (l) {
      var c = l.split(","); var o = {}; head.forEach(function (h, i) { o[h] = (c[i] || "").trim(); }); return o;
    });
    return { head: head, rows: rows };
  }
  // import depuis l'export LinkedIn (Shares/Connections) ou un CSV Look Us
  function ingestCapture(text) {
    var p = parseCsv(text); if (!p || !p.rows.length) { toast("CSV illisible"); return; }
    var r = p.rows[0];
    FIELDS.forEach(function (k) { if (r[k] != null && r[k] !== "") { var el = $('[name="' + k + '"]'); if (el) el.value = r[k]; } });
    compute(); toast("CSV importé");
  }
  $("#capture-import").addEventListener("change", function (e) {
    var f = e.target.files[0]; if (!f) return; var rd = new FileReader();
    rd.onload = function () { ingestCapture(String(rd.result)); }; rd.readAsText(f);
  });

  /* ---------- console ---------- */
  var loadedCsv = null;
  function renderPreview(p) {
    var prev = $("#csv-preview"); prev.hidden = false;
    var cols = p.head.slice(0, 9);
    prev.innerHTML = "<table><thead><tr>" + cols.map(function (h) { return "<th>" + h + "</th>"; }).join("") +
      "</tr></thead><tbody>" + p.rows.slice(0, 5).map(function (r) {
        return "<tr>" + cols.map(function (h) { return "<td>" + (r[h] || "") + "</td>"; }).join("") + "</tr>";
      }).join("") + "</tbody></table>";
    $("#integration-panel").hidden = false;
  }
  function loadCsvText(text) {
    loadedCsv = { text: text, parsed: parseCsv(text) };
    if (!loadedCsv.parsed) { toast("CSV illisible"); return; }
    $("#dz-status").textContent = loadedCsv.parsed.rows.length + " ligne(s) chargée(s)";
    renderPreview(loadedCsv.parsed);
  }
  var dz = $("#dropzone");
  $("#console-import").addEventListener("change", function (e) {
    var f = e.target.files[0]; if (!f) return; var rd = new FileReader();
    rd.onload = function () { loadCsvText(String(rd.result)); }; rd.readAsText(f);
  });
  ["dragover", "dragenter"].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add("drag"); }); });
  ["dragleave", "drop"].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove("drag"); }); });
  dz.addEventListener("drop", function (e) {
    var f = e.dataTransfer.files[0]; if (!f) return; var rd = new FileReader();
    rd.onload = function () { loadCsvText(String(rd.result)); }; rd.readAsText(f);
  });

  /* ---------- destination ---------- */
  var DEST = {
    ftp: [["protocol", "Protocole", "SFTP"], ["host", "Hôte", "ftp.client.com"], ["port", "Port", "22"], ["user", "Utilisateur", "deploy"], ["password", "Mot de passe", "••••••", "password"], ["path", "Chemin distant", "/imports/look-us.csv", "", true]],
    crm: [["provider", "CRM", "HubSpot"], ["endpoint", "Endpoint API", "https://api.hubapi.com/..."], ["apiKey", "Clé API", "••••••", "password"], ["object", "Objet", "contacts", "", true]],
    db: [["engine", "Moteur", "PostgreSQL"], ["host", "Hôte", "db.client.com"], ["database", "Base", "growth"], ["table", "Table", "authority_scores"], ["connstr", "Connection string", "postgresql://…", "", true]]
  };
  function renderDest(kind) {
    $("#dest-body").innerHTML = DEST[kind].map(function (f) {
      var name = f[0], label = f[1], ph = f[2], type = f[3] || "text", wide = f[4];
      return '<label class="field' + (wide ? " field-wide" : "") + '"><span>' + label + '</span><input type="' + type + '" data-d="' + name + '" placeholder="' + ph + '" /></label>';
    }).join("");
    $("#payload").hidden = true;
  }
  $$(".dest-tab").forEach(function (b) {
    b.addEventListener("click", function () {
      $$(".dest-tab").forEach(function (x) { x.classList.remove("is-active"); });
      b.classList.add("is-active"); renderDest(b.dataset.dest);
    });
  });
  function currentDest() { var a = $(".dest-tab.is-active"); return a ? a.dataset.dest : "ftp"; }
  function buildPayload() {
    var cfg = {}; $$("#dest-body [data-d]").forEach(function (i) { if (i.type === "password") cfg[i.dataset.d] = i.value ? "***" : ""; else cfg[i.dataset.d] = i.value; });
    return { destination: currentDest(), config: cfg, rows: loadedCsv && loadedCsv.parsed ? loadedCsv.parsed.rows.length : 0, payloadPreview: loadedCsv ? loadedCsv.parsed.rows.slice(0, 3) : [], sentAt: new Date().toISOString() };
  }
  $("#send-btn").addEventListener("click", function () {
    if (!loadedCsv) { toast("Charge d'abord un CSV"); return; }
    var p = buildPayload(); var pre = $("#payload"); pre.hidden = false; pre.textContent = JSON.stringify(p, null, 2);
    toast("Destination configurée · envoi réel = fonction serverless (à brancher)");
  });
  $("#copy-payload").addEventListener("click", function () {
    var p = JSON.stringify(buildPayload(), null, 2);
    if (navigator.clipboard) navigator.clipboard.writeText(p);
    var pre = $("#payload"); pre.hidden = false; pre.textContent = p; toast("Payload copié");
  });

  /* ---------- init ---------- */
  renderDest("ftp");
  compute(); // pre-remplit le cockpit avec les valeurs d'exemple
})();
