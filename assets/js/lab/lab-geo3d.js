/* ERLY — Noor Lab: interactive geometry (JSXGraph) and 3D mathematics (three.js), v16.
   Geometry: every construction is made of live, dependent objects — drag a vertex and every length, angle,
   centre and explanation updates. 3D: real meshes you can rotate, zoom and pan, with exact volume and surface-area
   formulas, cross-sections, surfaces z = f(x, y), 3D curves, planes, vectors and vector fields. */
(function () {
  'use strict';
  const L = window.ERLY_LAB; if (!L) return;
  const { T, esc, num: N, ui } = L;
  let seq = 0;

  /* ======================= geometry ======================= */
  const GEO = [
    [/\b(angles? (of|in) a triangle|triangle angles? add|sum of (the )?angles|why .*180|angle sum)\b/i, 'anglesum'],
    [/\b(circumcent|incent|orthocent|centroid|incircle|circumcircle|euler line|centres? of a triangle|centers? of a triangle)/i, 'centres'],
    [/\btangent\b.*\bcircle\b|\bcircle\b.*\btangent\b/i, 'tangent'],
    [/\b(two circles|circles? intersect|intersection of (the |these )?(two )?circles)\b/i, 'circles'],
    [/\b(reflect\w*|rotat\w*|translat\w*|dilat\w*|enlarge\w*)\b.*\b(shape|triangle|polygon|square|quadrilateral|point|figure|line of symmetry|mirror line)\b|\bgeometric transformations?\b|\b(reflection|rotation|translation|dilation|enlargement)s? (in|of|about|by) /i, 'transform'],
    [/\b(perpendicular bisector|angle bisector|midpoint|bisect)\b/i, 'bisect'],
    [/\b(pythagor\w*|right[- ]angled triangle|hypotenuse)/i, 'pythag'],
    [/\b(parallel lines?|perpendicular lines?|line through|segment|\bray\b|vectors? in 2d)\b/i, 'lines'],
    [/\b(polygon|quadrilateral|pentagon|hexagon|interior angles of a polygon)\b/i, 'polygon'],
    [/\b(similar triangles|similarity|congruen)/i, 'similar'],
    [/\b(construct|draw|make|build|show)\b.*\btriangle\b|\btriangle\b.*\b(angles?|sides?|measure)/i, 'triangle'],
    [/\b(construct|draw)\b.*\bcircle\b|\bcircle\b.*\b(radius|chord|arc|circumference)\b/i, 'circle']
  ];
  L.register({
    id: 'geometry', family: 'math', kind: T('Maths · Geometry', 'رياضيات · الهندسة'), title: T('Geometry construction', 'إنشاء هندسي'),
    match(t) {
      if (/\b(3d|three[- ]dimensional|sphere|cube|cone|cylinder|pyramid|prism|polyhedr)\b/i.test(t)) return null;
      if (/[xy]\s*\^?\s*2\s*[+-].*=|y\s*=/.test(L.normalise(t))) return null; // an equation is for the grapher
      if (/\b(time dilation|length contraction|relativi\w*|lorentz)\b/i.test(t)) return null; // physics, not a geometric dilation
      for (const [re, mode] of GEO) if (re.test(t)) { const rot = t.match(/rotat\w*\s+(?:by\s+)?(-?\d+)/i); return { score: 0.86, params: { mode, angle: rot ? +rot[1] : undefined, which: /reflect/i.test(t) ? 'reflect' : /translat/i.test(t) ? 'translate' : /dilat|enlarge/i.test(t) ? 'dilate' : 'rotate' } }; }
      return null;
    },
    async mount(ctx) { return geometry(ctx); }
  });
  async function geometry(ctx) {
    const JXG = await L.libs.jsx(); const p = ctx.params, mode = p.mode || 'triangle';
    const box = ui.el('div', 'lab-jxg jxgbox'); box.id = 'labJXG' + (++seq); ctx.stage.appendChild(box);
    const C = L.colors();
    JXG.Options.text.display = 'internal'; JXG.Options.text.fontSize = 14;
    const board = JXG.JSXGraph.initBoard(box.id, { boundingbox: [-8, 6, 8, -6], axis: true, grid: false, showCopyright: false, showNavigation: true, keepaspectratio: true, pan: { enabled: true, needTwoFingers: true }, zoom: { wheel: true, needShift: false, pinch: true }, defaultAxes: { x: { strokeColor: C.axis, ticks: { strokeColor: C.grid2, label: { strokeColor: C.muted } } }, y: { strokeColor: C.axis, ticks: { strokeColor: C.grid2, label: { strokeColor: C.muted } } } } });
    const S = { show: { angles: true, sides: true, circum: false, incircle: false, ortho: false, centroid: false, euler: false }, which: p.which || 'rotate', angle: p.angle != null ? p.angle : 60, k: 1.5, dx: 3, dy: 1 };
    const col = C.pal, ink = C.ink;
    const pt = (x, y, name, o) => board.create('point', [x, y], Object.assign({ name, size: 5, strokeColor: col[0], fillColor: col[0], label: { strokeColor: ink, offset: [8, 8] }, highlightFillColor: col[3] }, o || {}));
    const txt = (fx, fy, fs, o) => board.create('text', [fx, fy, fs], Object.assign({ strokeColor: ink, fontSize: 13, anchorX: 'middle', anchorY: 'middle', fixed: true, highlight: false }, o || {}));
    const ang = (a, b, c, o) => board.create('nonreflexangle', [a, b, c], Object.assign({ radius: 0.8, fillColor: col[3], fillOpacity: 0.22, strokeColor: col[3], name: () => N.fmt(JXG.Math.Geometry.trueAngle(a, b, c) > 180 ? 360 - JXG.Math.Geometry.trueAngle(a, b, c) : JXG.Math.Geometry.trueAngle(a, b, c), 1) + '°', label: { strokeColor: ink } }, o || {}));
    const angDeg = (a, b, c) => { const v = JXG.Math.Geometry.trueAngle(a, b, c); return v > 180 ? 360 - v : v; };
    const E = {}; let items = [];
    const toggles = [];
    function tri(A0, B0, C0) {
      E.A = pt(A0[0], A0[1], 'A'); E.B = pt(B0[0], B0[1], 'B'); E.C = pt(C0[0], C0[1], 'C');
      E.poly = board.create('polygon', [E.A, E.B, E.C], { fillColor: col[0], fillOpacity: 0.08, borders: { strokeColor: col[0], strokeWidth: 2.5 }, vertices: { visible: true } });
      E.angA = ang(E.B, E.A, E.C); E.angB = ang(E.C, E.B, E.A); E.angC = ang(E.A, E.C, E.B);
      const mid = (P, Q, nm) => txt(() => (P.X() + Q.X()) / 2 + (P.Y() - Q.Y()) * 0.08, () => (P.Y() + Q.Y()) / 2 + (Q.X() - P.X()) * 0.08, () => `${nm} = ${N.fmt(P.Dist(Q), 2)}`, { strokeColor: C.muted });
      E.sa = mid(E.B, E.C, 'a'); E.sb = mid(E.C, E.A, 'b'); E.sc = mid(E.A, E.B, 'c');
    }
    function setVis(list, v) { list.forEach(o => o && o.setAttribute({ visible: v })); }
    if (mode === 'triangle' || mode === 'centres' || mode === 'anglesum' || mode === 'similar') {
      tri([-4, -2.5], [4, -2], [0.8, 3.5]);
      // centres
      E.O = board.create('circumcenter', [E.A, E.B, E.C], { name: 'O', size: 4, strokeColor: col[1], fillColor: col[1], visible: false });
      E.cc = board.create('circumcircle', [E.A, E.B, E.C], { strokeColor: col[1], dash: 2, visible: false, center: { visible: false } });
      E.I = board.create('incenter', [E.A, E.B, E.C], { name: 'I', size: 4, strokeColor: col[2], fillColor: col[2], visible: false });
      E.ic = board.create('incircle', [E.A, E.B, E.C], { strokeColor: col[2], dash: 2, visible: false, center: { visible: false } });
      E.H = board.create('point', [() => E.A.X() + E.B.X() + E.C.X() - 2 * E.O.X(), () => E.A.Y() + E.B.Y() + E.C.Y() - 2 * E.O.Y()], { name: 'H', size: 4, strokeColor: col[4], fillColor: col[4], visible: false, fixed: true });
      E.G = board.create('point', [() => (E.A.X() + E.B.X() + E.C.X()) / 3, () => (E.A.Y() + E.B.Y() + E.C.Y()) / 3], { name: 'G', size: 4, strokeColor: col[5], fillColor: col[5], visible: false, fixed: true });
      E.medians = [[E.A, E.B, E.C], [E.B, E.C, E.A], [E.C, E.A, E.B]].map(([v, a, b]) => board.create('segment', [v, board.create('midpoint', [a, b], { visible: false })], { strokeColor: col[5], dash: 1, visible: false }));
      E.alts = [[E.A, E.B, E.C], [E.B, E.C, E.A], [E.C, E.A, E.B]].map(([v, a, b]) => board.create('segment', [v, board.create('perpendicularpoint', [v, board.create('line', [a, b], { visible: false })], { visible: false })], { strokeColor: col[4], dash: 1, visible: false }));
      E.euler = board.create('line', [E.O, E.H], { strokeColor: C.muted, dash: 3, visible: false });
      if (mode === 'centres') { S.show.circum = S.show.incircle = S.show.centroid = S.show.ortho = true; }
      if (mode === 'anglesum') {
        E.par = board.create('parallel', [E.A, E.B, E.C], { strokeColor: C.muted, dash: 2, name: '', straightFirst: true, straightLast: true });
        E.D = board.create('point', [() => E.C.X() - (E.B.X() - E.A.X()) / E.A.Dist(E.B) * 3, () => E.C.Y() - (E.B.Y() - E.A.Y()) / E.A.Dist(E.B) * 3], { name: 'D', size: 2, fixed: true, strokeColor: C.muted });
        E.Ee = board.create('point', [() => E.C.X() + (E.B.X() - E.A.X()) / E.A.Dist(E.B) * 3, () => E.C.Y() + (E.B.Y() - E.A.Y()) / E.A.Dist(E.B) * 3], { name: 'E', size: 2, fixed: true, strokeColor: C.muted });
        E.alt1 = ang(E.D, E.C, E.A, { fillColor: col[0], strokeColor: col[0], radius: 1.1 }); E.alt2 = ang(E.B, E.C, E.Ee, { fillColor: col[2], strokeColor: col[2], radius: 1.1 });
        E.angA.setAttribute({ fillColor: col[0], strokeColor: col[0] }); E.angB.setAttribute({ fillColor: col[2], strokeColor: col[2] });
      }
      if (mode === 'similar') {
        S.k = 1.6; E.P = pt(-6, -4.5, 'P', { strokeColor: col[1], fillColor: col[1] });
        const img = (V, nm) => board.create('point', [() => E.P.X() + S.k * (V.X() - E.A.X()), () => E.P.Y() + S.k * (V.Y() - E.A.Y())], { name: nm, size: 3, fixed: true, strokeColor: col[1], fillColor: col[1] });
        E.A2 = E.P; E.B2 = img(E.B, "B'"); E.C2 = img(E.C, "C'");
        E.poly2 = board.create('polygon', [E.A2, E.B2, E.C2], { fillColor: col[1], fillOpacity: 0.08, borders: { strokeColor: col[1] }, vertices: { visible: false } });
        board.setBoundingBox([-8, 9, 12, -6], true);
      }
    }
    if (mode === 'pythag') {
      E.A = pt(-3, -2, 'A', { fixed: false }); E.B = pt(2, -2, 'B'); E.C = board.create('point', [() => E.A.X(), () => E.A.Y() + 3], { name: 'C', size: 5, strokeColor: col[0], fillColor: col[0] });
      E.Cy = board.create('slider', [[3, 5], [6.5, 5], [0.5, 3, 6]], { name: 'height', snapWidth: 0.1, label: { strokeColor: ink } });
      E.C = board.create('point', [() => E.A.X(), () => E.A.Y() + E.Cy.Value()], { name: 'C', size: 4, strokeColor: col[0], fillColor: col[0], fixed: true });
      E.B = board.create('point', [() => E.Bx.Value() + E.A.X(), () => E.A.Y()], { name: 'B', size: 4, strokeColor: col[0], fillColor: col[0], fixed: true });
      E.Bx = board.create('slider', [[3, 4.2], [6.5, 4.2], [0.5, 4, 7]], { name: 'base', snapWidth: 0.1, label: { strokeColor: ink } });
      E.poly = board.create('polygon', [E.A, E.B, E.C], { fillColor: col[0], fillOpacity: 0.1, borders: { strokeColor: col[0], strokeWidth: 2.5 } });
      board.create('angle', [E.B, E.A, E.C], { orthoType: 'square', radius: 0.4, fillColor: col[3], strokeColor: col[3], name: '' });
      const sq = (P, Q, color) => { const R = board.create('point', [() => Q.X() + (Q.Y() - P.Y()), () => Q.Y() - (Q.X() - P.X())], { visible: false }); const S2 = board.create('point', [() => P.X() + (Q.Y() - P.Y()), () => P.Y() - (Q.X() - P.X())], { visible: false }); return board.create('polygon', [P, Q, R, S2], { fillColor: color, fillOpacity: 0.16, borders: { strokeColor: color }, vertices: { visible: false } }); };
      E.s1 = sq(E.A, E.B, col[1]); E.s2 = sq(E.C, E.A, col[2]); E.s3 = sq(E.B, E.C, col[4]);
      board.setBoundingBox([-11, 9, 9, -10], true);
    }
    if (mode === 'circle' || mode === 'tangent') {
      E.O = pt(0, 0, 'O'); E.R = pt(3, 0, 'R', { size: 3 }); E.c = board.create('circle', [E.O, E.R], { strokeColor: col[0], strokeWidth: 2.5, fillColor: col[0], fillOpacity: 0.05 });
      E.P = board.create('glider', [2.1, 2.1, E.c], { name: 'P', size: 5, strokeColor: col[1], fillColor: col[1], label: { strokeColor: ink } });
      E.OP = board.create('segment', [E.O, E.P], { strokeColor: col[0], dash: 2 });
      if (mode === 'tangent') {
        E.Tp = board.create('point', [() => E.P.X() - (E.P.Y() - E.O.Y()), () => E.P.Y() + (E.P.X() - E.O.X())], { visible: false });
        E.tan = board.create('line', [E.P, E.Tp], { strokeColor: col[1], strokeWidth: 2.5 });
        E.right = board.create('angle', [E.O, E.P, E.Tp], { orthoType: 'square', radius: 0.45, fillColor: col[3], strokeColor: col[3], name: '' });
        E.Q = board.create('point', [5.5, 4.5], { name: 'Q', size: 4, strokeColor: col[2], fillColor: col[2], label: { strokeColor: ink } });
        // the two tangents from an outside point Q: touch points from the Thales circle on OQ
        E.Mq = board.create('midpoint', [E.O, E.Q], { visible: false }); E.th = board.create('circle', [E.Mq, E.O], { visible: false });
        E.T1 = board.create('intersection', [E.c, E.th, 0], { name: 'T₁', size: 3, strokeColor: col[2], fillColor: col[2] }); E.T2 = board.create('intersection', [E.c, E.th, 1], { name: 'T₂', size: 3, strokeColor: col[2], fillColor: col[2] });
        E.q1 = board.create('segment', [E.Q, E.T1], { strokeColor: col[2], dash: 1 }); E.q2 = board.create('segment', [E.Q, E.T2], { strokeColor: col[2], dash: 1 });
      } else {
        E.Q = board.create('glider', [-2.5, 1.6, E.c], { name: 'Q', size: 4, strokeColor: col[2], fillColor: col[2], label: { strokeColor: ink } });
        E.chord = board.create('segment', [E.P, E.Q], { strokeColor: col[2] });
        E.arc = board.create('minorArc', [E.O, E.P, E.Q], { strokeColor: col[3], strokeWidth: 4 });
        E.cang = board.create('angle', [E.P, E.O, E.Q], { radius: 0.7, fillColor: col[3], strokeColor: col[3], name: () => N.fmt(angDeg(E.P, E.O, E.Q), 1) + '°' });
      }
    }
    if (mode === 'circles') {
      E.O1 = pt(-2, 0, 'O₁'); E.R1 = pt(1.5, 0, '', { size: 3 }); E.c1 = board.create('circle', [E.O1, E.R1], { strokeColor: col[0], strokeWidth: 2.5 });
      E.O2 = pt(2.5, 0.5, 'O₂', { strokeColor: col[1], fillColor: col[1] }); E.R2 = pt(2.5, 3.3, '', { size: 3, strokeColor: col[1], fillColor: col[1] }); E.c2 = board.create('circle', [E.O2, E.R2], { strokeColor: col[1], strokeWidth: 2.5 });
      E.X1 = board.create('intersection', [E.c1, E.c2, 0], { name: 'X₁', size: 4, strokeColor: col[2], fillColor: col[2], label: { strokeColor: ink } }); E.X2 = board.create('intersection', [E.c1, E.c2, 1], { name: 'X₂', size: 4, strokeColor: col[2], fillColor: col[2], label: { strokeColor: ink } });
      E.d = board.create('segment', [E.O1, E.O2], { strokeColor: C.muted, dash: 2 });
    }
    if (mode === 'transform') {
      E.A = pt(-5, 1, 'A'); E.B = pt(-2, 1, 'B'); E.C = pt(-2.5, 3.5, 'C'); E.D = pt(-5, 3, 'D');
      E.poly = board.create('polygon', [E.A, E.B, E.C, E.D], { fillColor: col[0], fillOpacity: 0.15, borders: { strokeColor: col[0], strokeWidth: 2.5 } });
      E.P1 = pt(0, -3, 'L₁', { size: 3, strokeColor: C.muted, fillColor: C.muted }); E.P2 = pt(1, 3, 'L₂', { size: 3, strokeColor: C.muted, fillColor: C.muted });
      E.mirror = board.create('line', [E.P1, E.P2], { strokeColor: C.muted, dash: 2 });
      E.Ctr = pt(0, 0, 'O', { strokeColor: col[4], fillColor: col[4] });
      const map = V => () => { const x = V.X(), y = V.Y(); if (S.which === 'reflect') { const ax = E.P1.X(), ay = E.P1.Y(), dx = E.P2.X() - ax, dy = E.P2.Y() - ay, t = ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy), fx = ax + t * dx, fy = ay + t * dy; return [2 * fx - x, 2 * fy - y]; } if (S.which === 'rotate') { const a = S.angle * Math.PI / 180, cx = E.Ctr.X(), cy = E.Ctr.Y(); return [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]; } if (S.which === 'translate') return [x + S.dx, y + S.dy]; const cx = E.Ctr.X(), cy = E.Ctr.Y(); return [cx + S.k * (x - cx), cy + S.k * (y - cy)]; };
      E.img = [E.A, E.B, E.C, E.D].map((V, i) => { const f = map(V); return board.create('point', [() => f()[0], () => f()[1]], { name: ['A', 'B', 'C', 'D'][i] + "'", size: 3, fixed: true, strokeColor: col[1], fillColor: col[1], label: { strokeColor: ink } }); });
      E.poly2 = board.create('polygon', E.img, { fillColor: col[1], fillOpacity: 0.15, borders: { strokeColor: col[1], strokeWidth: 2.5 }, vertices: { visible: false } });
      E.vec = board.create('arrow', [[() => E.A.X(), () => E.A.Y()], [() => E.A.X() + S.dx, () => E.A.Y() + S.dy]], { strokeColor: col[4], dash: 2 });
    }
    if (mode === 'bisect') {
      E.A = pt(-4, -2, 'A'); E.B = pt(3, 1, 'B'); E.C = pt(-1, 4, 'C');
      E.AB = board.create('segment', [E.A, E.B], { strokeColor: col[0], strokeWidth: 2.5 }); E.AC = board.create('segment', [E.A, E.C], { strokeColor: col[0], strokeWidth: 2.5 });
      E.M = board.create('midpoint', [E.A, E.B], { name: 'M', size: 4, strokeColor: col[1], fillColor: col[1], label: { strokeColor: ink } });
      E.pb = board.create('perpendicularbisector', [E.A, E.B], { strokeColor: col[1], dash: 2 });
      E.bis = board.create('bisector', [E.B, E.A, E.C], { strokeColor: col[2], dash: 2 });
      E.a1 = ang(E.B, E.A, E.C, { radius: 1.2 });
      E.X = board.create('glider', [0, 3, E.pb], { name: 'X', size: 4, strokeColor: col[3], fillColor: col[3], label: { strokeColor: ink } });
      E.XA = board.create('segment', [E.X, E.A], { strokeColor: col[3], dash: 1 }); E.XB = board.create('segment', [E.X, E.B], { strokeColor: col[3], dash: 1 });
    }
    if (mode === 'lines') {
      E.A = pt(-4, -1, 'A'); E.B = pt(3, 2, 'B'); E.P = pt(-1, 3.5, 'P', { strokeColor: col[1], fillColor: col[1] });
      E.l = board.create('line', [E.A, E.B], { strokeColor: col[0], strokeWidth: 2.5, name: 'l', withLabel: false });
      E.par = board.create('parallel', [E.l, E.P], { strokeColor: col[1], dash: 2 }); E.perp = board.create('perpendicular', [E.l, E.P], { strokeColor: col[2], dash: 2 });
      E.foot = board.create('perpendicularpoint', [E.P, E.l], { name: 'F', size: 3, strokeColor: col[2], fillColor: col[2] });
      E.ray = board.create('arrow', [[0, -4], [() => E.B.X() - E.A.X(), () => E.B.Y() - E.A.Y() - 4]], { strokeColor: col[4], name: 'v' });
    }
    if (mode === 'polygon') {
      const n = 5; E.V = []; for (let i = 0; i < n; i++) E.V.push(pt(4 * Math.cos(Math.PI / 2 + 2 * Math.PI * i / n), 4 * Math.sin(Math.PI / 2 + 2 * Math.PI * i / n), String.fromCharCode(65 + i)));
      E.poly = board.create('polygon', E.V, { fillColor: col[0], fillOpacity: 0.1, borders: { strokeColor: col[0], strokeWidth: 2.5 } });
      E.angs = E.V.map((V, i) => ang(E.V[(i + 1) % n], V, E.V[(i + n - 1) % n], { radius: 0.6 }));
    }
    board.on('update', () => { cancelAnimationFrame(S.raf); S.raf = requestAnimationFrame(() => { L.explainNow(); }); });
    /* ---------- controls ---------- */
    const side = ctx.side; const g = ui.group(T('Show', 'إظهار'));
    const tg = (key, label, list) => { const t = ui.toggle({ key, label, value: S.show[key], on: v => { S.show[key] = v; apply(); L.explainNow(); } }); toggles.push(t); g.appendChild(t); };
    if (E.angA) { tg('angles', T('Interior angles', 'الزوايا الداخلية')); tg('sides', T('Side lengths', 'أطوال الأضلاع')); }
    if (E.O && E.cc) { tg('circum', T('Circumcentre O and circumcircle', 'مركز الدائرة المحيطة')); tg('incircle', T('Incentre I and incircle', 'مركز الدائرة الداخلية')); tg('centroid', T('Centroid G and medians', 'المركز الهندسي والمتوسطات')); tg('ortho', T('Orthocentre H and altitudes', 'ملتقى الارتفاعات')); tg('euler', T('Euler line through O, G, H', 'مستقيم أويلر')); }
    if (mode === 'transform') {
      g.appendChild(ui.select({ key: 'which', label: T('Transformation', 'التحويل'), value: S.which, options: [['reflect', T('Reflection in the line L₁L₂', 'انعكاس')], ['rotate', T('Rotation about O', 'دوران')], ['translate', T('Translation by a vector', 'انسحاب')], ['dilate', T('Dilation (enlargement) from O', 'تمدد')]], on: v => { S.which = v; apply(); board.update(); } }));
      g.appendChild(ui.slider({ key: 'angle', label: T('rotation angle', 'زاوية الدوران'), min: -180, max: 180, step: 1, value: S.angle, unit: '°', on: v => { S.angle = v; board.update(); } }));
      g.appendChild(ui.slider({ key: 'k', label: T('scale factor k', 'معامل التمدد k'), min: -3, max: 3, step: 0.1, value: S.k, on: v => { S.k = v; board.update(); } }));
      g.appendChild(ui.slider({ key: 'dx', label: T('vector x', 'المتجه x'), min: -8, max: 8, step: 0.5, value: S.dx, on: v => { S.dx = v; board.update(); } }));
      g.appendChild(ui.slider({ key: 'dy', label: T('vector y', 'المتجه y'), min: -8, max: 8, step: 0.5, value: S.dy, on: v => { S.dy = v; board.update(); } }));
    }
    if (mode === 'similar') g.appendChild(ui.slider({ key: 'k', label: T('scale factor k', 'معامل التشابه k'), min: 0.2, max: 3, step: 0.1, value: S.k, on: v => { S.k = v; board.update(); } }));
    g.appendChild(ui.buttons([[T('Fit to view', 'ملاءمة'), () => board.zoom100()]]));
    side.appendChild(g);
    side.appendChild(ui.el('p', 'lab-sub', T('Drag any blue point. Everything that depends on it moves with it.', 'اسحب أي نقطة زرقاء.')));
    function apply() {
      if (E.angA) { setVis([E.angA, E.angB, E.angC], S.show.angles); setVis([E.sa, E.sb, E.sc], S.show.sides); }
      if (E.cc) { setVis([E.O, E.cc], S.show.circum); setVis([E.I, E.ic], S.show.incircle); setVis([E.G, ...E.medians], S.show.centroid); setVis([E.H, ...E.alts], S.show.ortho); setVis([E.euler], S.show.euler); if (S.show.euler) setVis([E.O, E.H, E.G], true); }
      if (mode === 'transform') { setVis([E.P1, E.P2, E.mirror], S.which === 'reflect'); setVis([E.Ctr], S.which === 'rotate' || S.which === 'dilate'); setVis([E.vec], S.which === 'translate'); }
      board.update();
    }
    apply();
    // measurements for the explanation (always computed from the live objects)
    const tri3 = () => ({ a: E.B.Dist(E.C), b: E.C.Dist(E.A), c: E.A.Dist(E.B), A: angDeg(E.B, E.A, E.C), B: angDeg(E.C, E.B, E.A), C: angDeg(E.A, E.C, E.B), area: Math.abs(E.poly.Area()) });
    const inst = {
      board,
      intro() {
        if (mode === 'triangle') { const t = tri3(); return T(`I’ve constructed triangle ABC with its side lengths and interior angles: A = ${N.fmt(t.A, 1)}°, B = ${N.fmt(t.B, 1)}°, C = ${N.fmt(t.C, 1)}°, which add to ${N.fmt(t.A + t.B + t.C, 1)}°. Drag any vertex — the lengths and angles update, and the sum stays 180°.`, 'أنشأت المثلث ABC.'); }
        if (mode === 'anglesum') return T('Why the angles of a triangle add to 180°: through C I’ve drawn the line DE parallel to AB. The orange angle at C equals angle A (alternate angles), the green one equals angle B, and together with angle C they make the straight line DE — 180°. Drag the vertices: it holds for every triangle.', 'لماذا مجموع زوايا المثلث 180°.');
        if (mode === 'centres') return T('Triangle centres: circumcentre O (perpendicular bisectors meet), incentre I (angle bisectors meet), centroid G (medians meet) and orthocentre H (altitudes meet). Turn on the Euler line: O, G and H always lie on one line.', 'مراكز المثلث.');
        if (mode === 'tangent') return T('A circle with a point P on it and the tangent at P: the tangent is always perpendicular to the radius OP (the square marker). From the outside point Q there are two tangents, and QT₁ = QT₂ — drag Q to check.', 'المماس عمودي على نصف القطر.');
        if (mode === 'circles') return T('Two circles and their intersection points. Drag the centres or the radius points: the number of intersections depends on the distance between the centres compared with the radii.', 'تقاطع دائرتين.');
        if (mode === 'transform') return T('A shape ABCD (blue) and its image A′B′C′D′ (red). Choose reflection, rotation, translation or dilation in the panel, then drag the shape or the controls.', 'التحويلات الهندسية.');
        if (mode === 'bisect') return T('Segment AB with its midpoint M and perpendicular bisector, and the bisector of angle BAC. Drag X along the perpendicular bisector: XA always equals XB.', 'المنصف العمودي.');
        if (mode === 'pythag') return T('A right-angled triangle with a square on each side. The two smaller squares’ areas always add up to the largest: a² + b² = c². Use the sliders to change the legs.', 'نظرية فيثاغورس.');
        if (mode === 'lines') return T('Line l through A and B, a point P, the line through P parallel to l and the line through P perpendicular to l (meeting l at F). Drag A, B or P.', 'المستقيمات المتوازية والمتعامدة.');
        if (mode === 'polygon') return T('A pentagon with its interior angles. Drag any vertex: for a convex polygon the interior angles always add up to (n − 2) × 180° = 540°.', 'مضلع خماسي.');
        if (mode === 'similar') return T('Triangle ABC and an enlarged copy with scale factor k. Corresponding angles are equal and every side is multiplied by k, so the triangles are similar.', 'المثلثات المتشابهة.');
        return T('A circle with a chord PQ and the central angle POQ. Drag P and Q around the circle.', 'دائرة.');
      },
      explain() {
        const h = [];
        if (E.angA && mode !== 'pythag') { const t = tri3(); h.push(ui.readout([['a = BC', N.fmt(t.a, 3)], ['b = CA', N.fmt(t.b, 3)], ['c = AB', N.fmt(t.c, 3)], ['∠A', N.fmt(t.A, 2) + '°'], ['∠B', N.fmt(t.B, 2) + '°'], ['∠C', N.fmt(t.C, 2) + '°'], [T('angle sum', 'مجموع الزوايا'), `<b>${N.fmt(t.A + t.B + t.C, 2)}°</b>`], [T('area', 'المساحة'), N.fmt(t.area, 3)], [T('perimeter', 'المحيط'), N.fmt(t.a + t.b + t.c, 3)]])); const big = [['A', t.A], ['B', t.B], ['C', t.C]].sort((x, y) => y[1] - x[1])[0]; h.push(`<p>${Math.abs(big[1] - 90) < 0.5 ? T(`Right-angled at ${big[0]}.`, 'قائم الزاوية.') : big[1] > 90 ? T(`Obtuse (∠${big[0]} > 90°).`, 'منفرج.') : T('Acute (every angle < 90°).', 'حاد.')} ${T('The longest side is always opposite the largest angle.', 'أطول ضلع يقابل أكبر زاوية.')}</p>`); }
        if (mode === 'anglesum') { const t = tri3(); h.push(`<p>∠DCA = ∠A = ${N.fmt(t.A, 1)}° <i>(${T('alternate angles, DE ∥ AB', 'زوايا متبادلة')})</i><br>∠BCE = ∠B = ${N.fmt(t.B, 1)}°<br>∠DCA + ∠C + ∠BCE = ${N.fmt(t.A + t.C + t.B, 1)}° = ${T('a straight line', 'خط مستقيم')}</p>`); }
        if (mode === 'centres' || (E.cc && (S.show.circum || S.show.incircle))) { const R = E.cc.Radius(), r = E.ic.Radius(), d = Math.hypot(E.O.X() - E.I.X(), E.O.Y() - E.I.Y()); h.push(ui.readout([[T('circumradius R', 'نصف قطر المحيطة R'), N.fmt(R, 3)], [T('inradius r', 'نصف قطر الداخلية r'), N.fmt(r, 3)], ['OI² = R(R − 2r)', `${N.fmt(d * d, 3)} = ${N.fmt(R * (R - 2 * r), 3)}`]]) + `<p class="lab-sub">${T('Euler’s theorem, checked live: the two numbers agree for every triangle.', 'نظرية أويلر.')}</p>`); }
        if (mode === 'tangent') { const r = E.O.Dist(E.P), a = angDeg(E.O, E.P, E.Tp); const d1 = E.Q.Dist(E.T1), d2 = E.Q.Dist(E.T2); h.push(ui.readout([[T('radius', 'نصف القطر'), N.fmt(r, 3)], ['∠OPT', N.fmt(a, 2) + '°'], ['QT₁', isFinite(d1) ? N.fmt(d1, 3) : T('Q is inside the circle', 'Q داخل الدائرة')], ['QT₂', isFinite(d2) ? N.fmt(d2, 3) : '—']])); }
        if (mode === 'circle') h.push(ui.readout([[T('radius r', 'نصف القطر'), N.fmt(E.O.Dist(E.R), 3)], [T('circumference 2πr', 'المحيط'), N.fmt(2 * Math.PI * E.O.Dist(E.R), 3)], [T('area πr²', 'المساحة'), N.fmt(Math.PI * E.O.Dist(E.R) ** 2, 3)], [T('chord PQ', 'الوتر'), N.fmt(E.P.Dist(E.Q), 3)], ['∠POQ', N.fmt(angDeg(E.P, E.O, E.Q), 2) + '°']]));
        if (mode === 'circles') { const r1 = E.c1.Radius(), r2 = E.c2.Radius(), d = E.O1.Dist(E.O2); const n = d > r1 + r2 + 1e-9 || d < Math.abs(r1 - r2) - 1e-9 ? 0 : Math.abs(d - (r1 + r2)) < 1e-6 || Math.abs(d - Math.abs(r1 - r2)) < 1e-6 ? 1 : 2; h.push(ui.readout([['r₁', N.fmt(r1, 3)], ['r₂', N.fmt(r2, 3)], [T('distance d', 'المسافة d'), N.fmt(d, 3)], [T('intersections', 'التقاطعات'), `<b>${n}</b>`]]) + `<p>${n === 2 ? T('|r₁ − r₂| < d < r₁ + r₂: two intersection points.', 'نقطتا تقاطع.') : n === 1 ? T('The circles just touch: one point.', 'تماس.') : d > r1 + r2 ? T('d > r₁ + r₂: too far apart to meet.', 'بعيدتان.') : T('d < |r₁ − r₂|: one circle is inside the other.', 'إحداهما داخل الأخرى.')}</p>`); if (n) h.push(`<p class="lab-sub">X₁ = (${N.fmt(E.X1.X(), 3)}, ${N.fmt(E.X1.Y(), 3)})${n === 2 ? `, X₂ = (${N.fmt(E.X2.X(), 3)}, ${N.fmt(E.X2.Y(), 3)})` : ''}</p>`); }
        if (mode === 'transform') { const s0 = E.A.Dist(E.B), s1 = E.img[0].Dist(E.img[1]); h.push(`<p>${{ reflect: T('A reflection flips the shape over the mirror line; every point and its image are the same distance from the line. Lengths and angles are preserved, orientation is reversed.', 'الانعكاس.'), rotate: T(`A rotation of ${S.angle}° about O: every point turns through the same angle and stays the same distance from O.`, 'الدوران.'), translate: T(`A translation by (${S.dx}, ${S.dy}): every point moves by the same vector.`, 'الانسحاب.'), dilate: T(`A dilation with scale factor k = ${S.k} from O: distances from O are multiplied by k, so lengths scale by |k| and areas by k².`, 'التمدد.') }[S.which]}</p>` + ui.readout([['AB', N.fmt(s0, 3)], ["A′B′", N.fmt(s1, 3)], [T('ratio', 'النسبة'), N.fmt(s1 / s0, 3)], [T('area ratio', 'نسبة المساحة'), N.fmt(Math.abs(E.poly2.Area() / E.poly.Area()), 3)]])); }
        if (mode === 'bisect') h.push(ui.readout([['M', `(${N.fmt(E.M.X(), 2)}, ${N.fmt(E.M.Y(), 2)})`], ['XA', N.fmt(E.X.Dist(E.A), 3)], ['XB', N.fmt(E.X.Dist(E.B), 3)], ['∠BAC / 2', N.fmt(angDeg(E.B, E.A, E.C) / 2, 2) + '°']]) + `<p>${T('Every point on the perpendicular bisector is equidistant from A and B — that is why the circumcentre (where three of them meet) is the centre of a circle through all three vertices.', 'كل نقطة على المنصف العمودي على بعد متساوٍ.')}</p>`);
        if (mode === 'pythag') { const a = E.A.Dist(E.B), b = E.A.Dist(E.C), c = E.B.Dist(E.C); h.push(ui.readout([['a² ', N.fmt(a * a, 3)], ['b²', N.fmt(b * b, 3)], ['a² + b²', `<b>${N.fmt(a * a + b * b, 3)}</b>`], ['c²', `<b>${N.fmt(c * c, 3)}</b>`]])); }
        if (mode === 'lines') { const m1 = (E.B.Y() - E.A.Y()) / (E.B.X() - E.A.X()); h.push(ui.readout([[T('gradient of l', 'ميل l'), N.fmt(m1, 3)], [T('parallel gradient', 'ميل الموازي'), N.fmt(m1, 3)], [T('perpendicular gradient', 'ميل العمودي'), isFinite(m1) && m1 !== 0 ? N.fmt(-1 / m1, 3) : '—'], [T('distance from P to l', 'بعد P عن l'), N.fmt(E.P.Dist(E.foot), 3)]]) + `<p>${T('Parallel lines have equal gradients; perpendicular gradients multiply to −1.', 'المستقيمات المتوازية ميولها متساوية.')}</p>`); }
        if (mode === 'polygon') { const s = E.angs.reduce((a, x, i) => a + angDeg(E.V[(i + 1) % 5], E.V[i], E.V[(i + 4) % 5]), 0); h.push(ui.readout([[T('angle sum', 'مجموع الزوايا'), `<b>${N.fmt(s, 2)}°</b>`], ['(n − 2) × 180°', '540°'], [T('area', 'المساحة'), N.fmt(Math.abs(E.poly.Area()), 3)]]) + `<p class="lab-sub">${T('Holds while the pentagon stays convex; drag a vertex inwards to see a reflex angle break the pattern of measured angles.', 'صحيح للمضلع المحدب.')}</p>`); }
        if (mode === 'similar') { const t = tri3(); h.push(ui.readout([["A′B′ / AB", N.fmt(E.A2.Dist(E.B2) / t.c, 3)], ["B′C′ / BC", N.fmt(E.B2.Dist(E.C2) / t.a, 3)], ["C′A′ / CA", N.fmt(E.C2.Dist(E.A2) / t.b, 3)], [T('area ratio', 'نسبة المساحة'), N.fmt(Math.abs(E.poly2.Area() / E.poly.Area()), 3) + ` = k² = ${N.fmt(S.k * S.k, 3)}`]])); }
        return h.join('');
      },
      command(t) {
        let mm;
        const flags = [[/circum/i, 'circum'], [/incircle|incent/i, 'incircle'], [/centroid|median/i, 'centroid'], [/orthocent|altitude/i, 'ortho'], [/euler/i, 'euler'], [/angle/i, 'angles'], [/side|length/i, 'sides']];
        for (const [re, k] of flags) if (re.test(t) && k in S.show && E.angA) { const on = !/\b(hide|remove|off)\b/i.test(t); S.show[k] = on; toggles.forEach(x => { if (x.input.dataset.key === k) x.set(on); }); apply(); return { note: (on ? T('Showing ', 'إظهار ') : T('Hiding ', 'إخفاء ')) + k + '.' }; }
        if ((mm = t.match(/rotat\w*\s+(?:by\s+)?(-?\d+)/i)) && mode === 'transform') { S.which = 'rotate'; S.angle = +mm[1]; side.querySelector('[data-key="which"]').value = 'rotate'; ctx.side.querySelectorAll('.lab-sl').forEach(w => { if (w.input.dataset.key === 'angle') w.set(S.angle); }); apply(); return { note: T(`Rotated by ${S.angle}° about O.`, 'دوران.') }; }
        if (/\breflect/i.test(t) && mode === 'transform') { S.which = 'reflect'; side.querySelector('[data-key="which"]').value = 'reflect'; apply(); return { note: T('Reflection in the line L₁L₂.', 'انعكاس.') }; }
        if ((mm = t.match(/\b(?:scale|enlarge|dilate)\w*\s+(?:by\s+)?(?:a factor of\s+)?(-?[\d.]+)/i)) && (mode === 'transform' || mode === 'similar')) { S.which = mode === 'transform' ? 'dilate' : S.which; S.k = +mm[1]; if (mode === 'transform') side.querySelector('[data-key="which"]').value = 'dilate'; apply(); return { note: `k = ${S.k}.` }; }
        if ((mm = t.match(/\bmove\s+([A-D])\s+to\s*\(?\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)/i)) && E[mm[1].toUpperCase()] && E[mm[1].toUpperCase()].setPosition) { E[mm[1].toUpperCase()].setPosition(JXG.COORDS_BY_USER, [+mm[2], +mm[3]]); board.update(); return { note: T(`Moved ${mm[1].toUpperCase()} to (${mm[2]}, ${mm[3]}).`, 'نُقلت النقطة.') }; }
        if (/\bright[- ]angled?\b/i.test(t) && E.angA) { E.A.setPosition(JXG.COORDS_BY_USER, [-3, -2]); E.B.setPosition(JXG.COORDS_BY_USER, [3, -2]); E.C.setPosition(JXG.COORDS_BY_USER, [-3, 3]); board.update(); return { note: T('Made it right-angled at A.', 'قائم الزاوية عند A.') }; }
        if (/\bequilateral\b/i.test(t) && E.angA) { E.A.setPosition(JXG.COORDS_BY_USER, [-3, -2]); E.B.setPosition(JXG.COORDS_BY_USER, [3, -2]); E.C.setPosition(JXG.COORDS_BY_USER, [0, -2 + 3 * Math.sqrt(3)]); board.update(); return { note: T('Now equilateral: all sides and angles equal.', 'متساوي الأضلاع.') }; }
        if (/\bisosceles\b/i.test(t) && E.angA) { E.A.setPosition(JXG.COORDS_BY_USER, [-3, -2]); E.B.setPosition(JXG.COORDS_BY_USER, [3, -2]); E.C.setPosition(JXG.COORDS_BY_USER, [0, 3]); board.update(); return { note: T('Now isosceles: CA = CB and ∠A = ∠B.', 'متساوي الساقين.') }; }
        return null;
      },
      state() { const o = { mode, show: Object.assign({}, S.show) }; if (E.angA) Object.assign(o, tri3()); if (mode === 'circles') o.intersections = [E.X1, E.X2].filter(X => isFinite(X.X())).map(X => [X.X(), X.Y()]); if (mode === 'tangent') o.radiusTangentAngle = angDeg(E.O, E.P, E.Tp); if (mode === 'transform') Object.assign(o, { which: S.which, angle: S.angle, k: S.k, image: E.img.map(P => [P.X(), P.Y()]) }); return o; },
      table() { if (!E.angA) return null; const t = tri3(); return [['measure', 'value'], ['a', t.a], ['b', t.b], ['c', t.c], ['A (deg)', t.A], ['B (deg)', t.B], ['C (deg)', t.C], ['sum', t.A + t.B + t.C]]; },
      async canvas() { // SVG → PNG
        const svg = board.renderer.svgRoot.cloneNode(true), r = box.getBoundingClientRect(); svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); svg.setAttribute('width', r.width); svg.setAttribute('height', r.height);
        const img = new Image(), url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
        const c = document.createElement('canvas'); c.width = r.width * 2; c.height = r.height * 2; const g = c.getContext('2d'); g.fillStyle = L.colors().bg; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); return c;
      },
      drag(name, x, y) { const P = E[name]; if (P && P.setPosition) { P.setPosition(JXG.COORDS_BY_USER, [x, y]); board.update(); } },
      reset: () => L.open('geometry', ctx.params), redraw: () => L.open('geometry', ctx.params),
      destroy: () => { try { JXG.JSXGraph.freeBoard(board); } catch (e) { /* gone */ } }
    };
    return inst;
  }

  /* ======================= 3D ======================= */
  const SHAPES = { sphere: /\bsphere\b/i, cube: /\bcube\b/i, cuboid: /\bcuboid|rectangular prism/i, cylinder: /\bcylinder/i, cone: /\bcone\b/i, pyramid: /\bpyramid/i, tetrahedron: /\btetrahedron/i, octahedron: /\boctahedron/i, dodecahedron: /\bdodecahedron/i, icosahedron: /\bicosahedron/i, torus: /\btorus|doughnut|donut/i };
  L.register({
    id: '3d', family: 'math', kind: T('Maths · 3D', 'رياضيات · ثلاثي الأبعاد'), title: T('3D model', 'نموذج ثلاثي الأبعاد'),
    match(t) {
      const n = L.normalise(t);
      for (const [k, re] of Object.entries(SHAPES)) if (re.test(n) && !/\b(volume of|surface area of)\b.*\d/i.test(n) || (re.test(n) && /\b(3d|model|show|draw|make|create|rotate|cross[- ]section)\b/i.test(n))) { const r0 = n.match(/radius\s*(?:of\s*)?(?:=\s*)?([\d.]+)/i), h0 = n.match(/height\s*(?:of\s*)?(?:=\s*)?([\d.]+)/i), s0 = n.match(/(?:side|edge)\s*(?:length\s*)?(?:of\s*)?(?:=\s*)?([\d.]+)/i); return { score: 0.9, params: { shape: k, r: r0 ? +r0[1] : undefined, h: h0 ? +h0[1] : undefined, a: s0 ? +s0[1] : undefined, section: /cross[- ]section/i.test(n) } }; }
      const z = n.match(/z\s*=\s*([^,;?]+)/i); if (z && /x/.test(z[1]) && /y/.test(z[1])) return { score: 0.93, params: { shape: 'surface', f: z[1].trim() } };
      if (/\b(surface|paraboloid|saddle)\b/i.test(n) && /\b(3d|graph|plot|show)\b/i.test(n)) return { score: 0.85, params: { shape: 'surface', f: /saddle/i.test(n) ? 'x^2 - y^2' : 'x^2 + y^2' } };
      if (/\b(helix|3d curve|space curve)\b/i.test(n)) return { score: 0.85, params: { shape: 'curve' } };
      if (/\bplane\b/i.test(n) && /\b(3d|equation|x\s*[+-]|show)\b/i.test(n)) { const pm = n.match(/(-?[\d.]*)\s*x\s*([+-]\s*[\d.]*)\s*y\s*([+-]\s*[\d.]*)\s*z\s*=\s*(-?[\d.]+)/i); return { score: 0.85, params: { shape: 'plane', coef: pm ? pm.slice(1, 5).map(s => { s = s.replace(/\s/g, ''); return s === '' || s === '+' ? 1 : s === '-' ? -1 : +s; }) : [1, 1, 1, 3] } }; }
      if (/\bvector field\b/i.test(n) && /\b3d\b/i.test(n)) return { score: 0.85, params: { shape: 'field' } };
      const vs = [...n.matchAll(/\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/g)].map(m => [+m[1], +m[2], +m[3]]);
      if (vs.length && /\b(vectors?|points?|3d|cross product|dot product)\b/i.test(n)) return { score: 0.9, params: { shape: 'vectors', vecs: vs } };
      if (/\b(3d|three[- ]dimensional)\b.*\b(coordinates|axes|space)\b/i.test(n)) return { score: 0.7, params: { shape: 'vectors', vecs: [[2, 1, 3]] } };
      return null;
    },
    async mount(ctx) { return three(ctx); }
  });
  async function three(ctx) {
    const { THREE, Orbit } = await L.libs.three(); const p = ctx.params; const shape = p.shape || 'sphere';
    const S = { r: p.r || 2, h: p.h || 4, a: p.a || 3, l: 4, w: 2.5, cut: 0, section: !!p.section, axes: true, wire: false, spin: false, R: 3, f: p.f || 'x^2 - y^2', coef: p.coef || [1, 1, 1, 3], vecs: p.vecs || [[2, 1, 3]], params: {} };
    const host = ctx.stage, C = L.colors();
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false }); renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.localClippingEnabled = true;
    renderer.domElement.className = 'lab-cv lab-gl'; renderer.domElement.setAttribute('role', 'img'); host.appendChild(renderer.domElement);
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(45, 1, 0.1, 500); cam.position.set(9, 7, 11); cam.lookAt(0, 0, 0);
    scene.add(new THREE.AmbientLight(0xffffff, 0.55)); const dl = new THREE.DirectionalLight(0xffffff, 0.9); dl.position.set(6, 12, 8); scene.add(dl); const dl2 = new THREE.DirectionalLight(0xffffff, 0.35); dl2.position.set(-8, -4, -6); scene.add(dl2);
    // maths axes: x right, y into the screen, z up (three.js uses y up, so math (x, y, z) → three (x, z, −y))
    const M3 = (x, y, z) => new THREE.Vector3(x, z, -y);
    const root = new THREE.Group(); scene.add(root);
    const axes = new THREE.Group(); root.add(axes);
    function label(text, pos, color) { const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d'); g.font = 'italic 600 40px Georgia, serif'; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 64, 32); const tex = new THREE.CanvasTexture(c); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true })); s.position.copy(pos); s.scale.set(1.1, 0.55, 1); return s; }
    function buildAxes() {
      axes.clear(); const col = L.colors(), L0 = 6;
      [[M3(L0, 0, 0), '#ef4444', 'x'], [M3(0, L0, 0), '#22c55e', 'y'], [M3(0, 0, L0), '#3b82f6', 'z']].forEach(([v, c, n]) => { const g = new THREE.BufferGeometry().setFromPoints([v.clone().multiplyScalar(-1), v]); axes.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: c }))); axes.add(label(n, v.clone().multiplyScalar(1.08), c)); });
      const grid = new THREE.GridHelper(12, 12, col.dark ? 0x3a4560 : 0xc9cdd8, col.dark ? 0x252d42 : 0xe3e6ee); axes.add(grid);
      scene.background = new THREE.Color(col.bg);
    }
    buildAxes();
    let mesh = null, edges = null, extra = new THREE.Group(); root.add(extra);
    const mat = () => new THREE.MeshStandardMaterial({ color: L.colors().pal[0], metalness: 0.1, roughness: 0.45, transparent: true, opacity: 0.85, side: THREE.DoubleSide, wireframe: S.wire, clippingPlanes: S.section ? [clip] : [] });
    const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    let fC = null;
    async function build() {
      if (mesh) { root.remove(mesh); mesh.geometry.dispose(); } if (edges) { root.remove(edges); edges.geometry.dispose(); } extra.clear();
      let geo = null;
      if (shape === 'sphere') geo = new THREE.SphereGeometry(S.r, 64, 40);
      if (shape === 'cube') geo = new THREE.BoxGeometry(S.a, S.a, S.a);
      if (shape === 'cuboid') geo = new THREE.BoxGeometry(S.l, S.h, S.w);
      if (shape === 'cylinder') geo = new THREE.CylinderGeometry(S.r, S.r, S.h, 64, 1);
      if (shape === 'cone') geo = new THREE.ConeGeometry(S.r, S.h, 64, 1);
      if (shape === 'pyramid') { geo = new THREE.ConeGeometry(S.a / Math.SQRT2, S.h, 4, 1); geo.rotateY(Math.PI / 4); }
      if (shape === 'tetrahedron') geo = new THREE.TetrahedronGeometry(S.a * Math.sqrt(3 / 8));
      if (shape === 'octahedron') geo = new THREE.OctahedronGeometry(S.a / Math.SQRT2);
      if (shape === 'dodecahedron') geo = new THREE.DodecahedronGeometry(S.a * (Math.sqrt(3) * (1 + Math.sqrt(5)) / 4));
      if (shape === 'icosahedron') geo = new THREE.IcosahedronGeometry(S.a * Math.sin(2 * Math.PI / 5));
      if (shape === 'torus') geo = new THREE.TorusGeometry(S.R, S.r, 32, 96);
      if (shape === 'surface') {
        const m = await L.mathReady(); fC = m.compile(L.prep(S.f)); const n = 80, R = S.R; geo = new THREE.BufferGeometry(); const pos = [], colA = [], idx = []; let zmin = Infinity, zmax = -Infinity; const zs = [];
        for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) { const x = -R + 2 * R * i / n, y = -R + 2 * R * j / n; let z; try { z = fC.evaluate(Object.assign({ x, y }, S.params)); } catch (e) { z = NaN; } if (!isFinite(z)) z = NaN; else { zmin = Math.min(zmin, z); zmax = Math.max(zmax, z); } zs.push([x, y, z]); }
        const cl = Math.max(Math.abs(zmin), Math.abs(zmax), 1e-9) > 8 ? 8 / Math.max(Math.abs(zmin), Math.abs(zmax)) : 1; S.zscale = cl;
        zs.forEach(([x, y, z]) => { const v = M3(x, y, (isFinite(z) ? z : 0) * cl); pos.push(v.x, v.y, v.z); const t = isFinite(z) ? (z - zmin) / ((zmax - zmin) || 1) : 0.5; const c = new THREE.Color().setHSL(0.66 - 0.66 * t, 0.75, 0.52); colA.push(c.r, c.g, c.b); });
        for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = j * (n + 1) + i, b = a + 1, c2 = a + n + 1, d = c2 + 1; if ([a, b, c2, d].every(k => isFinite(zs[k][2]))) idx.push(a, b, d, a, d, c2); }
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(colA, 3)); geo.setIndex(idx); geo.computeVertexNormals();
        mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.55, wireframe: S.wire })); root.add(mesh); S.zr = [zmin, zmax]; return;
      }
      if (shape === 'curve') { const pts = []; for (let i = 0; i <= 600; i++) { const t = i / 600 * 6 * Math.PI; pts.push(M3(S.R * Math.cos(t), S.R * Math.sin(t), t / (2 * Math.PI) * S.h / 3 - S.h / 2)); } const g = new THREE.BufferGeometry().setFromPoints(pts); mesh = new THREE.Line(g, new THREE.LineBasicMaterial({ color: L.colors().pal[1] })); root.add(mesh); return; }
      if (shape === 'plane') { const [a, b, c, d] = S.coef; const g = new THREE.PlaneGeometry(10, 10, 1, 1); mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: L.colors().pal[4], side: THREE.DoubleSide, transparent: true, opacity: 0.6 })); const nrm = M3(a, b, c).normalize(); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm); const k = d / (a * a + b * b + c * c); mesh.position.copy(M3(a * k, b * k, c * k)); root.add(mesh); extra.add(new THREE.ArrowHelper(nrm, mesh.position, 2.5, 0xef4444)); return; }
      if (shape === 'vectors' || shape === 'field') {
        mesh = new THREE.Group(); root.add(mesh); mesh.geometry = { dispose() {} };
        if (shape === 'vectors') S.vecs.forEach((v, i) => { const d = M3(...v), len = d.length(); if (len > 0) mesh.add(new THREE.ArrowHelper(d.clone().normalize(), new THREE.Vector3(), len, new THREE.Color(L.colors().pal[i % 8]).getHex(), 0.35, 0.2)); mesh.add(label(`(${v.join(', ')})`, d.clone().multiplyScalar(1.1), L.colors().pal[i % 8])); });
        if (S.vecs.length >= 2 && shape === 'vectors') { const [u, w] = S.vecs, cr = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]], d = M3(...cr); if (d.length() > 0) mesh.add(new THREE.ArrowHelper(d.clone().normalize(), new THREE.Vector3(), Math.min(6, d.length()), 0xf59e0b, 0.35, 0.2)); }
        if (shape === 'field') for (let x = -3; x <= 3; x += 1.5) for (let y = -3; y <= 3; y += 1.5) for (let z = -3; z <= 3; z += 1.5) { const v = [-y, x, 0.3 * z], d = M3(...v), L2 = d.length(); if (L2 > 0) mesh.add(new THREE.ArrowHelper(d.clone().normalize(), M3(x, y, z), Math.min(1.2, 0.3 + L2 * 0.2), 0x60a5fa, 0.25, 0.15)); }
        return;
      }
      mesh = new THREE.Mesh(geo, mat());
      // solids sit on the xy-plane with their base at z = 0, except the sphere and polyhedra (centred at the origin)
      if (['cylinder', 'cone', 'pyramid', 'cuboid'].includes(shape)) mesh.position.y = (shape === 'cuboid' ? S.h : S.h) / 2;
      if (shape === 'cube') mesh.position.y = S.a / 2;
      if (shape === 'torus') mesh.rotation.x = Math.PI / 2;
      root.add(mesh);
      edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), new THREE.LineBasicMaterial({ color: L.colors().dark ? 0xdbeafe : 0x1e3a8a, transparent: true, opacity: 0.55, clippingPlanes: S.section ? [clip] : [] })); edges.position.copy(mesh.position); edges.rotation.copy(mesh.rotation); root.add(edges);
      if (S.section) { const sec = section(); if (sec) extra.add(sec); }
    }
    // the cross-section at height z = cut (exact shapes)
    function sectionShape() {
      const z = S.cut, base = ['cylinder', 'cone', 'pyramid', 'cuboid'].includes(shape) ? 0 : shape === 'cube' ? 0 : -Infinity;
      if (shape === 'sphere') { const r2 = S.r * S.r - z * z; return r2 > 0 ? { kind: 'circle', r: Math.sqrt(r2) } : null; }
      if (shape === 'cylinder') return z >= 0 && z <= S.h ? { kind: 'circle', r: S.r } : null;
      if (shape === 'cone') return z >= 0 && z <= S.h ? { kind: 'circle', r: S.r * (1 - z / S.h) } : null;
      if (shape === 'pyramid') return z >= 0 && z <= S.h ? { kind: 'square', a: S.a * (1 - z / S.h) } : null;
      if (shape === 'cube') return z >= 0 && z <= S.a ? { kind: 'rect', w: S.a, d: S.a } : null;
      if (shape === 'cuboid') return z >= 0 && z <= S.h ? { kind: 'rect', w: S.l, d: S.w } : null;
      return null;
    }
    function section() { const s = sectionShape(); if (!s) return null; let g; if (s.kind === 'circle') g = new THREE.CircleGeometry(s.r, 64); else { const w = s.kind === 'square' ? s.a : s.w, d = s.kind === 'square' ? s.a : s.d; g = new THREE.PlaneGeometry(w, d); } const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })); m.rotation.x = -Math.PI / 2; m.position.y = S.cut + 0.001; return m; }
    function measures() {
      const r = S.r, h = S.h, a = S.a, sl = Math.hypot(r, h), PI = Math.PI;
      switch (shape) {
        case 'sphere': return [[T('volume', 'الحجم') + ' ⁴⁄₃πr³', 4 / 3 * PI * r ** 3], [T('surface area', 'المساحة السطحية') + ' 4πr²', 4 * PI * r * r]];
        case 'cube': return [[T('volume', 'الحجم') + ' a³', a ** 3], [T('surface area', 'المساحة السطحية') + ' 6a²', 6 * a * a], [T('space diagonal', 'القطر') + ' a√3', a * Math.sqrt(3)]];
        case 'cuboid': return [[T('volume', 'الحجم') + ' lwh', S.l * S.w * h], [T('surface area', 'المساحة السطحية'), 2 * (S.l * S.w + S.l * h + S.w * h)]];
        case 'cylinder': return [[T('volume', 'الحجم') + ' πr²h', PI * r * r * h], [T('surface area', 'المساحة السطحية') + ' 2πr² + 2πrh', 2 * PI * r * r + 2 * PI * r * h]];
        case 'cone': return [[T('volume', 'الحجم') + ' ⅓πr²h', PI * r * r * h / 3], [T('slant height', 'الارتفاع الجانبي') + ' √(r² + h²)', sl], [T('surface area', 'المساحة السطحية') + ' πr² + πrl', PI * r * r + PI * r * sl]];
        case 'pyramid': return [[T('volume', 'الحجم') + ' ⅓a²h', a * a * h / 3], [T('surface area', 'المساحة السطحية'), a * a + 2 * a * Math.hypot(a / 2, h)]];
        case 'tetrahedron': return [[T('volume', 'الحجم') + ' a³/(6√2)', a ** 3 / (6 * Math.SQRT2)], [T('surface area', 'المساحة السطحية') + ' √3a²', Math.sqrt(3) * a * a], [T('faces · edges · vertices', 'الأوجه · الأحرف · الرؤوس'), '4 · 6 · 4']];
        case 'octahedron': return [[T('volume', 'الحجم') + ' √2a³/3', Math.SQRT2 * a ** 3 / 3], [T('surface area', 'المساحة السطحية') + ' 2√3a²', 2 * Math.sqrt(3) * a * a], [T('faces · edges · vertices', 'الأوجه · الأحرف · الرؤوس'), '8 · 12 · 6']];
        case 'dodecahedron': return [[T('volume', 'الحجم'), (15 + 7 * Math.sqrt(5)) / 4 * a ** 3], [T('faces · edges · vertices', 'الأوجه · الأحرف · الرؤوس'), '12 · 30 · 20']];
        case 'icosahedron': return [[T('volume', 'الحجم'), 5 * (3 + Math.sqrt(5)) / 12 * a ** 3], [T('faces · edges · vertices', 'الأوجه · الأحرف · الرؤوس'), '20 · 30 · 12']];
        case 'torus': return [[T('volume', 'الحجم') + ' 2π²Rr²', 2 * PI * PI * S.R * r * r], [T('surface area', 'المساحة السطحية') + ' 4π²Rr', 4 * PI * PI * S.R * r]];
        default: return [];
      }
    }
    // camera control: OrbitControls when available, else our own drag-rotate / wheel-zoom / two-finger pan
    let controls = null;
    if (Orbit) { controls = new Orbit(cam, renderer.domElement); controls.enableDamping = !L.still(); controls.dampingFactor = 0.08; }
    else { let drag = null; const el = renderer.domElement; el.style.touchAction = 'none'; const sph = new THREE.Spherical().setFromVector3(cam.position); el.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY]; el.setPointerCapture(e.pointerId); }); el.addEventListener('pointermove', e => { if (!drag) return; sph.theta -= (e.clientX - drag[0]) * 0.01; sph.phi = Math.max(0.05, Math.min(Math.PI - 0.05, sph.phi - (e.clientY - drag[1]) * 0.01)); drag = [e.clientX, e.clientY]; cam.position.setFromSpherical(sph); cam.lookAt(0, 0, 0); }); el.addEventListener('pointerup', () => { drag = null; }); el.addEventListener('wheel', e => { e.preventDefault(); sph.radius = Math.max(3, Math.min(80, sph.radius * Math.exp(e.deltaY * 0.0012))); cam.position.setFromSpherical(sph); cam.lookAt(0, 0, 0); }, { passive: false }); }
    let raf = 0, dead = false;
    function size() { const r = host.getBoundingClientRect(); renderer.setSize(Math.max(50, r.width), Math.max(50, r.height), false); renderer.domElement.style.width = r.width + 'px'; renderer.domElement.style.height = r.height + 'px'; cam.aspect = r.width / Math.max(1, r.height); cam.updateProjectionMatrix(); }
    const ro = new ResizeObserver(size); ro.observe(host); size();
    function loop() { if (dead) return; if (S.spin && !L.still()) root.rotation.y += 0.006; if (controls) controls.update(); renderer.render(scene, cam); raf = requestAnimationFrame(loop); }
    await build(); loop();
    /* ---------- controls ---------- */
    const side = ctx.side, g = ui.group(T('Dimensions', 'الأبعاد'));
    const sl = (k, label, min, max, step) => { g.appendChild(ui.slider({ key: k, label, min, max, step, value: S[k], on: async v => { S[k] = v; await build(); L.explainNow(); } })); };
    if (['sphere', 'cylinder', 'cone', 'torus'].includes(shape)) sl('r', shape === 'torus' ? T('tube radius r', 'نصف قطر الأنبوب') : T('radius r', 'نصف القطر r'), 0.2, 5, 0.1);
    if (shape === 'torus') sl('R', T('ring radius R', 'نصف قطر الحلقة R'), 1, 5, 0.1);
    if (['cylinder', 'cone', 'pyramid', 'cuboid'].includes(shape)) sl('h', T('height h', 'الارتفاع h'), 0.5, 8, 0.1);
    if (['cube', 'pyramid', 'tetrahedron', 'octahedron', 'dodecahedron', 'icosahedron'].includes(shape)) sl('a', T('edge a', 'الحرف a'), 0.5, 6, 0.1);
    if (shape === 'cuboid') { sl('l', T('length l', 'الطول l'), 0.5, 8, 0.1); sl('w', T('width w', 'العرض w'), 0.5, 8, 0.1); }
    if (shape === 'surface') { const fi = ui.el('label', 'lab-se', `<span>z =</span><input value="${esc(S.f)}" spellcheck="false">`); fi.querySelector('input').addEventListener('change', async e => { S.f = e.target.value; try { await build(); L.explainNow(); } catch (er) { L.note(er.message); } }); g.appendChild(fi); sl('R', T('domain ± (x and y)', 'المجال'), 1, 8, 0.5); }
    if (shape === 'curve') { sl('R', T('radius', 'نصف القطر'), 0.5, 5, 0.1); sl('h', T('rise', 'الارتفاع'), 1, 10, 0.5); }
    if (['sphere', 'cylinder', 'cone', 'pyramid', 'cube', 'cuboid'].includes(shape)) {
      g.appendChild(ui.toggle({ key: 'section', label: T('Cross-section (cut by a horizontal plane)', 'مقطع عرضي'), value: S.section, on: async v => { S.section = v; await build(); L.explainNow(); } }));
      g.appendChild(ui.slider({ key: 'cut', label: T('cut height z', 'ارتفاع القطع z'), min: shape === 'sphere' ? -5 : 0, max: 8, step: 0.05, value: S.cut, on: async v => { S.cut = v; clip.constant = v; await build(); L.explainNow(); } }));
    }
    g.appendChild(ui.toggle({ key: 'axes', label: T('Axes and grid', 'المحاور والشبكة'), value: true, on: v => { axes.visible = v; } }));
    g.appendChild(ui.toggle({ key: 'wire', label: T('Wireframe', 'إطار سلكي'), value: false, on: async v => { S.wire = v; await build(); } }));
    g.appendChild(ui.toggle({ key: 'spin', label: T('Rotate slowly', 'دوران بطيء'), value: false, on: v => { S.spin = v; } }));
    g.appendChild(ui.buttons([[T('Front', 'أمام'), () => view(0, 2, 14)], [T('Top', 'أعلى'), () => view(0, 16, 0.01)], [T('Side', 'جانب'), () => view(14, 2, 0)], [T('3D view', 'منظور'), () => view(9, 7, 11)]]));
    side.appendChild(g); side.appendChild(ui.el('p', 'lab-sub', T('Drag to rotate · scroll or pinch to zoom · right-drag or two fingers to pan.', 'اسحب للتدوير · اقرص للتكبير.')));
    function view(x, y, z) { cam.position.set(x, y, z); cam.lookAt(0, 0, 0); if (controls) { controls.target.set(0, 0, 0); controls.update(); } }
    clip.constant = S.cut;
    const names = { sphere: T('Sphere', 'كرة'), cube: T('Cube', 'مكعب'), cuboid: T('Cuboid', 'متوازي مستطيلات'), cylinder: T('Cylinder', 'أسطوانة'), cone: T('Cone', 'مخروط'), pyramid: T('Square pyramid', 'هرم رباعي'), tetrahedron: T('Regular tetrahedron', 'رباعي الأوجه'), octahedron: T('Regular octahedron', 'ثماني الأوجه'), dodecahedron: T('Regular dodecahedron', 'ذو اثني عشر وجهاً'), icosahedron: T('Regular icosahedron', 'ذو عشرين وجهاً'), torus: T('Torus', 'طارة'), surface: 'z = ' + S.f, curve: T('Helix', 'حلزون'), plane: T('Plane', 'مستوى'), vectors: T('Vectors in 3D', 'متجهات ثلاثية'), field: T('3D vector field', 'حقل متجهات') };
    const ws = L.workspace(); if (ws) ws.querySelector('#labTitle').textContent = names[shape] || 'Shape';
    return {
      intro() { const ms = measures(); return T(`A rotatable 3D ${(names[shape] || shape).toLowerCase()}. Drag to rotate, pinch or scroll to zoom${ms.length ? '; ' + ms.map(([k, v]) => `${k} = ${typeof v === 'number' ? N.fmt(v, 4) : v}`).join(', ') : ''}. Change the dimensions with the sliders${['sphere', 'cylinder', 'cone', 'pyramid', 'cube', 'cuboid'].includes(shape) ? ', or turn on the cross-section' : ''}.`, 'نموذج ثلاثي الأبعاد قابل للتدوير.'); },
      explain() {
        const h = []; const ms = measures();
        if (ms.length) h.push(ui.readout(ms.map(([k, v]) => [k, typeof v === 'number' ? N.fmt(v, 5) : v])));
        if (S.section) { const s = sectionShape(); h.push(`<h5>${T('Cross-section at z = ', 'المقطع عند z = ')}${N.fmt(S.cut, 2)}</h5><p>${!s ? T('The plane misses the solid here.', 'المستوى لا يقطع المجسم هنا.') : s.kind === 'circle' ? T(`A circle of radius ${N.fmt(s.r, 4)} (area ${N.fmt(Math.PI * s.r * s.r, 4)}).`, 'دائرة.') + (shape === 'sphere' ? ' ' + T('From r² = R² − z²: it shrinks to a point at the poles.', 'من r² = R² − z².') : shape === 'cone' ? ' ' + T('Shrinks linearly with height: r(z) = r(1 − z/h).', 'يصغر خطياً.') : '') : s.kind === 'square' ? T(`A square of side ${N.fmt(s.a, 4)}.`, 'مربع.') : T(`A ${N.fmt(s.w, 3)} × ${N.fmt(s.d, 3)} rectangle.`, 'مستطيل.')}</p>`); }
        if (shape === 'surface') h.push(`<p>${T('Each point (x, y) is raised to height z = f(x, y); colour shows height (blue low, red high).', 'كل نقطة ترتفع إلى z.')}${S.zscale && S.zscale < 1 ? ' ' + T(`Heights are drawn ×${N.fmt(S.zscale, 3)} so the surface fits.`, 'مقياس الارتفاع مصغر.') : ''}</p>${ui.readout([[T('lowest z', 'أدنى z'), N.fmt(S.zr[0], 4)], [T('highest z', 'أعلى z'), N.fmt(S.zr[1], 4)]])}`);
        if (shape === 'vectors') { const v = S.vecs; h.push(ui.readout(v.map((u, i) => [`|v${i + 1}|`, N.fmt(Math.hypot(...u), 4)]))); if (v.length >= 2) { const [a, b] = v, dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cr = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], ang = Math.acos(dot / (Math.hypot(...a) * Math.hypot(...b))) * 180 / Math.PI; h.push(ui.readout([['v₁ · v₂', N.fmt(dot, 4)], ['v₁ × v₂', `(${cr.map(x => N.fmt(x, 3)).join(', ')})`], [T('angle between', 'الزاوية بينهما'), N.fmt(ang, 3) + '°']]) + `<p class="lab-sub">${T('The orange arrow is v₁ × v₂: perpendicular to both.', 'السهم البرتقالي حاصل الضرب الاتجاهي.')}</p>`); } }
        if (shape === 'plane') { const [a, b, c, d] = S.coef; h.push(`<p>${a}x + ${b}y + ${c}z = ${d}. ${T('The red arrow is the normal vector', 'السهم الأحمر هو المتجه العمودي')} (${a}, ${b}, ${c}); ${T('distance from the origin', 'البعد عن الأصل')} = |d|/|n| = ${N.fmt(Math.abs(d) / Math.hypot(a, b, c), 4)}.</p>`); }
        if (shape === 'curve') h.push(`<p>${T('A helix: (R cos t, R sin t, ct) — it winds around the z-axis while rising steadily.', 'حلزون.')}</p>`);
        if (shape === 'field') h.push(`<p>F(x, y, z) = (−y, x, 0.3z): ${T('a rotation about the z-axis plus a gentle outward flow along z.', 'دوران حول محور z.')}</p>`);
        return h.join('');
      },
      command(t) {
        let mm;
        if ((mm = t.match(/\bradius\s*(?:to|=|of)?\s*([\d.]+)/i))) { S.r = +mm[1]; build(); side.querySelectorAll('.lab-sl').forEach(w => { if (w.input.dataset.key === 'r') w.set(S.r); }); return { note: `r = ${S.r}.` }; }
        if ((mm = t.match(/\bheight\s*(?:to|=|of)?\s*([\d.]+)/i))) { S.h = +mm[1]; build(); side.querySelectorAll('.lab-sl').forEach(w => { if (w.input.dataset.key === 'h') w.set(S.h); }); return { note: `h = ${S.h}.` }; }
        if (/\b(bigger|larger)\b/i.test(t)) { S.r *= 1.5; S.a *= 1.5; build(); return { note: T('Scaled up by 1.5.', 'تكبير.') }; }
        if (/\b(smaller)\b/i.test(t)) { S.r /= 1.5; S.a /= 1.5; build(); return { note: T('Scaled down.', 'تصغير.') }; }
        if ((mm = t.match(/\bcross[- ]?section\b(?:.*?(?:at|z\s*=)\s*(-?[\d.]+))?/i))) { S.section = !/hide|remove|off/i.test(t); if (mm[1]) S.cut = +mm[1]; clip.constant = S.cut; build(); return { note: S.section ? T(`Cross-section at z = ${S.cut}.`, 'مقطع عرضي.') : T('Cross-section off.', 'أُخفي المقطع.') }; }
        if (/\b(spin|rotate)\b/i.test(t)) { S.spin = !/stop/i.test(t); return { note: S.spin ? T('Rotating — drag to take control.', 'يدور.') : T('Stopped.', 'توقف.') }; }
        if (/\b(hide|show) (the )?axes\b/i.test(t)) { axes.visible = /show/i.test(t); return { note: T('Axes toggled.', 'المحاور.') }; }
        if (/\bwireframe\b/i.test(t)) { S.wire = !/off|solid/i.test(t); build(); return { note: T('Wireframe toggled.', 'إطار سلكي.') }; }
        if (/\btop view\b/i.test(t)) { view(0, 16, 0.01); return { note: T('Top view.', 'منظر علوي.') }; }
        if ((mm = t.match(/z\s*=\s*(.+)$/i)) && shape === 'surface') { S.f = mm[1]; build(); return { note: 'z = ' + S.f }; }
        return null;
      },
      state: () => ({ shape, r: S.r, h: S.h, a: S.a, measures: Object.fromEntries(measures().map(([k, v]) => [k, v])), section: S.section ? sectionShape() : null, camera: cam.position.toArray().map(v => +v.toFixed(3)), rotation: root.rotation.y }),
      canvas: () => { renderer.render(scene, cam); return renderer.domElement; },
      params: () => [{ key: 'r', label: 'radius', alias: ['r'] }, { key: 'h', label: 'height', alias: ['h'] }, { key: 'a', label: 'edge', alias: ['side', 'a'] }],
      get: k => S[k], set: (k, v) => { S[k] = v; build(); },
      camera: () => cam, controls: () => controls,
      reset: () => L.open('3d', ctx.params), redraw: () => { buildAxes(); build(); },
      destroy: () => { dead = true; cancelAnimationFrame(raf); ro.disconnect(); controls && controls.dispose && controls.dispose(); renderer.dispose(); renderer.domElement.remove(); }
    };
  }
})();
