/* Noor — domain taxonomy and source registry.
   Statuses mean exactly this, and nothing more:
     integrated          a connector exists in assets/js/noor/research.js, is unit-tested, and was called live
     integrated-gateway  as above, but it runs through the Noor gateway (needs the gateway and possibly a free key)
     researched          terms, licence and limits were checked, but there is no connector yet
     registered          listed for future work; not checked in detail and not used by Noor
   "checked" records what was actually observed on that date from the development environment (a shared IP,
   which Wikimedia and OpenAlex rate-limit more strictly than a student's own browser).
   Adding a source or domain is a data change here plus, for retrieval, one connector function.
   UMD: window.ERLY_NOOR_REGISTRY in the browser, CommonJS for tests. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ERLY_NOOR_REGISTRY = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const D = '2026-11-10';
  const S = (o) => Object.assign({ auth: 'none', cost: 'free', languages: ['en'], coverage: 'global', status: 'registered', checked: null }, o);
  const SOURCES = [
    // ---- integrated (browser) ----
    S({ id: 'wikipedia', name: 'Wikipedia', url: 'https://www.wikipedia.org/', type: 'reference', authority: 'reference', domains: ['*'], api: 'https://www.mediawiki.org/wiki/API:Main_page', licence: 'CC BY-SA 4.0 (text)', rate: 'Unauthenticated browser users: 200 requests/min; unidentified clients 10/min (Wikimedia API rate limits, 2026)', updates: 'continuous', languages: ['en', 'ar', 'fr', 'es', 'de', 'zh', 'ja', 'hi', 'ur', 'pt', '+300'], retrieval: 'Action API search + plain-text extracts with section headings, from the student’s browser (CORS)', status: 'integrated', checked: { date: D, result: '429 from the shared development IP (expected under the 2026 limits); connector verified with recorded responses' } }),
    S({ id: 'wikidata', name: 'Wikidata', url: 'https://www.wikidata.org/', type: 'dataset', authority: 'reference', domains: ['*'], api: 'https://www.wikidata.org/wiki/Wikidata:Data_access', licence: 'CC0', rate: 'Wikimedia API limits (as Wikipedia)', updates: 'continuous', languages: ['multilingual'], retrieval: 'entity search: label + description', status: 'integrated', checked: { date: D, result: '429 from the shared development IP' } }),
    S({ id: 'worldbank', name: 'World Bank Open Data', url: 'https://data.worldbank.org/', type: 'dataset', authority: 'official', domains: ['economics', 'demographics', 'education-data', 'development'], api: 'https://datahelpdesk.worldbank.org/knowledgebase/articles/889392', licence: 'CC BY 4.0', rate: 'no published per-user limit', updates: 'annual series; API last updated 2026-10-08', retrieval: 'Indicators API, one request per country (multi-country requests are served without CORS headers)', status: 'integrated', checked: { date: D, result: '200 — GDP for Japan/Germany returned; multi-country path found to lack CORS, fixed' } }),
    S({ id: 'crossref', name: 'Crossref', url: 'https://www.crossref.org/', type: 'scholarly', authority: 'scholarly', domains: ['research', '*'], api: 'https://www.crossref.org/documentation/retrieve-metadata/rest-api/', licence: 'Metadata facts CC0; works under their own licences', rate: 'public pool; polite pool if a contact email is sent (not sent: privacy)', updates: 'continuous', retrieval: 'works search (journal articles with abstracts)', status: 'integrated', checked: { date: D, result: '200 — relevant sleep-and-memory articles returned' } }),
    S({ id: 'thesportsdb', name: 'TheSportsDB', url: 'https://www.thesportsdb.com/', type: 'api', authority: 'community', domains: ['sports'], api: 'https://www.thesportsdb.com/free_sports_api', licence: 'Free API key "123" for testing/low volume; community-maintained data', rate: 'free tier is limited; heavier use needs a Patreon key', updates: 'near real time for major leagues', retrieval: 'team search + last results', status: 'integrated', checked: { date: D, result: '200 — Arsenal 1–0 Hull City (2026-11-07) returned' } }),
    S({ id: 'musicbrainz', name: 'MusicBrainz', url: 'https://musicbrainz.org/', type: 'media-metadata', authority: 'community', domains: ['music'], api: 'https://musicbrainz.org/doc/MusicBrainz_API', licence: 'Core data CC0', rate: '1 request/second per client; meaningful User-Agent expected', updates: 'continuous', retrieval: 'artist search', status: 'integrated', checked: { date: D, result: '200 — "Queen (UK rock group)" returned' } }),
    // ---- integrated through the gateway ----
    S({ id: 'openalex', name: 'OpenAlex', url: 'https://openalex.org/', type: 'scholarly', authority: 'scholarly', domains: ['research', '*'], api: 'https://docs.openalex.org/', auth: 'free-key', licence: 'CC0', rate: 'keyless requests share a per-IP daily budget; a free key has its own budget', updates: 'continuous', retrieval: 'works search via gateway (/v1/research/openalex) with OPENALEX_API_KEY', status: 'integrated-gateway', checked: { date: D, result: '429 without a key ("Insufficient budget") — key required for reliable use' } }),
    S({ id: 'arxiv', name: 'arXiv', url: 'https://arxiv.org/', type: 'scholarly', authority: 'preprint', domains: ['physics', 'mathematics', 'computer-science', 'ai'], api: 'https://info.arxiv.org/help/api/', licence: 'Metadata CC0; papers under their own licences', rate: '1 request every 3 seconds (enforced in the gateway)', updates: 'daily', retrieval: 'Atom API via gateway (no browser CORS)', status: 'integrated-gateway', checked: { date: D, result: '200 from the server side; no CORS header for browsers' } }),
    S({ id: 'gemini-search', name: 'Gemini — Grounding with Google Search', url: 'https://aistudio.google.com/docs/google-search', type: 'api', authority: 'search', domains: ['news', 'sports', 'current-events', '*'], api: 'https://aistudio.google.com/docs/google-search', auth: 'free-key', cost: 'free allowance on some models (pricing page); the terms call API grounding a Paid Service — confirm before use', licence: 'Grounded results must be shown unmodified with Google’s search suggestions; no caching (Gemini API terms)', rate: 'Gemini 3+: default 1,500 grounded requests/day per project', updates: 'live', retrieval: 'Interactions API with google_search tool, via gateway; opt-in (GEMINI_SEARCH=1)', status: 'integrated-gateway', checked: { date: D, result: 'docs and terms read; not called (no key provided)' } }),
    // ---- researched, not integrated ----
    S({ id: 'gdelt', name: 'GDELT DOC 2.0', url: 'https://www.gdeltproject.org/', type: 'news', authority: 'news-index', domains: ['news', 'politics', 'international-relations'], licence: 'open, attribution requested', status: 'researched', checked: { date: D, result: 'timed out from the development environment twice — not integrated' } }),
    S({ id: 'nasa', name: 'NASA APIs', url: 'https://api.nasa.gov/', type: 'api', authority: 'official', domains: ['astronomy', 'space'], auth: 'free-key', licence: 'mostly public domain (US Gov)', rate: 'DEMO_KEY is heavily limited; a free key is needed', status: 'researched', checked: { date: D, result: 'timed out from the development environment' } }),
    S({ id: 'openrouter', name: 'OpenRouter (free models)', url: 'https://openrouter.ai/', type: 'ai-provider', authority: 'n/a', domains: ['*'], auth: 'free-key', licence: 'provider terms; some free providers may train on prompts unless disabled in account settings', rate: ':free models — 20/min; 50/day (≥10 credits ever bought: 1,000/day)', status: 'integrated-gateway', checked: { date: D, result: '16 free models listed (e.g. google/gemma-4-31b-it:free with image input)' } }),
    S({ id: 'huggingface', name: 'Hugging Face Inference Providers', url: 'https://huggingface.co/docs/inference-providers/index', type: 'ai-provider', authority: 'n/a', domains: ['*'], auth: 'key', cost: 'free accounts get no monthly credits (PRO: $2/month)', status: 'researched', checked: { date: D, result: 'pricing page: free users must buy credits — not a zero-budget option' } }),
    // ---- registered (need keys, paid, or no permitted API) ----
    ...[
      ['tmdb', 'The Movie Database (TMDB)', 'https://developer.themoviedb.org/', 'media-metadata', ['movies', 'television'], 'free-key'],
      ['omdb', 'OMDb API', 'https://www.omdbapi.com/', 'media-metadata', ['movies'], 'free-key'],
      ['lastfm', 'Last.fm API', 'https://www.last.fm/api', 'media-metadata', ['music'], 'free-key'],
      ['youtube', 'YouTube Data API v3', 'https://developers.google.com/youtube/v3', 'media-metadata', ['youtube', 'social-media'], 'free-key'],
      ['semanticscholar', 'Semantic Scholar API', 'https://www.semanticscholar.org/product/api', 'scholarly', ['research'], 'free-key'],
      ['pubmed', 'PubMed / NCBI E-utilities', 'https://www.ncbi.nlm.nih.gov/books/NBK25501/', 'scholarly', ['medicine', 'biology'], 'none'],
      ['europeana', 'Europeana', 'https://pro.europeana.eu/page/apis', 'reference', ['history', 'art', 'culture'], 'free-key'],
      ['loc', 'Library of Congress', 'https://www.loc.gov/apis/', 'reference', ['history', 'law'], 'none'],
      ['gutenberg', 'Project Gutenberg', 'https://www.gutenberg.org/', 'oer', ['literature'], 'none'],
      ['openstax', 'OpenStax', 'https://openstax.org/', 'oer', ['mathematics', 'physics', 'chemistry', 'biology', 'economics'], 'none'],
      ['mdn', 'MDN Web Docs', 'https://developer.mozilla.org/', 'docs', ['programming', 'web'], 'none'],
      ['python-docs', 'Python documentation', 'https://docs.python.org/', 'docs', ['programming'], 'none'],
      ['ourworldindata', 'Our World in Data', 'https://ourworldindata.org/', 'dataset', ['economics', 'climate', 'health', 'demographics'], 'none'],
      ['un-data', 'UNdata', 'https://data.un.org/', 'dataset', ['demographics', 'development'], 'none'],
      ['imf', 'IMF Data', 'https://www.imf.org/en/Data', 'dataset', ['economics', 'finance'], 'none'],
      ['oecd', 'OECD Data', 'https://data.oecd.org/', 'dataset', ['economics', 'education-data'], 'none'],
      ['fred', 'FRED (St. Louis Fed)', 'https://fred.stlouisfed.org/docs/api/fred/', 'dataset', ['economics', 'finance'], 'free-key'],
      ['geonames', 'GeoNames', 'https://www.geonames.org/export/web-services.html', 'dataset', ['geography'], 'free-key'],
      ['osm', 'OpenStreetMap (Nominatim)', 'https://nominatim.org/release-docs/latest/api/Overview/', 'dataset', ['geography'], 'none'],
      ['who', 'World Health Organization', 'https://www.who.int/data/gho/info/gho-odata-api', 'dataset', ['health'], 'none'],
      ['medlineplus', 'MedlinePlus', 'https://medlineplus.gov/about/developers/webservices/', 'reference', ['health'], 'none'],
      ['sep', 'Stanford Encyclopedia of Philosophy', 'https://plato.stanford.edu/', 'reference', ['philosophy'], 'none'],
      ['britannica', 'Encyclopaedia Britannica', 'https://www.britannica.com/', 'reference', ['*'], 'paid'],
      ['reuters', 'Reuters', 'https://www.reuters.com/', 'news', ['news'], 'paid'],
      ['apnews', 'AP News', 'https://apnews.com/', 'news', ['news'], 'paid'],
      ['bbc', 'BBC News', 'https://www.bbc.com/news', 'news', ['news'], 'none'],
      ['aljazeera', 'Al Jazeera', 'https://www.aljazeera.com/', 'news', ['news'], 'none']
    ].map(([id, name, url, type, domains, auth]) => S({ id, name, url, type, authority: type === 'news' ? 'news' : type === 'scholarly' ? 'scholarly' : type === 'dataset' ? 'official' : 'reference', domains, auth: auth === 'paid' ? 'paid' : auth, cost: auth === 'paid' ? 'paid / no open API' : 'free', status: 'registered', retrieval: auth === 'paid' ? 'link only — no permitted free API; never scraped' : 'not connected yet' }))
  ];

  // Domain taxonomy. freshness: stable (rarely changes) | periodic (yearly data) | live (needs current sources)
  const G = (group, list) => list.map(([id, name, sub, freshness, sources]) => ({ id, group, name, subdomains: sub, freshness, sources }));
  const DOMAINS = [
    ...G('Science and mathematics', [
      ['mathematics', 'Mathematics', ['algebra', 'calculus', 'geometry', 'statistics', 'probability'], 'stable', ['wikipedia', 'arxiv', 'openstax']],
      ['physics', 'Physics', ['mechanics', 'thermodynamics', 'electromagnetism', 'quantum', 'relativity'], 'stable', ['wikipedia', 'arxiv', 'crossref', 'openstax']],
      ['chemistry', 'Chemistry', ['organic', 'inorganic', 'physical', 'biochemistry'], 'stable', ['wikipedia', 'crossref', 'openstax']],
      ['biology', 'Biology', ['cells', 'genetics', 'ecology', 'evolution', 'anatomy'], 'stable', ['wikipedia', 'crossref', 'pubmed', 'openstax']],
      ['astronomy', 'Astronomy and space', ['solar system', 'cosmology', 'missions'], 'periodic', ['wikipedia', 'nasa', 'arxiv']],
      ['earth', 'Earth sciences', ['geology', 'meteorology', 'oceanography', 'climate'], 'periodic', ['wikipedia', 'ourworldindata']]
    ]),
    ...G('Society and humanities', [
      ['history', 'History', ['ancient', 'medieval', 'modern', 'archaeology'], 'stable', ['wikipedia', 'loc', 'europeana']],
      ['geography', 'Geography', ['countries', 'cities', 'physical geography'], 'periodic', ['wikipedia', 'wikidata', 'geonames', 'osm']],
      ['politics', 'Politics and government', ['systems', 'institutions', 'elections'], 'live', ['wikipedia', 'gemini-search']],
      ['philosophy', 'Philosophy', ['ethics', 'logic', 'epistemology'], 'stable', ['wikipedia', 'sep']],
      ['psychology', 'Psychology', ['cognitive', 'developmental', 'social'], 'stable', ['wikipedia', 'crossref']],
      ['economics', 'Economics', ['micro', 'macro', 'trade', 'development'], 'periodic', ['worldbank', 'wikipedia', 'imf', 'oecd', 'fred']],
      ['law', 'Law', ['international law', 'constitutions'], 'periodic', ['wikipedia']],
      ['literature', 'Literature and languages', ['authors', 'works', 'linguistics'], 'stable', ['wikipedia', 'gutenberg']],
      ['religion', 'Religion (academic study)', ['traditions', 'history of religions'], 'stable', ['wikipedia']],
      ['international-relations', 'International relations', ['diplomacy', 'organisations', 'conflicts'], 'live', ['wikipedia', 'gemini-search']]
    ]),
    ...G('Technology and engineering', [
      ['mechanical', 'Mechanical and automotive engineering', ['engines', 'thermodynamics', 'vehicles'], 'stable', ['wikipedia', 'crossref']],
      ['electrical', 'Electrical engineering and electronics', ['circuits', 'motors', 'power'], 'stable', ['wikipedia', 'crossref']],
      ['civil', 'Civil engineering and architecture', ['structures', 'materials', 'construction'], 'stable', ['wikipedia']],
      ['computer-science', 'Computer science and programming', ['algorithms', 'data structures', 'languages', 'databases'], 'stable', ['wikipedia', 'mdn', 'python-docs', 'arxiv']],
      ['ai', 'Artificial intelligence and data science', ['machine learning', 'neural networks', 'statistics'], 'periodic', ['wikipedia', 'arxiv', 'crossref']],
      ['cybersecurity', 'Cybersecurity (education)', ['cryptography', 'networks', 'safe practice'], 'periodic', ['wikipedia']]
    ]),
    ...G('Global information', [
      ['countries', 'Countries and cities', ['facts', 'capitals', 'demographics'], 'periodic', ['wikipedia', 'wikidata', 'worldbank']],
      ['demographics', 'Demographics and development', ['population', 'health', 'education'], 'periodic', ['worldbank', 'ourworldindata', 'un-data']],
      ['organisations', 'Companies and organisations', ['history', 'products'], 'live', ['wikipedia', 'wikidata']]
    ]),
    ...G('Media and entertainment', [
      ['movies', 'Film and television', ['plots (summaries only)', 'cast', 'awards'], 'live', ['wikipedia', 'tmdb', 'omdb']],
      ['music', 'Music', ['artists', 'albums'], 'periodic', ['musicbrainz', 'wikipedia', 'lastfm']],
      ['social-media', 'Online platforms and creators', ['how platforms work', 'public metadata'], 'live', ['wikipedia', 'youtube']]
    ]),
    ...G('Sports', [
      ['sports', 'Sports', ['football', 'cricket', 'basketball', 'tennis', 'motorsport', 'athletics', 'Olympics'], 'live', ['thesportsdb', 'wikipedia', 'gemini-search']]
    ]),
    ...G('Current events', [
      ['news', 'News and current events', ['world', 'science news', 'technology news'], 'live', ['gemini-search', 'gdelt', 'bbc', 'aljazeera', 'reuters', 'apnews']]
    ]),
    ...G('Everyday knowledge', [
      ['how-things-work', 'How things work', ['machines', 'everyday science'], 'stable', ['wikipedia']],
      ['comparisons', 'Comparisons and decisions', ['pros and cons', 'trade-offs'], 'periodic', ['wikipedia', 'worldbank']]
    ]),
    ...G('Health education', [
      ['health', 'Health and medicine (education only)', ['body systems', 'public health'], 'periodic', ['wikipedia', 'medlineplus', 'who', 'pubmed']]
    ])
  ];
  function summary() {
    const by = k => SOURCES.reduce((m, s) => { m[s[k]] = (m[s[k]] || 0) + 1; return m; }, {});
    return { domains: DOMAINS.length, groups: [...new Set(DOMAINS.map(d => d.group))].length, sources: SOURCES.length, byStatus: by('status'), byAuth: by('auth'), languages: [...new Set(SOURCES.flatMap(s => s.languages))] };
  }
  return { SOURCES, DOMAINS, summary, CHECKED: D };
});
