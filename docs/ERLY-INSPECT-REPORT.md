# Learning Studio: browser inspectability

**Entry points:**
- **Read-only, no sign-in:** `learn.html?inspect=1`
- **Plain HTML, no JavaScript:** `learn-guide/index.html`

## 1. What prevented external tools from inspecting the Studio

Two things in `learn.html` blocked inspection.

1. **The sign-in guard in `<head>`.** A browser without the session flag `acubins-role=student` was sent straight to `login.html`. That includes ChatGPT's browser and any other inspector. Such tools never reached the Studio, and they cannot sign in to a fictional demo university.
2. **The static HTML was almost empty.** It held only the shell and "Opening the Learning Studio…". All content comes from JavaScript: subjects, lessons, experiences, the Visual Lab, readings, videos and questions. Tools that do not run scripts therefore saw nothing.

Some of the content was also hard to reach even after sign-in:
- **Lazy loading.** Experience definitions and the 174 Visual Lab models load only when opened (`LS.needExp`, `LS.needLab`).
- **Visuals drawn on canvas.** Simulations draw on canvas.
- **Hash routes only.** Every address was a `#/` route, which some fetchers drop.

## 2. Root cause in the code

| Problem | Location |
|---|---|
| Sign-in redirect | `learn.html`: `if (r !== 'student') location.replace('login.html…')` |
| Content only in JavaScript objects | `LS.lessons` (lesson files), `LS.experiences` (`ls-explore.js`), `LS.exp.DEFS` (`ls-exp*.js`, `ls-x-*.js`), `ERLY_LAB.engines`, `STUDIO_LIBRARY`, `LS.VIDEOS`, `LS.paths`, `LS.bank()` |
| Content rendered only by a hash router | `ls-core.js` `render()` |

## 3. What changed

### Inspection mode (`assets/js/learn/ls-boot.js`, new)

`?inspect=1` runs before the guard. It is read-only by construction:
- `localStorage` and `sessionStorage` are replaced, for this page only, with in-memory stores that start **empty**.
- `indexedDB` is switched off.

As a result, inspection mode:
- cannot see a student's saved data on that device;
- cannot leave anything behind after the tab closes;
- needs no sign-in;
- calms motion and skips the opening animation.

### Query-string addresses

Query strings now map to the Studio's routes:

| Query string | Route |
|---|---|
| `?subject=` | `#/subject/…` (aliases such as `mathematics` are accepted) |
| `?lesson=` | `#/lesson/…` |
| `?topic=` | `#/topic/…` |
| `?exp=` | `#/exp/…` |
| `?section=` | `#/…` (only real sections) |

The mapping uses `replaceState`, so refresh, Back and Forward keep working. Unknown ids reach the Studio's own "not found" pages, and anything that is not a plain id is ignored.

### Content directory (`assets/js/learn/ls-inspect.js`, new)

The routes `#/inspect` and `#/inspect/<subject>` show semantic HTML: `article`, `section`, `nav`, a logical heading order, a table with a caption, and `details` for answers and long text.

It is built from the Studio's own data, so it covers every lesson with:
- objectives;
- each section's text, worked examples and activities;
- the summary, revision questions, flashcards, further reading and sources.

For every experience it shows:
- the kind and what the model simplifies;
- the introduction, the prediction question and the instructions;
- **the real controls**, read from the experience's DOM after an off-screen build;
- the explanation, apply questions, summary and connections.

It also lists the Visual Lab models, readings (full text), videos (transcripts read from the captions files), paths and practice questions (answers folded).

It only reads. It never opens an experience, so it records no events.

### Static guide (`learn-guide/`)

`learn-guide/` holds 12 plain-HTML pages: an index plus one page per subject. `tools/build-learn-guide.js` writes them from the same renderer, running in the real Studio.

### `learn.html`

- A short static subject list sits inside `<main>`, so tools that run no scripts can read it. The Studio replaces it as soon as it starts.
- A `<link rel="alternate">` points to the guide.
- New script and stylesheet: `ls-boot.js`, `ls-inspect.js` and `learn-inspect.css`.

