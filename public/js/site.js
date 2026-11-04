/* patatalabs.io — cursor e idioma
   La página es la traza del pipeline. Hay un solo cursor señal por
   vista y va donde va la lectura: titular, reglas, pipeline, cada uno
   de los seis pasos y el contacto.

   Sin JS la página se lee entera en español, con el cursor en el
   titular. Con movimiento reducido el cursor sigue la lectura igual
   (es estado, no animación), pero no parpadea. */

(function () {
  "use strict";

  /* ── Idioma ───────────────────────────────────────────────
     El español va en el HTML. El inglés viaja en `data-en` y se
     intercambia; al volver a español se restaura el HTML original,
     que en algún nodo lleva marcado interno. */

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

    Array.prototype.forEach.call(document.querySelectorAll("[data-en]"), function (el) {
      if (el.dataset.esHtml === undefined) el.dataset.esHtml = el.innerHTML;
      if (lang === "en") el.textContent = el.dataset.en;
      else el.innerHTML = el.dataset.esHtml;
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
        pick();
      });
    });
  }

  /* ── El cursor viajero ────────────────────────────────────
     Cada estación tiene su cursor; sólo se ve el de la última cuyo
     borde superior pasó la mitad de la ventana. Al final de la
     página, el del contacto. Se mide en cada scroll, sin
     requestAnimationFrame: son diez medidas, y así no se queda
     atrás en una pestaña en segundo plano. */

  var stations = [];
  var here = null;

  function pick() {
    if (!stations.length) return;
    var doc = document.documentElement;
    var next = stations[0];

    if (window.scrollY + window.innerHeight >= doc.scrollHeight - 2) {
      next = stations[stations.length - 1];
    } else {
      var line = window.innerHeight * 0.5;
      stations.forEach(function (s) {
        if (s.getBoundingClientRect().top <= line) next = s;
      });
    }

    if (next === here) return;
    if (here) here.classList.remove("is-here");
    next.classList.add("is-here");
    here = next;
  }

  /* ── Arranque ─────────────────────────────────────────── */

  function start() {
    stations = [].slice.call(document.querySelectorAll("[data-station]"));
    here = document.querySelector("[data-station].is-here");

    initLang();
    window.addEventListener("scroll", pick, { passive: true });
    window.addEventListener("resize", pick);
    pick();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
