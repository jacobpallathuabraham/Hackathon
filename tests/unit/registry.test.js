// Noor domain taxonomy + source registry: internally consistent and honest about status.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const REG = require('../../assets/data/noor-registry.js');
const RS = require('../../assets/js/noor/research.js');

test('every source a domain names exists in the registry, ids are unique', () => {
  const ids = REG.SOURCES.map(s => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const d of REG.DOMAINS) for (const s of d.sources) assert.ok(ids.includes(s), d.id + ' → ' + s);
});
test('"integrated" means a connector exists and was checked; nothing else claims integration', () => {
  const conn = Object.keys(RS.connectors).map(n => (n === 'sportsdb' ? 'thesportsdb' : n));
  for (const s of REG.SOURCES.filter(x => x.status === 'integrated')) { assert.ok(conn.includes(s.id), s.id + ' has a connector'); assert.ok(s.checked && s.checked.date && s.checked.result, s.id + ' was checked'); }
  for (const s of REG.SOURCES) assert.ok(['integrated', 'integrated-gateway', 'researched', 'registered'].includes(s.status), s.id);
  for (const s of REG.SOURCES.filter(x => x.auth === 'paid')) assert.equal(s.status, 'registered', 'paid sources are never shown as integrated');
});
test('every record carries the fields the dashboard reports', () => {
  for (const s of REG.SOURCES) for (const k of ['id', 'name', 'url', 'type', 'authority', 'domains', 'auth', 'status']) assert.ok(s[k] != null, s.id + '.' + k);
  for (const d of REG.DOMAINS) assert.ok(['stable', 'periodic', 'live'].includes(d.freshness), d.id);
  const sum = REG.summary(); assert.equal(sum.sources, REG.SOURCES.length); assert.ok(sum.domains >= 30);
});
