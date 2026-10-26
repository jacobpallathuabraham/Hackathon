/* ERLY Start-Ramp — for when starting is the hard part: deadline nudges the
   student chooses, a five-minute first step, micro-tasks, and a quiet
   body-doubling room. Works from day one, with no tracking. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const T = (en, ar) => I18N.t(en, ar);
  const app = $('#ramp-app'); if (!app) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TASKS = [
    ['Open the brief and read only the first section', 'افتح التكليف واقرأ القسم الأول فقط'],
    ['Copy the report headings into a blank doc', 'انسخ عناوين التقرير في مستند فارغ'],
    ['Paste in your raw lab numbers — no writing yet', 'ألصق أرقام المختبر الخام — بلا كتابة بعد'],
    ['Write three rough sentences for the method', 'اكتب ثلاث جمل أولية عن الطريقة'],
    ['Make one graph, ugly is fine', 'ارسم رسماً بيانياً واحداً، لا بأس إن كان بسيطاً'],
    ['Submit the draft you have', 'سلّم المسودة التي لديك']
  ];
  const done = new Set();
  function render() {
    $('#micro').innerHTML = TASKS.map((t, i) => `<li class="${done.has(i) ? 'is-done' : ''}"><button data-m="${i}" aria-pressed="${done.has(i)}"><i>${ICON('check')}</i><span>${T(...t)}</span><small class="mono">${i < 2 ? '5 min' : i < 5 ? '15 min' : '2 min'}</small></button></li>`).join('');
    $('#rampBar').style.width = (done.size / TASKS.length * 100) + '%';
    $('#rampDue').textContent = T('due in 3 days', 'موعده بعد ٣ أيام');
  }
  $('#micro').addEventListener('click', e => {
    const b = e.target.closest('[data-m]'); if (!b) return;
    const i = +b.dataset.m;
    done.has(i) ? done.delete(i) : done.add(i);
    render();
    if (done.has(i)) { window.FUN && FUN.confetti($(`[data-m="${i}"]`), 10); if (done.size === TASKS.length) ERLY.toast(T('All done. That started with five minutes.', 'أنجزت كل شيء. وبدأ ذلك بخمس دقائق.')); }
  });

  // five-minute first step
  const C = 2 * Math.PI * 52, ring = $('#t5ring');
  ring.style.strokeDasharray = C; ring.style.strokeDashoffset = 0;
  let left = 300, iv = null;
  const fmt = n => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
  $('#t5go').addEventListener('click', () => {
    if (iv) { clearInterval(iv); iv = null; $('#t5go').textContent = T('Keep going', 'تابع'); $('#timer5').classList.remove('is-on'); return; }
    if (left <= 0) left = 300;
    $('#timer5').classList.add('is-on');
    $('#t5go').textContent = T('Pause', 'إيقاف مؤقت');
    ERLY.toast(T('Just the first micro-task. Five minutes, then you can stop.', 'المهمة الأولى فقط. خمس دقائق، ثم يمكنك التوقف.'));
    iv = setInterval(() => {
      left--;
      $('#t5txt').textContent = fmt(left);
      ring.style.strokeDashoffset = C * (1 - left / 300);
      if (left <= 0) { clearInterval(iv); iv = null; $('#timer5').classList.remove('is-on'); $('#t5go').textContent = T('Another five?', 'خمس أخرى؟'); ERLY.toast(T('Five minutes done. The hardest part was starting.', 'انتهت الدقائق الخمس. أصعب جزء كان البدء.')); }
    }, reduce ? 1000 : 1000);
  });

  // body-doubling room
  let inRoom = false;
  $('#roomBtn').addEventListener('click', () => {
    inRoom = !inRoom;
    $('#roomBtn').classList.toggle('is-on', inRoom);
    $('#roomN').textContent = inRoom ? T('You + 4 students studying quietly · cameras off', 'أنت و٤ طلبة تدرسون بهدوء · الكاميرات مغلقة') : T('4 students studying quietly · cameras off', '٤ طلبة يدرسون بهدوء · الكاميرات مغلقة');
    ERLY.toast(inRoom ? T('Joined. Nobody can see you — just company.', 'انضممت. لا أحد يراك — مجرد صحبة.') : T('Left the room.', 'غادرت الغرفة.'));
  });
  I18N.onChange(render);
  render();
})();
