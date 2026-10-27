/**
 * Fichero: a card catalog filed by meaning, 6 × 4 drawers on a plinth under a
 * top that overhangs. The pointer is a query, read on the plane of the drawer
 * fronts at rest, which never moves: each drawer slides out by its distance to
 * it, on its own spring, and the nearest takes the bright edge and a 3 × 3 dot
 * mark on its top. At rest two clusters stay half out, where the last queries
 * left them. The slider is the reach, in drawer pitches.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rings, rrect, spring, stepS,
  flatDot, mk, place, pointer, poly, put, register, disposer, solid,
} = HL;

const COLS = 6, ROWS = 4, DW = 22, DH = 13, G = 3, PX = DW + G, PZ = DH + G;
const W = COLS * DW + (COLS + 1) * G, H = ROWS * DH + (ROWS + 1) * G;
const D = 40, PH = 7, ZT = PH + H, TT = 4, OV = 3, OUT = 34, MIN = 0.9;

/** The share of the full pull at u reaches from the query: 1 → .31 at 42% → .04 at the edge and beyond. */
const falloff = (u) =>
  u <= 0 ? 1 : u <= 0.42 ? 1 - (u / 0.42) * 0.69 : u <= 1 ? 0.31 - ((u - 0.42) / 0.58) * 0.27 : 0.04;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.55);
  const box = [];
  for (const x of [-OV, W + OV]) for (const y of [-OV, D + OUT]) for (const z of [0, ZT + TT]) box.push([x, y, z]);
  fit(C, box, 200, 166);
  const P = proj(C), front = facing(C);
  let R = value, over = null;

  // The query plane: the drawer fronts at rest, y = D. P is affine, so a screen
  // point maps back onto it by one 2 × 2 solve.
  const o = P(0, D, 0), ex = P(1, D, 0), ez = P(0, D, 1);
  const ax = ex[0] - o[0], ay = ex[1] - o[1], bx = ez[0] - o[0], by = ez[1] - o[1], det = ax * by - ay * bx;
  const onFace = (s) => {
    const dx = s[0] - o[0], dy = s[1] - o[1];
    return [(dx * by - dy * bx) / det, (ax * dy - ay * dx) / det];
  };

  const root = mk("g", {}, svg);
  const [pr, pi] = rings(4, 4, W - 4, D - 4, 2, 0.9);
  put(solid(root), prism(P, front, pr, pi, 0, PH));
  const [kr, ki] = rings(0, 0, W, D, 2.2, 1.2);
  put(solid(root), prism(P, front, kr, ki, PH, ZT));

  // By ascending column + row: a drawer can only hide one to its left or below,
  // so appending in this order is painting back to front.
  const drawers = [];
  for (let s = 0; s <= COLS + ROWS - 2; s++) for (let c = 0; c < COLS; c++) {
    const r = s - c;
    if (r < 0 || r >= ROWS) continue;
    const u = c / (COLS - 1), v = r / (ROWS - 1);
    const d0 = MIN + 21 * Math.exp(-((u - 0.26) ** 2 + (v - 0.6) ** 2) / 0.05) + 8 * Math.exp(-((u - 0.84) ** 2 + (v - 0.22) ** 2) / 0.03);
    const g = mk("g", {}, root), el = solid(g);
    const label = mk("path", { class: "lo nf" }, g), pull = mk("path", { class: "lo nf" }, g);
    drawers.push({ c, r, x0: G + c * PX, z0: PH + G + r * PZ, d0, sp: spring(d0, { eps: 0.05 }), g, el, label, pull, drawn: NaN });
  }

  const [tr, ti] = rings(-OV, -OV, W + OV, D + OV, 3, 1.4);
  put(solid(root), prism(P, front, tr, ti, ZT, ZT + TT));

  // The mark: a 3 × 3 of dots on the top of one drawer, the card that answered,
  // moved in the paint order to just after its drawer.
  const mark = mk("g", {}, root), md = [];
  for (let k = 0; k < 9; k++) md.push(flatDot(mark, C, 0.55, k === 4 ? "dot" : "dot m"));
  const peak = drawers.reduce((a, b) => (b.d0 > a.d0 ? b : a));
  const byCell = new Map();
  drawers.forEach((k) => byCell.set(k.c + "," + k.r, k));
  let mc = null, want = peak;

  const onFront = (ring, y) => poly(ring.map((q) => P(q.u, y, q.v)));

  // A drawer whose spring hasn't moved keeps its paths.
  function drawDrawer(k) {
    const d = Math.max(MIN, k.sp.x);
    if (d === k.drawn) return;
    k.drawn = d;
    const [ring, inner] = rings(k.x0, D, k.x0 + DW, D + d, 1.6, Math.min(0.8, d * 0.4));
    put(k.el, prism(P, front, ring, inner, k.z0, k.z0 + DH));
    const cx = k.x0 + DW / 2, yf = D + d;
    k.label.setAttribute("d", onFront(rrect(cx - 5.5, k.z0 + 8, cx + 5.5, k.z0 + 11, 0.8, 3), yf));
    k.pull.setAttribute("d", onFront(rrect(cx - 3, k.z0 + 3.6, cx + 3, k.z0 + 5.4, 0.9, 3), yf));
  }

  function drawMark() {
    if (want !== mc) {
      if (mc) mc.el.sil.classList.remove("hi");
      mc = want;
      mc.el.sil.classList.add("hi");
      mc.g.after(mark);
    }
    const d = Math.max(MIN, mc.sp.x), cx = mc.x0 + DW / 2, z = mc.z0 + DH;
    const cy = D + Math.max(d - 4, d / 2), sy = Math.min(2.5, d / 4);
    md.forEach((el, k) => place(el, P(cx + ((k % 3) - 1) * 2.5, cy + (Math.floor(k / 3) - 1) * sy, z)));
  }

  const B = register(stage, (dt) => {
    let m = false;
    for (const k of drawers) { if (stepS(k.sp, dt)) m = true; drawDrawer(k); }
    drawMark();
    return m;
  });
  bag.add(B.unregister);

  function retarget() {
    for (const k of drawers) {
      if (!over) { k.sp.t = k.d0; continue; }
      const du = (k.x0 + DW / 2 - over[0]) / PX, dv = (k.z0 + DH / 2 - over[1]) / PZ;
      k.sp.t = Math.max(MIN, OUT * falloff(Math.hypot(du, dv) / R));
    }
    if (over) {
      const c = clamp(Math.floor((over[0] - G / 2) / PX), 0, COLS - 1);
      const r = clamp(Math.floor((over[1] - PH - G / 2) / PZ), 0, ROWS - 1);
      want = byCell.get(c + "," + r);
      read.textContent = `drawer ${c + 1}·${ROWS - r}`;
    } else { want = peak; read.textContent = "rest"; }
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => { over = onFace(p); retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { R = v; if (over) retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "fichero",
  means: "A card catalog filed by meaning: the drawers nearest the query slide out, the closest furthest.",
  rules: [1, 3, 5, 6],
  range: [1, 1.8, 3],
  tour: [[150, 150], [250, 130], [200, 180], null],
  mount,
});
