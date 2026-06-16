/* Look Us — carte de partage PNG (rendu <canvas>, zéro dépendance).
   La preuve partageable passe par une IMAGE téléchargeable (à poster nativement
   sur LinkedIn) plutôt qu'un OG dynamique — impossible ici (le score est dans le
   #hash, jamais envoyé au serveur, et les crawlers n'exécutent pas le JS).
   API : window.LookUsCard.build({total,tier,dimensions}) -> <canvas>
         window.LookUsCard.download(res, filename?) */
(function (global) {
  "use strict";
  var DIMS = [
    { k: "reach", label: "Reach", w: "15%", color: "#e9b949" },
    { k: "resonance", label: "Resonance", w: "35%", color: "#9bb46a" },
    { k: "consistency", label: "Consistency", w: "20%", color: "#d8a657" },
    { k: "momentum", label: "Momentum", w: "20%", color: "#7daea3" },
    { k: "breadth", label: "Breadth", w: "10%", color: "#c8553d" }
  ];
  var INK = "#100f0e", LINE = "#2e2920", TRACK = "#251f18", PAPER = "#ede7db", DIM = "#b7ad9c", MUTED = "#8a8273", GOLD = "#e9b949";
  function scoreColor(s) { return s >= 90 ? "#8b3dff" : s >= 70 ? "#1ed760" : s >= 40 ? "#e9b949" : "#c8553d"; }

  function roundRect(x, cx, cy, w, h, r) {
    x.beginPath();
    if (x.roundRect) { x.roundRect(cx, cy, w, h, r); return; }
    x.moveTo(cx + r, cy); x.arcTo(cx + w, cy, cx + w, cy + h, r); x.arcTo(cx + w, cy + h, cx, cy + h, r);
    x.arcTo(cx, cy + h, cx, cy, r); x.arcTo(cx, cy, cx + w, cy, r); x.closePath();
  }

  function build(res) {
    var total = Math.round(res.total), tier = res.tier, d = res.dimensions || {};
    var W = 1200, H = 630, c = document.createElement("canvas");
    c.width = W; c.height = H;
    var x = c.getContext("2d");

    // fond + halo or
    x.fillStyle = INK; x.fillRect(0, 0, W, H);
    var g = x.createRadialGradient(W * 0.82, -60, 0, W * 0.82, -60, 760);
    g.addColorStop(0, "rgba(233,185,73,0.13)"); g.addColorStop(1, "rgba(233,185,73,0)");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // cadre
    x.strokeStyle = LINE; x.lineWidth = 2; roundRect(x, 26, 26, W - 52, H - 52, 18); x.stroke();

    var L = 78; // marge gauche du contenu

    // marque : réticule + "Look Us"
    x.save(); x.translate(L + 17, 86);
    x.strokeStyle = GOLD; x.lineWidth = 2.2;
    x.beginPath(); x.arc(0, 0, 16, 0, 2 * Math.PI); x.stroke();
    x.globalAlpha = 0.55; x.beginPath(); x.arc(0, 0, 9, 0, 2 * Math.PI); x.stroke(); x.globalAlpha = 1;
    x.fillStyle = GOLD; x.beginPath(); x.arc(0, 0, 3.4, 0, 2 * Math.PI); x.fill();
    x.restore();
    x.fillStyle = PAPER; x.textBaseline = "alphabetic"; x.textAlign = "left";
    x.font = "600 34px Fraunces, Georgia, serif"; x.fillText("Look Us", L + 44, 96);

    // kicker
    try { x.letterSpacing = "3px"; } catch (e) {}
    x.fillStyle = GOLD; x.font = "600 17px 'JetBrains Mono', monospace";
    x.fillText("INSTRUMENT D'AUTORITÉ", L, 150);
    try { x.letterSpacing = "0px"; } catch (e) {}

    // grand score
    x.fillStyle = scoreColor(total); x.font = "900 232px Fraunces, Georgia, serif";
    x.fillText(String(total), L - 6, 420);
    var sw = x.measureText(String(total)).width;
    x.fillStyle = MUTED; x.font = "500 40px 'JetBrains Mono', monospace";
    x.fillText("/100", L + sw + 8, 420);

    // tier badge
    x.font = "700 22px 'Hanken Grotesk', system-ui, sans-serif";
    var tw = x.measureText(tier).width;
    x.strokeStyle = "#c79a36"; x.lineWidth = 1.5; roundRect(x, L, 452, tw + 36, 44, 22); x.stroke();
    x.fillStyle = GOLD; x.fillText(tier, L + 18, 481);
    // légende
    x.fillStyle = MUTED; x.font = "500 18px 'JetBrains Mono', monospace";
    x.fillText("Score d'autorité · 5 dimensions pondérées", L, 532);

    // colonne droite : 5 dimensions
    var rx = 700, rw = W - 78 - rx, rRight = W - 78, y0 = 168, step = 70;
    DIMS.forEach(function (dim, i) {
      var y = y0 + i * step, v = Math.max(0, Math.min(100, Math.round(d[dim.k] || 0)));
      x.textAlign = "left"; x.fillStyle = PAPER; x.font = "600 23px 'Hanken Grotesk', system-ui, sans-serif";
      x.fillText(dim.label, rx, y);
      var lw = x.measureText(dim.label).width;
      x.fillStyle = MUTED; x.font = "500 14px 'JetBrains Mono', monospace"; x.fillText(dim.w, rx + lw + 10, y);
      x.textAlign = "right"; x.fillStyle = DIM; x.font = "600 23px 'JetBrains Mono', monospace"; x.fillText(String(v), rRight, y);
      x.textAlign = "left";
      var ty = y + 14;
      x.fillStyle = TRACK; roundRect(x, rx, ty, rw, 9, 4.5); x.fill();
      x.fillStyle = dim.color; roundRect(x, rx, ty, Math.max(rw * v / 100, v > 0 ? 9 : 0), 9, 4.5); x.fill();
    });

    // watermark bas
    x.fillStyle = MUTED; x.font = "500 19px 'JetBrains Mono', monospace"; x.textAlign = "left";
    x.fillText("Pas un compteur de followers — une mesure d'autorité.", L, 588);
    x.textAlign = "right"; x.fillStyle = "#c79a36";
    x.fillText("look-us", rRight, 588);

    return c;
  }

  function trigger(canvas, filename) {
    function save(url, revoke) {
      var a = document.createElement("a"); a.href = url; a.download = filename || "look-us-carte.png"; a.click();
      if (revoke) setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    }
    if (canvas.toBlob) { canvas.toBlob(function (b) { save(URL.createObjectURL(b), true); }, "image/png"); }
    else { save(canvas.toDataURL("image/png"), false); }
  }

  function download(res, filename) {
    var go = function () { trigger(build(res), filename); };
    var loads = [];
    if (document.fonts && document.fonts.load) {
      try {
        loads.push(document.fonts.load("900 232px Fraunces"));
        loads.push(document.fonts.load("600 23px 'Hanken Grotesk'"));
        loads.push(document.fonts.load("600 23px 'JetBrains Mono'"));
      } catch (e) {}
    }
    if (loads.length) Promise.all(loads).then(go).catch(go);
    else go();
  }

  global.LookUsCard = { build: build, download: download };
})(window);
