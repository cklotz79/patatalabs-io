/* patatalabs.io — anfitrión de figuras Hairline
   Hace en la home lo que bench.html hace en su página: crea el svg, se lo
   entrega a la figura y se ocupa de lo de alrededor —la lectura, el idioma y
   una sola vuelta del recorrido cuando la figura aparece—. kernel.js y la
   figura se cargan tal cual salen de la skill hairline-create: no se tocan
   aquí, y un cambio en la figura se hace en out/hairline-fichero/. */

(function () {
  "use strict";

  // La figura escribe su lectura en inglés, como en el paquete; aquí se dice
  // en el idioma de la página.
  var WORDS = { es: { drawer: "cajón", rest: "reposo" }, en: {} };
  var LABEL = {
    es: "Un fichero archivado por significado: los cajones más cercanos a la consulta se abren, el más próximo más que ninguno.",
  };

  var lang = function () {
    return document.documentElement.lang === "en" ? "en" : "es";
  };

  window.hairline = function (figure) {
    var stage = document.querySelector('[data-figure="' + figure.name + '"]');
    if (!stage) return;
    var out = stage.parentNode.querySelector("[data-figure-read]");

    HL.inject(document);
    stage.setAttribute("data-hairline", figure.name);
    stage.setAttribute("role", "img");
    var svg = HL.mk("svg", { viewBox: "0 0 400 320", "aria-hidden": "true" }, stage);

    var raw = "rest";
    function show() {
      var l = lang();
      stage.setAttribute("aria-label", LABEL[l] || figure.means);
      if (out) out.textContent = raw.replace(/^[a-z]+/, function (w) { return WORDS[l][w] || w; });
    }
    var read = {
      get textContent() { return raw; },
      set textContent(v) { raw = v == null ? "" : String(v); show(); },
    };

    figure.mount({ stage: stage, svg: svg, read: read }, figure.range[1]);
    show();
    new MutationObserver(show).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

    // Una vuelta del recorrido cuando la sesión imprime la figura, y ya: el
    // resto del tiempo sólo responde a la mano. Con movimiento reducido, nada.
    var line = stage.closest("[data-line]");
    if (!line || HL.reducedMotion()) return;
    var stops = figure.tour || HL.LAP;
    var played = false;
    function lap() {
      if (played || !line.classList.contains("is-on")) return;
      played = true;
      watch.disconnect();
      var run = HL.tour(stage, stops, function (i) {
        if (i === stops.length - 1) run.stop();
      });
    }
    var watch = new MutationObserver(lap);
    watch.observe(line, { attributes: true, attributeFilter: ["class"] });
    lap();
  };
})();
