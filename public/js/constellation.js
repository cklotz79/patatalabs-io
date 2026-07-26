/* patatalabs.io — constelación de embeddings
   No es un adorno con puntos al azar: son 44 vectores unitarios en
   R^6, sus vecinos se calculan por similitud coseno, y lo que se
   anima es la proyección a 2D, que rota en cuatro planos del espacio
   a la vez. Por eso los puntos se acercan y se alejan sin que la
   figura gire en bloque: se ven vértices multidimensionales.

   La rotación conserva el producto interno, así que la vecindad es
   fija — lo correcto: la estructura del espacio no cambia, cambia
   desde dónde se mira. Lo que sí ocurre es la consulta: cada pocos
   segundos un vector se activa y sus aristas se trazan hacia sus
   vecinos, con el mismo barrido de filete de 240ms del sistema. */

(function () {
  "use strict";

  var canvas = document.getElementById("pl-embed");
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext("2d");
  var quiet = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var DIMS = 6;
  var COUNT = 96;
  /* El pie es una banda muy apaisada, así que la proyección se estira
     en horizontal. Con un umbral bajo eso produce trazos larguísimos:
     subirlo deja sólo vecindad estrecha y la malla se lee fina. */
  var LINK = 0.74; // umbral de similitud coseno para dibujar arista
  var NEIGHBOURS = 4; // vecinos que se iluminan en cada consulta
  var SWEEP = 520; // ms que tarda una arista en trazarse
  var HOLD = 2100; // ms entre consulta y consulta

  /* Los planos que rotan. Se proyecta sobre los ejes 0 y 1, y se rota
     en planos que los cruzan: así los puntos entran y salen del plano
     de proyección en vez de girar todos juntos. */
  var PLANES = [
    { a: 0, b: 2, speed: 0.00021 },
    { a: 1, b: 4, speed: 0.00017 },
    { a: 3, b: 5, speed: 0.000131 },
    { a: 2, b: 5, speed: 0.000089 }
  ];

  /* ── Espacio ──────────────────────────────────────────── */

  function gauss() {
    var u = 1 - Math.random();
    var v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  var points = [];
  for (var i = 0; i < COUNT; i++) {
    var v = [];
    var norm = 0;
    for (var d = 0; d < DIMS; d++) {
      v[d] = gauss();
      norm += v[d] * v[d];
    }
    norm = Math.sqrt(norm) || 1;
    for (d = 0; d < DIMS; d++) v[d] /= norm;
    points.push(v);
  }

  function dot(a, b) {
    var s = 0;
    for (var d = 0; d < DIMS; d++) s += a[d] * b[d];
    return s;
  }

  // Aristas de fondo: todo par por encima del umbral
  var edges = [];
  // Vecinos por nodo, ordenados por similitud
  var near = [];

  for (i = 0; i < COUNT; i++) {
    var ranked = [];
    for (var j = 0; j < COUNT; j++) {
      if (i === j) continue;
      var sim = dot(points[i], points[j]);
      ranked.push({ j: j, sim: sim });
      if (j > i && sim > LINK) edges.push({ a: i, b: j, sim: sim });
    }
    ranked.sort(function (x, y) {
      return y.sim - x.sim;
    });
    near.push(ranked.slice(0, NEIGHBOURS));
  }

  /* ── Proyección ───────────────────────────────────────── */

  var angles = PLANES.map(function () {
    return Math.random() * Math.PI * 2;
  });

  var projected = new Float64Array(COUNT * 2);

  function project(w, h) {
    var cx = w / 2;
    var cy = h / 2;
    /* Escala por eje: el marco es apaisado y una escala isótropa
       dejaría la nube encogida en el centro. Estirar la ventana es
       una convención de vista, no altera qué vértice conecta con
       cuál — las aristas siguen uniendo los mismos puntos. */
    var scaleX = w * 0.45;
    var scaleY = h * 0.45;

    var cos = [];
    var sin = [];
    for (var p = 0; p < PLANES.length; p++) {
      cos[p] = Math.cos(angles[p]);
      sin[p] = Math.sin(angles[p]);
    }

    for (var i = 0; i < COUNT; i++) {
      var v = points[i];
      // copia rotada: sólo hacen falta los ejes que acaban en 0 y 1
      var c = v.slice();
      for (p = 0; p < PLANES.length; p++) {
        var a = PLANES[p].a;
        var b = PLANES[p].b;
        var va = c[a];
        var vb = c[b];
        c[a] = va * cos[p] - vb * sin[p];
        c[b] = va * sin[p] + vb * cos[p];
      }
      projected[i * 2] = cx + c[0] * scaleX;
      projected[i * 2 + 1] = cy + c[1] * scaleY;
    }
  }

  /* ── Pintura ──────────────────────────────────────────── */

  /* Va sobre tinta: un solo color de papel a distintas opacidades,
     y la señal para el vector consultado. */
  var css = getComputedStyle(document.documentElement);
  var PAPER = (css.getPropertyValue("--pl-on-ink") || "#F8F6F1").trim();
  var SIGNAL = (css.getPropertyValue("--pl-signal") || "#2BF5C8").trim();

  /* Es fondo de un pie de marca: ningún momento de la animación debe
     competir con el logotipo ni con el correo que van encima. */
  var A_EDGE = 0.09; // aristas de fondo: estructura, no protagonismo
  var A_NODE = 0.26;
  var A_QUERY = 0.5; // aristas de la consulta
  var A_HIT = 0.75; // vecinos alcanzados

  var w = 0;
  var h = 0;
  var dpr = 1;

  /* Se mide el pie, no el canvas: el canvas está posicionado en
     absoluto, así que no influye en la altura de su contenedor y no
     hay realimentación. Medir el propio canvas sí la tendría. */
  function resize() {
    var rect = canvas.parentNode.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, rect.width);
    h = Math.max(1, rect.height);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(active, sweep) {
    ctx.clearRect(0, 0, w, h);

    // Aristas de fondo: la estructura estable del espacio
    ctx.lineWidth = 1;
    ctx.strokeStyle = PAPER;
    ctx.globalAlpha = A_EDGE;
    ctx.beginPath();
    for (var e = 0; e < edges.length; e++) {
      var a = edges[e].a;
      var b = edges[e].b;
      ctx.moveTo(projected[a * 2], projected[a * 2 + 1]);
      ctx.lineTo(projected[b * 2], projected[b * 2 + 1]);
    }
    ctx.stroke();

    // Vértices: cuadrados, no círculos — cero radios
    ctx.fillStyle = PAPER;
    ctx.globalAlpha = A_NODE;
    for (var i = 0; i < COUNT; i++) {
      ctx.fillRect(projected[i * 2] - 1.5, projected[i * 2 + 1] - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1;

    if (active < 0) return;

    // La consulta: las aristas se trazan desde el vector activo
    var ax = projected[active * 2];
    var ay = projected[active * 2 + 1];
    var list = near[active];

    ctx.strokeStyle = PAPER;
    ctx.globalAlpha = A_QUERY;
    ctx.beginPath();
    for (var n = 0; n < list.length; n++) {
      // cada vecino arranca un poco después que el anterior
      var t = (sweep - n * 0.12) / (1 - (list.length - 1) * 0.12);
      if (t <= 0) continue;
      if (t > 1) t = 1;
      var k = list[n].j;
      var kx = projected[k * 2];
      var ky = projected[k * 2 + 1];
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + (kx - ax) * t, ay + (ky - ay) * t);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Vecinos alcanzados, en papel pleno
    ctx.fillStyle = PAPER;
    ctx.globalAlpha = A_HIT;
    for (n = 0; n < list.length; n++) {
      var tn = (sweep - n * 0.12) / (1 - (list.length - 1) * 0.12);
      if (tn < 1) continue;
      var m = list[n].j;
      ctx.fillRect(projected[m * 2] - 2, projected[m * 2 + 1] - 2, 4, 4);
    }

    // El vector consultado: la única señal del pie
    ctx.globalAlpha = 1;
    ctx.fillStyle = SIGNAL;
    ctx.fillRect(ax - 2, ay - 2, 4, 4);
  }

  /* ── Ciclo ────────────────────────────────────────────── */

  var active = 0;
  var phase = 0;
  var last = 0;
  var running = false;
  var frame = 0;

  function step(now) {
    if (!running) return;
    var dt = last ? Math.min(now - last, 64) : 16;
    last = now;

    for (var p = 0; p < PLANES.length; p++) {
      angles[p] += PLANES[p].speed * dt;
    }

    phase += dt;
    var sweep = phase / SWEEP;
    if (sweep > 1) sweep = 1;
    if (phase > SWEEP + HOLD) {
      phase = 0;
      active = (active + 7) % COUNT; // salto primo: no recorre vecinos seguidos
    }

    project(w, h);
    draw(active, sweep);
    frame = requestAnimationFrame(step);
  }

  function start() {
    if (running) return;
    running = true;
    last = 0;
    frame = requestAnimationFrame(step);
  }

  function stop() {
    running = false;
    if (frame) cancelAnimationFrame(frame);
  }

  function still() {
    project(w, h);
    draw(0, 1);
  }

  resize();

  if (quiet) {
    still();
  } else if ("IntersectionObserver" in window) {
    // Fuera de pantalla no se pinta nada
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) start();
        else stop();
      });
    }).observe(canvas);
  } else {
    start();
  }

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resize();
      if (quiet || !running) still();
    }, 150);
  });
})();
