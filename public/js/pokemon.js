'use strict';
// ---------------- Pokémon theme ----------------
// Every repository room becomes a climate zone of one Pokémon type and every session a Pokémon of
// that type (sprites from PokéAPI, cached and served by our server). Sessions evolve as they are used
// (measured: the session's turn count). Claude itself floats around the office as a Haunter.
// The office itself is drawn by bioma.js (the "Bioma Coworking" design); this file is the Pokémon skin.
// Turn on with ?theme=pokemon (remembered) or the P key; ?theme=office turns it off.
// Loaded right after art.js/i18n.js so the Art.look wrapper is in place before palette.js reads it.
const Poke = (() => {
  if (qs.get('theme')) store.set('theme', qs.get('theme') === 'pokemon' ? 'pokemon' : 'office');
  let on = store.get('theme', 'office') === 'pokemon';
  const HAUNTER = 93;
  const EVOLVE_AT = [20, 60]; // turns in the session to reach stage 2 and stage 3
  // the zone of each room comes from the Bioma scene (bioma.js); it is only asked at draw time
  const biomeOf = R => Bioma.biomeOf(R);
  // ?skin=original draws the design system's own creatures instead of Pokémon sprites
  if (qs.get('skin')) store.set('skin', qs.get('skin') === 'original' ? 'original' : 'pokemon');
  const sprites = () => store.get('skin', 'pokemon') === 'pokemon';

  // ---- data from our server (type lists, evolution lines), fetched once per page ----
  const lists = {}, lines = {};
  // a failed request (PokéAPI offline, no network) is asked again after RETRY_MS instead of never
  const RETRY_MS = 30000;
  const load = (bag, key, url) => {
    const v = bag[key];
    if (v === undefined || (v && v.failedAt && Date.now() - v.failedAt > RETRY_MS)) {
      bag[key] = 'loading';
      fetch(url).then(r => r.ok ? r.json() : Promise.reject()).then(x => { bag[key] = x; }, () => { bag[key] = { failedAt: Date.now() }; });
    }
    return bag[key];
  };
  const getJSON = (bag, key, url) => { const v = load(bag, key, url); return Array.isArray(v) && v.length ? v : null; };
  const typeList = t => getJSON(lists, t, '/api/pokemon/type/' + t);
  const lineOf = id => getJSON(lines, id, '/api/pokemon/line/' + id);

  // ---- sprites: cropped to their pixels and shrunk by a whole factor so they stay crisp ----
  const imgs = new Map();
  function spr(kind, id, maxH) {
    const key = kind + id + '/' + maxH, old = imgs.get(key);
    if (old && old.failed && Date.now() - old.at > RETRY_MS) imgs.delete(key);
    if (!imgs.has(key)) {
      const e = { c: null, failed: false, at: Date.now() }, im = new Image();
      im.onload = () => {
        const s = document.createElement('canvas'); s.width = im.width; s.height = im.height;
        const g = s.getContext('2d'); g.drawImage(im, 0, 0);
        const px = g.getImageData(0, 0, s.width, s.height).data;
        let x0 = s.width, y0 = s.height, x1 = -1, y1 = -1;
        for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) if (px[(y * s.width + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        if (x1 < 0) { e.failed = true; return; }
        const w = x1 - x0 + 1, h = y1 - y0 + 1, k = Math.max(1, Math.ceil(h / maxH));
        const c = document.createElement('canvas'); c.width = Math.ceil(w / k); c.height = Math.ceil(h / k);
        const cg = c.getContext('2d'); cg.imageSmoothingEnabled = false; cg.drawImage(s, x0, y0, w, h, 0, 0, w / k, h / k);
        // white silhouette for the evolution flash
        const wc = document.createElement('canvas'); wc.width = c.width; wc.height = c.height;
        const wg = wc.getContext('2d'); wg.drawImage(c, 0, 0); wg.globalCompositeOperation = 'source-in'; wg.fillStyle = '#ffffff'; wg.fillRect(0, 0, wc.width, wc.height);
        e.c = c; e.white = wc;
      };
      im.onerror = () => { e.failed = true; e.at = Date.now(); };
      im.src = `/api/pokemon/sprite/${kind}/${id}.png`;
      imgs.set(key, e);
    }
    return imgs.get(key);
  }
  const icon = id => spr('icon', id, 30);
  const back = id => { const b = spr('back', id, 28); return b.failed ? icon(id) : b; };

  // ---- who is which Pokémon: deterministic per session, no repeats inside a room ----
  let memo = '', who = new Map(); // session id -> { base, type, turns }
  function assign() {
    const loaded = Object.values(lists).filter(Array.isArray).length + Object.values(lines).filter(Array.isArray).length;
    const key = loaded + '|' + rooms.map(R => R.name + ':' + R.people.map(p => p.id + '/' + (p.turns || 0)).join(',')).join('|');
    if (key === memo) return;
    memo = key; who = new Map();
    for (const R of rooms) {
      const B = biomeOf(R), main = typeList(B.type), alt = typeList(B.alt);
      if (!main) continue;
      const pool = [...main, ...(alt || []).filter(id => !main.includes(id))];
      const used = new Set();
      for (const p of [...R.people].sort((a, b) => (a.id < b.id ? -1 : 1))) {
        let i = Art.hash(p.id) % pool.length, base = null;
        for (let n = 0; n < pool.length; n++, i = (i + 1) % pool.length) {
          const l = lineOf(pool[i]), b = l ? l[0] : pool[i];
          if (!used.has(b)) { base = pool[i]; used.add(b); break; }
        }
        who.set(p.id, { base: base || pool[i], type: B.type, turns: p.turns || 0 });
      }
    }
  }
  // stage from use: the line's base form, evolving at EVOLVE_AT turns
  function monOf(id) {
    let m = who.get(id);
    if (!m) { // a subagent in the meeting room: same zone as its lead (its id ends with the lead's)
      for (const [lead, v] of who) if (id.length > lead.length && id.endsWith(lead)) { const l = typeList(v.type); if (l) m = { base: l[Art.hash(id) % l.length], type: v.type, turns: 0 }; break; }
      if (!m) { const l = typeList('normal'); if (!l) return null; m = { base: l[Art.hash(id) % l.length], type: 'normal', turns: 0 }; }
    }
    const l = lineOf(m.base);
    if (!l) return m.base;
    const stage = m.turns >= EVOLVE_AT[1] ? 2 : m.turns >= EVOLVE_AT[0] ? 1 : 0;
    return l[Math.min(stage, l.length - 1)];
  }
  function stageOf(id) { const m = who.get(id), l = m && lineOf(m.base); if (!l) return null; const s = m.turns >= EVOLVE_AT[1] ? 2 : m.turns >= EVOLVE_AT[0] ? 1 : 0; return { stage: Math.min(s, l.length - 1) + 1, of: l.length, next: s < l.length - 1 ? EVOLVE_AT[s] : null }; }

  // ---- the panel's Pokémon card: level from use, the 4 latest moves it knows at that level ----
  const infos = {}, moveData = {};
  const getObj = (bag, key, url) => { const v = load(bag, key, url); return v && typeof v === 'object' && !v.failedAt ? v : null; };
  const levelOf = turns => Math.min(100, 5 + (turns || 0)); // 1 turn of conversation = 1 level, from level 5
  function cardOf(p) {
    if (!on || !sprites()) return null;
    assign();
    const mon = monOf(p.id);
    if (!mon) return null;
    const level = levelOf(p.turns), info = getObj(infos, mon, '/api/pokemon/info/' + mon);
    if (!info) return { mon, level, loading: true };
    const known = [];
    for (const m of info.moves) if (m.level <= level && !known.some(k => k.name === m.name)) known.push(m);
    const moves = known.slice(-4).reverse().map(m => ({ level: m.level, ...(getObj(moveData, m.name, '/api/pokemon/move/' + m.name) || { name: m.name, label: m.name.replace(/-/g, ' ') }) }));
    return { mon, level, info, moves, stage: stageOf(p.id) };
  }

  // ---- evolution flash: the sprite glows white for a moment when the stage goes up ----
  const shownMon = new Map(), evolvedAt = new Map();
  function noteEvolution(id, mon) {
    const was = shownMon.get(id);
    if (was && was !== mon) { evolvedAt.set(id, Date.now()); if (typeof toast === 'function') toast(`<b>${lang === 'pt' ? 'Evoluiu!' : 'Evolved!'}</b>${esc((data && data.people.find(p => p.id === id) || {}).name || '')}`, 'ok'); }
    shownMon.set(id, mon);
  }

  // ---- drawing ----
  const ctx2 = () => Art.getCtx();
  function blitMon(e, cx, bottom, opts = {}) {
    const g = ctx2(), w = e.c.width, h = e.c.height;
    const x = Math.round(cx - w / 2), y = Math.round(bottom - h * (opts.squash || 1));
    if (opts.shadow !== false) { g.fillStyle = '#00000030'; g.fillRect(Math.round(cx - w / 3), bottom - 1, Math.round(w * 2 / 3), 2); }
    g.save();
    if (opts.alpha) g.globalAlpha = opts.alpha;
    if (opts.flip) { g.translate(x * 2 + w, 0); g.scale(-1, 1); }
    g.drawImage(e.c, x, y, w, Math.round(h * (opts.squash || 1)));
    if (opts.flash && e.white) { g.globalAlpha = opts.flash; g.drawImage(e.white, x, y, w, Math.round(h * (opts.squash || 1))); }
    g.restore();
  }
  let satDown = false; // the chair back drawn right after a seated Pokémon would hide it
  function draw(lk, kind, pose, t, cx, bottom, opts = {}) {
    satDown = false;
    if (!on || !sprites() || !lk || !lk._id) return false;
    assign();
    const mon = monOf(lk._id);
    if (!mon) return false;
    const e = kind === 'back' ? back(mon) : icon(mon);
    if (!e.c) return false;
    noteEvolution(lk._id, mon);
    const since = Date.now() - (evolvedAt.get(lk._id) || 0);
    satDown = pose === 'seated' || pose === 'sleep';
    blitMon(e, cx, bottom, { ...opts, flash: since < 1500 ? (1 - since / 1500) * (((t / 80) | 0) % 2 ? 1 : .4) : 0 });
    return true;
  }

  // the people sprites become Pokémon; anyone without a session id (janitor, pizza guy) stays human
  const orig = { portrait: Art.portrait, chairBack: Art.drawChairBack, look: Art.look, seated: Art.drawSeatedBack, front: Art.drawFront, standing: Art.drawStanding, sleeping: Art.drawSleeping, lying: Art.drawLying };
  Art.look = id => ({ ...orig.look(id), _id: id });
  Art.drawSeatedBack = (x, y, lk, t, opts) => {
    const bob = opts && opts.typing ? ((t / 140) | 0) % 2 : ((t / 900) | 0) % 2;
    if (!draw(lk, 'back', 'seated', t, x + 8, y + 22 + bob, { shadow: false })) orig.seated(x, y, lk, t, opts);
  };
  Art.drawFront = (x, y, lk, t, opts) => {
    const hop = opts && opts.wave && ((t / 220) | 0) % 4 === 0 ? -3 : 0;
    if (!draw(lk, 'icon', 'front', t, x + 8, y + 24 + hop)) orig.front(x, y, lk, t, opts);
  };
  Art.drawStanding = (x, y, lk, t, walking) => {
    const bob = walking && ((t / 160) | 0) % 2 ? -1 : 0;
    if (!draw(lk, 'icon', 'stand', t, x + 8, y + 25 + bob)) orig.standing(x, y, lk, t, walking);
  };
  Art.drawSleeping = (x, y, lk, t) => { if (!draw(lk, 'icon', 'sleep', t, x + 8, y + 22, { squash: .85, alpha: .9, shadow: false })) orig.sleeping(x, y, lk, t); };
  Art.drawChairBack = (x, y) => { if (satDown) { satDown = false; return; } orig.chairBack(x, y); };
  // faces (dock counter, side panel, talk) become the Pokémon's icon, 18px tall like the human face
  Art.portrait = (id, mood) => {
    const mon = on && sprites() && (assign(), monOf(id)), e = mon && spr('icon', mon, 18);
    if (!e || !e.c) return orig.portrait(id, mood);
    const cv = document.createElement('canvas'); cv.width = Math.max(16, e.c.width); cv.height = 18;
    cv.getContext('2d').drawImage(e.c, Math.floor((cv.width - e.c.width) / 2), 18 - e.c.height);
    cv.dataset.poke = '1';
    return cv;
  };
  Art.drawLying = (x, y, lk, t) => { if (!draw(lk, 'icon', 'nap', t, x + 10, y + 16, { squash: .8, flip: true })) orig.lying(x, y, lk, t); };

  // ---- Claude, floating around as a Haunter (in place of the office cat) ----
  function drawHaunter(x, y, mode, t, flip) {
    if (!on || !sprites()) return false;
    const e = icon(HAUNTER);
    if (!e.c) return false;
    const float = Math.round(Math.sin(t / 420) * 2) - (mode === 'sleep' ? 0 : 3);
    const g = ctx2();
    g.fillStyle = '#00000026'; g.fillRect(x - 3, y + 8, 18, 2);
    blitMon(e, x + 6, y + 8 + float - 2, { shadow: false, flip: !flip, alpha: mode === 'sleep' ? .55 : .92 });
    if (((t / 140) | 0) % 6 === 0) Art.r(x + 6 + ((t / 70) | 0) % 9 - 4, y - 14 + float, 1, 1, '#c79cf0');
    return true;
  }

  // ---- for the Bioma scene: a session's sprite bottom-centred at (cx, bottom); false while there is none ----
  function drawAt(id, kind, t, cx, bottom, opts = {}) {
    if (!on || !sprites()) return false;
    assign();
    const mon = monOf(id);
    if (!mon) return false;
    const e = opts.maxH ? spr(kind === 'back' ? 'back' : 'icon', mon, opts.maxH) : kind === 'back' ? back(mon) : icon(mon);
    if (!e.c) return false;
    noteEvolution(id, mon);
    const since = Date.now() - (evolvedAt.get(id) || 0);
    blitMon(e, cx, bottom, { ...opts, flash: since < 1500 ? (1 - since / 1500) * (((t / 80) | 0) % 2 ? 1 : .4) : 0 });
    return true;
  }
  // the type of a session's zone (a subagent's id ends with its lead's)
  function typeOfId(id) {
    for (const R of rooms) for (const p of R.people) if (id === p.id || (id.length > p.id.length && id.endsWith(p.id))) return biomeOf(R).type;
    return null;
  }
  function drawHaunterAt(cx, bottom, t) {
    const e = icon(HAUNTER);
    if (!e.c || !sprites()) return false;
    blitMon(e, cx, bottom + Math.round(Math.sin(t / 420) * 1), { shadow: false });
    return true;
  }
  function setOn(v) {
    on = v; store.set('theme', on ? 'pokemon' : 'office');
    applyBody();
    if (typeof toast === 'function') toast(`<b>${on ? 'Bioma Coworking' : 'coworking-agents'}</b>${on ? (lang === 'pt' ? 'Tema Bioma ligado (P desliga)' : 'Bioma theme on (P turns it off)') : ''}`, 'ok');
  }
  // the office's own name in the HUD: ?nome=Escritório do Adriano (remembered)
  if (qs.get('nome') !== null) store.set('biomaTitle', qs.get('nome').trim().slice(0, 28));
  const title = () => store.get('biomaTitle', '') || 'Bioma Coworking';
  const applyBody = () => { document.body.classList.toggle('poke', on); const b = document.querySelector('.brand b'); if (b) b.dataset.title = title(); };
  addEventListener('DOMContentLoaded', applyBody);
  if (document.body) applyBody();

  return { get on() { return on; }, setOn, drawHaunter, drawHaunterAt, drawAt, stageOf, typeOfId, cardOf, levelOf };
})();
