/* ERLY — Learning Games on the student dashboard (v12; replaced the Daily Quest).
   Reads only the games' own local record ("erly-games-v1") to show recent activity.
   Nothing here measures, scores or infers anything about the student. */
(function () {
  'use strict';
  const box = document.getElementById('lgHome'); if (!box) return;
  const T = (en, ar) => (window.I18N ? I18N.t(en, ar) : en);
  const G = [
    ['comprehend', '📖', '#f97316', ['Read & Reason', 'اقرأ واستنتج'], ['Reading comprehension', 'فهم المقروء']],
    ['words', '🔤', '#fb7185', ['Word Builder', 'بنّاء الكلمات'], ['Vocabulary & language', 'المفردات واللغة']],
    ['sequence', '🧠', '#a855f7', ['Glow Sequence', 'تسلسل الضوء'], ['Memory', 'الذاكرة']],
    ['plan', '🗺️', '#22c55e', ['Plan It', 'خطّط لها'], ['Planning', 'التخطيط']],
    ['switch', '🎯', '#eab308', ['Switch!', 'بدّل!'], ['Focus & attention', 'التركيز والانتباه']],
    ['listen', '🎧', '#ec4899', ['Listen & Tap', 'استمع واضغط'], ['Listening', 'الاستماع']],
    ['spark', '✍️', '#14b8a6', ['Story Spark', 'شرارة القصة'], ['Writing & creativity', 'الكتابة والإبداع']],
    ['rotate', '🧊', '#38bdf8', ['Rotate 3D', 'تدوير ثلاثي الأبعاد'], ['Spatial & 3D', 'المكاني وثلاثي الأبعاد']],
    ['pattern', '🔷', '#6366f1', ['Pattern Seeker', 'باحث الأنماط'], ['Pattern recognition', 'التعرّف على الأنماط']],
    ['hanoi', '🧩', '#84cc16', ['Tower Shift', 'نقل البرج'], ['Problem-solving', 'حل المشكلات']],
    ['order', '📖', '#f97316', ['Sentence Flow', 'تسلسل الجمل'], ['Reading comprehension', 'فهم المقروء']],
    ['chunk', '🧠', '#a855f7', ['Chunk It', 'جزّئها'], ['Memory', 'الذاكرة']]
  ];
  const L = p => T(p[0], p[1]);
  function sessions() { try { const s = JSON.parse(localStorage.getItem('erly-games-v1') || 'null'); return s && Array.isArray(s.sessions) ? s.sessions : []; } catch (e) { return []; } }
  function render() {
    const S = sessions(), last = S.slice(-3).reverse(), tried = new Set(S.map(x => x.g));
    const next = G.filter(g => !tried.has(g[0])).slice(0, 4), feat = (next.length >= 4 ? next : G.slice(0, 4));
    box.innerHTML = `<div class="lg-tiles">${G.slice(0, 10).map(g => `<a class="lg-tile" href="games.html?play=${g[0]}" style="--c:${g[2]}"><i aria-hidden="true">${g[1]}</i><b>${L(g[4])}</b><small>${L(g[3])}</small></a>`).join('')}</div>
      <div class="lg-side"><b>${T('Your recent activity', 'نشاطك الأخير')}</b>${last.length ? `<ul>${last.map(x => { const g = G.find(y => y[0] === x.g); return g ? `<li><i aria-hidden="true">${g[1]}</i> ${L(g[3])} <small>· ${x.n} ${T('rounds', 'جولات')}</small></li>` : ''; }).join('')}</ul><p>${T(`${S.length} session${S.length === 1 ? '' : 's'} so far · ${tried.size}/12 games tried`, `${S.length} جلسات حتى الآن · ${tried.size}/12 لعبة جُرّبت`)}</p>` : `<p>${T('No games played yet. Try one — each takes about five minutes.', 'لم تلعب بعد. جرّب لعبة — كل منها نحو خمس دقائق.')}</p>`}
        <b>${T('Try next', 'جرّب بعدها')}</b><ul>${feat.slice(0, 3).map(g => `<li><a href="games.html?play=${g[0]}">${g[1]} ${L(g[3])}</a></li>`).join('')}</ul></div>`;
  }
  render();
  if (window.I18N && I18N.onChange) I18N.onChange(render);
  addEventListener('pageshow', render);
})();
