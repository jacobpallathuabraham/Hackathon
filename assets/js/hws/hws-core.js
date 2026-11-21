/* ERLY Handwriting Studio (v24) — core: namespace, document model, history, storage.

   Document model
     notebook { id, title, created, updated, pages: [page] }
     page     { id, name, paper, w, h, layers: [{ id, name, visible, items: [item] }], active }
     item     { id, t: 'stroke' | 'erase' | 'shape' | 'text' | 'image' | 'fn' | 'stamp' | 'measure', … }   (plain JSON)
   Items are never mutated in place once committed: edits replace them, so an undo snapshot is just the page's
   layer arrays (cheap shallow copies).

   Storage — only after the student chooses “Save on this device”:
     IndexedDB database “erly-hws”, store “notebooks” (one record per notebook) and “inbox” (things sent from the
     Learning Studio). Drawings can be megabytes, which is why IndexedDB is used rather than localStorage.
     Nothing is ever uploaded. Choosing “Just this visit” keeps everything in memory only. */
(function () {
  'use strict';
  const H = window.HWS = window.HWS || {};
  H.T = (en, ar) => (window.I18N && I18N.lang === 'ar' && ar ? ar : en);
  H.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  H.uid = p => (p || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  H.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  H.reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-still');
  const bus = {}; H.on = (e, f) => (bus[e] = bus[e] || []).push(f); H.emit = (e, d) => (bus[e] || []).forEach(f => { try { f(d); } catch (err) { console.error(err); } });

  /* ---------- pages and notebooks ---------- */
  H.SIZES = { landscape: [1600, 1131], portrait: [1131, 1600], square: [1300, 1300], wide: [1920, 1080] };
  H.newPage = (paper = 'ruled', size = 'landscape', name) => { const [w, h] = H.SIZES[size] || H.SIZES.landscape; const L = { id: H.uid('l'), name: H.T('Layer 1', 'طبقة 1'), visible: true, items: [] }; return { id: H.uid('p'), name: name || '', paper, size, w, h, layers: [L], active: L.id }; };
  H.newNotebook = (title, paper, size) => ({ id: H.uid('n'), title: title || H.T('Untitled notebook', 'دفتر بلا عنوان'), created: Date.now(), updated: Date.now(), pages: [H.newPage(paper, size)] });
  H.layer = (page, id) => page.layers.find(l => l.id === (id || page.active)) || page.layers[0];
  H.allItems = page => page.layers.filter(l => l.visible).flatMap(l => l.items);

  /* ---------- history (per page) ---------- */
  const hist = new Map(); // pageId -> { undo: [], redo: [] }
  const snap = page => ({ layers: page.layers.map(l => Object.assign({}, l, { items: l.items.slice() })), active: page.active, paper: page.paper });
  H.checkpoint = page => { const h = hist.get(page.id) || { undo: [], redo: [] }; h.undo.push(snap(page)); if (h.undo.length > 200) h.undo.shift(); h.redo = []; hist.set(page.id, h); };
  H.undo = page => { const h = hist.get(page.id); if (!h || !h.undo.length) return false; h.redo.push(snap(page)); const s = h.undo.pop(); page.layers = s.layers; page.active = s.active; page.paper = s.paper; return true; };
  H.redo = page => { const h = hist.get(page.id); if (!h || !h.redo.length) return false; h.undo.push(snap(page)); const s = h.redo.pop(); page.layers = s.layers; page.active = s.active; page.paper = s.paper; return true; };
  H.canUndo = page => !!(hist.get(page.id) || { undo: [] }).undo.length; H.canRedo = page => !!(hist.get(page.id) || { redo: [] }).redo.length;

  /* ---------- storage ---------- */
  const DB = 'erly-hws', VER = 1; let dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => { if (!('indexedDB' in window)) return rej(new Error('no-idb')); const r = indexedDB.open(DB, VER); r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('notebooks')) d.createObjectStore('notebooks', { keyPath: 'id' }); if (!d.objectStoreNames.contains('inbox')) d.createObjectStore('inbox', { keyPath: 'id' }); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
  const tx = (store, mode, fn) => open().then(d => new Promise((res, rej) => { const t = d.transaction(store, mode), s = t.objectStore(store); const out = fn(s); t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }));
  const PREF = 'erly-hws-prefs';
  H.prefs = (() => { try { return Object.assign({ consent: null, recent: [], favs: ['#1c1b19', '#1f4fd1', '#c8341f'], brush: 'fountain', size: 5, paper: 'ruled', lastId: null, intro: 0 }, JSON.parse(localStorage.getItem(PREF) || '{}')); } catch (e) { return { consent: null, recent: [], favs: [], brush: 'fountain', size: 3, paper: 'ruled', lastId: null, intro: 0 }; } })();
  H.savePrefs = () => { if (H.prefs.consent !== 'device') return; try { localStorage.setItem(PREF, JSON.stringify(H.prefs)); } catch (e) { /* blocked */ } };
  H.store = {
    enabled: () => H.prefs.consent === 'device',
    list: () => tx('notebooks', 'readonly', s => s.getAll()).then(a => (a || []).sort((x, y) => y.updated - x.updated)),
    get: id => tx('notebooks', 'readonly', s => s.get(id)),
    put: nb => tx('notebooks', 'readwrite', s => s.put(JSON.parse(JSON.stringify(nb)))),
    del: id => tx('notebooks', 'readwrite', s => s.delete(id)),
    clearAll: () => Promise.all([tx('notebooks', 'readwrite', s => s.clear()), tx('inbox', 'readwrite', s => s.clear())]),
    inbox: () => tx('inbox', 'readonly', s => s.getAll()), inboxDel: id => tx('inbox', 'readwrite', s => s.delete(id)),
    estimate: () => (navigator.storage && navigator.storage.estimate ? navigator.storage.estimate() : Promise.resolve(null))
  };
  // autosave: debounced, status visible, never silent about failure
  let saveT = 0, saving = false; H.saveState = 'unsaved';
  H.dirty = nb => { nb.updated = Date.now(); H.saveState = H.store.enabled() ? 'pending' : 'memory'; H.emit('save', H.saveState); if (!H.store.enabled()) return; clearTimeout(saveT); saveT = setTimeout(() => H.flush(nb), 700); };
  H.flush = nb => { if (!H.store.enabled() || saving) return Promise.resolve(); saving = true; H.saveState = 'saving'; H.emit('save', 'saving');
    return H.store.put(nb).then(() => { saving = false; H.saveState = 'saved'; H.savedAt = Date.now(); H.prefs.lastId = nb.id; H.savePrefs(); H.emit('save', 'saved'); }).catch(err => { saving = false; H.saveState = 'error'; H.saveError = err && (err.name || err.message); H.emit('save', 'error'); }); };
  addEventListener('pagehide', () => { if (H.nb && H.saveState === 'pending') H.flush(H.nb); });
})();
