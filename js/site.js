/* patatalabs.io — movimiento
   La página se comporta como una sesión de terminal: se teclea el
   comando, se imprime la respuesta. Las líneas ya están en el DOM
   desde el principio y sólo se encienden, así que la maqueta nunca
   salta y el texto sigue disponible para lectores de pantalla.

   Si el sistema pide menos movimiento, todo aparece de una vez. */

(function () {
  "use strict";

  var quiet = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── Idioma ───────────────────────────────────────────────
     El español va en el HTML, así que sin JS la página se lee
     entera. El inglés viaja en `data-en` y se intercambia; al
     volver a español se restaura el HTML original, que en algún
     nodo lleva marcado interno. */

  var STORE = "patata-lang";

  function stored() {
    try {
      var q = new URLSearchParams(location.search).get("lang");
      if (q === "en" || q === "es") return q;
      return localStorage.getItem(STORE);
    } catch (e) {
      return null;
    }
  }

  function remember(lang) {
    try {
      localStorage.setItem(STORE, lang);
    } catch (e) {
      /* modo privado: la elección dura lo que la sesión */
    }
  }

  function applyLang(lang) {
    var root = document.documentElement;
    if (root.lang === lang) return;
    root.lang = lang;

    var nodes = document.querySelectorAll("[data-en]");
    Array.prototype.forEach.call(nodes, function (el) {
      if (el.dataset.esHtml === undefined) el.dataset.esHtml = el.innerHTML;
      if (lang === "en") el.textContent = el.dataset.en;
      else el.innerHTML = el.dataset.esHtml;
    });

    // Los comandos ya tecleados se reescriben; los que aún no han
    // corrido olvidan su caché y se teclearán en el idioma nuevo.
    Array.prototype.forEach.call(document.querySelectorAll("[data-type]"), function (el) {
      var block = el.closest("[data-term]");
      delete el.dataset.text;
      if (block && block.dataset.queued) el.dataset.text = el.textContent;
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-lang-set]"), function (btn) {
      btn.setAttribute("aria-pressed", String(btn.dataset.langSet === lang));
    });
  }

  function initLang() {
    var choice = stored();
    if (choice) applyLang(choice);

    Array.prototype.forEach.call(document.querySelectorAll("[data-lang-set]"), function (btn) {
      btn.addEventListener("click", function () {
        var lang = btn.dataset.langSet;
        applyLang(lang);
        remember(lang);
      });
    });
  }

  var TYPE_MS = 46; // por carácter
  var LINE_MS = 120; // entre líneas de respuesta
  var AFTER_CMD_MS = 220; // pausa antes de que el comando responda
  var AFTER_BLOCK_MS = 340; // pausa antes del siguiente comando

  /* ── Cursor: uno solo encendido en toda la página ─────── */

  var caret = null;

  function setCaret(el) {
    if (caret) caret.classList.remove("is-caret");
    caret = el;
    if (el) el.classList.add("is-caret");
  }

  /* ── Tecleado ─────────────────────────────────────────── */

  function typeText(el, done) {
    var text = el.dataset.text || el.textContent;
    el.dataset.text = text;
    el.textContent = "";

    var i = 0;
    (function step() {
      el.textContent = text.slice(0, ++i);
      if (i < text.length) setTimeout(step, TYPE_MS);
      else if (done) done();
    })();
  }

  function fill(el) {
    el.textContent = el.dataset.text || el.textContent;
  }

  /* ── Un bloque = un comando y su respuesta ────────────── */

  function runBlock(block, done) {
    var lines = [].slice.call(block.querySelectorAll("[data-line]"));
    var i = 0;

    (function next() {
      if (i >= lines.length) {
        // El cursor queda esperando al final de la respuesta, salvo en
        // los bloques que traen su propia señal: una sola por vista.
        setCaret(block.hasAttribute("data-nocaret") ? null : lines[lines.length - 1]);
        if (done) setTimeout(done, AFTER_BLOCK_MS);
        return;
      }

      var line = lines[i++];
      line.classList.add("is-on");

      var typed = line.querySelector("[data-type]");
      if (typed) {
        setCaret(line);
        typeText(typed, function () {
          setCaret(null);
          setTimeout(next, AFTER_CMD_MS);
        });
      } else {
        setTimeout(next, LINE_MS);
      }
    })();
  }

  /* ── Cola: los bloques corren en orden, nunca a la vez ── */

  function sequence(blocks) {
    var queue = [];
    var busy = false;

    function pump() {
      if (busy) return;
      var block = queue.shift();
      if (!block) return;
      busy = true;
      runBlock(block, function () {
        busy = false;
        pump();
      });
    }

    function request(block) {
      if (block.dataset.queued) return;
      block.dataset.queued = "1";
      queue.push(block);
      pump();
    }

    if (!("IntersectionObserver" in window)) {
      blocks.forEach(request);
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          io.unobserve(entry.target);
          request(entry.target);
        });
      },
      { rootMargin: "0px 0px -15% 0px", threshold: 0.1 }
    );

    blocks.forEach(function (b) {
      io.observe(b);
    });
  }

  /* ── Arranque ─────────────────────────────────────────── */

  function showAll(blocks) {
    blocks.forEach(function (block) {
      block.querySelectorAll("[data-line]").forEach(function (line) {
        line.classList.add("is-on");
      });
      block.querySelectorAll("[data-type]").forEach(fill);
    });
    var last = blocks[blocks.length - 1];
    if (last) {
      var lines = last.querySelectorAll("[data-line]");
      setCaret(lines[lines.length - 1]);
    }
  }

  function start() {
    initLang();

    var blocks = [].slice.call(document.querySelectorAll("[data-term]"));
    var hero = [].slice.call(document.querySelectorAll(".site__hero [data-reveal]"));
    var tagline = document.querySelector("[data-typed]");

    if (quiet) {
      hero.forEach(function (el) {
        el.classList.add("is-in");
      });
      if (tagline) fill(tagline);
      showAll(blocks);
      return;
    }

    // El tagline se teclea junto al logotipo; luego entra el titular
    if (tagline) {
      // el mono mide en ch: reservar el ancho evita que la cabecera salte
      tagline.style.minWidth = (tagline.dataset.text || tagline.textContent).length + "ch";
      typeText(tagline, function () {
        hero.forEach(function (el) {
          el.classList.add("is-in");
        });
      });
    } else {
      hero.forEach(function (el) {
        el.classList.add("is-in");
      });
    }

    sequence(blocks);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