### Small edits elsewhere

- `ls-exp.js` exposes its build context as `LS.exp.ctx`.
- Its "save to notebook" check now tests `window.indexedDB`, so it reports "storage unavailable" in inspection mode instead of throwing.
- `ls-explore.js` has a version bump.

## 4–7. What can be inspected

**Every part of the Studio, in all 11 subjects:**
- Mathematics, Physics, Chemistry, Biology, Computer science, English & study, Geography & environment, History, Languages, Social science, and Economics, psychology & more.
- 10 lessons, 64 experiences, 174 Visual Lab models, 6 readings, 3 ERLY videos and 3 external videos, 5 paths and 107 practice questions.

**The live Studio in inspection mode:**
- **Sections:** Home, Explore (subjects, topics, Discover), Learn (lessons, reading, video, Visual Lab), Practise (practice, flashcards, mistakes), My Workspace (notebook, library, paths, progress, journey, archive, privacy) and Noor.
- **My Workspace starts empty**, because no student data is read.

**Lessons and experiences open directly:**
- `learn.html?inspect=1&lesson=phys-newton`
- `learn.html?inspect=1&exp=projectile`

## 8. Simulations

Simulations are unchanged and run in both normal and inspection mode. The directory describes each one, but it does not claim that reading the description is the same as using the simulation.

## 9–10. Tests

**New suite:** `tests/e2e/learn-inspect.e2e.js`, **15/15 passed**. It checks:
- a fresh browser with no sign-in reaches the directory;
- every lesson's sections and objectives, and every experience's frame and controls, appear on its subject page;
- the controls are the real ones;
- **read-only:** a seeded student store, settings and an IndexedDB database are byte-for-byte unchanged after browsing, predicting, writing a note, asking to "save on this device" and toggling the theme in inspection mode, and none of it was visible inside;
- inspection mode sends no requests to other sites except fonts;
- query addresses, refresh, Back and Forward, and graceful handling of unknown ids;
- the normal guard still applies without `?inspect=1`;
- with JavaScript off, `learn.html` lists the subjects;
- the guide matches the Studio exactly;
- every link in the guide resolves: 297 live routes, plus every file and anchor;
- no secrets or personal data appear;
- the normal Studio is unchanged;
- phone width works;
- axe finds no WCAG 2.1 A/AA violations;
- no page errors.

**Existing suites:**

| Suite | Result |
|---|---|
| `learning-studio-v24` | 42/42 |
| `learning-studio-v23` | 18/18 |
| `learning-studio-v22` | 22/22 |
| `learning-studio-v21` | 21/21 |

**Failures found during the work:**
- **A real bug:** a physics path linked a maths lesson to a missing anchor. Fixed.
- **Three test mistakes:**
  - The test read storage on `index.html`, which by design clears ERLY keys on open (its existing "reset on open").
  - One assertion was wrong.
  - The link checker did not strip the query string.

## 11. Limitations

- **Simulations need JavaScript.** Without it, they are available only as described text.
- **Visual Lab models are listed by title and kind.** Their controls appear only when a model is opened live; they are not listed in the directory.
- **The guide is a generated copy.** Re-run `tools/build-learn-guide.js` after content changes. The e2e suite fails if it is out of date.
- **Section descriptions are short sentences** that repeat each section's own heading. Everything else comes from data.
- **Inspection mode is open to anyone with the link.** It shows only public demonstration content.

## 12. Files

**New:**
- `assets/js/learn/ls-boot.js`
- `assets/js/learn/ls-inspect.js`
- `assets/css/learn-inspect.css`
- `tools/build-learn-guide.js`
- `learn-guide/*.html` (12 pages)
- `tests/e2e/learn-inspect.e2e.js`
- this report

**Edited:**
- `learn.html`
- `assets/js/learn/ls-exp.js`
- `assets/js/learn/ls-explore.js`
