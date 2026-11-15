/* ERLY Learning Studio — figures drawn for the lessons (original SVG, ERLY-made).
   Each is a schematic: simplified on purpose, with the simplification stated in its caption. Colours follow
   textbook conventions and are always paired with text labels, never used alone to carry meaning. */
(function () {
  'use strict';
  const F = (window.LS = window.LS || {}).fig = {};

  // Front view of the heart, as if facing the person: the heart's RIGHT side is on the viewer's LEFT.
  F.heart = `<svg viewBox="0 0 400 380" class="ls-svg ls-heart" role="img" aria-labelledby="hfT hfD"><title id="hfT">Schematic of the human heart, front view</title>
  <desc id="hfD">Four chambers: right atrium top left, right ventricle bottom left, left atrium top right, left ventricle bottom right with a thicker wall. The septum separates left and right. The superior and inferior venae cavae bring blood into the right atrium; the pulmonary artery carries blood from the right ventricle up to the lungs; two pulmonary veins bring blood from the lungs into the left atrium; the aorta arches up from the left ventricle and carries blood to the body.</desc>
  <defs><marker id="hfA" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="ah"/></marker></defs>
  <!-- vessels -->
  <path class="deo" d="M96 18 h30 v104 h-30z"/>
    <path class="deo" d="M162 214 V62 h-46 v-26 h120 v26 h-48 V214z"/>
  <path class="deo" d="M38 352 v-196 a12 12 0 0 1 12 -12 h22 v26 h-8 v182z"/>
  <path class="oxy" d="M212 216 V70 C212 30 240 18 276 18 C336 18 364 30 364 66 V112 h-26 V68 C338 52 322 44 276 44 C252 44 238 54 238 76 V216z"/>
  <path class="oxy" d="M330 132 h56 v20 h-56z M330 170 h56 v20 h-56z"/>
  <!-- chambers -->
  <rect class="ch deo-l" x="72" y="118" width="88" height="92" rx="30"/>
  <path class="ch deo-l" d="M72 216 H196 V318 C160 352 108 344 82 300 C74 284 72 262 72 246Z"/>
  <rect class="ch oxy-l" x="246" y="118" width="86" height="92" rx="30"/>
  <path class="ch oxy-l wall" d="M206 216 H340 C346 270 318 336 236 352 C220 352 210 346 206 336Z"/>
  <line class="sep" x1="201" y1="118" x2="201" y2="350"/>
  <g class="valve"><path d="M86 213 h60"/><path d="M232 213 h90"/></g>
  <!-- flow -->
  <g class="flow"><path d="M111 40 V112" marker-end="url(#hfA)"/><path d="M52 330 V196 Q52 176 74 170" marker-end="url(#hfA)"/><path d="M110 196 V246" marker-end="url(#hfA)"/><path d="M150 300 C176 290 180 260 176 200 V60" marker-end="url(#hfA)"/><path d="M168 48 H124" marker-end="url(#hfA)"/><path d="M178 48 H206" marker-end="url(#hfA)"/>
    <path d="M384 142 H336" marker-end="url(#hfA)"/><path d="M384 180 H336" marker-end="url(#hfA)"/><path d="M290 190 V244" marker-end="url(#hfA)"/><path d="M260 312 C238 300 226 270 225 220 V84 C226 56 246 32 276 31 C330 31 351 46 351 70 V108" marker-end="url(#hfA)"/></g>
  <g class="tx"><text x="172" y="28">to both lungs</text><text x="351" y="128">to body</text><text x="359" y="208">from lungs</text></g>
  </svg>`;
  F.heartCap = 'Schematic, not to scale. Blue marks blood low in oxygen and red marks oxygen-rich blood — a textbook convention: real blood is always red, darker when low in oxygen. Arrows show the direction of flow.';

  // a leaf cell's chloroplast, labelled for the photosynthesis lesson
  F.chloroplast = `<svg viewBox="0 0 400 240" class="ls-svg ls-chloro" role="img" aria-labelledby="chT chD"><title id="chT">Schematic of a chloroplast</title>
  <desc id="chD">An oval organelle with an outer and inner membrane. Inside, stacks of disc-shaped thylakoids called grana sit in a fluid called the stroma.</desc>
  <ellipse class="mem" cx="200" cy="120" rx="186" ry="104"/><ellipse class="mem2" cx="200" cy="120" rx="176" ry="94"/>
  <g class="gr">${[[110, 90], [170, 140], [240, 86], [300, 140], [150, 70]].map(([x, y]) => [0, 1, 2, 3].map(k => `<rect x="${x}" y="${y + k * 11}" width="46" height="9" rx="4.5"/>`).join('')).join('')}</g>
  <path class="lam" d="M156 86 C170 110 175 120 182 140 M216 140 C228 118 236 104 246 92 M286 104 C290 120 296 130 300 140"/>
  </svg>`;
  F.chloroCap = 'Schematic of a chloroplast, not to scale. The light-dependent reactions happen on the thylakoid membranes; the Calvin cycle happens in the stroma.';

  // a simple circuit: cell, switch, two resistors in series, ammeter in series, voltmeter across R2
  F.circuit = `<svg viewBox="0 0 400 230" class="ls-svg ls-circ" role="img" aria-labelledby="ciT ciD"><title id="ciT">Series circuit diagram</title>
  <desc id="ciD">A cell, a closed switch, an ammeter and two resistors R1 and R2 joined in one loop. A voltmeter is connected across R2.</desc>
  <path class="w" d="M40 60 H150 M190 60 H240 M290 60 H360 V190 H300 M240 190 H40 V60"/>
  <g class="cell"><line x1="150" y1="44" x2="150" y2="76"/><line x1="162" y1="52" x2="162" y2="68" class="thick"/><line x1="174" y1="44" x2="174" y2="76"/><line x1="186" y1="52" x2="186" y2="68" class="thick"/></g>
  <text x="168" y="34" class="lb">cell (6 V)</text>
  <circle cx="265" cy="60" r="16" class="meter"/><text x="265" y="66" class="mt">A</text>
  <rect x="90" y="178" width="70" height="24" class="res"/><text x="125" y="222" class="lb">R1</text>
  <rect x="240" y="178" width="60" height="24" class="res"/><text x="270" y="222" class="lb">R2</text>
  <path class="w" d="M160 190 H240"/>
  <path class="w thin" d="M240 190 V140 H255 M285 140 H300 V190"/><circle cx="270" cy="140" r="15" class="meter"/><text x="270" y="146" class="mt">V</text>
  </svg>`;
  F.circuitCap = 'Circuit symbols follow the usual school convention. The ammeter is in series (it measures the current through the loop); the voltmeter is in parallel across R2 (it measures the potential difference across it).';

  // the pH scale with some everyday solutions placed at typical values
  F.phScale = `<svg viewBox="0 0 420 120" class="ls-svg ls-ph" role="img" aria-labelledby="phT phD"><title id="phT">The pH scale from 0 to 14</title>
  <desc id="phD">A bar from 0 (most acidic) through 7 (neutral) to 14 (most alkaline), with typical values: stomach acid about 1.5, lemon juice about 2.4, black coffee about 5, pure water 7, sea water about 8.1, household ammonia about 11.5.</desc>
  <defs><linearGradient id="phG" x1="0" x2="1"><stop offset="0" stop-color="#d63c2f"/><stop offset=".3" stop-color="#ef9a2c"/><stop offset=".5" stop-color="#3fa34d"/><stop offset=".72" stop-color="#2d7fc1"/><stop offset="1" stop-color="#5a3fa8"/></linearGradient></defs>
  <rect x="20" y="40" width="380" height="22" rx="6" fill="url(#phG)"/>
  ${Array.from({ length: 15 }, (_, i) => `<text x="${20 + i * 380 / 14}" y="80" class="tk">${i}</text>`).join('')}
  ${[[1.5, 'stomach acid'], [2.4, 'lemon juice'], [5, 'black coffee'], [7, 'pure water'], [8.1, 'sea water'], [11.5, 'ammonia']].map(([v, n], k) => `<line x1="${20 + v * 380 / 14}" y1="${k % 2 ? 62 : 40}" x2="${20 + v * 380 / 14}" y2="${k % 2 ? 98 : 22}" class="pin"/><text x="${20 + v * 380 / 14}" y="${k % 2 ? 112 : 16}" class="nm">${n}</text>`).join('')}
  </svg>`;
  F.phCap = 'Typical values at 25 °C; real samples vary. Each step of 1 on the pH scale is a tenfold change in hydrogen-ion concentration.';
})();
