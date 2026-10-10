'use strict';
// ---------------- Bioma scene (the Pokémon theme's office) ----------------
// Follows the "Bioma Coworking" design system: a wooden wall with badges, each repository room a
// climate zone with its own floor and weather, desks with a CRT, a safari under the rooms and a
// service wing (healing centre, arena, gym, day care). Same floor plan, actors and hit boxes as the
// classic office; drawScene hands over to drawBiomaScene while the theme is on.
const Bioma = (() => {
  const OUT = '#1a1218', PAPER = '#fbf8ef', NAVY = '#1b2a4a', BORDER = '#f4f4f0';
  const R = (x, y, w, h, c) => { const k = Art.getCtx(); k.fillStyle = c; k.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const Rk = (k, x, y, w, h, c) => { k.fillStyle = c; k.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  function disc(k, cx, cy, rx, ry, c) { for (let dy = -ry; dy <= ry; dy++) { const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2))); Rk(k, cx - hw, cy + dy, hw * 2 + 1, 1, c); } }
  function diamond(k, cx, cy, r, c) { for (let dy = -r; dy <= r; dy++) { const hw = r - Math.abs(dy); Rk(k, cx - hw, cy + dy, hw * 2 + 1, 1, c); } }

  // ---- 3×5 bitmap font, upper case, accents dropped ----
  const FONT = { A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111',
    0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110', 4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110',
    ' ': '000000000000000', '.': '000000000000010', ',': '000000000010100', ':': '000010000010000', '!': '010010010000010', '?': '110001010000010', '-': '000000111000000', '/': '001001010100100', '#': '101111101111101', '+': '000010111010000', '%': '101001010100101', '(': '010100100100010', ')': '010001001001010', "'": '010010000000000', '_': '000000000000111', '>': '100010001010100', '<': '001010100010001', '=': '000111000111000', '*': '000101010101000' };
  const norm = s => String(s).replace(/…/g, '...').replace(/·/g, '-').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  const tw = (s, sc = 1) => norm(s).length * 4 * sc - sc;
  function text(k, s, x, y, c, sc = 1) {
    s = norm(s); k.fillStyle = c; x = Math.round(x); y = Math.round(y);
    for (let i = 0; i < s.length; i++) { const gl = FONT[s[i]] || FONT['?']; for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (gl[r * 3 + q] === '1') k.fillRect(x + (i * 4 + q) * sc, y + r * sc, sc, sc); }
  }
  // the original capsule icon (egg with a zig-zag band)
  const CAPS = ['...ooo...', '..occco..', '.occlcco.', '.occccco.', 'ocwcwcwco', 'owcwcwcwo', 'occcdccco', '.occdcco.', '..odddo..', '...ooo...'];
  function capsule(k, x, y, c, d, swap) {
    for (let r = 0; r < 10; r++) for (let q = 0; q < 9; q++) { const ch = CAPS[r][q]; if (ch === '.') continue;
      Rk(k, x + q, y + r, 1, 1, ch === 'o' ? OUT : ch === 'c' ? (swap ? d : c) : ch === 'd' ? (swap ? c : d) : '#ffffff'); }
  }
  function bubble(k, x, y, w, h, bg = '#ffffff', bd = OUT) {
    Rk(k, x + 1, y, w - 2, h, bd); Rk(k, x, y + 1, w, h - 2, bd); Rk(k, x + 1, y + 1, w - 2, h - 2, bg);
    const tx = Math.round(x + w / 2); Rk(k, tx - 2, y + h - 1, 5, 2, bd); Rk(k, tx - 1, y + h - 1, 3, 1, bg); Rk(k, tx, y + h, 1, 1, bg); Rk(k, tx - 1, y + h + 1, 3, 1, bd); Rk(k, tx, y + h + 2, 1, 1, bd);
  }

  // ---- zones (tokens volcano-0…3 etc.) ----
  const TYPE_COLOR = { normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C', grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1', ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A', rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705746', steel: '#B7B7CE', fairy: '#D685AD' };
  const BIOMES = [
    { key: 'volcano', type: 'fire', alt: 'ground', pt: 'Vulcão', en: 'Volcano', p: ['#2b1a17', '#d9481c', '#f5a524', '#ffe07a'], mat: ['#5a4a46', '#7a6a64', '#3a2c2a'] },
    { key: 'lake', type: 'water', alt: 'ice', pt: 'Lago tropical', en: 'Tropical lake', p: ['#123a5c', '#2f7fc1', '#6fd0e8', '#e8f6ff'], mat: ['#d8b866', '#efd48a', '#a8843a'] },
    { key: 'forest', type: 'grass', alt: 'bug', pt: 'Floresta', en: 'Forest', p: ['#1f3b1d', '#3f7a2e', '#8cc84b', '#e9f2b0'], mat: ['#a8763f', '#c8945a', '#6a4423'] },
    { key: 'storm', type: 'electric', alt: 'steel', pt: 'Tempestade', en: 'Storm', p: ['#1c1f33', '#3a3f6b', '#f7d02c', '#fff7c2'], mat: ['#6a7088', '#8a90a8', '#3a3f58'] },
    { key: 'ice', type: 'ice', alt: 'water', pt: 'Caverna de gelo', en: 'Ice cave', p: ['#1d2c44', '#6e9cc9', '#bfe3f5', '#ffffff'], mat: ['#cfe6f2', '#f2fbff', '#8fb6d0'] },
    { key: 'desert', type: 'ground', alt: 'rock', pt: 'Cânion', en: 'Canyon', p: ['#4a2e1a', '#b9733a', '#e8b86b', '#fbe6b5'], mat: ['#c8905a', '#e0ac70', '#8a5a30'] },
    { key: 'rock', type: 'rock', alt: 'fighting', pt: 'Montanha', en: 'Mountain', p: ['#2e2a26', '#6b5f53', '#a89a86', '#e2d8c6'], mat: ['#8a7e70', '#a89a86', '#5a5046'] },
    { key: 'swamp', type: 'poison', alt: 'dark', pt: 'Pântano', en: 'Swamp', p: ['#24142e', '#5b2a6e', '#a24bc4', '#d9a6f0'], mat: ['#6a5a3a', '#8a7a52', '#4a3e26'] },
    { key: 'sky', type: 'flying', alt: 'fairy', pt: 'Céu', en: 'Sky', p: ['#4d7fbf', '#9ec6f2', '#f2f7ff', '#ffd9ec'], mat: ['#f2f7ff', '#ffffff', '#b8cce6'] },
    { key: 'haunted', type: 'ghost', alt: 'dark', pt: 'Torre assombrada', en: 'Haunted tower', p: ['#120e1f', '#33285a', '#6c5ba8', '#b7f0c8'], mat: ['#4a3a30', '#6a5444', '#2a2018'] },
    { key: 'psychic', type: 'psychic', alt: 'fairy', pt: 'Templo psíquico', en: 'Psychic temple', p: ['#2d1636', '#a2457f', '#f28fc1', '#ffe1f0'], mat: ['#ecd6e2', '#fbeef4', '#b890a8'] },
    { key: 'dragon', type: 'dragon', alt: 'fire', pt: 'Covil do dragão', en: "Dragon's lair", p: ['#14131f', '#3b2f6e', '#7b5ce0', '#f2c14e'], mat: ['#5a5070', '#7a7090', '#3a3050'] },
    { key: 'steel', type: 'steel', alt: 'electric', pt: 'Fábrica de aço', en: 'Steel works', p: ['#1e2226', '#4d5966', '#9aa7b3', '#e3e9ee'], mat: ['#7a8694', '#9aa7b3', '#4d5966'] },
  ];
  // each room its own zone while there are zones left; the same repository keeps its zone
  let biomeKey = '', biomeMap = new Map();
  function biomeOf(Rm) {
    const key = rooms.map(x => x.name).join('|');
    if (key !== biomeKey) {
      biomeKey = key; biomeMap = new Map();
      const used = new Set();
      for (const name of rooms.map(x => x.name).sort()) {
        let i = Art.hash('biome' + name) % BIOMES.length;
        for (let n = 0; n < BIOMES.length && used.has(i); n++) i = (i + 1) % BIOMES.length;
        used.add(i); biomeMap.set(name, BIOMES[i]);
      }
    }
    return biomeMap.get(Rm.name) || BIOMES[Art.hash('biome' + Rm.name) % BIOMES.length];
  }

  // ---- states, tools (tokens state-*, acc-*) ----
  const STATE = {
    working: { pt: 'Trabalhando', en: 'Working', ink: '#1f7a44', hud: '#5fd38a' },
    thinking: { pt: 'Pensando', en: 'Thinking', ink: '#22679a', hud: '#7fc8ff' },
    needs: { pt: 'Precisa de você', en: 'Needs you', ink: '#b8281f', hud: '#ff6b5e' },
    turn: { pt: 'Sua vez', en: 'Your turn', ink: '#8a6200', hud: '#ffd24a' },
    delegate: { pt: 'Delegando', en: 'Delegating', ink: '#6a3fb0', hud: '#c4a2ff' },
    asleep: { pt: 'Dormindo', en: 'Asleep', ink: '#4a5590', hud: '#a8b4f0' },
  };
  const stateOf = p => p.state === 'needs_you' || p.state === 'waiting' ? 'needs' : p.state === 'idle' ? 'turn' : p.state === 'asleep' ? 'asleep' : p.state === 'thinking' ? 'thinking' : p.state === 'delegate' || (p.subagents && p.subagents.length) ? 'delegate' : 'working';
  const TOOL = { claude: ['#d97757', '#a8532e'], codex: ['#3f9a4a', '#2b6e34'], gemini: ['#3d7be0', '#2a5bb0'] };
  const toolOf = p => TOOL[p.agent] ? p.agent : 'other';
  const toolInk = p => (TOOL[p.agent] || ['#8a8f98', '#5f646c'])[1];

  // ---- original creatures: the design system's fallback while a Pokémon sprite isn't there ----
  const CRIT = {
    fire: { b: '#e8743a', d: '#a8431c', l: '#ffb36b', f1: '#f5a524', f2: '#ffe07a' }, water: { b: '#5aa6e8', d: '#2f6fb0', l: '#a8dcff', f1: '#e8f6ff', f2: '#6fd0e8' },
    grass: { b: '#7cc455', d: '#3f7a2e', l: '#c3e88a', f1: '#2f8a3a', f2: '#9be05a' }, electric: { b: '#f2d23c', d: '#b8961a', l: '#fff3a0', f1: '#5a4a20', f2: '#fffbe0' },
    normal: { b: '#cfc2e8', d: '#8f80b8', l: '#efe8fb', f1: '#a99bd6', f2: '#efe8fb' },
  };
  const CRIT_OF = { fire: 'fire', dragon: 'fire', ground: 'fire', water: 'water', ice: 'water', flying: 'water', grass: 'grass', bug: 'grass', poison: 'grass', electric: 'electric', steel: 'electric' };
  const SHAPES = { round: [5, 4.5, 10], tall: [4, 5.5, 9.5], wide: [6, 4, 10.5] };
  const critCache = {};
  function critter(type, shape, tool, view, fr, s, sleep) {
    type = CRIT_OF[type] || 'normal';
    const key = [type, shape, tool, view, fr, s, sleep ? 1 : 0].join('|');
    if (critCache[key]) return critCache[key];
    const T = CRIT[type]; let G = [...Array(16)].map(() => Array(16).fill(null));
    const [rx, ry, cy] = SHAPES[shape], cx = 7.5;
    const set = (x, y, c) => { if (x >= 0 && x < 16 && y >= 0 && y < 16) G[y][x] = c; };
    const inside = (x, y) => { const dx = (x - cx) / rx, dy = (y - cy) / ry; return dx * dx + dy * dy <= 1; };
    let top = 99, bot = 0;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (inside(x, y)) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry; let c = T.b;
      if (view === 'front' && dy > 0.25 && Math.abs(dx) < 0.45) c = T.l;
      if (dx + dy > 0.8) c = T.d; else if (dx + dy < -0.75) c = T.l;
      G[y][x] = c; top = Math.min(top, y); bot = Math.max(bot, y);
    }
    if (bot < 15) [5, 6, 9, 10].forEach(x => set(x, bot + 1, T.d));
    const my = Math.round(cy), lx = Math.round(cx - rx) - 1, rxp = Math.round(cx + rx) + 1;
    if (type === 'fire') { (fr ? [[6, -1, 'f1'], [7, -1, 'f2'], [8, -1, 'f1'], [7, -2, 'f1'], [8, -3, 'f2']] : [[6, -1, 'f1'], [7, -1, 'f2'], [8, -1, 'f1'], [7, -2, 'f2'], [6, -3, 'f1']]).forEach(([x, d, k]) => set(x, top + d, T[k])); const tx = Math.min(15, rxp); set(tx, my, T.f1); set(tx, my - 1, T.f2); if (fr) set(tx, my - 2, T.f2); }
    if (type === 'water') { set(7, top - 1, T.f1); set(8, top - 1, T.f1); set(8, top - 2, T.f1); set(9, top - 3, T.f1); set(lx, my, T.f2); set(lx, my + 1, T.f2); set(rxp, my, T.f2); set(rxp, my + 1, T.f2); if (view === 'back') for (let x = 0; x < 16; x++) if (inside(x, my - 1)) set(x, my - 1, T.f2); }
    if (type === 'grass') { [[7, -1, 'f1'], [7, -2, 'f1'], [6, -3, 'f2'], [5, -3, 'f2'], [5, -4, 'f2'], [8, -3, 'f1'], [9, -3, 'f2'], [10, -4, 'f2'], [9, -4, 'f2']].forEach(([x, d, k]) => set(x, top + d, T[k])); if (view === 'back') { set(5, my, T.d); set(9, my + 1, T.d); set(7, my - 2, T.d); set(10, my - 1, T.d); } }
    if (type === 'electric') { set(7, top - 1, T.f1); set(8, top - 2, T.f1); set(7, top - 3, T.f1); set(8, top - 4, T.f2); if (view === 'back') { set(6, my - 1, T.d); set(7, my, T.d); set(8, my, T.d); set(9, my + 1, T.d); } }
    if (type === 'normal') { const a = Math.round(cx - rx * 0.6), c2 = Math.round(cx + rx * 0.6) - 1; set(a, top - 1, T.d); set(a + 1, top - 1, T.d); set(a, top - 2, T.d); set(c2, top - 1, T.d); set(c2 + 1, top - 1, T.d); set(c2 + 1, top - 2, T.d); }
    const ey = Math.round(cy - 1.5);
    if (view === 'front') {
      for (const ex of [5, 9]) { if (sleep) { set(ex, ey + 1, OUT); set(ex + 1, ey + 1, OUT); } else { set(ex, ey, '#ffffff'); set(ex + 1, ey, OUT); set(ex, ey + 1, OUT); set(ex + 1, ey + 1, OUT); } }
      set(7, ey + 2, OUT); set(8, ey + 2, OUT);
      if (inside(4, ey + 2)) set(4, ey + 2, '#f29aa0'); if (inside(11, ey + 2)) set(11, ey + 2, '#f29aa0');
    }
    const O = G.map(r => r.slice());
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (!G[y][x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const yy = y + b, xx = x + a; return yy >= 0 && yy < 16 && xx >= 0 && xx < 16 && G[yy][xx]; })) O[y][x] = OUT;
    G = O;
    const ac = (TOOL[tool] || ['#8a8f98'])[0], row = ey + 3;
    if (tool === 'claude') { for (let x = 0; x < 16; x++) if (inside(x, row) && G[row][x] !== OUT) G[row][x] = ac; const kx = view === 'front' ? 10 : 5; set(kx, row + 1, ac); set(kx, row + 2, '#a8532e'); }
    if (tool === 'codex') { for (let y = top; y <= top + 1; y++) for (let x = 0; x < 16; x++) if (inside(x, y)) G[y][x] = y === top ? '#57b862' : ac; if (view === 'front') for (let x = 2; x <= 6; x++) set(x, top + 2, '#2b6e34'); else for (let x = 9; x <= 13; x++) set(x, top + 2, '#2b6e34'); }
    if (tool === 'gemini') { if (view === 'front') { for (let x = 4; x <= 11; x++) set(x, ey - 1, ac); [4, 7, 8, 11].forEach(x => set(x, ey, ac)); set(4, ey + 1, ac); set(11, ey + 1, ac); } else for (let x = 0; x < 16; x++) if (inside(x, ey) && G[ey][x] !== OUT) G[ey][x] = ac; }
    if (tool === 'other') { if (view === 'back') { for (let y = my - 2; y <= my + 1; y++) for (let x = 5; x <= 10; x++) set(x, y, (x === 5 || x === 10) ? '#5f646c' : y === my - 2 ? '#b0b4bb' : ac); } else { set(5, my - 1, '#5f646c'); set(5, my, '#5f646c'); set(10, my - 1, '#5f646c'); set(10, my, '#5f646c'); } }
    const c = document.createElement('canvas'); c.width = c.height = 16 * s; const k = c.getContext('2d');
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (G[y][x]) { k.fillStyle = G[y][x]; k.fillRect(x * s, y * s, s, s); }
    return critCache[key] = c;
  }
  // a session: its Pokémon sprite, or the original creature of its type (×s), bottom-centred at (cx, bottom)
  function creature(p, view, t, cx, bottom, o = {}) {
    if (Poke.drawAt(p.id, view === 'back' ? 'back' : 'icon', t, cx, bottom, { shadow: false, alpha: o.dim ? .8 : 0, maxH: o.small ? 15 : 0, flip: o.flip })) return;
    const st = Poke.stageOf(p.id), shape = !st || st.stage === 1 ? 'round' : st.stage === 2 ? 'tall' : 'wide', s = o.small ? 1 : 2;
    const c = critter(Poke.typeOfId(p.id) || 'normal', shape, toolOf(p), view === 'back' ? 'back' : 'front', ((t / 300) | 0) % 2, s, o.sleep);
    const k = Art.getCtx(), x = Math.round(cx - 8 * s), y = Math.round(bottom - 16 * s);
    k.save(); if (o.dim) k.filter = 'brightness(0.78) saturate(0.7)';
    if (o.flip) { k.translate(x + 16 * s, y); k.scale(-1, 1); k.drawImage(c, 0, 0); } else k.drawImage(c, x, y);
    k.restore();
  }
  function ring(k, cx, cy, type, s = 2) {
    k.globalAlpha = .55; disc(k, cx, cy, 5 * s, Math.max(1, Math.round(1.5 * s)), TYPE_COLOR[type] || '#888');
    k.globalAlpha = .3; disc(k, cx, cy, 4 * s - 1, Math.max(1, Math.round(1.5 * s) - 1), '#000'); k.globalAlpha = 1;
  }

  // ---- room floors, painted once per room into a canvas (local coordinates) ----
  const floorCache = new Map();
  function paintFloor(B, w, h, seed) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const k = c.getContext('2d'), rnd = rng(seed), [p0, p1, p2, p3] = B.p, cracks = [];
    const tiles = (sz, base, line, speck) => { Rk(k, 0, 0, w, h, base); for (let ty = 0; ty < h; ty += sz) for (let tx = 0; tx < w; tx += sz) { Rk(k, tx, ty, sz, 1, line); Rk(k, tx, ty, 1, sz, line); if (speck && rnd() < .4) Rk(k, tx + 3 + rnd() * (sz - 6), ty + 3 + rnd() * (sz - 6), 2, 1, speck); } };
    if (B.key === 'volcano') {
      tiles(16, p0, '#3a2420', '#45302a');
      for (let n = 0; n < Math.max(4, w * h / 3000); n++) { let px = 8 + rnd() * (w - 16), py = 6 + rnd() * (h - 12);
        for (let s = 0; s < 10 + rnd() * 6; s++) { Rk(k, px, py, 2, 1, p1); Rk(k, px, py, 1, 1, p2); if (s % 3 === 0) cracks.push([px, py]); px += rnd() < .5 ? 2 : 1; py += rnd() < .5 ? 1 : (rnd() < .5 ? -1 : 0); if (px > w - 3 || py > h - 2 || py < 1) break; } }
      [[2, 2], [w - 10, 2]].forEach(([px, py]) => { Rk(k, px, py, 8, 22, OUT); Rk(k, px + 1, py + 1, 6, 20, '#140c12'); Rk(k, px + 2, py + 2, 1, 16, '#4a3a4a'); });
      disc(k, 10, h - 9, 6, 3, OUT); disc(k, 10, h - 10, 5, 2, '#5a4a46'); Rk(k, 8, h - 12, 5, 2, p2);
    } else if (B.key === 'lake') {
      Rk(k, 0, 0, w, h, p1); Rk(k, 0, h - 3, w, 3, p0);
      for (let i = 0; i < w * h / 300; i++) Rk(k, rnd() * (w - 4), rnd() * h, 3, 1, p2);
      Rk(k, w - 14, 0, 12, h, p3); for (let i = 0; i < 4; i++) Rk(k, w - 12 + i * 3, 0, 1, h, '#bfe3f5');
      const dx = 4, dw = w - 22, dy = 2, dh = h - 12;
      Rk(k, dx - 1, dy - 1, dw + 2, dh + 2, '#5c3a1e');
      for (let py = dy; py < dy + dh; py += 5) { Rk(k, dx, py, dw, 4, (py / 5) % 2 ? '#a0703f' : '#946538'); Rk(k, dx, py + 4, dw, 1, '#5c3a1e'); for (let px = dx + ((py / 5) % 2) * 20; px < dx + dw; px += 40) Rk(k, px, py, 1, 4, '#5c3a1e'); }
      disc(k, w - 8, h - 8, 4, 4, OUT); disc(k, w - 8, h - 8, 3, 3, '#ffffff'); Rk(k, w - 11, h - 9, 6, 2, '#e0453a');
    } else if (B.key === 'forest') {
      Rk(k, 0, 0, w, h, p1);
      for (let i = 0; i < w * h / 200; i++) Rk(k, rnd() * (w - 1), rnd() * (h - 2), 1, 2, rnd() < .5 ? '#5f9a3a' : p2);
      Rk(k, 0, h - 14, w, 9, '#8a6a3a'); for (let i = 0; i < w / 8; i++) Rk(k, rnd() * w, h - 13 + rnd() * 7, 2, 1, '#a8844a');
      for (let i = 0; i < w / 30; i++) { const vx = 6 + rnd() * (w - 12), len = 6 + rnd() * 10; Rk(k, vx, 0, 1, len, '#2f6a28'); for (let j = 3; j < len; j += 4) Rk(k, vx + (j % 8 ? 1 : -1), j, 1, 1, p2); }
      [[4, h - 22], [w - 12, h - 24], [w / 2 - 4, h - 20]].forEach(([mx, my]) => { Rk(k, mx + 2, my + 4, 3, 4, '#f3ead8'); disc(k, mx + 3, my + 3, 4, 2, OUT); disc(k, mx + 3, my + 2, 3, 2, '#d9481c'); Rk(k, mx + 1, my + 1, 1, 1, '#fff'); Rk(k, mx + 4, my + 2, 1, 1, '#fff'); });
    } else if (B.key === 'storm' || B.key === 'steel') {
      tiles(16, p1, p0); for (let ty = 0; ty < h; ty += 16) for (let tx = 0; tx < w; tx += 16) { Rk(k, tx + 2, ty + 2, 1, 1, p2); Rk(k, tx + 13, ty + 2, 1, 1, p2); Rk(k, tx + 2, ty + 13, 1, 1, p2); Rk(k, tx + 13, ty + 13, 1, 1, p2); }
      if (B.key === 'storm') { Rk(k, 0, h - 6, w, 5, OUT); for (let x = 0; x < w; x += 8) for (let i = 0; i < 4; i++) Rk(k, x + i, h - 5 + i, 4, 1, p2); [[3, 3], [w - 11, 3]].forEach(([px, py]) => { Rk(k, px, py, 8, 24, OUT); Rk(k, px + 1, py + 1, 6, 22, '#4a5070'); Rk(k, px + 3, py + 4, 2, 14, p2); }); }
      else [[6, h - 14], [w - 16, h - 16]].forEach(([gx, gy]) => { disc(k, gx + 5, gy + 5, 6, 6, OUT); disc(k, gx + 5, gy + 5, 5, 5, p2); disc(k, gx + 5, gy + 5, 2, 2, p0); for (const [a, b] of [[0, -7], [0, 6], [-7, 0], [6, 0]]) Rk(k, gx + 5 + a, gy + 5 + b, 2, 2, p2); });
    } else if (B.key === 'ice') {
      Rk(k, 0, 0, w, h, p1);
      for (let i = 0; i < w * h / 400; i++) { const x = rnd() * w, y = rnd() * h, s = 6 + rnd() * 12; Rk(k, x, y, s, s * .6, '#7fa9d2'); }
      for (let i = 0; i < w / 12; i++) { const x = rnd() * w, y = rnd() * h; for (let j = 0; j < 6; j++) Rk(k, x + j, y + j, 1, 1, p3); }
      for (let x = 2; x < w; x += 18 + (rnd() * 10 | 0)) { const l = 4 + rnd() * 6; for (let j = 0; j < l; j++) Rk(k, x + j / 2, j, Math.max(1, 4 - j / 2), 1, p2); }
    } else if (B.key === 'desert') {
      Rk(k, 0, 0, w, h, p2);
      for (let y = 6; y < h; y += 10) for (let x = 0; x < w; x++) if (Math.sin((x + y * 3) / 9) > .6) Rk(k, x, y + Math.round(Math.sin(x / 7) * 2), 1, 1, p1);
      for (let i = 0; i < w * h / 250; i++) Rk(k, rnd() * w, rnd() * h, 1, 1, p3);
      [[6, h - 22], [w - 14, h - 26]].forEach(([cx, cy]) => { Rk(k, cx + 2, cy, 4, 18, OUT); Rk(k, cx + 3, cy + 1, 2, 16, '#4f8a3a'); Rk(k, cx - 1, cy + 6, 3, 6, OUT); Rk(k, cx, cy + 7, 2, 4, '#4f8a3a'); Rk(k, cx + 6, cy + 4, 3, 6, OUT); Rk(k, cx + 6, cy + 5, 2, 4, '#4f8a3a'); });
    } else if (B.key === 'rock') {
      Rk(k, 0, 0, w, h, p0);
      for (let y = 0; y < h; y += 12) for (let x = -((y / 12) % 2) * 10; x < w; x += 20) { Rk(k, x + 1, y + 1, 18, 10, p1); Rk(k, x + 1, y + 1, 18, 1, p2); }
      Rk(k, 6, h - 16, 12, 10, p2); for (let a = 0; a < 6; a += .5) Rk(k, 12 + Math.cos(a * 2) * a * .6, h - 11 + Math.sin(a * 2) * a * .6, 1, 1, p0);
    } else if (B.key === 'swamp') {
      Rk(k, 0, 0, w, h, p1);
      for (let i = 0; i < w * h / 900; i++) disc(k, rnd() * w, rnd() * h, 6 + rnd() * 10, 3 + rnd() * 4, p0);
      for (let i = 0; i < w * h / 300; i++) Rk(k, rnd() * w, rnd() * h, 2, 2, p2);
      [[4, h - 20], [w - 14, h - 22]].forEach(([bx, by]) => { Rk(k, bx, by, 10, 14, OUT); Rk(k, bx + 1, by + 1, 8, 12, '#6a4a2a'); Rk(k, bx + 1, by + 4, 8, 1, '#4a3a1a'); Rk(k, bx + 1, by + 9, 8, 1, '#4a3a1a'); Rk(k, bx + 2, by + 1, 6, 2, '#7ac74c'); });
    } else if (B.key === 'sky') {
      Rk(k, 0, 0, w, h, p1);
      for (let i = 0; i < w * h / 700; i++) { const x = rnd() * w, y = rnd() * h; disc(k, x, y, 10, 4, p2); disc(k, x + 7, y - 2, 6, 3, '#ffffff'); }
      [[3, 2], [w - 9, 2]].forEach(([px, py]) => { Rk(k, px, py, 6, 26, OUT); Rk(k, px + 1, py + 1, 4, 24, '#fbf0d0'); Rk(k, px - 1, py, 8, 3, OUT); Rk(k, px, py + 1, 6, 1, p3); });
    } else if (B.key === 'haunted') {
      Rk(k, 0, 0, w, h, p1);
      for (let y = 0; y < h; y += 6) { Rk(k, 0, y + 5, w, 1, p0); for (let x = ((y / 6) % 2) * 17; x < w; x += 34) Rk(k, x, y, 1, 5, p0); }
      for (const [cx, dir] of [[0, 1], [w - 1, -1]]) for (let i = 0; i < 10; i++) { Rk(k, cx + dir * i, i, 1, 1, '#9a92b8'); Rk(k, cx + dir * i * .5, i, 1, 1, '#9a92b8'); Rk(k, cx, i, 1, 1, '#9a92b8'); }
      [[8, h - 12], [w - 12, h - 14]].forEach(([vx, vy]) => { Rk(k, vx, vy, 4, 8, OUT); Rk(k, vx + 1, vy + 1, 2, 6, '#efe8d8'); });
    } else if (B.key === 'psychic') {
      tiles(16, p1, '#8e3a6e'); for (let i = 0; i < w / 6; i++) { let x = rnd() * w, y = rnd() * h; for (let j = 0; j < 8; j++) { Rk(k, x, y, 1, 1, p2); x += 1; y += rnd() < .5 ? 1 : 0; } }
      [[4, h - 18], [w - 12, h - 20]].forEach(([cx, cy]) => { diamond(k, cx + 4, cy + 6, 6, OUT); diamond(k, cx + 4, cy + 6, 5, '#c8a8ff'); Rk(k, cx + 3, cy + 3, 1, 3, '#ffffff'); });
    } else if (B.key === 'dragon') {
      tiles(16, p1, p0, '#4a3e80');
      for (let i = 0; i < w * h / 1200; i++) { const x = 4 + rnd() * (w - 10), y = 4 + rnd() * (h - 10); Rk(k, x, y, 5, 1, p3); Rk(k, x + 2, y, 1, 5, p3); Rk(k, x, y + 4, 3, 1, p3); }
      disc(k, w - 14, h - 8, 10, 5, OUT); disc(k, w - 14, h - 9, 9, 4, p3); for (let i = 0; i < 6; i++) Rk(k, w - 20 + i * 2, h - 11 + (i % 2), 1, 1, '#fff7c2');
    }
    return { c, cracks };
  }
  function roomFloor(Rm, B) {
    const w = Rm.w, h = Rm.h - 14, key = Rm.name + '|' + w + 'x' + h + '|' + B.key;
    if (!floorCache.has(key)) floorCache.set(key, paintFloor(B, w, h, Art.hash(Rm.name)));
    return floorCache.get(key);
  }

  // ---- the wall: wood, badges, partner of the month, weekly board, ON AIR, radio, clock ----
  function drawWall(k, t, night, lights) {
    Rk(k, 0, 0, W, TOP, '#c79a6b');
    for (let x = 0; x < W; x += 24) Rk(k, x, 3, 1, TOP - 9, '#a87c50');
    Rk(k, 0, 0, W, 3, '#7a4f2e'); Rk(k, 0, TOP - 7, W, 7, '#7a4f2e'); Rk(k, 0, TOP - 7, W, 1, '#5a3a20'); Rk(k, 0, TOP - 1, W, 1, OUT);
    windowBoxes = [];
    const win = (x, w) => { windowAt(k, x, 7, w, 34, t, night, lights); windowBoxes.push({ x, y: 7, w, h: 34 }); };
    // light switch
    switchBox = { x: 4, y: 20, w: 7, h: 11 };
    Rk(k, 4, 20, 7, 11, OUT); Rk(k, 5, 21, 5, 9, '#f4ecd8'); Rk(k, 6, lightsOn ? 22 : 25, 3, 4, lightsOn ? '#5fd38a' : '#8b9bb4');
    let x = 16;
    const fits = w => x + w <= CX - 6;
    if (fits(52)) { win(x, 52); x += 60; }
    // badges: one per climate zone open on this floor, in its type colour
    if (fits(104)) {
      Rk(k, x, 5, 104, 42, OUT); Rk(k, x + 1, 6, 102, 40, '#6a4423'); Rk(k, x + 3, 8, 98, 36, '#24345a');
      text(k, 'INSIGNIAS', x + (104 - tw('INSIGNIAS')) / 2, 10, '#ffe07a');
      const earned = [...new Set(rooms.map(Rm => TYPE_COLOR[biomeOf(Rm).type]))];
      for (let i = 0; i < 8; i++) { const bx = x + 17 + (i % 4) * 23, by = 24 + Math.floor(i / 4) * 12; diamond(k, bx, by, 5, OUT); diamond(k, bx, by, 4, earned[i] || '#3a4a70'); if (earned[i]) Rk(k, bx - 2, by - 2, 1, 1, '#ffffff'); }
      x += 112;
    }
    // partner of the month: the session with the most active time this month, as its creature
    if (fits(64)) {
      const fx = x + 10;
      Rk(k, fx, 3, 44, 36, OUT); Rk(k, fx + 1, 4, 42, 34, '#d9a830'); Rk(k, fx + 3, 6, 38, 30, '#a87c18'); Rk(k, fx + 4, 7, 36, 28, '#f3e2b8');
      const m = usageData && usageData.month && usageData.month.top && usageData.month.top[0];
      const live = m && data && data.people.find(p => p.id === m.id);
      if (live) creature(live, 'front', t, fx + 22, 34, {}); else Poke.drawHaunterAt(fx + 22, 34, t);
      Rk(k, x, 40, 64, 9, OUT); Rk(k, x + 1, 41, 62, 7, '#f4ecd8'); text(k, 'PARCEIRO DO MES', x + 3, 42, OUT);
      aotmBox = { x: fx, y: 3, w: 44, h: 36 };
      x += 72;
    }
    // weekly board: active hours of the last 7 days; opens the usage report
    if (fits(100)) {
      Rk(k, x, 5, 100, 42, OUT); Rk(k, x + 1, 6, 98, 40, '#6a4423'); Rk(k, x + 3, 8, 94, 36, '#2f5a3a');
      text(k, 'PLACAR SEMANAL', x + (100 - tw('PLACAR SEMANAL')) / 2, 10, '#e9f2b0');
      const days = [], names = lang === 'pt' ? 'DSTQQSS' : 'SMTWTFS';
      for (let i = 6; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5), key = d.toISOString().slice(0, 10), v = usageData && usageData.days && usageData.days[key]; days.push({ v: v ? v.activeMs || 0 : 0, n: names[d.getDay()] }); }
      const max = Math.max(1, ...days.map(d => d.v));
      days.forEach((d, i) => { const hh = Math.max(1, Math.round(d.v / max * 20)); Rk(k, x + 9 + i * 12, 38 - hh, 7, hh, i === 6 ? '#ffe07a' : '#e9f2b0'); text(k, d.n, x + 11 + i * 12, 39, '#e9f2b0'); });
      usageBox = { x, y: 5, w: 100, h: 42 };
      x += 108;
    }
    if (fits(52)) { win(x, 52); x += 60; }
    // clock (real time)
    if (fits(28)) {
      const cx = x + 13, cy = 24, d = new Date(), hh = d.getHours(), mm = d.getMinutes();
      disc(k, cx, cy, 11, 11, OUT); disc(k, cx, cy, 10, 10, '#f4f0e4'); disc(k, cx, cy, 1, 1, OUT);
      const hand = (a, l, c) => { for (let i = 0; i < l; i++) Rk(k, cx + Math.sin(a) * i, cy - Math.cos(a) * i, 1, 1, c); };
      hand((hh % 12 + mm / 60) / 12 * Math.PI * 2, 5, OUT); hand(mm / 60 * Math.PI * 2, 8, '#a8431c');
      x += 36;
    }
    while (fits(52)) { win(x, 52); x += 60; if (fits(24)) { plant(k, x, 26); x += 28; } }
    // over the service wing: a big window and a plant
    win(RX + 6, 70); plant(k, RX + 112, 26);
  }
  function plant(k, px, py) { Rk(k, px, py + 10, 16, 14, OUT); Rk(k, px + 1, py + 11, 14, 12, '#b8643a'); Rk(k, px + 1, py + 11, 14, 2, '#d8845a'); disc(k, px + 8, py + 4, 9, 7, OUT); disc(k, px + 8, py + 4, 8, 6, '#3f7a2e'); disc(k, px + 5, py + 2, 3, 2, '#5f9a3a'); }
  function windowAt(k, x, y, w, h, t, night, lights) {
    Rk(k, x - 1, y - 1, w + 2, h + 2, OUT); Rk(k, x, y, w, h, '#f4ecd8');
    const ix = x + 3, iy = y + 3, iw = w - 6, ih = h - 6;
    k.save(); k.beginPath(); k.rect(ix, iy, iw, ih); k.clip();
    if (night) { Rk(k, ix, iy, iw, ih, '#1a2250'); Rk(k, ix, iy + ih - 6, iw, 6, '#26306a'); const r = rng(x); for (let i = 0; i < 10; i++) Rk(k, ix + r() * iw, iy + r() * (ih - 6), 1, 1, (i + Math.floor(t / 600)) % 5 ? '#f4f0d0' : '#8a90c0'); disc(k, ix + iw - 10, iy + 7, 4, 4, '#f4f0d0'); disc(k, ix + iw - 8, iy + 6, 3, 3, '#1a2250'); lights.push([x + w / 2, y + h / 2, 26, 'rgba(120,140,255,.12)']); }
    else { Rk(k, ix, iy, iw, ih, '#8fd0f5'); Rk(k, ix, iy + ih - 7, iw, 7, '#bfe6fa'); for (let i = 0; i < 2; i++) { const cx = ix + ((t / 180 + i * 37 + x) % (iw + 30)) - 15, cy = iy + 6 + i * 8; disc(k, cx, cy, 7, 2, '#ffffff'); disc(k, cx + 4, cy - 2, 4, 2, '#ffffff'); } }
    k.restore();
    Rk(k, x + w / 2 - 1, iy, 2, ih, '#f4ecd8'); Rk(k, ix, y + h / 2 - 1, iw, 2, '#f4ecd8');
  }

  // ---- a desk (design: desk 74×22, CRT 30×24, keyboard), at cell (cx, cy = cell top + 4) ----
  function drawDesk(k, B, cx, cy, type) {
    const [top, hi, front] = B.mat;
    Rk(k, cx + 13, cy + 13, 74, 22, OUT); Rk(k, cx + 14, cy + 14, 72, 14, top); Rk(k, cx + 14, cy + 14, 72, 1, hi); Rk(k, cx + 14, cy + 28, 72, 6, front);
    if (B.key === 'lake') for (let i = 0; i < 72; i += 9) Rk(k, cx + 14 + i, cy + 15, 1, 13, '#a8843a');
    if (B.key === 'forest') { disc(k, cx + 24, cy + 21, 4, 3, '#c8945a'); disc(k, cx + 24, cy + 21, 2, 1, '#8a5a2a'); for (let i = 0; i < 72; i += 6) Rk(k, cx + 14 + i, cy + 29, 2, 4, '#5a3a1e'); }
    if (B.key === 'volcano') { Rk(k, cx + 70, cy + 29, 8, 1, '#d9481c'); Rk(k, cx + 72, cy + 30, 1, 2, '#d9481c'); }
    Rk(k, cx + 35, cy - 1, 30, 24, OUT); Rk(k, cx + 36, cy, 28, 22, '#d9d4c4'); Rk(k, cx + 36, cy + 20, 28, 2, '#a8a294'); Rk(k, cx + 46, cy + 22, 8, 1, '#a8a294');
    Rk(k, cx + 39, cy + 3, 22, 14, '#16202a');
    Rk(k, cx + 37, cy + 23, 26, 6, OUT); Rk(k, cx + 38, cy + 24, 24, 4, '#e8e4d8'); for (let i = 0; i < 11; i++) Rk(k, cx + 39 + i * 2, cy + 25, 1, 1, '#a8a294');
    Rk(k, cx + 18, cy + 17, 6, 7, OUT); Rk(k, cx + 19, cy + 18, 4, 5, TYPE_COLOR[type]); Rk(k, cx + 24, cy + 19, 1, 3, OUT);
    Rk(k, cx + 70, cy + 17, 12, 8, OUT); Rk(k, cx + 71, cy + 18, 10, 6, '#f4f0e4'); Rk(k, cx + 72, cy + 20, 8, 1, '#c9c2b0'); Rk(k, cx + 72, cy + 22, 6, 1, '#c9c2b0');
  }
  function screen(k, st, cx, cy, type, t, lights) {
    const sx = cx + 39, sy = cy + 3, col = TYPE_COLOR[type];
    if (st === 'working' || st === 'delegate') { const off = Math.floor(t / 250); for (let j = 0; j < 4; j++) { const len = 4 + ((j + off) * 7) % 14; Rk(k, sx + 2 + ((j + off) % 3) * 2, sy + 2 + j * 3, len, 1, j % 2 ? col : '#9fe0b0'); } if ((t / 400 | 0) % 2) Rk(k, sx + 18, sy + 11, 2, 1, '#ffffff'); Rk(k, cx + 61, cy + 18, 2, 1, '#5fd38a'); }
    else if (st === 'thinking') { const n = (t / 300 | 0) % 4; for (let i = 0; i < 3; i++) Rk(k, sx + 6 + i * 4, sy + 6, 2, 2, i < n ? col : '#2a3a48'); Rk(k, cx + 61, cy + 18, 2, 1, '#5fd38a'); }
    else if (st === 'needs') { if ((t / 500 | 0) % 2) text(k, '?', sx + 9, sy + 4, '#ffd24a'); Rk(k, sx + 4, sy + 11, 14, 1, '#ffd24a'); Rk(k, cx + 61, cy + 18, 2, 1, '#ff6b5e'); }
    else return;
    lights.push([sx + 11, sy + 7, 24, col + '55']);
  }
  function particles(k, type, kx, ky, t, n = 6, rise = 20) {
    for (let i = 0; i < n; i++) { const ph = (t / 1400 + i / n) % 1, px = kx + Math.sin(i * 12.9 + ph * 6) * 7, py = ky - ph * rise;
      if (type === 'fire' || type === 'dragon') Rk(k, px, py, 1, 1, i % 2 ? '#ffe07a' : '#f5a524');
      else if (type === 'water' || type === 'ice') Rk(k, px, py, 1, 2, '#a8dcff');
      else if (type === 'grass' || type === 'bug') Rk(k, px, py, 2, 1, i % 2 ? '#8cc84b' : '#c3e88a');
      else if (type === 'electric' || type === 'steel') Rk(k, px, py, 1, 1, '#fff3a0');
      else Rk(k, px, py, 1, 1, TYPE_COLOR[type] || '#ffffff'); }
  }

  // ---- weather of each zone ----
  function weather(k, Rm, B, fl, t, night, lights) {
    const x0 = Rm.x, y0 = Rm.y + 14, w = Rm.w, h = Rm.h - 14, [p0, p1, p2, p3] = B.p;
    k.save(); k.beginPath(); k.rect(x0, y0, w, h); k.clip();
    if (B.key === 'volcano') {
      for (let i = 0; i < w / 26; i++) { const ph = (t / 3200 + i * 0.137) % 1; Rk(k, x0 + 6 + (i * 53) % (w - 12) + Math.sin(ph * 9 + i) * 3, y0 + h - ph * h, 1, 1, i % 3 ? p2 : p3); }
      const pulse = .5 + .5 * Math.sin(t / 500); fl.cracks.forEach(([px, py], i) => { if (i % 2 === 0) Rk(k, x0 + px, y0 + py, 1, 1, pulse > .5 ? p3 : p2); });
      lights.push([x0 + w / 2, y0 + h / 2, Math.max(w, h) * .55, `rgba(217,72,28,${.12 + .05 * pulse})`]);
    } else if (B.key === 'lake') {
      for (let i = 0; i < w / 22; i++) Rk(k, x0 + 4 + ((i * 47 + t / 70) % (w - 22)), y0 + h - 8 + (i % 2) * 3, 4, 1, p2);
      for (let i = 0; i < 4; i++) Rk(k, x0 + w - 13 + i * 3, y0 + ((t / 30 + i * 23) % h), 2, 6, '#ffffff');
      if (t % 12000 < 4000) for (let i = 0; i < w / 8; i++) { const ph = (t / 600 + i * .173) % 1; Rk(k, x0 + (i * 37) % w - ph * 6, y0 + ph * h, 1, 3, '#bfe3f5'); }
    } else if (B.key === 'forest') {
      for (let i = 0; i < w / 34; i++) { const ph = (t / 5000 + i * .21) % 1; Rk(k, x0 + 10 + (i * 41) % (w - 20) + Math.sin(ph * 12 + i) * 6, y0 + ph * (h - 4), 2, 1, i % 2 ? p2 : '#e9b84b'); }
      if (night) for (let i = 0; i < w / 26; i++) { if ((t / 300 + i * 3 | 0) % 4 === 0) continue; const fx = x0 + 8 + (i * 67 + Math.sin(t / 1200 + i) * 10) % (w - 16), fy = y0 + 6 + (i * 29 + Math.cos(t / 900 + i) * 6) % (h - 12); Rk(k, fx, fy, 1, 1, '#f6ff9a'); lights.push([fx, fy, 6, 'rgba(240,255,140,.6)']); }
    } else {
      const n = Math.max(8, w * h / 500 | 0);
      for (let i = 0; i < n; i++) {
        const hh = Art.hash('wx' + Rm.name + i), sp = 6 + hh % 10, fall = (t / 1000 * sp * 2 + (hh >>> 4) % 1000) % h, x = x0 + (hh >>> 9) % w, sway = Math.round(Math.sin(t / 700 + i) * 2);
        if (B.key === 'ice') Rk(k, x + sway, y0 + fall, i % 4 ? 1 : 2, i % 4 ? 1 : 2, '#ffffff');
        else if (B.key === 'desert') Rk(k, x0 + (fall * 3 + (hh >>> 9)) % w, y0 + (hh >>> 12) % h, 2, 1, 'rgba(251,230,181,.8)');
        else if (B.key === 'swamp') { const rise = h - fall; if (rise > h * .3) { Rk(k, x, y0 + rise, 2, 2, p2); Rk(k, x, y0 + rise, 1, 1, p3); } }
        else if (B.key === 'sky') { if (i % 3) continue; const cx = x0 + (t / 1000 * sp + (hh >>> 9)) % (w + 30) - 20; k.fillStyle = 'rgba(255,255,255,.4)'; k.fillRect(cx, y0 + 8 + (hh >>> 12) % (h - 16), 14, 4); k.fillRect(cx + 3, y0 + 6 + (hh >>> 12) % (h - 16), 8, 2); }
        else if (B.key === 'haunted') { if (i % 2) continue; const fx = x0 + 8 + (hh >>> 9) % (w - 16), fy = y0 + h - 12; if (i % 4 === 0) { Rk(k, fx, fy - 2 - ((t / 160 + i) | 0) % 2, 1, 2, '#ffd27a'); lights.push([fx, fy - 2, 10, 'rgba(255,210,120,.45)']); } else { k.fillStyle = `rgba(183,240,200,${.2 + .2 * Math.sin(t / 500 + i)})`; k.fillRect(x + Math.round(Math.sin(t / 900 + i) * 6), y0 + 10 + (hh >>> 12) % (h - 20), 2, 2); } }
        else if (B.key === 'psychic') { const a = t / 1500 + i * 2.1, rr = 12 + (hh % Math.max(1, Math.min(w, h) / 2 - 12)); Rk(k, x0 + w / 2 + Math.cos(a) * rr, y0 + h / 2 + Math.sin(a) * rr * .6, 1, 1, p3); }
        else if (B.key === 'storm') { if (((t / 120) | 0) % 9 === i % 9) Rk(k, x, y0 + 4 + (hh >>> 12) % (h - 8), 2, 1, p3); }
        else if (B.key === 'rock') { if (fall < h * .5) Rk(k, x, y0 + fall * 2, 2, 2, p2); }
        else if (B.key === 'dragon') { if (i % 3 === 0) { k.fillStyle = 'rgba(200,190,220,.25)'; k.fillRect(x + sway, y0 + h - fall, 3, 2); } else if (night && i % 5 === 1 && ((t / 2000 + i) | 0) % 3) { Rk(k, x, y0 + (hh >>> 12) % h, 1, 1, '#ff4040'); Rk(k, x + 3, y0 + (hh >>> 12) % h, 1, 1, '#ff4040'); } }
        else if (B.key === 'steel') { if (i % 3 === 0) { k.fillStyle = 'rgba(227,233,238,.3)'; k.fillRect(x + sway, y0 + h - fall, 3, 3); } }
      }
      if (B.key === 'storm' && ((t / 100) | 0) % 70 < 2) { k.fillStyle = 'rgba(255,255,230,.35)'; k.fillRect(x0, y0, w, h); }
    }
    k.restore();
  }

  // ---- safari (the game room): grass, pond, mural with the paper, easel, shop, tall grass ----
  function tallGrass(k, x, y, w, h) { for (let ty = y; ty < y + h; ty += 8) for (let tx = x; tx < x + w; tx += 8) { Rk(k, tx, ty, 8, 8, '#5aa83e'); Rk(k, tx + 1, ty + 2, 1, 5, '#3f8a30'); Rk(k, tx + 2, ty + 1, 1, 2, '#3f8a30'); Rk(k, tx + 5, ty + 3, 1, 5, '#3f8a30'); Rk(k, tx + 6, ty + 2, 1, 2, '#3f8a30'); Rk(k, tx + 3, ty + 4, 1, 3, '#8cd060'); } }
  function tree(k, x, y) { Rk(k, x - 3, y + 6, 8, 12, OUT); Rk(k, x - 2, y + 6, 6, 11, '#6a4423'); disc(k, x, y, 12, 9, OUT); disc(k, x, y, 11, 8, '#3f7a2e'); disc(k, x - 4, y - 3, 5, 3, '#5f9a3a'); disc(k, x - 5, y - 4, 2, 1, '#8cc84b'); }
  function drawSafari(k, G, t, lights) {
    gameHits = []; gameBox = G;
    const { x, y, w, h } = G, rnd = rng(7);
    Rk(k, x - 2, y - 2, w + 4, h + 4, OUT); Rk(k, x, y, w, h, '#86c45a');
    for (let i = 0; i < w * h / 160; i++) Rk(k, x + rnd() * w, y + rnd() * h, 1, 2, rnd() < .5 ? '#6fae48' : '#a8dc78');
    // paths from the doors
    const mid = y + h / 2;
    Rk(k, x + w * .45, mid - 8, w * .55, 16, '#c2a46a'); Rk(k, x + w * .45, mid - 6, w * .55, 12, '#d9bf86');
    for (const d of G.doors) if (d.side !== 'right') { const py = d.side === 'top' ? y : mid; Rk(k, d.x - 8, py, 16, d.side === 'top' ? mid - y : y + h - mid, '#c2a46a'); Rk(k, d.x - 6, py, 12, d.side === 'top' ? mid - y : y + h - mid, '#d9bf86'); }
    for (let i = 0; i < w / 6; i++) Rk(k, x + w * .45 + rnd() * w * .55, mid - 5 + rnd() * 10, 2, 1, '#c2a46a');
    // fence along the top, gaps at the doors
    Rk(k, x, y + 4, w, 2, '#a87c50'); Rk(k, x, y + 9, w, 2, '#a87c50');
    for (let px = x + 4; px < x + w; px += 20) if (!G.doors.some(d => d.side === 'top' && Math.abs(d.x - px) < 12)) { Rk(k, px, y + 1, 4, 12, OUT); Rk(k, px + 1, y + 2, 2, 10, '#c8945a'); }
    // pond with fish
    const pcx = x + 62, pcy = y + 62;
    disc(k, pcx, pcy, 54, 30, '#e8d49a'); disc(k, pcx, pcy, 51, 27, OUT); disc(k, pcx, pcy, 50, 26, '#4a9ee0'); disc(k, pcx, pcy + 2, 36, 17, '#3a86cc');
    [[pcx - 30, pcy - 8], [pcx + 28, pcy + 12], [pcx + 14, pcy - 16]].forEach(([lx, ly]) => { disc(k, lx, ly, 5, 3, '#2f6a28'); disc(k, lx, ly, 4, 2, '#4f9a3a'); });
    for (let i = 0; i < 3; i++) { const a = t / 2600 + i * 2.1, fx = pcx + Math.cos(a) * (20 + i * 8), fy = pcy + 2 + Math.sin(a) * (9 + i * 2), dir = -Math.sin(a) > 0 ? 1 : -1; Rk(k, fx - 4, fy - 1, 8, 3, '#2f6fb0'); Rk(k, fx - 3, fy, 6, 1, '#8aa0b8'); Rk(k, fx + 4 * -dir, fy - 1, 1, 3, '#8aa0b8'); Rk(k, fx + 2 * dir, fy - 1, 1, 1, OUT); }
    const rip = (t % 3000) / 3000; k.globalAlpha = 1 - rip; disc(k, pcx - 20, pcy + 10, Math.round(3 + rip * 10), Math.round(1 + rip * 4), '#a8dcff'); k.globalAlpha = 1;
    // flowers and bushes where the old game room had its machines
    const fr2 = rng(Art.hash('flowers' + w));
    for (let i = 0; i < w / 5; i++) { const fx = x + 130 + fr2() * (w - 150), fy = y + 16 + fr2() * (h - 30); if (Math.abs(fy - mid) < 12) continue; Rk(k, fx, fy, 1, 2, '#3f8a30'); Rk(k, fx - 1, fy - 1, 3, 1, ['#ffd24a', '#ff6b5e', '#f4f0e4', '#c4a2ff'][i % 4]); }
    for (const [bx, by] of [[x + Math.round(w * .38), y + 26], [x + Math.round(w * .7), y + 30], [x + Math.round(w * .85), y + h - 30]]) { disc(k, bx, by, 9, 6, OUT); disc(k, bx, by, 8, 5, '#3f8a30'); disc(k, bx - 3, by - 2, 3, 2, '#5f9a3a'); }
    const sx = x + Math.round(w * .3), sy = y + h - 34;
    Rk(k, sx + 18, sy + 8, 2, 16, OUT); Rk(k, sx, sy, 40, 11, OUT); Rk(k, sx + 1, sy + 1, 38, 9, '#c8945a'); text(k, 'SAFARI', sx + 20 - tw('SAFARI') / 2, sy + 3, OUT);
    // tall grass, lamp posts, trees
    tallGrass(k, x + 8, y + h - 26, 88, 24); tallGrass(k, x + Math.round(w * .55), y + h - 26, Math.min(120, w * .2) | 0, 24);
    [[x + 128, y + 70], [x + w - 60, y + h - 40]].forEach(([px, py]) => { Rk(k, px, py, 3, 26, OUT); Rk(k, px - 3, py - 6, 9, 7, OUT); Rk(k, px - 2, py - 5, 7, 5, '#ffe9a0'); Rk(k, px - 3, py + 24, 9, 3, OUT); lights.push([px + 1, py - 3, 34, 'rgba(255,233,160,.5)']); });
    tree(k, x + 14, y + 22); tree(k, x + 122, y + 26); tree(k, x + w - 12, y + h - 30); tree(k, x + Math.round(w * .55), y + 24); tree(k, x + w - 40, y + 26);
    devSpots = gameSpots(G);
  }

  // ---- service wing: healing centre, arena, gym, day care, servers ----
  function wingHeader(k, x, y, w, title, col) { Rk(k, x, y, w, 14, '#2a3550'); Rk(k, x, y + 13, w, 1, OUT); const pw = tw(title) + 10; Rk(k, x + 4, y + 2, pw, 10, OUT); Rk(k, x + 5, y + 3, pw - 2, 8, col); text(k, title, x + 9, y + 4, OUT); }
  const WING_TITLES = { pt: ['CENTRO DE CURA - SUA VEZ', 'GINASIO - DELEGANDO', 'CRECHE - DORMINDO'], en: ['HEALING CENTER - YOUR TURN', 'GYM - DELEGATING', 'DAY CARE - ASLEEP'] };
  function wingBoxes() { return [[wing.copa, wing.meet - 4], [wing.meet - 2, wing.nap - 4], [wing.nap - 2, wing.bottom]]; }
  function drawWingBG(k, t, lights) {
    const x = RX - 2, w = RW + 4, rnd = rng(3), [cura, gym, creche] = wingBoxes();
    for (const [a, b] of wingBoxes()) Rk(k, x - 2, a - 2, w + 4, b - a + 4, OUT);
    // healing centre: checker floor, mint counter, healing machine, bell, bench
    for (let ty = cura[0]; ty < cura[1]; ty += 8) for (let tx = x; tx < x + w; tx += 8) Rk(k, tx, ty, Math.min(8, x + w - tx), Math.min(8, cura[1] - ty), ((tx - x + ty) / 8 | 0) % 2 ? '#f6eedf' : '#eadbc4');
    const cy = cura[0] + 22;
    Rk(k, x + 5, cy, w - 10, 20, OUT); Rk(k, x + 6, cy + 1, w - 12, 11, '#8fd8c8'); Rk(k, x + 6, cy + 12, w - 12, 7, '#3d8a7e'); Rk(k, x + 6, cy + 1, w - 12, 1, '#c8f0e6');
    Rk(k, x + 10, cy - 12, 36, 18, OUT); Rk(k, x + 11, cy - 11, 34, 16, '#d9d4c4'); Rk(k, x + 11, cy - 11, 34, 2, '#f4f0e4');
    for (let i = 0; i < 6; i++) { const lit = ((t / 300 | 0) % 7) > i, hx = x + 14 + (i % 3) * 10, hy = cy - 8 + Math.floor(i / 3) * 6; Rk(k, hx, hy, 6, 5, OUT); Rk(k, hx + 1, hy + 1, 4, 3, lit ? '#ffe07a' : '#8a8478'); if (lit) lights.push([hx + 3, hy + 2, 8, 'rgba(255,224,122,.5)']); }
    disc(k, x + w - 30, cy + 2, 3, 2, OUT); disc(k, x + w - 30, cy + 1, 2, 1, '#d9a830');
    Rk(k, x + 60, cy - 6, 22, 6, OUT); Rk(k, x + 61, cy - 5, 20, 4, '#f4f0e4'); Rk(k, x + 66, cy - 4, 10, 1, '#5fb8a8'); Rk(k, x + 70, cy - 5, 2, 4, '#5fb8a8');
    Rk(k, x + 8, cura[0] + 74, w - 16, 7, OUT); Rk(k, x + 9, cura[0] + 75, w - 18, 4, '#c8945a'); Rk(k, x + 12, cura[0] + 79, 2, 4, OUT); Rk(k, x + w - 14, cura[0] + 79, 2, 4, OUT);
    lights.push([x + w / 2, cura[0] + 50, 70, 'rgba(255,240,200,.25)']);
    // a waiting corner under the counter: plants and a second bench
    for (const px of [x + 6, x + w - 22]) plant(k, px, cura[1] - 30);
    Rk(k, x + 30, cura[1] - 18, w - 60, 7, OUT); Rk(k, x + 31, cura[1] - 17, w - 62, 4, '#c8945a');
    // gym: glass room, grid floor, ring
    Rk(k, x, gym[0] + 14, w, gym[1] - gym[0] - 14, '#5d6e80');
    for (let ty = gym[0] + 14; ty < gym[1]; ty += 12) Rk(k, x, ty, w, 1, '#4d5d6e'); for (let tx = x; tx < x + w; tx += 12) Rk(k, tx, gym[0] + 14, 1, gym[1] - gym[0] - 14, '#4d5d6e');
    const gc = (gym[0] + 14 + gym[1]) / 2; disc(k, x + w / 2, gc, 40, 22, '#7a8ea2'); disc(k, x + w / 2, gc, 38, 20, '#5d6e80');
    Rk(k, x, gym[0] + 14, w, 2, '#bfe9f5'); Rk(k, x, gym[1] - 2, w, 2, '#bfe9f5'); Rk(k, x, gym[0] + 14, 2, gym[1] - gym[0] - 14, '#bfe9f5'); Rk(k, x + w - 2, gym[0] + 14, 2, gym[1] - gym[0] - 14, '#bfe9f5');
    for (let i = 0; i < 3; i++) { Rk(k, x + 4 + i * 4, gym[0] + 18 + i * 2, 1, 10, '#e8f8ff'); Rk(k, x + w - 16 + i * 4, gym[1] - 16 - i * 2, 1, 10, '#e8f8ff'); }
    lights.push([x + w / 2, gc, 60, 'rgba(191,233,245,.25)']);
    // day care: hay floor and hay beds where the nappers lie
    Rk(k, x, creche[0] + 14, w, creche[1] - creche[0] - 14, '#e2c27a');
    for (let i = 0; i < 70; i++) Rk(k, x + rnd() * (w - 4), creche[0] + 14 + rnd() * (creche[1] - creche[0] - 16), 3, 1, '#c9a55a');
    for (const sp of spots.nap) { const bx = sp.x + 10, by = sp.y + 14; disc(k, bx, by, 16, 6, OUT); disc(k, bx, by, 15, 5, '#d9b45a'); disc(k, bx, by - 1, 12, 3, '#c99e44'); for (let i = -12; i < 12; i += 4) Rk(k, bx + i, by + 3, 3, 1, '#b08a3a'); }
    napBox = null;
  }
  function drawWingUI(k) {
    const x = RX - 2, w = RW + 4, tl = WING_TITLES[lang] || WING_TITLES.pt, cols = ['#8fd8c8', '#bfe9f5', '#cfc2e8'];
    wingBoxes().forEach(([a], i) => wingHeader(k, x, a, w, tl[i], cols[i]));
  }

  // ---- the room header band (the plaque itself is the HTML room sign) ----
  function roomHeader(k, Rm, B) {
    Rk(k, Rm.x, Rm.y, Rm.w, 14, B.p[0]); Rk(k, Rm.x, Rm.y + 13, Rm.w, 1, OUT);
    const c = `${Rm.people.length}/9`; text(k, c, Rm.x + Rm.w - 6 - tw(c), Rm.y + 5, B.p[3]);
  }

  // ---- the scene ----
  function drawBiomaScene(t, dt) {
    const now = Date.now(), k = Art.getCtx(), lights = [];
    const sky = Art.skyFor(styleHour(qs.get('hour') ? Number(qs.get('hour')) : new Date().getHours() + new Date().getMinutes() / 60));
    const night = sky.phase === 'night', dusk = !night && sky.phase !== 'day';
    updateActors(dt, now); updateCat(dt, t); updatePlayer(dt);
    usageBox = null; neonBox = null; moodBox = null; boardBox = null; hallBox = null; tvBox = null; trophyBox = null; radioBox = null; aotmBox = null; sites = [];
    // ground: the village planks under everything
    Rk(k, 0, TOP, W, H - TOP, '#e3c99a');
    for (let y = TOP; y < H; y += 8) { Rk(k, 0, y, W, 1, '#cfb07c'); for (let x = ((y - TOP) / 8 % 2) * 24; x < W; x += 48) Rk(k, x, y, 1, 8, '#cfb07c'); }
    drawWall(k, t, night, lights);
    // rooms: frame, floor, desks
    const roomInfo = rooms.map(Rm => ({ Rm, B: biomeOf(Rm) }));
    for (const { Rm, B } of roomInfo) {
      Rk(k, Rm.x - 2, Rm.y - 2, Rm.w + 4, Rm.h + 4, OUT);
      const fl = roomFloor(Rm, B); k.drawImage(fl.c, Rm.x, Rm.y + 14);
      Rk(k, Rm.doorX, Rm.y + Rm.h, 18, 2, '#e3c99a');
      weather(k, Rm, B, fl, t, night, lights);
    }
    for (const d of desks) { const B = biomeOf(d.room); drawDesk(k, B, d.x, d.y + 4, B.type); }
    if (game) drawSafari(k, game, t, lights);
    drawWingBG(k, t, lights);
    // desks: screens and whoever sits there
    const fr = (t / 250 | 0) % 2, ui = [];
    for (const cell of layout) {
      const p = cell.p, a = cell.actor, B = biomeOf(cell.room), cx = cell.x, cy = cell.y + 4, st = stateOf(p);
      cell.certs = []; cell.extraCerts = 0; cell.interns = [];
      const atDesk = a && a.mode === 'desk';
      if (!atDesk) continue;
      screen(k, st, cx, cy, B.type, t, lights);
      const born = arrivals.get(p.id), age = born ? now - born : Infinity;
      if (age < 1400) { // arrival: the capsule drops onto the chair and opens with a flash
        const kk = Math.min(1, age / 700), yy = cy + 40 - Math.round((1 - kk) * 40);
        if (age < 900) capsule(k, cx + 46, yy, TYPE_COLOR[B.type], '#5a5160', (t / 120 | 0) % 2);
        else { k.globalAlpha = 1 - (age - 900) / 500; disc(k, cx + 50, cy + 44, 14, 14, '#ffffff'); k.globalAlpha = 1; }
        continue;
      }
      ring(k, cx + 50, cy + 54, B.type);
      let bottom = cy + 54;
      if (st === 'working' || st === 'delegate') { bottom += fr; creature(p, 'back', t, cx + 50, bottom); particles(k, B.type, cx + 50, cy + 24, t + cx * 13); }
      else if (st === 'thinking') { bottom += Math.round(Math.sin(t / 600 + cx) * 1.5); creature(p, 'front', t, cx + 50, bottom); }
      else if (st === 'needs') { const ph = (t % 2000) / 2000; bottom -= ph < .15 ? Math.round(Math.sin(ph / .15 * Math.PI) * 5) : 0; creature(p, 'front', t, cx + 50, bottom); }
      else creature(p, 'front', t, cx + 50, bottom, { dim: st === 'asleep', sleep: st === 'asleep' });
      ui.push({ st, x: cx + 34, y: cy + 22 });
    }
    // everyone away from their desk, the cat (a Haunter) and you, sorted by depth
    const movers = [];
    for (const c of layout) {
      const a = c.actor;
      if (!a || a.mode === 'desk' || a.mode === 'meet' || a.mode === 'gone') continue;
      const walking = a.mode === 'walk', bob = walking ? (t / 150 | 0) % 2 : 0;
      if (a.mode === 'nap') movers.push({ y: a.y, draw: () => { creature(c.p, 'front', t, a.x + 10, a.y + 16, { dim: true, sleep: true }); zzz(k, a.x + 18, a.y - 2, t, Art.hash(c.p.id) % 2400); } });
      else movers.push({ y: a.y, draw: () => { ring(k, a.x + 8, a.y + 24, Poke.typeOfId(c.p.id) || 'normal', 1.4); creature(c.p, 'front', t, a.x + 8, a.y + 25 - bob, { flip: walking && a.flip }); if (a.mode === 'lounge' && a.spot && a.spot.zone === 'lounge' && a.y < wing.ping) ui.push({ st: 'ready', x: a.x - 7, y: a.y - 4 }); } });
    }
    movers.push({ y: cat.y, draw: () => drawMascot(cat.x, cat.y, cat.mode, t, cat.flip) });
    drawPlayer(t, movers);
    movers.sort((a, b) => a.y - b.y).forEach(m => m.draw());
    // gym: the lead and its subagents (×1)
    const meet = layout.filter(c => c.actor && c.actor.mode === 'meet');
    const subs = [], seats = [...spots.meetTop, ...spots.meetBot, ...spots.meetStand].filter(s => !meet.some(c => c.actor.spot === s));
    for (const c of meet) for (const s of c.p.subagents || []) { const seat = seats.shift(); if (seat) subs.push({ c, s, seat }); }
    meetInfo = { people: [...meet.map(c => ({ spot: c.actor.spot, label: c.p.name, lead: true })), ...subs.map(({ c, s, seat }) => ({ spot: seat, label: s.type, title: `${s.type}${s.description ? ': ' + s.description : ''} (${c.p.name})` }))], subTotal: meet.reduce((n, c) => n + (c.p.subagents || []).length, 0), shown: subs.length };
    for (const { c, s, seat } of subs) { ring(k, seat.x + 8, seat.y + 22, Poke.typeOfId(c.p.id) || 'normal', 1); creature({ ...c.p, id: s.id + c.p.id }, 'front', t, seat.x + 8, seat.y + 22 + Math.round(Math.sin(t / 400 + seat.x)), { small: true }); }
    for (const c of meet) { ring(k, c.actor.spot.x + 8, c.actor.spot.y + 24, Poke.typeOfId(c.p.id) || 'normal', 1.4); creature(c.p, 'front', t, c.actor.spot.x + 8, c.actor.spot.y + 25); capsule(k, c.actor.spot.x + 4, c.actor.spot.y - 12, TYPE_COLOR[Poke.typeOfId(c.p.id)] || '#A8A77A', '#2f6a28', (t / 200 | 0) % 2); }
    // night veil, then the lights added on top
    if (night || dusk) {
      k.fillStyle = night ? (lightsOn ? 'rgba(12,16,48,.42)' : 'rgba(12,16,48,.6)') : 'rgba(40,24,60,.22)'; k.fillRect(0, 0, W, H);
      k.globalCompositeOperation = 'lighter';
      for (const [lx, ly, lr, c] of lights) { const gr = k.createRadialGradient(lx, ly, 0, lx, ly, lr); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); k.fillStyle = gr; k.fillRect(lx - lr, ly - lr, lr * 2, lr * 2); }
      k.globalCompositeOperation = 'source-over';
    }
    // ---- UI layer: never darkened ----
    for (const { Rm, B } of roomInfo) roomHeader(k, Rm, B);
    drawWingUI(k);
    for (const u of ui) {
      if (u.st === 'thinking') { bubble(k, u.x + 27, u.y + 4, 17, 9); const n = (t / 400 | 0) % 4; for (let i = 0; i < 3; i++) if (i < n) Rk(k, u.x + 30 + i * 4, u.y + 7, 2, 2, OUT); }
      else if (u.st === 'needs') { const hop = (t % 2000) / 2000 < .15 ? -4 : 0; bubble(k, u.x + 28, u.y + 1 + hop, 12, 15, NAVY, BORDER); if ((t / 350 | 0) % 3 !== 0) text(k, '!', u.x + 31, u.y + 4 + hop, '#ffffff', 2); }
      else if (u.st === 'asleep') zzz(k, u.x + 30, u.y + 6, t, 0);
      else if (u.st === 'ready') { const lbl = lang === 'pt' ? 'PRONTO!' : 'DONE!', bw = tw(lbl) + 7; bubble(k, u.x + 15 - bw / 2, u.y - 12, bw, 11); text(k, lbl, u.x + 19 - bw / 2, u.y - 9, '#8a6200'); }
    }
  }
  function zzz(k, x, y, t, off) { const ph = ((t + off) % 2400) / 2400; k.globalAlpha = 1 - ph; text(k, 'Z', x + ph * 6, y - ph * 14, '#4a5590', ph > .5 ? 2 : 1); k.globalAlpha = 1; }

  // ---- HTML labels (overlay.js): state colour and tool name, as the design's paper label ----
  function tagStyle(p) { const s = STATE[stateOf(p)]; return `--st:${s.hud};--st-ink:${s.ink};--tool-ink:${toolInk(p)}`; }
  function stateLabel(p) { const s = STATE[stateOf(p)]; return lang === 'pt' ? s.pt : s.en; }
  const signName = Rm => { const B = biomeOf(Rm); return lang === 'pt' ? B.pt : B.en; };
  const typeColor = Rm => TYPE_COLOR[biomeOf(Rm).type];

  return { drawScene: drawBiomaScene, biomeOf, tagStyle, stateLabel, signName, typeColor, TYPE_COLOR, critter };
})();
