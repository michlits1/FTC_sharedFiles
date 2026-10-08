# BIOBUZZ Auto Planner — website module

A browser tool for FTC BIOBUZZ (2026-27) that lets students plan a 30-second AUTO on
engineering paper, enter the route, simulate it on a tile grid, and compare the result
with their prediction. Plain JavaScript, no frameworks, no server, no build step needed.

## Three ways to put it on a team website

**1. Its own page (easiest).** Upload `dist/biobuzz-planner-standalone.html` anywhere
that serves files (GitHub Pages, your team host, a school site). It is one file with
everything inside. Rename it `planner.html` or whatever you like.

**2. Inside an existing page.** Upload `dist/biobuzz-planner.js` and
`dist/biobuzz-planner.css`, then add to the page:

```html
<link rel="stylesheet" href="biobuzz-planner.css">
<div id="planner"></div>
<script src="biobuzz-planner.js"></script>
<script>BiobuzzPlanner.mount('#planner');</script>
```

Every style is scoped under `.bbp`, so the planner will not restyle the rest of your
site. A full example is in `examples/embed-example.html`.

**3. Site builders that only allow embeds** (Google Sites, Wix, Squarespace). Host the
standalone file somewhere (option 1), then embed it with an iframe. See
`examples/iframe-example.html`. An iframe also fully shields the planner from your
site's styles.

## Options

```js
BiobuzzPlanner.mount('#planner', {
  title: 'RMV Auto Planner',                 // heading
  storageKey: 'rmv-38148-planner',           // where routes are saved in each visitor's browser
  theme: 'auto',                             // 'auto' (follows device), 'light' or 'dark'
  robot: { tile: 0.9, turn: 0.5, intake: 1.2, launch: 0.4 },   // default seconds per action
  assumptions: { firstTip: 4, nextTip: 8, capacity: 4 },       // POLLEN per HIVE TIP, robot capacity
  flowers: [['A2','A3'], ['B6','C6'], ['F4','F5'], ['D1','E1']] // the two wall tiles each FLOWER sits between
});
```

`mount()` returns `{ destroy(), reset() }`. Several planners can share one page if each
has its own `storageKey`.

## Things to know

- **Saving:** routes and predictions are saved in each visitor's own browser only.
  Nothing is sent anywhere, and visitors don't see each other's routes.
- **Fonts:** the standalone page and `index.html` load Google Fonts. When embedding,
  copy that `<link>` line from `examples/embed-example.html` if you want the same look;
  otherwise it uses ordinary system fonts.
- **Accuracy:** FLOWER positions and the POLLEN needed to tip the HIVE are estimates.
  Check them against the Competition Manual (Figure 9-2) and set `flowers` / `assumptions`
  to match. The page's "Rules used" tab lists every simplification.

## Editing

The code lives in `src/`. After editing, run `python build.py` to regenerate `dist/`.
`make_biobuzz_paper.py` draws the matching engineering paper set
(`python make_biobuzz_paper.py out.pdf`, needs `pip install reportlab`).
