/* Noor knowledge-quality dashboard (university role).
   Everything shown is computed from the registry (assets/data/noor-registry.js) or from requests made from
   this browser; nothing is invented. Live-check results are kept on this device only. */
(function () {
  'use strict';
  const REG = window.ERLY_NOOR_REGISTRY, RS = window.ERLY_RESEARCH;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const KEY = 'noor-registry-checks';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } };
  const save = d => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* not stored */ } };
  const STATUS = { integrated: 'Integrated', 'integrated-gateway': 'Integrated via gateway', researched: 'Researched only', registered: 'Registered only' };
  const sum = REG.summary(), S = REG.SOURCES;
  const free = S.filter(s => s.auth === 'none' && !/paid/.test(s.cost)).length, keyed = S.filter(s => /key/.test(s.auth)).length, paid = S.filter(s => s.auth === 'paid' || /paid/.test(s.cost)).length;
  const checks = load();
  function cards() {
  const live = Object.values(load()).filter(c => c.ok).length;
  $('#kqCards').innerHTML = [
    [sum.groups + ' / ' + sum.domains, 'domain groups / domains configured'],
    [sum.sources, 'sources registered'],
    [(sum.byStatus.integrated || 0) + ' + ' + (sum.byStatus['integrated-gateway'] || 0), 'integrated (browser + gateway)'],
    [sum.byStatus.researched || 0, 'researched, not integrated'],
    [free, 'free, no key'], [keyed, 'need a (free) key'], [paid, 'paid / no open API'],
    [live, 'connected from this browser (last check)'], ['0', 'documents indexed (retrieval is on demand)']
  ].map(([n, l]) => `<div class="kq-card"><b>${esc(n)}</b><span>${esc(l)}</span></div>`).join('');
  }
  cards();

  // ---- registry table with a status filter ----
  let filter = 'all';
  function sources() {
    $('#kqFilter').innerHTML = ['all', ...Object.keys(STATUS)].map(k => `<button type="button" role="radio" aria-checked="${filter === k}" data-f="${k}">${k === 'all' ? 'All' : STATUS[k]} (${k === 'all' ? S.length : S.filter(s => s.status === k).length})</button>`).join('');
    $('#kqSources tbody').innerHTML = S.filter(s => filter === 'all' || s.status === filter).map(s => `<tr>
      <td data-label="Source"><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a><small>${esc((s.domains || []).join(', '))}</small></td>
      <td data-label="Status"><span class="kq-st kq-st--${s.status}">${esc(STATUS[s.status])}</span></td>
      <td data-label="Type">${esc(s.type)} · ${esc(s.authority)}</td>
      <td data-label="Access">${esc(s.auth === 'none' ? 'open' : s.auth)}${s.cost && s.cost !== 'free' ? '<small>' + esc(s.cost) + '</small>' : ''}</td>
      <td data-label="Licence">${esc(s.licence || '—')}</td>
      <td data-label="Rate limits">${esc(s.rate || '—')}</td>
      <td data-label="Last checked">${s.checked ? esc(s.checked.date) + '<small>' + esc(s.checked.result) + '</small>' : 'not checked'}${checks[s.id] && checks[s.id].lastOk ? '<small>✓ this browser: ' + esc(new Date(checks[s.id].lastOk).toLocaleString()) + '</small>' : ''}</td></tr>`).join('');
  }
  $('#kqFilter').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { filter = b.dataset.f; sources(); } });
  sources();

  // ---- domains ----
  const groups = [...new Set(REG.DOMAINS.map(d => d.group))];
  $('#kqDomains').innerHTML = groups.map(g => `<div class="kq-group"><h3>${esc(g)}</h3>${REG.DOMAINS.filter(d => d.group === g).map(d => { const integ = d.sources.filter(id => (S.find(s => s.id === id) || {}).status && /^integrated/.test(S.find(s => s.id === id).status)); return `<div class="kq-dom"><b>${esc(d.name)}</b><small>${esc(d.subdomains.join(' · '))}</small><span class="kq-fresh kq-fresh--${d.freshness}">${esc(d.freshness)}</span><span class="kq-cov">${integ.length}/${d.sources.length} sources integrated${integ.length ? ': ' + esc(integ.join(', ')) : ''}</span></div>`; }).join('')}</div>`).join('');

  // ---- live connector check (real requests from this browser) ----
  const TESTS = [['wikipedia', 'wikipedia', 'What is photosynthesis?'], ['wikidata', 'wikidata', 'Japan'], ['worldbank', 'worldbank', 'GDP of Japan'], ['crossref', 'crossref', 'research on photosynthesis'], ['thesportsdb', 'sportsdb', 'Arsenal latest results'], ['musicbrainz', 'musicbrainz', 'Who is Queen the band']];
  function liveRows() {
    const c = load();
    $('#kqLive tbody').innerHTML = TESTS.map(([id]) => { const r = c[id]; return `<tr><td data-label="Source">${esc((S.find(s => s.id === id) || {}).name || id)}</td><td data-label="Result">${r ? (r.ok ? '<span class="kq-st kq-st--integrated">OK · ' + r.count + ' passage(s)</span>' : '<span class="kq-st kq-st--fail">' + esc(r.status) + '</span>') : 'not checked yet'}</td><td data-label="Time">${r ? r.ms + ' ms' : '—'}</td><td data-label="Last success">${r && r.lastOk ? esc(new Date(r.lastOk).toLocaleString()) : '—'}</td></tr>`; }).join('');
  }
  liveRows();
  $('#kqCheck').addEventListener('click', async e => {
    const btn = e.currentTarget; btn.disabled = true; btn.textContent = 'Checking…';
    const c = load();
    await Promise.all(TESTS.map(async ([id, conn, q]) => {
      const t0 = performance.now();
      const r = await RS.retrieve(q, { only: [conn], timeoutMs: 9000 }).catch(() => null);
      const st = r ? r.status[conn] : 'failed', n = r ? r.docs.length : 0;
      c[id] = { ok: st === 'ok' && n > 0, status: st === 'ok' && !n ? 'no results' : st, count: n, ms: Math.round(performance.now() - t0), at: Date.now(), lastOk: st === 'ok' && n > 0 ? Date.now() : (c[id] && c[id].lastOk) || null };
    }));
    save(c); liveRows(); sources(); cards(); btn.disabled = false; btn.textContent = 'Check connectors now';
  });

  // ---- gateway ----
  const gw = (window.ERLY_AI_CONFIG || {}).gateway;
  if (!gw || !gw.url) $('#kqGateway').innerHTML = 'No AI gateway is configured, so Noor uses its built-in knowledge, the open sources above and (with consent) the free online fallback. See <code>server/gateway/README.md</code> to deploy the zero-budget Gemini gateway.';
  else fetch(gw.url.replace(/\/$/, '') + '/v1/health').then(r => r.json()).then(h => {
    $('#kqGateway').innerHTML = `<p>Providers in order: ${h.providers.map(p => `<b>${esc(p.name)}</b> (${esc(p.model)}${p.vision ? ', images' : ''})`).join(' → ') || 'none configured'} · Google Search grounding: ${h.search ? 'on' : 'off'} · OpenAlex key: ${h.research && h.research.openalex ? 'yes' : 'no'}</p>
      <p>Today (${esc(h.usage.day)}): ${h.usage.requests} of ${h.usage.dailyCap} gateway requests. ${Object.entries(h.usage.providers).map(([n, p]) => `${esc(n)}: ${p.ok}/${p.requests} ok, ${p.quota} quota, ${p.rateLimited} rate-limited, ${p.timeouts} timeouts, ${p.tokens.input + p.tokens.output} tokens${p.paused ? ', paused until ' + esc(p.paused) : ''}`).join(' · ') || 'no traffic yet'}</p>`;
  }).catch(() => { $('#kqGateway').textContent = 'The gateway did not answer its health check.'; });

  // ---- this device ----
  const U = window.ERLY_USAGE.create(localStorage, (window.ERLY_AI_CONFIG || {}).limits || {}).snapshot();
  $('#kqUsage').innerHTML = `<p class="kq-note">AI requests today on this device: <b>${U.total}</b> of ${U.limits.aiPerDay} (per-minute cap ${U.limits.aiPerMinute}).</p>` +
    (Object.keys(U.ai).length ? `<div class="kq-table-wrap"><table class="kq-table"><thead><tr><th>Provider</th><th>Requests</th><th>OK</th><th>Failures</th><th>Rate-limited</th><th>Quota</th><th>Tokens</th></tr></thead><tbody>${Object.entries(U.ai).map(([n, p]) => `<tr><td data-label="Provider">${esc(n)}</td><td data-label="Requests">${p.requests}</td><td data-label="OK">${p.ok}</td><td data-label="Failures">${p.failures}</td><td data-label="Rate-limited">${p.rateLimited}</td><td data-label="Quota">${p.quota}</td><td data-label="Tokens">${p.input + p.output}</td></tr>`).join('')}</tbody></table></div>` : '') +
    (Object.keys(U.research).length ? `<p class="kq-note">Source calls today: ${Object.entries(U.research).map(([n, r]) => `${esc(n)} ${r.ok} ok / ${r.failed} failed / ${r.rateLimited} rate-limited`).join(' · ')}</p>` : '');

  $('#themeToggle').addEventListener('click', () => { const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = n; try { localStorage.setItem('erly-theme', n); } catch (e) { /* not stored */ } });
})();
