/* ERLY Learning Studio — boot: inspection mode and stable query-string addresses. Runs in <head>, before the demo sign-in guard.

   1. Inspection mode — learn.html?inspect=1
      For reviewers and browser-based tools that cannot sign in to the (fictional) demo university. It is read-only by
      construction: localStorage and sessionStorage are replaced for this page with in-memory stores that start EMPTY,
      and IndexedDB is switched off. So inspection mode can neither read a student's saved data on this device nor
      write anything that outlives the tab — progress, notes, cards and settings all vanish on close. Motion is calmed
      (the same "still" setting as the accessibility centre) and the opening animation is skipped.

   2. Query-string addresses, for tools that drop the #fragment:
        ?subject=physics        → #/subject/physics      (aliases: mathematics/math → maths, computer-science → cs …)
        ?topic=phys-newton      → #/topic/phys-newton
        ?lesson=phys-newton     → #/lesson/phys-newton
        ?exp=projectile         → #/exp/projectile
        ?section=explore        → #/explore              (only the Studio's real sections)
        ?inspect=1 on its own   → #/inspect              (the full content directory)
      Only applied when the address has no #route of its own, with replaceState, so Back/Forward and refresh behave.
      Unknown ids fall through to the Studio's own "not found" handling. */
(function () {
  'use strict';
  var q; try { q = new URLSearchParams(location.search); } catch (e) { return; }
  var inspect = q.get('inspect') === '1';
  window.LS_INSPECT = inspect;
  if (inspect) {
    var mem = function () {
      var m = new Map();
      return { getItem: function (k) { k = String(k); return m.has(k) ? m.get(k) : null; }, setItem: function (k, v) { m.set(String(k), String(v)); },
        removeItem: function (k) { m.delete(String(k)); }, clear: function () { m.clear(); }, key: function (i) { var a = Array.from(m.keys()); return i < a.length ? a[i] : null; },
        get length() { return m.size; } };
    };
    try {
      Object.defineProperty(window, 'localStorage', { value: mem(), configurable: true });
      Object.defineProperty(window, 'sessionStorage', { value: mem(), configurable: true });
      Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true });
      sessionStorage.setItem('acubins-role', 'student'); // the demo guard below only checks this flag; it grants nothing else
      sessionStorage.setItem('ls-entered', '1');          // skip the opening animation
      localStorage.setItem('erly-a11y', JSON.stringify({ still: true }));
      document.documentElement.classList.add('ls-inspect', 'a11y-still');
    } catch (e) { window.LS_INSPECT = inspect = false; } // could not sandbox storage: behave exactly like the normal page
  }
  if (location.hash && location.hash.length > 2) return;
  var SUBJ = { mathematics: 'maths', math: 'maths', maths: 'maths', physics: 'physics', chemistry: 'chemistry', biology: 'biology', 'computer-science': 'cs', computing: 'cs', cs: 'cs',
    english: 'english', geography: 'geography', environment: 'geography', history: 'history', languages: 'languages', social: 'social', 'social-science': 'social', economics: 'more', psychology: 'more', more: 'more' };
  var SECTIONS = ['home', 'explore', 'discover', 'lessons', 'read', 'video', 'lab', 'practice', 'mistakes', 'revise', 'notebook', 'mylibrary', 'paths', 'progress', 'journey', 'archive', 'profile', 'noor', 'inspect'];
  var id = function (k) { var v = (q.get(k) || '').trim().toLowerCase(); return /^[a-z0-9-]{1,60}$/.test(v) ? v : ''; };
  var route = '';
  if (id('exp')) route = 'exp/' + id('exp');
  else if (id('lesson')) route = 'lesson/' + id('lesson');
  else if (id('topic')) route = 'topic/' + id('topic');
  else if (id('subject')) route = 'subject/' + (SUBJ[id('subject')] || id('subject'));
  else if (SECTIONS.indexOf(id('section')) >= 0) route = id('section');
  else if (inspect) route = 'inspect';
  if (route) try { history.replaceState(history.state, '', location.pathname + location.search + '#/' + route); } catch (e) { location.hash = '#/' + route; }
})();
