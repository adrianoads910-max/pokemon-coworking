'use strict';
// Pokémon theme: type lists from PokéAPI and sprites from the PokeAPI/sprites repo, cached on disk
// and served from our own origin (the page's CSP only allows 'self' images).
const fs = require('fs');
const os = require('os');
const path = require('path');

const CACHE = path.join(os.homedir(), '.config', 'coworking-agents', 'pokemon-cache');
const API = 'https://pokeapi.co/api/v2';
const RAW = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
const TYPES = new Set(['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy']);
const KINDS = { art: id => `${RAW}/other/official-artwork/${id}.png`, icon: id => `${RAW}/versions/generation-vii/icons/${id}.png`, back: id => `${RAW}/back/${id}.png`, front: id => `${RAW}/${id}.png` };
const MAX_ID = 807; // generation VII icons stop here
// legendary and mythical Pokémon up to MAX_ID: kept out of the office by default
const LEGENDS = new Set([144, 145, 146, 150, 151, 243, 244, 245, 249, 250, 251, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386,
  480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493, 494, 638, 639, 640, 641, 642, 643, 644, 645, 646, 647, 648, 649,
  716, 717, 718, 719, 720, 721, 772, 773, 785, 786, 787, 788, 789, 790, 791, 792, 793, 794, 795, 796, 797, 798, 799, 800, 801, 802, 803, 804, 805, 806, 807]);

const pending = new Map();
function once(key, fn) {
  if (!pending.has(key)) pending.set(key, fn().finally(() => pending.delete(key)));
  return pending.get(key);
}
// files PokéAPI answered 404 for (a sprite that doesn't exist): not asked again until the server restarts,
// while network errors are, since the page retries them
const missing = new Set();
function cached(file, fetchIt) {
  const p = path.join(CACHE, file);
  try { return Promise.resolve(fs.readFileSync(p)); } catch {}
  if (missing.has(file)) return Promise.reject(new Error('missing'));
  return once(file, async () => {
    let buf;
    try { buf = await fetchIt(); } catch (e) { if (e.status === 404) missing.add(file); throw e; }
    fs.mkdirSync(CACHE, { recursive: true });
    fs.writeFileSync(p, buf);
    return buf;
  });
}
async function get(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw Object.assign(new Error(`${r.status} ${url}`), { status: r.status });
  return Buffer.from(await r.arrayBuffer());
}

// ids of the base-form, non-legendary Pokémon of a type, as JSON
function typeList(type) {
  if (!TYPES.has(type)) return Promise.reject(new Error('bad type'));
  return cached(`type-${type}.json`, async () => {
    const body = JSON.parse(await get(`${API}/type/${type}`));
    const ids = body.pokemon.map(e => Number((/\/(\d+)\/?$/.exec(e.pokemon.url) || [])[1]))
      .filter(id => id > 0 && id <= MAX_ID && !LEGENDS.has(id)).sort((a, b) => a - b);
    return Buffer.from(JSON.stringify(ids));
  });
}

// evolution line through this Pokémon, as ids: the path from the base form to it, then the first
// branch onwards (Gastly → Haunter → Gengar)
function line(id) {
  id = Number(id);
  if (!Number.isInteger(id) || id < 1 || id > MAX_ID) return Promise.reject(new Error('bad id'));
  return cached(`line-${id}.json`, async () => {
    const species = JSON.parse(await get(`${API}/pokemon-species/${id}`));
    const chain = JSON.parse(await get(species.evolution_chain.url)).chain;
    const idOf = node => Number((/\/(\d+)\/?$/.exec(node.species.url) || [])[1]);
    const find = (node, trail) => {
      const here = [...trail, idOf(node)];
      if (idOf(node) === id) return { node, here };
      for (const n of node.evolves_to) { const f = find(n, here); if (f) return f; }
      return null;
    };
    const hit = find(chain, []) || { node: chain, here: [idOf(chain)] };
    const ids = hit.here;
    for (let n = hit.node; n.evolves_to.length; ) { n = n.evolves_to[0]; ids.push(idOf(n)); }
    return Buffer.from(JSON.stringify(ids.filter(x => x > 0 && x <= MAX_ID)));
  });
}

// name, types, size and the moves it learns by levelling up (lowest level across the games)
function info(id) {
  id = Number(id);
  if (!Number.isInteger(id) || id < 1 || id > MAX_ID) return Promise.reject(new Error('bad id'));
  return cached(`info-${id}.json`, async () => {
    const p = JSON.parse(await get(`${API}/pokemon/${id}`));
    const moves = [];
    for (const m of p.moves) {
      const lv = m.version_group_details.filter(d => d.move_learn_method.name === 'level-up').map(d => d.level_learned_at);
      if (lv.length) moves.push({ name: m.move.name, level: Math.max(1, Math.min(...lv)) });
    }
    moves.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
    return Buffer.from(JSON.stringify({ id, name: p.name, types: p.types.map(t => t.type.name), height: p.height, weight: p.weight, moves }));
  });
}

// one move: type, power, accuracy, PP, class and its short effect (English)
function move(name) {
  if (!/^[a-z0-9-]{1,40}$/.test(name)) return Promise.reject(new Error('bad move'));
  return cached(`move-${name}.json`, async () => {
    const m = JSON.parse(await get(`${API}/move/${name}`));
    const en = (m.names.find(n => n.language.name === 'en') || {}).name || name;
    const fx = ((m.effect_entries.find(e => e.language.name === 'en') || {}).short_effect || '').replace(/\$effect_chance/g, m.effect_chance == null ? '' : m.effect_chance);
    return Buffer.from(JSON.stringify({ name, label: en, type: m.type.name, power: m.power, accuracy: m.accuracy, pp: m.pp, cls: m.damage_class.name, effect: fx }));
  });
}

function sprite(kind, id) {
  id = Number(id);
  if (!KINDS[kind] || !Number.isInteger(id) || id < 1 || id > MAX_ID) return Promise.reject(new Error('bad sprite'));
  return cached(`${kind}-${id}.png`, () => get(KINDS[kind](id)));
}

// /api/pokemon/type/fire  ·  /api/pokemon/line/4  ·  /api/pokemon/info/4  ·  /api/pokemon/move/ember  ·  /api/pokemon/sprite/icon/4.png
function route(pathname) {
  let m = /^\/api\/pokemon\/type\/([a-z]+)$/.exec(pathname);
  if (m) return typeList(m[1]).then(body => ({ type: 'application/json', body }));
  m = /^\/api\/pokemon\/info\/(\d{1,3})$/.exec(pathname);
  if (m) return info(m[1]).then(body => ({ type: 'application/json', body }));
  m = /^\/api\/pokemon\/move\/([a-z0-9-]{1,40})$/.exec(pathname);
  if (m) return move(m[1]).then(body => ({ type: 'application/json', body }));
  m = /^\/api\/pokemon\/line\/(\d{1,3})$/.exec(pathname);
  if (m) return line(m[1]).then(body => ({ type: 'application/json', body }));
  m = /^\/api\/pokemon\/sprite\/(art|icon|back|front)\/(\d{1,3})\.png$/.exec(pathname);
  if (m) return sprite(m[1], m[2]).then(body => ({ type: 'image/png', body }));
  return null;
}

module.exports = { route, typeList, line, info, move, sprite, LEGENDS, MAX_ID };
