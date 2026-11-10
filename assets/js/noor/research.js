/* Noor — research engine (browser side).
   plan → retrieve from real sources → split into passages → rank (BM25 + source authority) → cite.
   Every passage carries its source, URL, licence and retrieval time; nothing is invented. Sources are
   called from the student's own browser where the provider allows it (Wikipedia, Wikidata, World Bank,
   Crossref, TheSportsDB, MusicBrainz all send CORS headers), so each student is their own client under
   each provider's per-user limits. Keyed or CORS-less sources (OpenAlex, arXiv, live web search) go
   through the Noor gateway only when one is configured. Only the question (redacted) is ever sent.
   Retrieved text is untrusted data: it is quoted and cited, never followed as instructions.
   UMD: window.ERLY_RESEARCH in the browser, CommonJS for unit tests (fetch is injectable). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ERLY_RESEARCH = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const STOP = new Set('a an the of to in on for and or but is are was were be been being do does did how what why when where who whom which whose that this these those it its with by from as at about into than then so if not no can could should would will shall may might must i me my we our you your he she they them their his her there here please tell explain show give me us more most some any all each every just also very really vs versus compare comparison between difference differences pros cons advantages disadvantages better best which one say says said mean means know known ما هو هي في من على إلى عن كيف لماذا متى أين'.split(' '));
  const norm = s => String(s || '').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}\s-]/gu, ' ');
  // a light stemmer: compression / compresses / compressed → compress; studies → study
  const stem = w => (w.length > 4 ? w.replace(/ies$/, 'y').replace(/(ations?|ions?|ing|ed|es|ers?|ly|s)$/, '') : w);
  const terms = s => norm(s).split(/\s+/).filter(w => w && w.length > 1 && !STOP.has(w)).map(stem);
  const redact = s => String(s || '').replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]').replace(/\+?\d[\d\s-]{7,}\d/g, '[number]').slice(0, 300);

  /* ---------- what kind of question is this? ---------- */
  const LIVE = /\b(today|tonight|yesterday|this (week|weekend|month|season|year)|latest|newest|current(ly)?|right now|at the moment|recent(ly)?|breaking|news|score|scores|result|results|fixture|fixtures|standings|who won|who is winning|live|price of|stock price|exchange rate|weather|election|poll(s)?|20(2[5-9]|3\d))\b|اليوم|أمس|الأخبار|آخر|الحالي/i;
  const DATA = /\b(gdp|economy|economies|economic|population|inflation|unemployment|life expectancy|literacy|poverty|growth rate|per capita|income|exports?|imports?)\b/i;
  const SCHOLAR = /\b(research|studies|study shows|papers?|peer[- ]reviewed|journal|evidence|meta-?analysis|literature|preprints?|arxiv|citations?)\b/i;
  const SPORT = /\b(match(es)?|fixtures?|scores?|league|cup|tournament|season|fc|nba|nfl|nhl|ipl|cricket|football|soccer|basketball|tennis|f1|formula 1|grand prix|olympics?|beat|won against|lost to|standings)\b/i;
  const SPORT_LIVE = /\b(results?|score|won|win|lose|lost|play(ed|ing)?|game|fixtures?)\b/i;
  const MUSIC = /\b(album|albums|song|songs|band|singer|discography|rapper|musician|artist)\b/i;
  const COMPARE = /^(?:compare|comparison of|contrast)\s+(.+?)(?:\s+(?:and|with|to|vs\.?|versus)\s+(.+?))?(?:\s+(?:and|,)\s+(.+?))?[?.!]*$|^(.+?)\s+(?:vs\.?|versus|compared (?:to|with)|or)\s+(.+?)(?:\s*[-—:,]\s*.*)?[?.!]*$|^(?:what are the )?(?:pros and cons|advantages and disadvantages|benefits and (?:drawbacks|limitations|risks)|strengths and weaknesses) of\s+(.+?)[?.!]*$|^(?:which is better|should i (?:use|choose|pick))[,:]?\s+(.+?)\s+or\s+(.+?)[?.!]*$/i;
  // "compare the economies of Japan and Germany" → options Japan, Germany; aspect "economy"
  const ASPECT = /^(?:compare|comparison of|contrast)\s+(?:the\s+)?([a-z][a-z\s-]{2,40}?)\s+of\s+(.+?)[?.!]*$/i;
  function aspectOf(q) { const m = String(q).trim().replace(/^(please |can you |could you )/i, '').match(ASPECT); if (!m) return null; const opts = m[2].split(/\s*,\s*|\s+and\s+|\s+vs\.?\s+|\s+versus\s+/i).map(x => x.replace(/^(the|a|an)\s+/i, '').trim()).filter(Boolean); return opts.length >= 2 ? { aspect: m[1].replace(/ies$/, 'y').replace(/s$/, ''), opts: opts.slice(0, 4) } : null; }
  // "classical and modern physics" → "classical physics", "modern physics"
  const shareNoun = o => (o && o.length >= 2 && o.slice(0, -1).every(x => !/\s/.test(x)) && /\s/.test(o[o.length - 1]) && /^[a-z]/.test(o[0]) ? o.map((x, i) => (i < o.length - 1 ? x + ' ' + o[o.length - 1].split(/\s+/).slice(1).join(' ') : x)) : o);
  function compareOptions(q) { const o = compareOptions0(q); return o ? shareNoun(o) : o; }
  function compareOptions0(q) {
    const a = aspectOf(q); if (a) return a.opts;
    const t = String(q).trim().replace(/^(please |can you |could you )/i, '').replace(/^(which is better|which one is better|what is better)[,:]?\s+/i, 'which is better ').replace(/^(should i (use|choose|pick|learn))\s+/i, 'which is better ');
    const df = t.match(/differences? between\s+(.+?)\s+and\s+(.+?)[?.!]*$/i);
    if (df) return [df[1], df[2]].map(x => x.replace(/^(the|a|an)\s+/i, '').trim());
    const wb = t.match(/^which is better\s+(.+?)\s+or\s+(.+?)[?.!]*$/i);
    if (wb) return [wb[1], wb[2]].map(x => x.replace(/^(the|a|an)\s+/i, '').trim());
    const m = t.match(COMPARE); if (!m) return null;
    // groups: 1-3 "compare A and B (and C)"; 4-5 "A vs/or B"; 6 "pros and cons of A"; 7-8 "which is better A or B"
    const opts = (m[6] ? [m[6]] : m[7] ? [m[7], m[8]] : m[4] ? [m[4], m[5]] : [m[1], m[2], m[3]]).filter(Boolean).map(x => x.replace(/^(the|a|an)\s+/i, '').replace(/\b(in terms of|for|when it comes to)\b.*$/i, '').trim()).filter(x => x && x.length < 60);
    if (!opts.length) return null;
    const flat = opts.flatMap(x => x.split(/\s*,\s*/)).filter(Boolean);
    if (flat.length > opts.length) return flat.slice(0, 4);
    if (opts.length === 1 && / and /i.test(opts[0])) return opts[0].split(/\s*,\s*|\s+and\s+/i).filter(Boolean).slice(0, 4);
    return opts.slice(0, 4);
  }
  function plan(q, lang) {
    const t = String(q || ''), kinds = new Set(['reference']);
    if (DATA.test(t) && countriesIn(t).length) kinds.add('data');
    if (SCHOLAR.test(t)) kinds.add('scholarly');
    if (SPORT.test(t) || (SPORT_LIVE.test(t) && LIVE.test(t) && (t.match(/\b[A-Z][a-z]{2,}/g) || []).some(w => !/^(Who|What|When|Where|Which|How|Why|Did|Does|Is|Are|Show|Tell|Give|Latest|Today|Yesterday|The)$/.test(w)))) kinds.add('sports');
    if (MUSIC.test(t)) kinds.add('music');
    const live = LIVE.test(t);
    if (live) kinds.add('live');
    const options = compareOptions(t), asp = aspectOf(t);
    return { query: redact(t), lang: lang === 'ar' ? 'ar' : 'en', freshness: live ? 'live' : 'stable', kinds: [...kinds], compare: options && options.length ? options : null, aspect: asp ? asp.aspect : null, countries: countriesIn(t) };
  }

  /* ---------- World Bank indicators and country codes ---------- */
  const INDICATORS = [
    [/gdp per (capita|person|head)|income per/i, 'NY.GDP.PCAP.CD', 'GDP per capita (current US$)'],
    [/\bgdp\b|economy|economies|economic size|output/i, 'NY.GDP.MKTP.CD', 'GDP (current US$)'],
    [/growth/i, 'NY.GDP.MKTP.KD.ZG', 'GDP growth (annual %)'],
    [/population/i, 'SP.POP.TOTL', 'Population, total'],
    [/inflation/i, 'FP.CPI.TOTL.ZG', 'Inflation, consumer prices (annual %)'],
    [/unemployment/i, 'SL.UEM.TOTL.ZS', 'Unemployment (% of labour force, modelled ILO estimate)'],
    [/life expectancy/i, 'SP.DYN.LE00.IN', 'Life expectancy at birth (years)'],
    [/literacy/i, 'SE.ADT.LITR.ZS', 'Adult literacy rate (%)'],
    [/exports?/i, 'NE.EXP.GNFS.ZS', 'Exports of goods and services (% of GDP)']
  ];
  const C3 = { afghanistan: 'AFG', algeria: 'DZA', argentina: 'ARG', australia: 'AUS', austria: 'AUT', bahrain: 'BHR', bangladesh: 'BGD', belgium: 'BEL', brazil: 'BRA', canada: 'CAN', chile: 'CHL', china: 'CHN', colombia: 'COL', denmark: 'DNK', egypt: 'EGY', ethiopia: 'ETH', finland: 'FIN', france: 'FRA', germany: 'DEU', ghana: 'GHA', greece: 'GRC', india: 'IND', indonesia: 'IDN', iran: 'IRN', iraq: 'IRQ', ireland: 'IRL', israel: 'ISR', italy: 'ITA', japan: 'JPN', jordan: 'JOR', kenya: 'KEN', korea: 'KOR', 'south korea': 'KOR', kuwait: 'KWT', lebanon: 'LBN', malaysia: 'MYS', mexico: 'MEX', morocco: 'MAR', netherlands: 'NLD', 'new zealand': 'NZL', nigeria: 'NGA', norway: 'NOR', oman: 'OMN', pakistan: 'PAK', peru: 'PER', philippines: 'PHL', poland: 'POL', portugal: 'PRT', qatar: 'QAT', russia: 'RUS', 'saudi arabia': 'SAU', singapore: 'SGP', 'south africa': 'ZAF', spain: 'ESP', 'sri lanka': 'LKA', sudan: 'SDN', sweden: 'SWE', switzerland: 'CHE', syria: 'SYR', thailand: 'THA', tunisia: 'TUN', turkey: 'TUR', 'türkiye': 'TUR', uae: 'ARE', 'united arab emirates': 'ARE', emirates: 'ARE', uk: 'GBR', 'united kingdom': 'GBR', britain: 'GBR', usa: 'USA', 'united states': 'USA', america: 'USA', vietnam: 'VNM', yemen: 'YEM', 'الإمارات': 'ARE', 'السعودية': 'SAU', 'مصر': 'EGY', 'اليابان': 'JPN', 'الهند': 'IND', 'الصين': 'CHN' };
  function countriesIn(t) { const s = ' ' + norm(t) + ' ', out = []; for (const [n, c] of Object.entries(C3).sort((a, b) => b[0].length - a[0].length)) if (s.includes(' ' + n + ' ') && !out.includes(c)) out.push(c); return out.slice(0, 6); }

  // the topic of a scholarly question, without its scaffolding ("what does research say about …")
  const SCAFFOLD = /\b(what|how|does|do|did|is|are|the|research|researchers?|studies|study|studied|evidence|science|scientific|papers?|literature|journals?|peer[- ]reviewed|meta-?analys[ie]s|say|says|show|shows|suggest|suggests|find|found|about|on|regarding|latest|recent)\b/gi;
  // the topic of an everyday question, for encyclopedia search ("Explain how a four-stroke engine works" → "four-stroke engine")
  function topicQuery(q) {
    let t = String(q).trim().replace(/[?!.]+$/, '');
    t = t.replace(/^(please\s+)?(can|could) you\s+/i, '').replace(/^(explain|describe|define|summari[sz]e|outline|tell me (more )?about|teach me( about)?|what (is|are|was|were)( the)?|who (is|are|was|were)|how (does|do|did|is|are|can)|why (is|are|does|do|did)|when (did|was|were)|where (is|are)|give me (an? )?(overview|summary|introduction) (of|to))\s+/i, '');
    t = t.replace(/^(how|why|what|whether)\s+/i, '').replace(/^(a|an|the)\s+/i, '');
    t = t.replace(/\s+(works?|happens?|functions?|operates?|is made|are made|came about|started|means?)$/i, '').replace(/\s+(at an? (introductory|basic|simple|advanced) level|in simple (terms|words)|for beginners|step by step|visually|with examples?)$/i, '');
    t = t.replace(/^(the )?(history|geography|economy|culture|rules|basics) of the\s+/i, (m, a, b) => b + ' of ');
    return t.trim() || String(q);
  }
  const scholarQuery = q => String(q).replace(/[?.!]/g, ' ').replace(SCAFFOLD, ' ').replace(/\s+/g, ' ').trim() || String(q);

  /* ---------- connectors ---------- */
  const now = () => new Date().toISOString();
  const LIC = { wiki: 'CC BY-SA 4.0', wd: 'CC0', wb: 'CC BY 4.0', cr: 'Metadata: CC0 (Crossref); works under their own licences', sdb: 'TheSportsDB free API (Patreon-supported; attribution)', mb: 'CC0 core data (MusicBrainz)', oa: 'CC0', ax: 'Metadata CC0; papers under their own licences' };
  async function getJSON(fetchFn, url, opts) { const r = await fetchFn(url, Object.assign({ credentials: 'omit', referrerPolicy: 'no-referrer' }, opts || {})); if (!r.ok) { const e = new Error('http-' + r.status); e.status = r.status; throw e; } return r.json(); }
  const C = {
    // Wikipedia: search, then the article text (headings kept, so sections like "Advantages" can be found)
    async wikipedia(p, f) {
      const host = `https://${p.lang}.wikipedia.org/w/api.php`;
      const s = await getJSON(f, `${host}?action=query&list=search&srsearch=${encodeURIComponent(topicQuery(p.query))}&srlimit=3&format=json&origin=*`);
      const hits = ((s.query || {}).search || []).slice(0, 2);
      if (!hits.length) return [];
      const ex = await getJSON(f, `${host}?action=query&prop=extracts|info&explaintext=1&exsectionformat=wiki&inprop=url&titles=${encodeURIComponent(hits.map(h => h.title).join('|'))}&format=json&origin=*`);
      return Object.values((ex.query || {}).pages || {}).filter(pg => pg.extract).map(pg => ({ source: 'Wikipedia', sourceId: 'wikipedia', authority: 'reference', title: pg.title, url: pg.fullurl || `https://${p.lang}.wikipedia.org/wiki/${encodeURIComponent(pg.title.replace(/ /g, '_'))}`, text: pg.extract.slice(0, 30000), updated: pg.touched || null, licence: LIC.wiki, retrieved: now() }));
    },
    async wikidata(p, f) {
      const s = await getJSON(f, `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(topicQuery(p.query).slice(0, 80))}&language=${p.lang}&uselang=${p.lang}&limit=1&format=json&origin=*`);
      const e = (s.search || [])[0]; if (!e || !e.description) return [];
      return [{ source: 'Wikidata', sourceId: 'wikidata', authority: 'reference', title: e.label, url: e.concepturi || `https://www.wikidata.org/wiki/${e.id}`, text: `${e.label}: ${e.description}.`, licence: LIC.wd, retrieved: now() }];
    },
    // World Bank indicators for named countries (structured data → also usable as a chart)
    async worldbank(p, f) {
      if (!p.countries.length) return [];
      const ind = INDICATORS.find(([re]) => re.test(p.query)) || INDICATORS[1];
      // one request per country: the API sends CORS headers for single-country requests only (checked 2026-11-10)
      const js = await Promise.all(p.countries.map(c => getJSON(f, `https://api.worldbank.org/v2/country/${c}/indicator/${ind[1]}?format=json&mrv=1`).catch(() => null)));
      const rows = js.filter(Boolean).flatMap(j => j[1] || []).filter(r => r.value != null).map(r => ({ country: r.country.value, iso3: r.countryiso3code, year: r.date, value: r.value }));
      if (!rows.length) return [];
      const fmt = v => (Math.abs(v) >= 1e9 ? (v / 1e12 >= 1 ? (v / 1e12).toFixed(2) + ' trillion' : (v / 1e9).toFixed(1) + ' billion') : Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1) + ' million' : (Math.round(v * 10) / 10).toLocaleString('en'));
      return [{ source: 'World Bank Open Data', sourceId: 'worldbank', authority: 'official', title: `${ind[2]} — ${rows.map(r => r.country).join(', ')}`, url: `https://data.worldbank.org/indicator/${ind[1]}?locations=${rows.map(r => r.iso3).join('-')}`, text: rows.map(r => `${r.country}: ${ind[2]} was ${fmt(r.value)} in ${r.year}.`).join(' '), data: { indicator: ind[2], code: ind[1], rows }, published: rows.map(r => r.year).sort().pop(), licence: LIC.wb, retrieved: now() }];
    },
    async crossref(p, f) {
      const j = await getJSON(f, `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(scholarQuery(p.query))}&filter=type:journal-article,has-abstract:true&rows=4&select=DOI,title,author,issued,container-title,type,abstract`);
      return ((j.message || {}).items || []).filter(w => w.title && w.title[0]).map(w => ({ source: 'Crossref', sourceId: 'crossref', authority: 'scholarly', title: w.title[0], url: 'https://doi.org/' + w.DOI, text: `${w.title[0]}${w['container-title'] && w['container-title'][0] ? ' — ' + w['container-title'][0] : ''}${w.issued && w.issued['date-parts'] ? ' (' + w.issued['date-parts'][0][0] + ')' : ''}. ${(w.author || []).slice(0, 3).map(a => [a.given, a.family].filter(Boolean).join(' ')).join(', ')}. ${String(w.abstract || '').replace(/<[^>]+>/g, '').slice(0, 900)}`, published: w.issued && w.issued['date-parts'] ? String(w.issued['date-parts'][0][0]) : null, licence: LIC.cr, retrieved: now() }));
    },
    // TheSportsDB: a team's recent results (free test key "123", per https://www.thesportsdb.com/free_sports_api)
    async sportsdb(p, f) {
      const name = (p.query.match(/\b([A-Z][\w.'-]+(?:\s+(?:[A-Z][\w.'-]+|FC|CF|United|City))*)/g) || []).filter(x => !/^(Who|What|When|How|The|Did|Show|Tell|Explain|Latest|Today|Yesterday)$/.test(x)).sort((a, b) => b.length - a.length)[0];
      if (!name) return [];
      const t = await getJSON(f, `https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=${encodeURIComponent(name)}`);
      const team = (t.teams || [])[0]; if (!team) return [];
      const ev = await getJSON(f, `https://www.thesportsdb.com/api/v1/json/123/eventslast.php?id=${team.idTeam}`).catch(() => ({}));
      const games = (ev.results || ev.events || []).slice(0, 5);
      const out = [{ source: 'TheSportsDB', sourceId: 'thesportsdb', authority: 'community', title: team.strTeam, url: `https://www.thesportsdb.com/team/${team.idTeam}`, text: `${team.strTeam} (${team.strSport}${team.strLeague ? ', ' + team.strLeague : ''}${team.strCountry ? ', ' + team.strCountry : ''}). ${team.intFormedYear ? 'Formed ' + team.intFormedYear + '. ' : ''}${team.strStadium ? 'Stadium: ' + team.strStadium + '.' : ''}`, licence: LIC.sdb, retrieved: now() }];
      if (games.length) out.push({ source: 'TheSportsDB', sourceId: 'thesportsdb', authority: 'community', title: `${team.strTeam} — recent results`, url: `https://www.thesportsdb.com/team/${team.idTeam}`, text: games.map(g => `${g.dateEvent}: ${g.strHomeTeam} ${g.intHomeScore != null ? g.intHomeScore : '?'}–${g.intAwayScore != null ? g.intAwayScore : '?'} ${g.strAwayTeam}${g.strLeague ? ' (' + g.strLeague + ')' : ''}.`).join(' '), published: games[0].dateEvent, live: true, licence: LIC.sdb, retrieved: now() });
      return out;
    },
    async musicbrainz(p, f) {
      const group = /\b(band|group)\b/i.test(p.query);
      const name = p.query.replace(/^(who (is|are|was|were)|tell me about|what (is|are))\s+/i, '').replace(/[?.!].*$/, '').replace(/\b(the )?(album|albums|songs?|band|group|singer|rapper|musician|artist|discography)\b/ig, '').replace(/\s+the\s*$/i, '').replace(/\s+/g, ' ').trim().slice(0, 60);
      if (!name) return [];
      const j = await getJSON(f, `https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(`artist:"${name.replace(/"/g, '')}"${group ? ' AND type:group' : ''}`)}&fmt=json&limit=1`);
      const a = (j.artists || [])[0]; if (!a || (a.score || 0) < 85) return [];
      return [{ source: 'MusicBrainz', sourceId: 'musicbrainz', authority: 'community', title: a.name, url: `https://musicbrainz.org/artist/${a.id}`, text: `${a.name}${a.disambiguation ? ' (' + a.disambiguation + ')' : ''}: ${a.type || 'artist'}${a.country ? ' from ' + a.country : ''}${a['life-span'] && a['life-span'].begin ? ', active since ' + a['life-span'].begin : ''}${a['life-span'] && a['life-span'].ended && a['life-span'].end ? ' (ended ' + a['life-span'].end + ')' : ''}.`, licence: LIC.mb, retrieved: now() }];
    },
    // via the Noor gateway (keys / CORS live there)
    async openalex(p, f, gw) { if (!gw) return []; const j = await getJSON(f, gw + '/v1/research/openalex', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q: p.query }) }); return (j.results || []).map(w => ({ source: 'OpenAlex', sourceId: 'openalex', authority: 'scholarly', title: w.title, url: w.url, text: `${w.title} (${w.year || 'n.d.'}${w.venue ? ', ' + w.venue : ''}). ${w.authors.join(', ')}. ${w.abstract || ''}`, published: w.year ? String(w.year) : null, licence: LIC.oa, retrieved: now() })); },
    async arxiv(p, f, gw) { if (!gw) return []; const j = await getJSON(f, gw + '/v1/research/arxiv', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q: p.query }) }); return (j.results || []).map(w => ({ source: 'arXiv', sourceId: 'arxiv', authority: 'preprint', title: w.title, url: w.url, text: `${w.title} (${w.published}). ${w.authors.join(', ')}. ${w.abstract}`, published: w.published, licence: LIC.ax, retrieved: now() })); }
  };
  // which connectors a plan uses
  function route(pl, gw) {
    const use = ['wikipedia'];
    if (pl.kinds.includes('data')) use.push('worldbank');
    if (pl.kinds.includes('scholarly')) use.push('crossref', ...(gw ? ['openalex', 'arxiv'] : []));
    if (pl.kinds.includes('sports')) use.push('thesportsdb');
    if (pl.kinds.includes('music')) use.push('musicbrainz');
    if (!pl.kinds.includes('scholarly') && !pl.kinds.includes('data')) use.push('wikidata');
    return [...new Set(use)].map(n => (n === 'thesportsdb' ? 'sportsdb' : n));
  }

  /* ---------- passages and ranking ---------- */
  const AUTH = { official: 1.3, scholarly: 1.2, reference: 1.1, preprint: 0.95, news: 1.0, community: 0.85 };
  function passages(doc) {
    // keep section headings attached to their text; ~700-character chunks
    const out = []; let head = '';
    for (const block of String(doc.text).split(/\n{1,}/)) {
      const h = block.match(/^=+\s*(.+?)\s*=+$/); if (h) { head = h[1]; continue; }
      const b = block.trim(); if (b.length < 40) continue;
      for (let i = 0; i < b.length; i += 700) { const piece = b.slice(i, i + 760); out.push(Object.assign({}, doc, { section: head, text: piece })); }
    }
    if (!out.length && doc.text) out.push(Object.assign({}, doc, { section: '' }));
    return out;
  }
  function rank(q, list, k = 6) {
    const qt = [...new Set(terms(q))]; if (!qt.length) return list.slice(0, k);
    const docs = list.map(d => terms(d.title + ' ' + (d.section || '') + ' ' + d.text));
    const avg = docs.reduce((s, d) => s + d.length, 0) / Math.max(1, docs.length), N = docs.length;
    const df = Object.fromEntries(qt.map(t => [t, docs.filter(d => d.includes(t)).length]));
    const scored = list.map((d, i) => {
      const tf = {}; docs[i].forEach(w => { tf[w] = (tf[w] || 0) + 1; });
      let s = 0; for (const t of qt) { const f = tf[t] || 0; if (!f) continue; const idf = Math.log(1 + (N - df[t] + 0.5) / (df[t] + 0.5)); s += idf * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * docs[i].length / avg)); }
      if (terms(d.title).some(t => qt.includes(t))) s += 1.5;
      return { d, s: s * (AUTH[d.authority] || 1) };
    }).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
    const seen = new Set(), out = [];
    for (const x of scored) { const key = x.d.url + '#' + x.d.text.slice(0, 60); if (seen.has(key)) continue; seen.add(key); out.push(x.d); if (out.length >= k) break; }
    return out;
  }

  /* ---------- retrieve ---------- */
  async function retrieve(question, o = {}) {
    const f = o.fetchFn || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null), gw = o.gateway || null;
    const pl = plan(question, o.lang);
    const status = {};
    const timeout = (pr, ms) => Promise.race([pr, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
    const names = o.only || route(pl, gw);
    const docs = [];
    // comparisons: research each option separately
    const queries = pl.compare ? pl.compare.map(x => Object.assign({}, pl, { query: redact(pl.aspect ? `${pl.aspect} of ${x}` : x), option: x })) : [pl];
    await Promise.all(names.map(async n => {
      const fn = C[n]; if (!fn) return;
      try {
        for (const qp of (n === 'wikipedia' || n === 'wikidata' ? queries : [pl])) { const r = await timeout(fn(qp, f, gw), o.timeoutMs || 7000); r.forEach(d => { d.option = qp.option || null; }); docs.push(...r); }
        status[n] = 'ok';
      } catch (e) { status[n] = e.message === 'timeout' ? 'timeout' : e.status === 429 || e.status === 503 ? 'rate-limited' : 'failed'; }
    }));
    const all = docs.flatMap(passages);
    // comparisons: the best passages for each option, plus shared data (e.g. World Bank figures for all of them)
    const top = pl.compare ? [...all.filter(p => !p.option).slice(0, 2), ...pl.compare.flatMap(opt => rank(opt + ' ' + (pl.aspect || '') + ' ' + question, all.filter(p => p.option === opt), 3))] : rank(question, all, o.k || 6);
    top.forEach((p, i) => { p.n = i + 1; });
    const liveOk = top.some(p => p.live) || false;
    return { plan: pl, passages: top, docs, status, evidence: top.length ? (pl.freshness === 'live' ? (liveOk ? 'live' : 'retrieved-not-live') : 'retrieved') : 'none' };
  }

  /* ---------- citations ---------- */
  // remove [n] that point at nothing; flag citations whose passage shares no content with the sentence
  function verifyCitations(answer, list) {
    const ok = new Map(list.map(p => [p.n, p])), invalid = [], weak = [];
    const text = String(answer || '').replace(/\[(\d{1,2})\]/g, (m, n) => { n = +n; if (!ok.has(n)) { invalid.push(n); return ''; } return m; });
    for (const s of text.split(/(?<=[.!?])\s+/)) for (const m of s.matchAll(/\[(\d{1,2})\]/g)) { const p = ok.get(+m[1]); const st = terms(s.replace(/\[\d+\]/g, '')), pt = new Set(terms(p.title + ' ' + p.text)); if (st.length >= 4 && !st.some(w => pt.has(w))) weak.push(+m[1]); }
    return { text, invalid, weak: [...new Set(weak)], cited: [...new Set([...text.matchAll(/\[(\d{1,2})\]/g)].map(m => +m[1]))] };
  }
  function sourcesMarkdown(list, cited) {
    const used = list.filter(p => !cited || cited.includes(p.n));
    if (!used.length) return '';
    // one line per source page, listing every passage number taken from it
    const by = new Map(); for (const p of used) { const g = by.get(p.url) || by.set(p.url, { p, ns: [] }).get(p.url); if (!g.ns.includes(p.n)) g.ns.push(p.n); }
    return '\n\n**Sources**\n' + [...by.values()].map(({ p, ns }) => `${ns.sort((a, b) => a - b).map(n => '[' + n + ']').join('')} [${String(p.title).replace(/[[\]]/g, '')}](${p.url}) — ${p.source}${p.published ? ', ' + p.published : ''} · ${p.licence}`).join('\n');
  }

  /* ---------- answers without the AI (zero-budget tier 2): quote, don't invent ---------- */
  function sentences(t) { return String(t).replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z0-9"“(؀-ۿ])/).filter(s => s.length > 30 && s.length < 420); }
  function extractive(question, res, max = 4) {
    const qt = new Set(terms(question)), picked = [];
    for (const p of res.passages) for (const s of sentences(p.text)) { const st = terms(s); const hit = st.filter(w => qt.has(w)).length; if (hit) picked.push({ s, p, score: hit / Math.sqrt(st.length + 1) + (p.n === 1 ? 0.2 : 0) }); }
    picked.sort((a, b) => b.score - a.score);
    const out = [], used = new Set();
    for (const x of picked) { if (out.length >= max) break; if (used.has(x.s)) continue; used.add(x.s); out.push(x); }
    if (!out.length) return null;
    return { md: out.map(x => `${x.s} [${x.p.n}]`).join(' ') + sourcesMarkdown(res.passages, [...new Set(out.map(x => x.p.n))]), cited: [...new Set(out.map(x => x.p.n))] };
  }
  // pros and cons from sources' own "Advantages / Disadvantages / Criticism" sections (no invented ratings)
  const PRO = /advantage|benefit|strength|pros\b|merits/i, CON = /disadvantage|drawback|criticism|limitation|weakness|cons\b|risks?|controvers/i;
  function compareFromSources(res) {
    if (!res.plan.compare) return null;
    const rows = res.plan.compare.map(opt => {
      const docs = res.docs.filter(d => d.option === opt && d.sourceId === 'wikipedia');
      const parts = docs.flatMap(passages);
      const pick = re => parts.filter(p => re.test(p.section)).flatMap(p => sentences(p.text).slice(0, 2).map(s => ({ s, p }))).slice(0, 3);
      const intro = parts[0] ? sentences(parts[0].text)[0] : '';
      return { opt, intro: intro ? { s: intro, p: parts[0] } : null, pros: pick(PRO), cons: pick(CON), url: docs[0] && docs[0].url, title: docs[0] && docs[0].title };
    });
    return rows;
  }
  function freshnessNote(res, lang) {
    if (res.plan.freshness !== 'live') return '';
    return res.evidence === 'live' ? '' : (lang === 'ar' ? 'هذا سؤال عن معلومات تتغير، ولم أجد مصدراً مباشراً يغطي آخر المستجدات — قد تكون المعلومات أدناه قديمة.' : 'This asks about something that changes, and I could not reach a live source for it — what follows may be out of date.');
  }

  return { topicQuery, scholarQuery, plan, compareOptions, countriesIn, retrieve, rank, passages, verifyCitations, sourcesMarkdown, extractive, compareFromSources, freshnessNote, terms, redact, connectors: C, INDICATORS };
});
