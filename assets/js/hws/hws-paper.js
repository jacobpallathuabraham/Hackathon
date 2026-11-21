/* ERLY Handwriting Studio (v24) — paper. Drawn in page units, so lines stay crisp at any zoom and export exactly. */
(function () {
  'use strict';
  const H = window.HWS, T = H.T;
  H.PAPERS = {
    blank: ['Blank', 'فارغ'], ruled: ['Ruled', 'مسطر'], wide: ['Wide-ruled', 'مسطر واسع'], narrow: ['Narrow-ruled', 'مسطر ضيق'], dotted: ['Dotted', 'منقط'], grid: ['Grid (squares)', 'مربعات'],
    graph: ['Graph paper', 'ورق بياني'], coord: ['Coordinate plane', 'مستوى إحداثي'], engineering: ['Engineering', 'هندسي'], iso: ['Isometric', 'متساوي القياس'], music: ['Music staves', 'مدرج موسيقي'],
    guide: ['Handwriting guides', 'خطوط الكتابة'], slant: ['Calligraphy slant', 'خط مائل'], cornell: ['Cornell notes', 'ملاحظات كورنيل'], chalk: ['Chalkboard', 'سبورة']
  };
  H.paperDark = p => p === 'chalk';
  H.paperBg = p => (p === 'chalk' ? '#23362c' : p === 'engineering' ? '#f3f8ef' : '#fffdf8');
  const line = (g, x0, y0, x1, y1) => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
  H.drawPaper = (g, page) => {
    const p = page.paper, W = page.w, Hh = page.h; g.save(); g.fillStyle = H.paperBg(p); g.fillRect(0, 0, W, Hh);
    const blue = 'rgba(70,120,200,.32)', grey = 'rgba(120,120,120,.18)', fine = 'rgba(80,140,200,.16)', major = 'rgba(60,110,190,.38)';
    g.lineWidth = 1;
    if (p === 'ruled' || p === 'wide' || p === 'narrow' || p === 'cornell') { const s = p === 'wide' ? 52 : p === 'narrow' ? 30 : 40; g.strokeStyle = blue; for (let y = 110; y < Hh - 30; y += s) line(g, 0, y, W, y); g.strokeStyle = 'rgba(220,80,80,.45)'; line(g, p === 'cornell' ? W * 0.28 : 90, 0, p === 'cornell' ? W * 0.28 : 90, Hh); if (p === 'cornell') { g.strokeStyle = 'rgba(220,80,80,.45)'; line(g, 0, Hh - 220, W, Hh - 220); g.fillStyle = 'rgba(0,0,0,.35)'; g.font = '600 15px ui-sans-serif, system-ui'; g.fillText(T('Cues', 'إشارات'), 20, 90); g.fillText(T('Notes', 'ملاحظات'), W * 0.28 + 20, 90); g.fillText(T('Summary', 'ملخص'), 20, Hh - 196); } }
    if (p === 'dotted') { g.fillStyle = 'rgba(80,80,80,.35)'; for (let y = 40; y < Hh; y += 40) for (let x = 40; x < W; x += 40) { g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); } }
    if (p === 'grid') { g.strokeStyle = grey; for (let x = 0; x <= W; x += 40) line(g, x, 0, x, Hh); for (let y = 0; y <= Hh; y += 40) line(g, 0, y, W, y); }
    if (p === 'graph' || p === 'coord') { const ox = W / 2, oy = Hh / 2; g.strokeStyle = fine; for (let x = ox % 8; x <= W; x += 8) line(g, x, 0, x, Hh); for (let y = oy % 8; y <= Hh; y += 8) line(g, 0, y, W, y); g.strokeStyle = major; for (let x = ox % 40; x <= W; x += 40) line(g, x, 0, x, Hh); for (let y = oy % 40; y <= Hh; y += 40) line(g, 0, y, W, y);
      if (p === 'coord') { g.strokeStyle = 'rgba(30,30,30,.8)'; g.lineWidth = 2; line(g, 0, oy, W, oy); line(g, ox, 0, ox, Hh); g.fillStyle = 'rgba(30,30,30,.75)'; g.font = '13px ui-sans-serif, system-ui'; g.textAlign = 'center';
        for (let i = -Math.floor(ox / 40); i <= Math.floor(ox / 40); i++) if (i && i % 2 === 0) g.fillText(String(i), ox + i * 40, oy + 18); g.textAlign = 'right'; for (let j = -Math.floor(oy / 40); j <= Math.floor(oy / 40); j++) if (j && j % 2 === 0) g.fillText(String(-j), ox - 6, oy + j * 40 + 4);
        g.font = 'italic 700 18px Georgia, serif'; g.fillText('x', W - 14, oy - 10); g.textAlign = 'left'; g.fillText('y', ox + 10, 22); } }
    if (p === 'engineering') { g.strokeStyle = 'rgba(70,150,90,.22)'; for (let x = 0; x <= W; x += 10) line(g, x, 0, x, Hh); for (let y = 0; y <= Hh; y += 10) line(g, 0, y, W, y); g.strokeStyle = 'rgba(70,150,90,.5)'; for (let x = 0; x <= W; x += 50) line(g, x, 0, x, Hh); for (let y = 0; y <= Hh; y += 50) line(g, 0, y, W, y); }
    if (p === 'iso') { g.strokeStyle = grey; const s = 40, k = Math.tan(Math.PI / 6); for (let x = -Hh * 2; x < W + Hh * 2; x += s / Math.cos(Math.PI / 6) * 1) { line(g, x, 0, x + Hh / k, Hh); line(g, x, 0, x - Hh / k, Hh); } for (let x = 0; x <= W; x += s * Math.cos(Math.PI / 6)) line(g, x, 0, x, Hh); }
    if (p === 'music') { g.strokeStyle = 'rgba(40,40,40,.45)'; for (let y0 = 110; y0 < Hh - 80; y0 += 120) for (let k = 0; k < 5; k++) line(g, 60, y0 + k * 12, W - 60, y0 + k * 12); }
    if (p === 'guide') { for (let y0 = 120; y0 < Hh - 90; y0 += 132) { g.strokeStyle = 'rgba(60,110,190,.45)'; line(g, 40, y0, W - 40, y0); g.strokeStyle = 'rgba(220,80,80,.55)'; g.lineWidth = 1.6; line(g, 40, y0 + 80, W - 40, y0 + 80); g.lineWidth = 1; g.strokeStyle = 'rgba(60,110,190,.5)'; g.setLineDash([8, 7]); line(g, 40, y0 + 40, W - 40, y0 + 40); g.setLineDash([]); g.strokeStyle = 'rgba(60,110,190,.2)'; line(g, 40, y0 + 114, W - 40, y0 + 114); } }
    if (p === 'slant') { for (let y0 = 120; y0 < Hh - 60; y0 += 110) { g.strokeStyle = 'rgba(60,110,190,.38)'; line(g, 40, y0, W - 40, y0); line(g, 40, y0 + 70, W - 40, y0 + 70); g.setLineDash([5, 6]); line(g, 40, y0 + 35, W - 40, y0 + 35); g.setLineDash([]); g.strokeStyle = 'rgba(60,110,190,.16)'; for (let x = 40; x < W - 40; x += 34) line(g, x, y0 + 70, x + 70 * Math.tan(Math.PI / 180 * 35), y0); } }
    if (p === 'chalk') { g.strokeStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 60; i++) { g.lineWidth = 20 + (i % 7) * 6; line(g, (i * 97) % W, (i * 61) % Hh, ((i * 97) % W) + 200, ((i * 61) % Hh) + 40); } g.lineWidth = 1; }
    g.restore();
  };
})();
