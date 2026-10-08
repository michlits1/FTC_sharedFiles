/*!
 * BIOBUZZ Auto Planner  (FTC 2026-27)
 * A tile-grid AUTO planner for teaching students to plan before they code.
 *
 * Use on any web page:
 *   <link rel="stylesheet" href="biobuzz-planner.css">
 *   <div id="planner"></div>
 *   <script src="biobuzz-planner.js"></script>
 *   <script>BiobuzzPlanner.mount('#planner');</script>
 *
 * Options (all optional):
 *   title        heading text                         default 'BIOBUZZ Auto Planner'
 *   storageKey   browser storage key, one per planner default 'biobuzz-planner-v1'
 *   theme        'auto' | 'light' | 'dark'            default 'auto' (follows the device)
 *   robot        { tile, turn, intake, launch }       starting seconds per action
 *   assumptions  { firstTip, nextTip, capacity }      POLLEN to tip, robot capacity
 *   flowers      [['A2','A3'], ...]                   4 pairs of wall tiles each FLOWER sits between
 *
 * mount() returns { destroy(), reset() }.
 */
(function (global) {
  'use strict';
  var instances = 0;

  function robotDefaults(r) {
    var out = { tile: 1.0, turn: 0.6, intake: 1.0, launch: 0.5 };
    if (r) { ['tile', 'turn', 'intake', 'launch'].forEach(function (k) { var n = Number(r[k]); if (isFinite(n) && n > 0) { out[k] = n; } }); }
    return out;
  }
  function flowersFrom(pairs) {
    var C = 'ABCDEF', out = [];
    pairs.forEach(function (p) {
      var a = [C.indexOf(String(p[0]).charAt(0).toUpperCase()), parseInt(String(p[0]).slice(1), 10) - 1];
      var b = [C.indexOf(String(p[1]).charAt(0).toUpperCase()), parseInt(String(p[1]).slice(1), 10) - 1];
      var ok = function (t) { return t[0] >= 0 && t[0] <= 5 && t[1] >= 0 && t[1] <= 5; };
      if (!ok(a) || !ok(b)) { throw new Error('BiobuzzPlanner: bad FLOWER tiles ' + p); }
      var wall = a[0] === 0 && b[0] === 0 ? 'W' : a[0] === 5 && b[0] === 5 ? 'E' : a[1] === 0 && b[1] === 0 ? 'S' : a[1] === 5 && b[1] === 5 ? 'N' : null;
      if (!wall) { throw new Error('BiobuzzPlanner: FLOWER tiles ' + p + ' must be two neighbouring tiles along one wall'); }
      var names = { W: 'red wall', E: 'blue wall', S: 'audience wall', N: 'back wall' };
      out.push({ name: names[wall] + ', between ' + String(p[0]).toUpperCase() + ' and ' + String(p[1]).toUpperCase(), tiles: [a, b], wall: wall, red: a[0] <= 2 });
    });
    return out;
  }

  function create(root, opts) {


    // ======================================================================
    //  BIOBUZZ (FTC 2026-27) AUTO planner, simplified to a 6 x 6 tile grid.
    //  Points come from the Competition Manual, Table 10-2. Anything the
    //  public text does not pin down is listed in ASSUME and shown on the page.
    // ======================================================================
    var COLS = 'ABCDEF';
    var AUTO_SECONDS = 30;
    var ROWS = 40;
    var PTS = { leave: 3, park: 5, tip: 20 };
    var ASSUME = { capacity: 4, preload: 4, firstTip: 4, nextTip: 8, flowerPollen: 4, gardenPollen: 4, startNectar: 3 };
    ['capacity', 'firstTip', 'nextTip'].forEach(function (k) { var n = Number(opts.assumptions && opts.assumptions[k]); if (isFinite(n) && n >= 1) { ASSUME[k] = Math.floor(n); } });

    // x = column (0 = A ... 5 = F), y = row (0 = row 1 at the audience ... 5 = row 6)
    var FIELD = {
      hiveRed: [[2, 2], [2, 3]],
      hiveBlue: [[3, 2], [3, 3]],
      lzRed: [0, 4], lzBlue: [5, 1],
      gardenRed: [0, 0], gardenBlue: [5, 5],
      flowers: [
        { name: 'red wall, between A2 and A3', tiles: [[0, 1], [0, 2]], wall: 'W', red: true },
        { name: 'back wall, between B6 and C6', tiles: [[1, 5], [2, 5]], wall: 'N', red: true },
        { name: 'blue wall, between F4 and F5', tiles: [[5, 3], [5, 4]], wall: 'E', red: false },
        { name: 'audience wall, between D1 and E1', tiles: [[3, 0], [4, 0]], wall: 'S', red: false }
      ]
    };
    var DIRS = ['N', 'E', 'S', 'W'], DX = [0, 1, 0, -1], DY = [1, 0, -1, 0];
    var DIRWORD = { N: 'N (away from the audience)', E: 'E (toward the HIVE)', S: 'S (toward the audience)', W: 'W (toward the red wall)' };
    var LABELS = { forward: 'Move forward', backward: 'Move backward', rotateLeft: 'Rotate left', rotateRight: 'Rotate right', intake: 'Intake POLLEN', launch: 'Launch POLLEN' };
    var UNITS = { forward: 'tiles', backward: 'tiles', rotateLeft: 'degrees', rotateRight: 'degrees', intake: 'POLLEN', launch: 'POLLEN' };
    var KEY = opts.storageKey || 'biobuzz-planner-v1';
    if (opts.flowers) { FIELD.flowers = flowersFrom(opts.flowers); }

    function tn(x, y) { return COLS.charAt(x) + (y + 1); }
    function same(a, x, y) { return a[0] === x && a[1] === y; }
    function isHive(x, y) { return FIELD.hiveRed.concat(FIELD.hiveBlue).some(function (t) { return same(t, x, y); }); }
    function isRedHive(x, y) { return FIELD.hiveRed.some(function (t) { return same(t, x, y); }); }
    function flowerAt(x, y) { for (var i = 0; i < FIELD.flowers.length; i++) { if (FIELD.flowers[i].tiles.some(function (t) { return same(t, x, y); })) { return i; } } return -1; }
    function validStarts() {
      var out = [], x, y;
      for (x = 0; x <= 2; x++) {
        for (y = 0; y <= 5; y++) {
          if (!(x === 0 || y === 0 || y === 5)) { continue; }
          if (isHive(x, y) || same(FIELD.lzRed, x, y) || same(FIELD.gardenRed, x, y) || flowerAt(x, y) >= 0) { continue; }
          out.push(tn(x, y));
        }
      }
      return out;
    }
    function parseTile(s) { return [COLS.indexOf(s.charAt(0)), parseInt(s.slice(1), 10) - 1]; }

    // ---------------------------------------------------------------- state
    var st = {
      tab: 'predict',
      start: { tile: 'A4', dir: 'E' },
      robot: robotDefaults(opts.robot),
      prog: [],
      pred: { points: '', time: '', approach: '', locked: null }
    };
    var run = null, idx = 0, timer = null, speed = 700, runErr = { rows: {}, list: [] };
    var app = root;
    var P = 'bbp' + (++instances) + '-';
    app.classList.add('bbp');
    if (opts.theme === 'light' || opts.theme === 'dark') { app.setAttribute('data-theme', opts.theme); }
    function $(id) { return document.getElementById(P + id); }
    function key(t) { return t.id && t.id.indexOf(P) === 0 ? t.id.slice(P.length) : ''; }
    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function save() { try { localStorage.setItem(KEY, JSON.stringify({ start: st.start, robot: st.robot, prog: st.prog, pred: st.pred })); } catch (e) { /* ignore */ } }
    function load() {
      try {
        var o = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (!o) { return; }
        if (o.start && validStarts().indexOf(o.start.tile) >= 0 && DIRS.indexOf(o.start.dir) >= 0) { st.start = o.start; }
        if (o.robot) { ['tile', 'turn', 'intake', 'launch'].forEach(function (k) { var n = Number(o.robot[k]); if (isFinite(n) && n > 0) { st.robot[k] = n; } }); }
        if (Array.isArray(o.prog)) { st.prog = o.prog.map(function (e) { return e && LABELS[e.c] ? { c: e.c, v: String(e.v == null ? '' : e.v) } : { c: '', v: '' }; }); }
        if (o.pred) { st.pred = { points: o.pred.points || '', time: o.pred.time || '', approach: o.pred.approach || '', locked: o.pred.locked || null }; }
      } catch (e) { /* ignore */ }
    }
    function padProg() { while (st.prog.length < ROWS) { st.prog.push({ c: '', v: '' }); } st.prog.length = ROWS; }

    // ---------------------------------------------------------------- simulator
    function simulate() {
      var s0 = parseTile(st.start.tile);
      var R = st.robot;
      var x = s0[0], y = s0[1], dir = DIRS.indexOf(st.start.dir), t = 0;
      var held = ASSUME.preload, cell = 0, tips = 0, missed = 0, launchedIn = 0;
      var flowers = FIELD.flowers.map(function () { return ASSUME.flowerPollen; });
      var garden = ASSUME.gardenPollen;
      var frames = [], ended = 'finished', rowsRun = 0;
      function need() { return tips === 0 ? ASSUME.firstTip : ASSUME.nextTip; }
      function snap(row, label, ok, note, path) {
        frames.push({ row: row, cmd: label, ok: ok, note: note, path: path || [[x, y]], x: x, y: y, dir: DIRS[dir], held: held, t: Math.round(t * 100) / 100,
          cell: cell, need: need(), tips: tips, missed: missed, flowers: flowers.slice(), garden: garden, live: tips * PTS.tip });
      }
      function fits(dt) { return t + dt <= AUTO_SECONDS + 1e-9; }
      snap(-1, 'Start', true, 'Robot on ' + tn(x, y) + ', facing ' + DIRS[dir] + ', holding ' + held + ' pre-loaded POLLEN.');

      for (var r = 0; r < st.prog.length; r++) {
        var e = st.prog[r];
        if (!e.c) { continue; }
        if (!fits(0.0001)) { ended = 'time'; break; }
        rowsRun++;
        var n = parseInt(e.v, 10), label;
        if (UNITS[e.c] === 'degrees') { label = LABELS[e.c] + ' ' + n + '°'; }
        else if (UNITS[e.c] === 'tiles') { label = LABELS[e.c] + ' ' + n + (n === 1 ? ' tile' : ' tiles'); }
        else { label = (e.c === 'intake' ? 'Intake ' : 'Launch ') + n + ' POLLEN'; }
        var timeOut = false, i, done = 0;

        if (e.c === 'forward' || e.c === 'backward') {
          var d = e.c === 'forward' ? dir : (dir + 2) % 4, why = '', path = [[x, y]];
          while (done < n) {
            if (!fits(R.tile)) { timeOut = true; break; }
            var nx = x + DX[d], ny = y + DY[d];
            if (nx < 0 || ny < 0 || nx > 5 || ny > 5) { why = 'the field wall'; break; }
            if (isHive(nx, ny)) { why = 'the HIVE'; break; }
            if (nx > 2) { why = 'the centre line (this version keeps the robot on the red side)'; break; }
            x = nx; y = ny; t += R.tile; done++; path.push([x, y]);
          }
          if (done === n) { snap(r, label, true, 'Drove ' + n + (n === 1 ? ' tile' : ' tiles') + ' to ' + tn(x, y) + '.', path); }
          else if (timeOut) { snap(r, label, false, 'AUTO ended after ' + done + ' of ' + n + ' tiles.', path); }
          else if (done === 0) { snap(r, label, false, 'Blocked by ' + why + '. The robot did not move.', path); }
          else { snap(r, label, false, 'Stopped after ' + done + ' of ' + n + ' tiles: ' + why + ' was in the way. Now on ' + tn(x, y) + '.', path); }
        } else if (e.c === 'rotateLeft' || e.c === 'rotateRight') {
          var q = n / 90, step = e.c === 'rotateLeft' ? 3 : 1;
          for (i = 0; i < q; i++) { if (!fits(R.turn)) { timeOut = true; break; } dir = (dir + step) % 4; t += R.turn; done++; }
          if (timeOut) { snap(r, label, false, 'AUTO ended after turning ' + done * 90 + '°. Facing ' + DIRS[dir] + '.'); }
          else { snap(r, label, true, 'Turned ' + n + '°. Now facing ' + DIRWORD[DIRS[dir]] + '.'); }
        } else if (e.c === 'intake') {
          var fi = flowerAt(x, y), onGarden = same(FIELD.gardenRed, x, y);
          if (fi < 0 && !onGarden) { snap(r, label, false, 'Nothing to intake on ' + tn(x, y) + '. POLLEN is in the red GARDEN (A1) and in the FLOWERS.'); }
          else {
            var src = onGarden ? 'the GARDEN' : 'the FLOWER on the ' + FIELD.flowers[fi].name;
            var limit = '';
            while (done < n) {
              var avail = onGarden ? garden : flowers[fi];
              if (avail <= 0) { limit = src + ' is empty'; break; }
              if (held >= ASSUME.capacity) { limit = 'the robot is full (' + ASSUME.capacity + ')'; break; }
              if (!fits(R.intake)) { timeOut = true; break; }
              if (onGarden) { garden--; } else { flowers[fi]--; }
              held++; t += R.intake; done++;
            }
            if (done === n) { snap(r, label, true, 'Took ' + n + ' POLLEN from ' + src + '. Holding ' + held + '.'); }
            else if (timeOut) { snap(r, label, false, 'AUTO ended after taking ' + done + ' of ' + n + ' POLLEN.'); }
            else { snap(r, label, false, 'Took ' + done + ' of ' + n + ' POLLEN: ' + limit + '. Holding ' + held + '.'); }
          }
        } else if (e.c === 'launch') {
          // aimed if the line straight ahead reaches a red HIVE tile
          var ax = x, ay = y, aimed = false;
          for (i = 0; i < 6; i++) { ax += DX[dir]; ay += DY[dir]; if (ax < 0 || ay < 0 || ax > 5 || ay > 5) { break; } if (isRedHive(ax, ay)) { aimed = true; break; } if (isHive(ax, ay)) { break; } }
          var empty = false, tipNote = '';
          while (done < n) {
            if (held <= 0) { empty = true; break; }
            if (!fits(R.launch)) { timeOut = true; break; }
            held--; t += R.launch; done++;
            if (aimed) {
              cell++; launchedIn++;
              if (cell >= need()) { tips++; cell = 0; tipNote += ' HIVE TIP! +' + PTS.tip + '.'; }
            } else { missed++; }
          }
          if (!aimed && done > 0) { snap(r, label, false, 'Not aimed at the red HIVE, so ' + done + ' POLLEN missed and landed on the field.'); }
          else if (!aimed) { snap(r, label, false, 'Nothing to launch: the robot is empty.'); }
          else if (done === n) { snap(r, label, true, 'Launched ' + n + ' into the red HIVE.' + tipNote); }
          else if (timeOut) { snap(r, label, false, 'AUTO ended after launching ' + done + ' of ' + n + '.' + tipNote); }
          else { snap(r, label, false, 'Launched ' + done + ' of ' + n + ': the robot ran out of POLLEN.' + tipNote); }
          if (empty && done === 0 && aimed) { frames[frames.length - 1].note = 'Nothing to launch: the robot is empty.'; }
        }
        if (timeOut) { ended = 'time'; break; }
      }

      var last = frames[frames.length - 1];
      var leave = !same(s0, last.x, last.y), park = same(FIELD.lzRed, last.x, last.y);
      var total = tips * PTS.tip + (leave ? PTS.leave : 0) + (park ? PTS.park : 0);
      var remaining = 0;
      st.prog.forEach(function (e2) { if (e2.c) { remaining++; } });
      return { frames: frames, result: { tips: tips, leave: leave, park: park, total: total, time: last.t, ended: ended, notRun: remaining - rowsRun, missed: missed, launchedIn: launchedIn } };
    }

    // ---------------------------------------------------------------- drawing
    var S = 64, M = 30;
    function px(x) { return M + x * S; }
    function py(y) { return M + (5 - y) * S; }
    function fieldSvg(f, trail) {
      var W = 6 * S + 2 * M, H = 6 * S + 2 * M + 14, out = '', x, y, i;
      out += '<svg class="fieldsvg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="BIOBUZZ field, robot on ' + tn(f.x, f.y) + ' facing ' + f.dir + '">';
      for (x = 0; x < 6; x++) {
        for (y = 0; y < 6; y++) {
          out += '<rect class="tile ' + (x <= 2 ? 'redside' : 'blueside') + '" x="' + px(x) + '" y="' + py(y) + '" width="' + S + '" height="' + S + '"><title>' + tn(x, y) + '</title></rect>';
          for (i = 1; i < 4; i++) {
            out += '<line class="sub" x1="' + (px(x) + i * S / 4) + '" y1="' + py(y) + '" x2="' + (px(x) + i * S / 4) + '" y2="' + (py(y) + S) + '"/>';
            out += '<line class="sub" x1="' + px(x) + '" y1="' + (py(y) + i * S / 4) + '" x2="' + (px(x) + S) + '" y2="' + (py(y) + i * S / 4) + '"/>';
          }
        }
      }
      for (i = 0; i <= 6; i++) {
        out += '<line class="seam" x1="' + px(i) + '" y1="' + M + '" x2="' + px(i) + '" y2="' + (M + 6 * S) + '"/>';
        out += '<line class="seam" x1="' + M + '" y1="' + (M + i * S) + '" x2="' + (M + 6 * S) + '" y2="' + (M + i * S) + '"/>';
      }
      out += '<line class="centre" x1="' + px(3) + '" y1="' + M + '" x2="' + px(3) + '" y2="' + (M + 6 * S) + '"/>';
      out += '<rect class="perim" x="' + M + '" y="' + M + '" width="' + 6 * S + '" height="' + 6 * S + '"/>';
      for (x = 0; x < 6; x++) { out += '<text class="axl" x="' + (px(x) + S / 2) + '" y="' + (M + 6 * S + 16) + '">' + COLS.charAt(x) + '</text>'; }
      for (y = 0; y < 6; y++) { out += '<text class="axl" x="' + (M - 12) + '" y="' + (py(y) + S / 2 + 4) + '">' + (y + 1) + '</text>'; }
      out += '<text class="axl" x="' + (M + 3 * S) + '" y="' + (M + 6 * S + 32) + '">AUDIENCE</text>';
      out += '<text class="axl redt" x="' + (M + 1.5 * S) + '" y="' + (M - 10) + '">RED SIDE</text><text class="axl bluet" x="' + (M + 4.5 * S) + '" y="' + (M - 10) + '">BLUE SIDE</text>';

      // loading zones: about 23 in wide x 11 in deep against the side wall
      var dz = S * 11 / 24;
      out += '<rect class="lzred" x="' + px(0) + '" y="' + py(4) + '" width="' + dz + '" height="' + S + '"><title>Red LOADING ZONE (A5): end AUTO here for PARK +5</title></rect>';
      out += '<text class="tl small" x="' + (px(0) + dz + 4) + '" y="' + (py(4) + S / 2 - 3) + '" text-anchor="start">LOADING</text><text class="tl small" x="' + (px(0) + dz + 4) + '" y="' + (py(4) + S / 2 + 9) + '" text-anchor="start">ZONE</text>';
      out += '<rect class="lzblue" x="' + (px(6) - dz) + '" y="' + py(1) + '" width="' + dz + '" height="' + S + '"><title>Blue LOADING ZONE (F2)</title></rect>';
      // gardens: tape along the audience / back wall in the corner tiles
      out += '<rect class="gred" x="' + px(0) + '" y="' + (py(0) + S - 5) + '" width="' + S + '" height="5"><title>Red GARDEN (A1)</title></rect>';
      for (i = 0; i < f.garden; i++) { out += '<circle class="pollen" cx="' + (px(0) + 10 + i * 14) + '" cy="' + (py(0) + S - 14) + '" r="5.5"/>'; }
      out += '<text class="tl small" x="' + (px(0) + S / 2) + '" y="' + (py(0) + 16) + '">GARDEN</text>';
      out += '<rect class="gblue" x="' + px(5) + '" y="' + py(5) + '" width="' + S + '" height="5"><title>Blue GARDEN (F6)</title></rect>';
      for (i = 0; i < ASSUME.gardenPollen; i++) { out += '<circle class="pollen dim" cx="' + (px(5) + 10 + i * 14) + '" cy="' + (py(5) + 14) + '" r="5.5"/>'; }

      // HIVE
      out += '<rect class="hivered" x="' + px(2) + '" y="' + py(3) + '" width="' + S + '" height="' + 2 * S + '"/>';
      out += '<rect class="hiveblue" x="' + px(3) + '" y="' + py(3) + '" width="' + S + '" height="' + 2 * S + '"/>';
      out += '<text class="tl onhive" x="' + (px(2) + S / 2) + '" y="' + (py(3) + 22) + '">RED</text><text class="tl onhive" x="' + (px(2) + S / 2) + '" y="' + (py(3) + 36) + '">HIVE</text>';
      out += '<text class="tl onhive big" x="' + (px(2) + S / 2) + '" y="' + (py(3) + 72) + '">' + f.cell + '/' + f.need + '</text>';
      out += '<text class="tl onhive small" x="' + (px(2) + S / 2) + '" y="' + (py(3) + 86) + '">to tip</text>';
      out += '<text class="tl onhive small" x="' + (px(2) + S / 2) + '" y="' + (py(3) + 112) + '">tips: ' + f.tips + '</text>';
      out += '<text class="tl onhive" x="' + (px(3) + S / 2) + '" y="' + (py(3) + 22) + '">BLUE</text><text class="tl onhive" x="' + (px(3) + S / 2) + '" y="' + (py(3) + 36) + '">HIVE</text>';

      // FLOWERS on the wall, centred on the seam between their two tiles
      FIELD.flowers.forEach(function (fl, k) {
        var a = fl.tiles[0], b = fl.tiles[1], cx, cy;
        if (fl.wall === 'W' || fl.wall === 'E') { cx = fl.wall === 'W' ? px(0) + 9 : px(6) - 9; cy = (py(a[1]) + py(b[1])) / 2 + S / 2; }
        else { cy = fl.wall === 'S' ? py(0) + S - 9 : py(5) + 9; cx = (px(a[0]) + px(b[0])) / 2 + S / 2; }
        out += '<circle class="flower' + (fl.red ? '' : ' dim') + '" cx="' + cx + '" cy="' + cy + '" r="11"><title>FLOWER (' + esc(fl.name) + ')</title></circle>';
        out += '<text class="tl flowern" x="' + cx + '" y="' + (cy + 4) + '">' + f.flowers[k] + '</text>';
      });

      // start mark, trail, robot
      var s0 = parseTile(st.start.tile);
      out += '<rect class="startmark" x="' + (px(s0[0]) + 4) + '" y="' + (py(s0[1]) + 4) + '" width="' + (S - 8) + '" height="' + (S - 8) + '"/>';
      if (trail && trail.length > 1) {
        out += '<polyline class="trail" points="' + trail.map(function (p) { return (px(p[0]) + S / 2) + ',' + (py(p[1]) + S / 2); }).join(' ') + '"/>';
      }
      var ang = { N: 0, E: 90, S: 180, W: 270 }[f.dir], rs = S * 0.36;
      out += '<g transform="translate(' + (px(f.x) + S / 2) + ',' + (py(f.y) + S / 2) + ') rotate(' + ang + ')">' +
        '<rect class="robotbody" x="' + (-rs) + '" y="' + (-rs) + '" width="' + 2 * rs + '" height="' + 2 * rs + '" rx="3"/>' +
        '<polygon class="robotnose" points="0,' + (-rs - 7) + ' 8,' + (-rs + 3) + ' -8,' + (-rs + 3) + '"/></g>';
      out += '<text class="tl onrobot" x="' + (px(f.x) + S / 2) + '" y="' + (py(f.y) + S / 2 + 5) + '">' + f.held + '</text>';
      return out + '</svg>';
    }
    function legend() {
      return '<div class="legend"><span><i class="sw sw-pollen"></i>POLLEN</span><span><i class="sw sw-flower"></i>FLOWER (number = POLLEN inside)</span>' +
        '<span><i class="sw sw-lz"></i>red LOADING ZONE</span><span><i class="sw sw-robot"></i>robot (number = POLLEN held)</span><span>Dashed square: start tile</span></div>';
    }

    // ---------------------------------------------------------------- views
    function head() {
      var stats;
      if (st.tab === 'replay' && run) {
        var f = run.frames[idx];
        stats = '<div class="tb-stat"><span class="label">Clock</span><b class="num">' + f.t.toFixed(1) + ' s</b></div>' +
          '<div class="tb-stat"><span class="label">Tips</span><b class="num">' + f.tips + '</b></div>';
      } else {
        stats = '<div class="tb-stat"><span class="label">AUTO</span><b class="num">30 s</b></div><div class="tb-stat"><span class="label">Pre-load</span><b class="num">4</b></div>';
      }
      return '<header class="titleblock"><div><h1>' + esc(opts.title || 'BIOBUZZ Auto Planner') + '</h1>' +
        '<div class="sub">Plan on engineering paper first. Then predict, enter the route, run it, and compare what happened with what you expected.</div></div>' +
        '<div class="tb-stats">' + stats + '</div></header>';
    }
    function tabs() {
      function b(id, name) { return '<button data-tab="' + id + '"' + (st.tab === id ? ' aria-current="page"' : '') + '>' + name + '</button>'; }
      return '<nav class="tabs" aria-label="Sections">' + b('predict', 'Prediction') + b('program', 'Program') + b('replay', 'Replay') + b('rules', 'Rules used') + '</nav>';
    }
    function startFrame() {
      var s0 = parseTile(st.start.tile);
      return { x: s0[0], y: s0[1], dir: st.start.dir, held: ASSUME.preload, cell: 0, need: ASSUME.firstTip, tips: 0, flowers: FIELD.flowers.map(function () { return ASSUME.flowerPollen; }), garden: ASSUME.gardenPollen };
    }

    function predictView() {
      var p = st.pred, d = p.locked ? ' disabled' : '';
      var form = '<div class="panel"><h3>Your prediction</h3>' +
        '<p class="muted">Use the plan on your engineering paper. Write down the points you expect in AUTO and how many seconds the route will take, then lock it before you run anything.</p>' +
        '<div class="fields"><label class="label" for="' + P + 'pp">Predicted AUTO points</label><input type="number" id="' + P + 'pp" min="0" step="1" inputmode="numeric" value="' + esc(p.points) + '"' + d + '>' +
        '<label class="label" for="' + P + 'pt">Predicted seconds used (out of 30)</label><input type="number" id="' + P + 'pt" min="0" max="30" step="0.1" inputmode="decimal" value="' + esc(p.time) + '"' + d + '></div>' +
        '<label class="label" for="' + P + 'approach">Your approach in a sentence or two</label><textarea id="' + P + 'approach"' + d + '>' + esc(p.approach) + '</textarea>';
      if (p.locked) {
        form += '<div class="okbox">Locked: ' + p.locked.points + ' points in ' + p.locked.time + ' s. Now enter your route on the Program tab and run it.</div>' +
          '<div class="row"><button class="btn ghost" data-unlock="1">Unlock and edit</button></div>';
      } else {
        form += '<div id="' + P + 'lockmsg"></div><div class="row"><button class="btn" data-lock="1">Lock my prediction</button></div>';
      }
      form += '</div>';
      var scoring = '<div class="panel"><h3>What scores in AUTO</h3><table class="mini"><tbody>' +
        '<tr><td>HIVE TIP (launch enough POLLEN into the red HIVE)</td><td class="num">' + PTS.tip + ' each</td></tr>' +
        '<tr><td>PARK (end AUTO in the red LOADING ZONE, A5)</td><td class="num">' + PTS.park + '</td></tr>' +
        '<tr><td>LEAVE (end AUTO off your start tile)</td><td class="num">' + PTS.leave + '</td></tr></tbody></table>' +
        '<p class="muted small">The robot starts with ' + ASSUME.preload + ' POLLEN. In this version the first tip takes ' + ASSUME.firstTip + ' POLLEN and each tip after that takes ' + ASSUME.nextTip + '. See Rules used.</p></div>';
      return '<p class="intro">Step 1 is paper. Step 2 is this tab: commit to a prediction before you see the result, so you can measure how good the plan was.</p>' +
        '<div class="cols"><div class="stack"><div class="fieldbox">' + fieldSvg(startFrame()) + legend() + '</div></div><div class="stack">' + form + scoring + '</div></div>';
    }

    function programView() {
      padProg();
      var i, rows = '', used = 0, frameByRow = {};
      if (run) { run.frames.forEach(function (fr) { if (fr.row >= 0) { frameByRow[fr.row] = fr; } }); }
      st.prog.forEach(function (e) { if (e.c) { used++; } });
      for (i = 0; i < ROWS; i++) {
        var e = st.prog[i], fr = run ? frameByRow[i] : null, cls = '';
        if (e.c && run && !fr) { cls = ' notrun'; }
        if (fr && !fr.ok) { cls = ' fail'; }
        if (runErr.rows[i]) { cls = ' fail'; }
        var opts = '<option value="">-</option>';
        Object.keys(LABELS).forEach(function (k) { opts += '<option value="' + k + '"' + (k === e.c ? ' selected' : '') + '>' + LABELS[k] + '</option>'; });
        var val = UNITS[e.c] ? '<input type="number" min="1" step="' + (UNITS[e.c] === 'degrees' ? 90 : 1) + '" inputmode="numeric" data-val="' + i + '" value="' + esc(e.v) + '" placeholder="' + UNITS[e.c] + '" aria-label="Row ' + (i + 1) + ' ' + UNITS[e.c] + '">' : '';
        rows += '<tr class="rt' + cls + '"><td class="num">' + (i + 1) + '</td><td><select data-row="' + i + '" aria-label="Command ' + (i + 1) + '">' + opts + '</select></td>' +
          '<td class="valcell">' + val + '</td>' +
          '<td class="num res">' + (fr ? tn(fr.x, fr.y) : '') + '</td><td class="num res">' + (fr ? fr.dir : '') + '</td><td class="num res">' + (fr ? fr.held : '') + '</td>' +
          '<td class="num res">' + (fr ? fr.t.toFixed(1) : (e.c && run ? 'not run' : '')) + '</td></tr>';
        if (fr && !fr.ok) { rows += '<tr class="noterow res-row"><td></td><td colspan="6" class="rtnote">↑ ' + esc(fr.note) + '</td></tr>'; }
      }
      var startOpts = validStarts().map(function (s) { return '<option' + (s === st.start.tile ? ' selected' : '') + '>' + s + '</option>'; }).join('');
      var dirOpts = DIRS.map(function (d) { return '<option value="' + d + '"' + (d === st.start.dir ? ' selected' : '') + '>' + DIRWORD[d] + '</option>'; }).join('');
      var R = st.robot;
      var setup = '<div class="panel"><h3>Starting position</h3>' +
        '<p class="muted small">The robot must start touching the wall on the red side, not in the LOADING ZONE and not touching a FLOWER. These are the tiles that qualify.</p>' +
        '<div class="row"><label class="label" for="' + P + 'stile">Tile</label><select id="' + P + 'stile">' + startOpts + '</select>' +
        '<label class="label" for="' + P + 'sdir">Facing</label><select id="' + P + 'sdir">' + dirOpts + '</select></div></div>' +
        '<div class="panel"><h3>Your robot’s speed</h3><p class="muted small">Time your real robot and put the numbers here. Every plan is only as good as these.</p>' +
        '<div class="speedgrid">' +
        '<label for="' + P + 'r-tile">Seconds to drive 1 tile</label><input type="number" id="' + P + 'r-tile" min="0.1" step="0.1" value="' + R.tile + '">' +
        '<label for="' + P + 'r-turn">Seconds to turn 90°</label><input type="number" id="' + P + 'r-turn" min="0.1" step="0.1" value="' + R.turn + '">' +
        '<label for="' + P + 'r-intake">Seconds to intake 1 POLLEN</label><input type="number" id="' + P + 'r-intake" min="0.1" step="0.1" value="' + R.intake + '">' +
        '<label for="' + P + 'r-launch">Seconds to launch 1 POLLEN</label><input type="number" id="' + P + 'r-launch" min="0.1" step="0.1" value="' + R.launch + '"></div></div>';
      var cmdHelp = '<div class="panel"><h3>The commands</h3><ul class="cmdlist">' +
        '<li><b>Move forward / backward</b>: tiles. Backward goes the opposite way without turning. Walls, the HIVE and the centre line stop the robot.</li>' +
        '<li><b>Rotate left / right</b>: degrees, in 90s (90, 180, 270, 360).</li>' +
        '<li><b>Intake POLLEN</b>: how many to pick up. Works on the red GARDEN tile (A1) or a tile next to a FLOWER. The robot holds ' + ASSUME.capacity + ' at most.</li>' +
        '<li><b>Launch POLLEN</b>: how many to shoot. Only POLLEN launched while the robot faces straight at the red HIVE goes in. Anything else misses.</li></ul></div>';
      var res = '';
      if (run) {
        var r = run.result;
        res = '<div class="muted" id="' + P + 'lastrun">Last run: <b>' + r.total + ' points</b> in ' + r.time.toFixed(1) + ' s' + (r.notRun > 0 ? ', ' + r.notRun + ' row' + (r.notRun === 1 ? '' : 's') + ' never ran (out of time)' : '') + '. Rows in red did not go as written.</div>';
      }
      var errHtml = runErr.list.length ? '<div class="warn" role="alert">Fix these rows before running:<br>' + runErr.list.map(esc).join('<br>') + '</div>' : '';
      return '<p class="intro">This is your Route Sheet, on screen. Copy your paper route here one row at a time. Row 1 runs first. When you press Run, the Tile, Facing, Held and Clock columns fill in so you can check them against your paper.</p>' +
        '<div class="cols"><div class="stack"><div class="fieldbox">' + fieldSvg(startFrame()) + legend() + '</div>' + setup + cmdHelp + '</div>' +
        '<div class="stack"><div class="panel"><div class="row"><b class="num">' + used + ' / ' + ROWS + '</b> rows used' +
        '<button class="btn" data-run="1"' + (used ? '' : ' disabled') + '>Run AUTO</button><button class="btn ghost" data-clear="1">Clear the sheet</button></div>' + errHtml + res + '</div>' +
        '<div class="panel tablewrap"><table class="routesheet"><thead><tr><th>#</th><th>Command</th><th>Value</th><th>Tile</th><th>Facing</th><th>Held</th><th>Clock</th></tr></thead><tbody>' + rows + '</tbody></table></div></div></div>';
    }

    function replayView() {
      if (!run) {
        return '<div class="panel"><h3>No run yet</h3><p>Fill in the Program tab and press Run AUTO. The replay shows up here.</p></div>';
      }
      var n = run.frames.length - 1;
      return '<div class="cols"><div class="stack"><div class="fieldbox"><div id="' + P + 'fieldwrap"></div>' + legend() + '</div>' +
        '<div class="controls"><button class="btn ghost" data-act="restart">Restart</button><button class="btn ghost" data-act="back">Back</button>' +
        '<button class="btn" id="' + P + 'playbtn" data-act="play">Play</button><button class="btn ghost" data-act="step">Step</button>' +
        '<label class="label" for="' + P + 'speed">Speed</label><select id="' + P + 'speed"><option value="1100">Slow</option><option value="700">Normal</option><option value="300">Fast</option></select>' +
        '<input class="scrub" id="' + P + 'scrub" type="range" min="0" max="' + n + '" value="' + idx + '" aria-label="Step"></div></div>' +
        '<div class="stack"><div class="panel"><div class="stepinfo" id="' + P + 'stepinfo" aria-live="polite"></div><div id="' + P + 'breakdown"></div></div>' +
        '<div class="panel"><h3>Command log</h3><div class="log" id="' + P + 'log"></div></div><div id="' + P + 'compare"></div></div></div>';
    }
    function trailTo(k) {
      var pts = [], i;
      for (i = 0; i <= k; i++) { run.frames[i].path.forEach(function (p) { var l = pts[pts.length - 1]; if (!l || l[0] !== p[0] || l[1] !== p[1]) { pts.push(p); } }); }
      return pts;
    }
    function updateReplay() {
      var f = run.frames[idx];
      $('fieldwrap').innerHTML = fieldSvg(f, trailTo(idx));
      $('stepinfo').innerHTML = '<div class="label">' + (f.row < 0 ? 'Start' : 'Row ' + (f.row + 1)) + ' · clock ' + f.t.toFixed(1) + ' s of 30</div>' +
        '<div><span class="cmd' + (f.ok ? '' : ' bad') + '">' + esc(f.cmd) + '</span>' + (f.ok ? '' : ' <span class="pill badpill">not as written</span>') + '</div>' +
        '<div class="' + (f.ok ? '' : 'bad') + '">' + esc(f.note) + '</div>';
      var s0 = parseTile(st.start.tile);
      var leaveNow = !same(s0, f.x, f.y), parkNow = same(FIELD.lzRed, f.x, f.y);
      $('breakdown').innerHTML = '<div class="label" style="margin-top:6px">If AUTO ended right now</div><div class="totals"><div><span class="label">Tips</span><b class="num">' + f.tips + ' × ' + PTS.tip + '</b></div>' +
        '<div><span class="label">Leave</span><b class="num">' + (leaveNow ? '+' + PTS.leave : 'no') + '</b></div>' +
        '<div><span class="label">Park</span><b class="num">' + (parkNow ? '+' + PTS.park : 'no') + '</b></div>' +
        '<div><span class="label">Missed</span><b class="num">' + f.missed + '</b></div></div>';
      var log = '';
      run.frames.forEach(function (fr, k) {
        log += '<button class="logrow' + (k === idx ? ' cur' : '') + (fr.ok ? '' : ' fail') + '" data-i="' + k + '"><span class="n">' + (fr.row < 0 ? '-' : fr.row + 1) + '</span><span class="c">' + esc(fr.cmd) + '</span><span>' + fr.t.toFixed(1) + ' s · ' + esc(fr.note) + '</span></button>';
      });
      var lg = $('log');
      lg.innerHTML = log;
      var cur = lg.querySelector('.cur');
      if (cur) { lg.scrollTop = Math.max(0, cur.offsetTop - lg.clientHeight / 2); }
      $('scrub').value = idx;
      $('playbtn').textContent = timer ? 'Pause' : 'Play';
      var hs = app.querySelectorAll('.tb-stat b');
      if (hs.length === 2) { hs[0].textContent = f.t.toFixed(1) + ' s'; hs[1].textContent = f.tips; }
      $('compare').innerHTML = idx === run.frames.length - 1 ? resultHtml() : '';
    }
    function resultHtml() {
      var r = run.result, out = '<div class="panel"><h3>End of AUTO</h3>';
      out += '<p>' + (r.ended === 'time' ? 'The 30 seconds ran out before the route finished' + (r.notRun > 0 ? ' (' + r.notRun + ' row' + (r.notRun === 1 ? '' : 's') + ' never ran)' : '') + '.' : 'The route finished at ' + r.time.toFixed(1) + ' s, with ' + (AUTO_SECONDS - r.time).toFixed(1) + ' s to spare.') + '</p>';
      out += '<table class="mini"><tbody><tr><td>HIVE TIPS</td><td class="num">' + r.tips + ' × ' + PTS.tip + ' = ' + r.tips * PTS.tip + '</td></tr>' +
        '<tr><td>LEAVE</td><td class="num">' + (r.leave ? PTS.leave : 0) + '</td></tr><tr><td>PARK</td><td class="num">' + (r.park ? PTS.park : 0) + '</td></tr>' +
        '<tr><td><b>Total</b></td><td class="num"><b>' + r.total + '</b></td></tr></tbody></table>';
      if (r.missed) { out += '<div class="note">' + r.missed + ' POLLEN missed the HIVE.</div>'; }
      var pl = st.pred.locked;
      if (pl) {
        var dp = r.total - pl.points, dt = Math.round((r.time - pl.time) * 10) / 10;
        out += '<table class="compare"><thead><tr><th></th><th>Predicted</th><th>Actual</th><th>Difference</th></tr></thead><tbody>' +
          '<tr><td>Points</td><td class="num">' + pl.points + '</td><td class="num">' + r.total + '</td><td class="num diff ' + (dp >= 0 ? 'up' : 'down') + '">' + (dp > 0 ? '+' : '') + dp + '</td></tr>' +
          '<tr><td>Seconds</td><td class="num">' + pl.time + '</td><td class="num">' + r.time.toFixed(1) + '</td><td class="num diff ' + (dt <= 0 ? 'up' : 'down') + '">' + (dt > 0 ? '+' : '') + dt + '</td></tr></tbody></table>' +
          '<h3>Think it through</h3><ol class="prompts"><li>Where did the run differ most from your paper plan, and why?</li><li>Which step took more time than you expected?</li><li>Back on paper: what would you change in the plan itself, not just the numbers?</li></ol>';
      } else {
        out += '<div class="note">No prediction was locked for this run. Next time, lock one on the Prediction tab first.</div>';
      }
      return out + '</div>';
    }

    function rulesView() {
      var src = function (u, t) { return '<a href="' + u + '" target="_blank" rel="noopener">' + t + '</a>'; };
      return '<div class="cols"><div class="stack"><div class="panel"><h3>From the Competition Manual</h3><ul class="cmdlist">' +
        '<li>AUTO lasts 30 seconds with no driver input.</li>' +
        '<li>Field: 6 × 6 tiles of 24 in. Columns A–F left to right from the audience, rows 1–6 from the audience back. Red is on the left (columns A–C).</li>' +
        '<li>HIVE in the centre four tiles. Red LOADING ZONE on A5, blue on F2. Red GARDEN on A1, blue on F6, each with 4 POLLEN. Four FLOWERS on the walls, each with 4 POLLEN.</li>' +
        '<li>Start (G304): on your own side, touching the wall, not in the LOADING ZONE, not touching a FLOWER, with exactly 4 pre-loaded POLLEN.</li>' +
        '<li>AUTO points: LEAVE 3, PARK 5 (partly in your LOADING ZONE), HIVE TIP 20. A TIP only counts when caused by launching into the upward CELL.</li></ul>' +
        '<p class="muted small">Sources: ' + src('https://ftc-resources.firstinspires.org/ftc/game/manual', 'Competition Manual') + ', ' + src('https://ftc-resources.firstinspires.org/ftc/field/eventfieldguide', 'Event Field Setup Guide') + '.</p></div></div>' +
        '<div class="stack"><div class="panel"><h3>Simplified or assumed here</h3><ul class="cmdlist">' +
        '<li><b>FLOWER positions are approximate.</b> The manual shows them only in a figure. Check them against Figure 9-2 or your real field.</li>' +
        '<li><b>Tip counts are estimates.</b> The HIVE tips by weight. A community test found about 0.44 lb tips it, so with the 3 NECTAR already in the cell the first tip is about ' + ASSUME.firstTip + ' POLLEN and later tips about ' + ASSUME.nextTip + '.</li>' +
        '<li>The robot moves whole tiles and turns in 90° steps. Real robots don’t.</li>' +
        '<li>Every aimed launch goes in. Every unaimed one misses. Real launches can miss.</li>' +
        '<li>Aimed means facing straight down a row or column into a red HIVE tile (C3 or C4).</li>' +
        '<li>LEAVE counts if the robot ends off its start tile. PARK counts if it ends on A5.</li>' +
        '<li>One red robot only: no partner, no opponents, and the robot stays on the red side.</li>' +
        '<li>The robot holds ' + ASSUME.capacity + ' POLLEN at most.</li></ul></div></div></div>';
    }

    // ---------------------------------------------------------------- playback
    function stop() { if (timer) { clearTimeout(timer); timer = null; } }
    function tick() {
      if (idx >= run.frames.length - 1) { stop(); updateReplay(); return; }
      idx++;
      if (idx >= run.frames.length - 1) { stop(); updateReplay(); return; }
      updateReplay();
      timer = setTimeout(tick, speed);
    }
    function play() {
      if (timer) { stop(); updateReplay(); return; }
      if (idx >= run.frames.length - 1) { idx = 0; }
      timer = setTimeout(tick, 0);
      updateReplay();
    }

    function render() {
      var v = st.tab === 'predict' ? predictView() : st.tab === 'program' ? programView() : st.tab === 'replay' ? replayView() : rulesView();
      app.innerHTML = '<div class="wrap">' + head() + tabs() + v + '</div>';
      if (st.tab === 'replay' && run) { $('speed').value = String(speed); updateReplay(); }
    }
    function invalidate() {
      run = null; idx = 0;
      var cells = app.querySelectorAll('td.res'), q;
      for (q = 0; q < cells.length; q++) { cells[q].textContent = ''; }
      var lr = $('lastrun'); if (lr) { lr.textContent = 'Edited since the last run. Press Run AUTO to update.'; }
      var notes = app.querySelectorAll('tr.res-row'); for (q = 0; q < notes.length; q++) { notes[q].parentNode.removeChild(notes[q]); }
      var nr = app.querySelectorAll('tr.notrun, tr.fail');
      for (q = 0; q < nr.length; q++) { nr[q].classList.remove('notrun'); nr[q].classList.remove('fail'); }
    }

    // ---------------------------------------------------------------- events
    app.addEventListener('click', function (e) {
      var t = e.target.closest('[data-tab],[data-act],[data-i],[data-lock],[data-unlock],[data-run],[data-clear]');
      if (!t || !app.contains(t)) { return; }
      if (t.dataset.tab) { stop(); st.tab = t.dataset.tab; render(); return; }
      if (t.dataset.act) {
        var a = t.dataset.act;
        if (a === 'play') { play(); return; }
        stop();
        if (a === 'restart') { idx = 0; } else if (a === 'back') { idx = Math.max(0, idx - 1); } else if (a === 'step') { idx = Math.min(run.frames.length - 1, idx + 1); }
        updateReplay(); return;
      }
      if (t.dataset.i !== undefined) { stop(); idx = +t.dataset.i; updateReplay(); return; }
      if (t.dataset.lock) {
        var p = parseFloat(st.pred.points), tm = parseFloat(st.pred.time);
        if (isNaN(p) || isNaN(tm) || p < 0 || tm < 0 || tm > 30) { $('lockmsg').innerHTML = '<div class="warn">Fill in points and seconds (0 to 30) before locking.</div>'; return; }
        st.pred.locked = { points: p, time: tm, approach: st.pred.approach };
        save(); render(); return;
      }
      if (t.dataset.unlock) { st.pred.locked = null; save(); render(); return; }
      if (t.dataset.clear) { st.prog = []; run = null; runErr = { rows: {}, list: [] }; save(); render(); return; }
      if (t.dataset.run) {
        var errs = { rows: {}, list: [] }, any = false;
        st.prog.forEach(function (e2, ix) {
          if (!e2.c) { return; }
          any = true;
          var n = Number(e2.v);
          if (e2.v === '' || !isFinite(n) || n < 1 || Math.floor(n) !== n) { errs.rows[ix] = 1; errs.list.push('Row ' + (ix + 1) + ': enter a whole number of ' + UNITS[e2.c] + '.'); return; }
          if (UNITS[e2.c] === 'degrees' && (n % 90 !== 0 || n > 360)) { errs.rows[ix] = 1; errs.list.push('Row ' + (ix + 1) + ': turns go in 90° steps (90, 180, 270 or 360).'); }
        });
        runErr = errs;
        if (errs.list.length || !any) { run = null; render(); return; }
        stop(); run = simulate(); idx = 0; st.tab = 'replay'; render(); return;
      }
    });
    app.addEventListener('change', function (e) {
      var t = e.target;
      if (key(t) === 'speed') { speed = +t.value; return; }
      if (key(t) === 'stile' || key(t) === 'sdir') {
        if (key(t) === 'stile') { st.start.tile = t.value; } else { st.start.dir = t.value; }
        save(); run = null; render(); var el = document.getElementById(t.id); if (el) { el.focus(); } return;
      }
      if (t.dataset && t.dataset.row !== undefined) {
        var ri = +t.dataset.row;
        st.prog[ri] = { c: t.value, v: '' };
        run = null; runErr = { rows: {}, list: [] }; save(); render();
        var tgt = app.querySelector('input[data-val="' + ri + '"]') || app.querySelector('select[data-row="' + Math.min(ROWS - 1, ri + 1) + '"]');
        if (tgt) { tgt.focus(); }
      }
    });
    app.addEventListener('input', function (e) {
      var t = e.target;
      if (key(t) === 'pp') { st.pred.points = t.value; save(); }
      else if (key(t) === 'pt') { st.pred.time = t.value; save(); }
      else if (key(t) === 'approach') { st.pred.approach = t.value; save(); }
      else if (key(t) === 'scrub') { stop(); idx = +t.value; updateReplay(); }
      else if (/^r-/.test(key(t))) {
        var n = Number(t.value), k = key(t).slice(2);
        if (isFinite(n) && n > 0) { st.robot[k] = n; save(); invalidate(); }
      }
      else if (t.dataset && t.dataset.val !== undefined) { st.prog[+t.dataset.val].v = t.value; save(); invalidate(); }
    });
    function onKey(e) {
      if (st.tab !== 'replay' || !run) { return; }
      var ae = document.activeElement;
      if (ae && ae !== document.body && !app.contains(ae)) { return; }
      var tg = e.target && e.target.tagName;
      if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') { return; }
      if (e.key === 'ArrowRight') { stop(); idx = Math.min(run.frames.length - 1, idx + 1); updateReplay(); }
      else if (e.key === 'ArrowLeft') { stop(); idx = Math.max(0, idx - 1); updateReplay(); }
    }
    document.addEventListener('keydown', onKey);

    load();
    padProg();
    render();
    return {
      destroy: function () { stop(); document.removeEventListener('keydown', onKey); app.innerHTML = ''; app.classList.remove('bbp'); app.removeAttribute('data-theme'); },
      reset: function () { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } st.prog = []; st.pred = { points: '', time: '', approach: '', locked: null }; run = null; padProg(); render(); }
    };
  }

  function mount(target, opts) {
    var el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) { throw new Error('BiobuzzPlanner.mount: no element matches ' + target); }
    return create(el, opts || {});
  }

  global.BiobuzzPlanner = { mount: mount, version: '1.0.0' };
})(typeof window !== 'undefined' ? window : this);
