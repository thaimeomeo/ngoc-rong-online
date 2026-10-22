/* Ki Realm: a retro pixel Dragon Ball style side-scrolling MMORPG. */
(() => {
'use strict';
const MB = () => window.mindblown;
const DPR = Math.min(2, window.devicePixelRatio || 1);
const VIEW_H = 270;          // world units visible vertically in landscape
const GY = 260;              // ground top (world y, down positive)
let LW = 2600;               // level width (per-biome; see levelWidth)
const ARENA = 640;           // flat boss arena at the far end
const SPR = 0.56;             // texture px -> world units for characters
const FONT = 'PixelifySans, VT323, monospace';
const C = {
  navy: 0x1B2340, gold: 0xF4C542, orange: 0xF08A24, dark: 0x1A1A2E, red: 0xE0302A, redHi: 0xFF7A6E,
  hpEmpty: 0x3A1418, blue: 0x2F7BE0, blueHi: 0x7DB8FF, kiEmpty: 0x13224A, exp: 0xFFD23B, green: 0x3CC24A,
};
let T = {};
const TD = {
  walk_speed: 105, jump_power: 300, gravity: 820, fly_speed: 140, fly_drain: 7, ki_regen: 3, points_per_level: 5,
  exp_rate: 1, gold_rate: 1, mon_drop_chance: 0.1, boss_drop_chance: 0.7, boss_respawn_seconds: 75, bean_stage_seconds: 40, start_beans: 3, monsters: 9,
  respawn_seconds: 6, monster_power: 1, transform_seconds: 18, waste_level: 5, namek_level: 10, music: true, hud_scale: 1.15,
  player_name_color: '#ffe14d', monster_name_color: '#ff6a4a', potion_price: 15, charm_price: 45, charm_seconds: 60,
  grind_level: 15, grind_monsters: 14, grind_respawn: 3, arena_level: 20, arena_level_step: 2, arena_hp_mul: 0.35, arena_atk_mul: 0.55,
  board_price: 800, home_width: 1400, chest_rare_chance: 0.05,
};
// the home base is deliberately small and cosy; the other maps keep the long layout
const levelWidth = (k) => (k === 'home' ? Math.max(800, Math.round(tv('home_width'))) : 2600);
const tv = (k) => (T[k] !== undefined ? T[k] : TD[k]);

/* ---------------------------------------------------------------- data */
const RACES = {
  earth: { key: 'earth', name: 'Earthling', vn: 'Trái Đất', blast: 0x5EE0FF, blastHex: '#5EE0FF', aura: [0x9EEBFF, 0x5EE0FF],
    base: { hp: 120, ki: 100, atk: 12, arm: 7, crit: 6 }, atkInt: 0.2, regen: 0.5, portrait: 0,
    beam: 'Kamehameha', trans: 'Kaioken', heal: 'Meditate', healPct: 0.18, healCd: 16,
    blurb: 'Balanced fighter. Fastest combos.', bars: [3, 3, 3, 3, 5] },
  saiyan: { key: 'saiyan', name: 'Saiyan', vn: 'Xayda', blast: 0xFFE14D, blastHex: '#FFE14D', aura: [0xFFE55C, 0xFFB800],
    base: { hp: 112, ki: 90, atk: 16, arm: 3, crit: 8 }, atkInt: 0.3, regen: 0.4, portrait: 1,
    beam: 'Galick Gun', trans: 'Super Saiyan', heal: 'Focus', healPct: 0.15, healCd: 18,
    blurb: 'Huge damage, thin armour. Can turn Super Saiyan.', bars: [3, 2, 5, 1, 3] },
  namek: { key: 'namek', name: 'Namekian', vn: 'Namếc', blast: 0x9CFF5A, blastHex: '#9CFF5A', aura: [0xC8FF9A, 0x6FD13A],
    base: { hp: 150, ki: 110, atk: 10, arm: 6, crit: 4 }, atkInt: 0.32, regen: 2.2, portrait: 2,
    beam: 'Special Beam', trans: 'Regen Aura', heal: 'Healing Light', healPct: 0.42, healCd: 9,
    blurb: 'Regenerates fast. Strong heal and support aura.', bars: [5, 4, 2, 3, 2] },
};
const BIOMES = {
  // a safe home base: no monsters, just your own bean plant, chest and the Gift keeper
  home: { key: 'home', name: 'Nhà', sub: 'Your Home Base', lv: [1, 1], sky: 0x7FB6E8, dirt: 0x6A4A24,
    water: false, home: true, mons: [] },
  field: { key: 'field', name: 'Làng Kame', sub: 'Grassy Training Fields', lv: [1, 6], sky: 0x46A8F5, dirt: 0x6A3E1C,
    water: true, mons: [{ t: 'dino', name: 'Khủng Long', lv: [1, 3] }, { t: 'dino', name: 'Khủng Long Cam', lv: [4, 6], tint: 0xFFB774, scale: 1.12 }] },
  waste: { key: 'waste', name: 'Hoang Mạc', sub: 'Rocky Wasteland', lv: [6, 12], sky: 0xF7C873, dirt: 0x4A2A1A,
    water: false, mons: [{ t: 'bandit', name: 'Thổ Phỉ', lv: [6, 9] }, { t: 'bandit', name: 'Trùm Thổ Phỉ', lv: [10, 12], scale: 1.22, tint: 0xFFD0C0 }] },
  namek: { key: 'namek', name: 'Hành Tinh Namếc', sub: 'Alien Planet', lv: [12, 20], sky: 0xA9EE9A, dirt: 0x3A4458,
    water: true, mons: [{ t: 'bat', name: 'Dơi Namếc', lv: [12, 16] }, { t: 'bat', name: 'Dơi Chúa', lv: [17, 20], scale: 1.45, tint: 0xFFB0E0 }] },
  // map 4: a battlefield of weak, fast-returning monsters, made for farming
  grind: { key: 'grind', name: 'Vùng Cày Luyện', sub: 'Grinding Zone', lv: [12, 28], sky: 0x2A1230, dirt: 0x2A1410,
    water: false, farm: { exp: 1.3, gold: 1.6 }, mons: [
      { t: 'saiba', name: 'Saibaman', lv: [12, 18], hpMul: 0.25, atkMul: 0.5 },
      { t: 'saiba', name: 'Saibaman Đột Biến', lv: [19, 28], scale: 1.2, tint: 0xC8A0FF, hpMul: 0.4, atkMul: 0.6 }] },
  // map 5: the tournament stage, one opponent at a time, no wandering monsters
  arena: { key: 'arena', name: 'Đấu Trường', sub: 'Martial Arts Tournament', lv: [1, 99], sky: 0x3E9EE8, dirt: 0x4A4A56,
    water: false, arena: true, mons: [] },
};
const BIOME_ORDER = ['home', 'field', 'waste', 'namek', 'grind', 'arena'];
const levelNeed = (k) => (k === 'home' ? 1 : k === 'field' ? 1 : k === 'waste' ? Math.round(tv('waste_level')) : k === 'namek' ? Math.round(tv('namek_level')) : k === 'grind' ? Math.round(tv('grind_level')) : Math.round(tv('arena_level')));
// tournament opponents: they scale with your level and get stronger every round
const ARENA_NAMES = ['Trần Tiểu Hổ', 'Lý Bạch Long', 'Vệ Sĩ Sắt', 'Hoàng Lôi', 'Bóng Đêm', 'Kiếm Vương', 'Vô Danh Sư Phụ'];
function arenaFoeInfo(r) {
  const lv = Math.max(2, S.lv - 1 + (r - 1) * Math.max(1, Math.round(tv('arena_level_step'))));
  const pw = tv('monster_power');
  // every round steps up both the level and the raw difficulty
  const ramp = 1 + (r - 1) * 0.08;
  const moves = ['punch', 'blast'];
  if (r >= 2) moves.push('punch');
  if (r >= 3) moves.push('kick');
  if (r >= 4) moves.push('dash');
  if (r >= 6) moves.push('kick');
  return { lv, race: ['earth', 'saiyan', 'namek'][(r - 1) % 3], name: ARENA_NAMES[(r - 1) % ARENA_NAMES.length], moves,
    hp: Math.round((26 + lv * 20 + lv * lv * 1.2) * pw * Number(tv('arena_hp_mul')) * ramp),
    atk: (5 + lv * 3) * pw * Number(tv('arena_atk_mul')) * (1 + (r - 1) * 0.05), arm: lv * 1.5,
    speed: 78 + Math.min(42, r * 4), rec: Math.max(0.16, 0.5 - r * 0.04) };
}
function arenaReward(lv, r) {
  return { gold: Math.round((10 + lv * 5) * tv('gold_rate') * (1 + (r - 1) * 0.15)),
    exp: Math.round((10 + lv * 8) * tv('exp_rate') * (1 + (r - 1) * 0.1)),
    rarity: r >= 7 ? 3 : r >= 4 ? 2 : 1, prize: r >= 3 };
}
// a Reward Chest grows in value with the round reached
function chestTierName(t) { return t >= 7 ? 'Huyền Thoại' : t >= 5 ? 'Vàng' : t >= 3 ? 'Bạc' : 'Đồng'; }
function chestValue(tier, lv) {
  return { gold: Math.round((30 + (lv || 1) * 8) * (1 + (tier - 1) * 0.4) * tv('gold_rate')),
    gems: 2 + tier * 2 + Math.floor((lv || 1) / 10) };
}
const MON = {
  dino: { frames: 3, h: 42, w: 30, fly: false, speed: 38, atkFrame: 2, hurt: 3 },
  bandit: { frames: 3, h: 46, w: 18, fly: false, speed: 44, atkFrame: 2, hurt: 3 },
  bat: { frames: 2, h: 30, w: 22, fly: true, speed: 55, atkFrame: 2, hurt: 3 },
  saiba: { frames: 4, h: 40, w: 26, fly: false, speed: 60, atkFrame: 2, hurt: 3 },
};
// one boss per map, waiting in an arena at the far end in front of the gate
const BOSSES = {
  field: { t: 'boss_field', name: 'Vua Khủng Long', lv: 8, hpMul: 4.2, atkMul: 1.35, w: 58, h: 80, fly: false, speed: 34, scale: 0.56,
    moves: ['charge', 'stomp', 'bite'], gear: [['glove', 'Nanh Vua Khủng Long'], ['gi', 'Giáp Vảy Đỏ'], ['boot', 'Giày Móng Vuốt']] },
  waste: { t: 'boss_waste', name: 'Tướng Cướp Râu Đỏ', lv: 15, hpMul: 4.2, atkMul: 1.3, w: 40, h: 82, fly: false, speed: 44, scale: 0.56,
    moves: ['bombs', 'leap', 'slash'], gear: [['ring', 'Nhẫn Hải Tặc'], ['belt', 'Đai Râu Đỏ'], ['glove', 'Găng Đại Đao']] },
  namek: { t: 'boss_namek', name: 'Quỷ Vương Hắc Ma', lv: 23, hpMul: 4.2, atkMul: 1.3, w: 34, h: 70, fly: true, speed: 70, scale: 0.6,
    moves: ['volley', 'deathbeam', 'warp'], gear: [['radar', 'Rada Quỷ Vương'], ['gi', 'Áo Choàng Hắc Ma'], ['ring', 'Ngọc Lục Bảo']] },
};
const SLOTS = [
  { k: 'gi', name: 'Áo Võ', icon: 0, stat: ['hp', 'arm'] },
  { k: 'glove', name: 'Găng', icon: 1, stat: ['atk'] },
  { k: 'boot', name: 'Giày', icon: 2, stat: ['arm', 'hp'] },
  { k: 'radar', name: 'Rada', icon: 3, stat: ['crit'] },
  { k: 'belt', name: 'Đai', icon: 4, stat: ['ki', 'hp'] },
  { k: 'ring', name: 'Nhẫn', icon: 6, stat: ['atk', 'crit'] },
  // the hoverboard has its own dedicated slot and is never rolled as random gear
  { k: 'board', name: 'Hoverboard', icon: 8, stat: [], board: true },
];
const GEAR_SLOTS = SLOTS.filter((s) => !s.board);
const RARITY = [
  { n: 'Common', c: 0xFFFFFF, hex: '#ffffff', m: 1 },
  { n: 'Fine', c: 0x5BE35B, hex: '#5be35b', m: 1.5 },
  { n: 'Rare', c: 0x4FA3FF, hex: '#4fa3ff', m: 2.2 },
  { n: 'Epic', c: 0xC46BFF, hex: '#c46bff', m: 3.2 },
];
const STAT_INFO = [
  { k: 'hp', n: 'HP', c: 0xE0302A, per: 20 },
  { k: 'ki', n: 'Ki', c: 0x2F7BE0, per: 12 },
  { k: 'atk', n: 'Attack', c: 0xF08A24, per: 2 },
  { k: 'arm', n: 'Armor', c: 0x9AA6B8, per: 2 },
  { k: 'crit', n: 'Crit', c: 0xFFE14D, per: 0.6 },
];

/* ---------------------------------------------------------------- shop goods (consumables) */
// potions heal at once; Power Charms give a timed buff (stack = refresh the timer)
const GOODS = [
  { k: 'pot_s', n: 'Health Potion', icon: 0, kind: 'potion', price: () => tv('potion_price'), d: 'Restores 40% HP', hp: 0.4 },
  { k: 'pot_l', n: 'Great Potion', icon: 1, kind: 'potion', price: () => tv('potion_price') * 3, d: 'Full HP, +30% Ki', hp: 1, ki: 0.3 },
  { k: 'pot_ki', n: 'Ki Potion', icon: 2, kind: 'potion', price: () => Math.round(tv('potion_price') * 1.4), d: 'Restores 60% Ki', ki: 0.6 },
  { k: 'ch_atk', n: 'Fist Charm', icon: 3, kind: 'charm', price: () => tv('charm_price'), d: '+35% Attack', buff: 'atk', col: '#FF9A1F', c: 0xFF9A1F },
  { k: 'ch_arm', n: 'Stone Charm', icon: 4, kind: 'charm', price: () => tv('charm_price'), d: '+50% Armor', buff: 'arm', col: '#C8D0DC', c: 0xC8D0DC },
  { k: 'ch_spd', n: 'Wind Charm', icon: 5, kind: 'charm', price: () => tv('charm_price'), d: '+30% Speed', buff: 'spd', col: '#7DF9FF', c: 0x7DF9FF },
];
const BUFF_MUL = { atk: 1.35, arm: 1.5, spd: 1.3 };
const goodOf = (k) => GOODS.find((g) => g.k === k);
const goodSell = (g) => Math.max(1, Math.floor(g.price() / 2));

/* ---------------------------------------------------------------- materials & progression */
// the blacksmith forges gear upwards with vàng and these two materials
const MATS = {
  ore: { k: 'ore', n: 'Quặng Sắt', short: 'Quặng', icon: 'item_5', col: '#B8C0CE' },
  shard: { k: 'shard', n: 'Mảnh Pha Lê', short: 'Pha Lê', icon: 'item_7', col: '#7DF9FF' },
};
const MAX_UP = 10;
const GEM_COST = 50;                 // ngọc per single gem summon
// the free gift, once a day, cycling through seven days of escalating rewards
const DAILY = [
  { gold: 60 }, { beans: 2 }, { tickets: 1 }, { gold: 120, mat: { ore: 2 } },
  { gems: 30 }, { mat: { ore: 3, shard: 1 }, beans: 1 }, { gems: 60, tickets: 2 },
];
function todayKey() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function dailyAvailable() { return !!S && (!S.daily || S.daily.last !== todayKey()); }
function dailyDesc(r) {
  const parts = [];
  if (r.gold) parts.push(r.gold + ' vàng');
  if (r.gems) parts.push(r.gems + ' ngọc');
  if (r.tickets) parts.push(r.tickets + ' vé');
  if (r.beans) parts.push(r.beans + ' đậu');
  if (r.mat) for (const k in r.mat) parts.push(r.mat[k] + ' ' + MATS[k].short);
  return parts.join(', ');
}
// the icons a reward is made of, so a day tile shows what you get, not only words
function rewardIcons(r) {
  const out = [];
  if (r.gold) out.push({ icon: 'ui_coin', n: r.gold });
  if (r.gems) out.push({ icon: 'gempx', n: r.gems });
  if (r.tickets) out.push({ icon: 'ticketpx', n: r.tickets });
  if (r.beans) out.push({ icon: 'beanpx', n: r.beans });
  if (r.mat) for (const k in r.mat) out.push({ icon: MATS[k].icon, n: r.mat[k] });
  return out;
}
function giveReward(r) {
  if (r.gold) S.gold += r.gold;
  if (r.gems) S.gems = (S.gems || 0) + r.gems;
  if (r.tickets) S.tickets = (S.tickets || 0) + r.tickets;
  if (r.beans) S.beans += r.beans;
  if (r.mat) { S.mat = S.mat || {}; for (const k in r.mat) S.mat[k] = (S.mat[k] || 0) + r.mat[k]; }
}
/* ---------------------------------------------------------------- gift codes */
// the Gift keeper trades a typed code for a reward, once per code per account
const CODES = {
  KIREALM: { label: 'Starter pack', gold: 500, gems: 20 },
  DRAGON: { label: 'Dragon gift', tickets: 3, beans: 3 },
  HOVERBOARD: { board: true },
  KAMEHAME: { label: 'Potion crate', goods: { pot_l: 3, pot_ki: 3 } },
  SENZU: { label: 'Senzu stash', beans: 5 },
  MYSTERYBOX: { label: 'Mystery box', gems: 50, mat: { ore: 3, shard: 1 } },
};
function makeBoard(lv) {
  const it = makeItem(Math.max(1, Math.round(lv || S.lv)), { s: 'board', r: 2 });
  it.n = 'Hoverboard';
  return it;
}
// returns { ok, reason?, msg } and mutates S. The caller saves progress.
function grantCode(raw) {
  const code = String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!code) return { ok: false, reason: 'empty', msg: 'Type a code first.' };
  if (code.length > 24) return { ok: false, reason: 'empty', msg: 'That is not a code.' };
  const r = CODES[code];
  if (!r) return { ok: false, reason: 'bad', msg: 'That code does not exist.' };
  S.codes = S.codes || {};
  if (S.codes[code]) return { ok: false, reason: 'used', msg: 'Code already used.' };
  const got = [];
  giveReward(r);
  if (r.gold) got.push(r.gold + ' vàng');
  if (r.gems) got.push(r.gems + ' ngọc');
  if (r.tickets) got.push(r.tickets + ' vé');
  if (r.beans) got.push(r.beans + ' đậu');
  if (r.mat) for (const k in r.mat) got.push(r.mat[k] + ' ' + MATS[k].short);
  if (r.goods) { S.bagc = S.bagc || {}; for (const k in r.goods) { S.bagc[k] = Math.min(99, (S.bagc[k] || 0) + r.goods[k]); got.push(r.goods[k] + ' ' + goodOf(k).n); } }
  if (r.board) {
    if (S.inv.length >= 18) { S.gold += itemSell(makeBoard(S.lv)); got.push('and a Hoverboard (bag was full, paid as vàng)'); }
    else { const b = makeBoard(S.lv); S.inv.push(b); got.push('Hoverboard'); }
  }
  S.codes[code] = Date.now();
  return { ok: true, msg: (r.label ? r.label + ': ' : '') + got.join(', ') };
}
// an item's stats after its forge upgrades (+14% of each base stat per level)
function effSt(it) {
  const u = it.up || 0;
  if (!u) return it.st;
  const out = {};
  for (const k in it.st) { const b = it.st[k] * 0.14 * u; out[k] = k === 'crit' ? Math.round((it.st[k] + b) * 10) / 10 : Math.round(it.st[k] + b); }
  return out;
}
function upCost(it) {
  const u = (it.up || 0) + 1;
  return { gold: Math.round((40 + it.lv * 8) * u * (1 + it.r * 0.35) * tv('gold_rate')),
    mat: { ore: 1 + Math.floor(u / 2), shard: u >= 3 ? Math.floor((u - 1) / 2) : 0 } };
}
// every tenth pull is guaranteed Rare or better
function rollSummon(pity, premium) {
  const roll = Math.random();
  let r;
  if (pity) r = roll < 0.1 ? 3 : 2;
  else if (premium) r = roll < 0.06 ? 3 : roll < 0.3 ? 2 : roll < 0.75 ? 1 : 0;
  else r = roll < 0.03 ? 3 : roll < 0.18 ? 2 : roll < 0.6 ? 1 : 0;
  return makeItem(Math.max(1, S.lv), { r });
}

/* ---------------------------------------------------------------- Divine Dragon & Lucky Spin */
// seven unique Dragon Balls summon the Divine Dragon; one wish is granted each time
function ballsOwned() { const out = []; for (let s = 1; s <= 7; s++) if (S.balls && S.balls[s] > 0) out.push(s); return out; }
function hasAllBalls() { return ballsOwned().length >= 7; }
function takeAllBalls() { S.balls = S.balls || {}; for (let s = 1; s <= 7; s++) { S.balls[s] = (S.balls[s] || 0) - 1; if (S.balls[s] <= 0) delete S.balls[s]; } }
// the four wishes offered by the dragon. Strength is the game's Attack stat: there is no separate
// Strength stat, so the permanent boost lands on Attack (see stats()).
const WISHES = [
  { k: 'str', n: 'Sức Mạnh Vĩnh Viễn', en: 'Permanent Strength', d: 'Attack +6, permanent and stacking', icon: 'sk0', col: 0xFF9A1F, c: 0xFF9A1F },
  { k: 'gold', n: 'Kho Báu Vô Tận', en: 'A Mountain of Gold', d: 'A huge pile of vàng for the shop', icon: 'ui_coin', col: '#FFE14D', c: 0xF4C542 },
  { k: 'ticket', n: 'Vé Triệu Hồi', en: 'Gacha Tickets', d: '10 Lucky Spin tickets', icon: 'ticketpx', col: '#7DF9FF', c: 0x2F7BE0 },
  { k: 'vip', n: 'Thiên Y VIP', en: 'VIP Item', d: 'A one-of-a-kind golden outfit', icon: 'item_0', col: '#C46BFF', c: 0xC46BFF },
];
// the Lucky Spin wheel: eight prizes, read clockwise from the pointer
const WHEEL = [
  { k: 'gold', n: 'Vàng', icon: 'ui_coin', col: 0xB07A10, weight: 26 },
  { k: 'bean', n: 'Đậu', icon: 'beanpx', col: 0x3E8F1F, weight: 15 },
  { k: 'ticket', n: 'Vé', icon: 'ticketpx', col: 0x2F7BE0, weight: 18 },
  { k: 'gem', n: 'Ngọc', icon: 'gempx', col: 0x6A3FA0, weight: 20 },
  { k: 'gear', n: 'Trang bị', icon: 'item_1', col: 0x4A5070, weight: 12 },
  { k: 'gold2', n: 'Túi vàng', icon: 'ui_coin', col: 0xD9A020, weight: 8 },
  { k: 'rare', n: 'Rare+', icon: 'item_2', col: 0x4FA3FF, weight: 4 },
  { k: 'jack', n: 'JACKPOT', icon: 'item_6', col: 0xE0302A, weight: 1 },
];
function pickWheel() {
  const tot = WHEEL.reduce((a, p) => a + p.weight, 0);
  let r = Math.random() * tot;
  for (let i = 0; i < WHEEL.length; i++) { r -= WHEEL[i].weight; if (r <= 0) return i; }
  return 0;
}
// the VIP prize: a named Epic fighting outfit, far above an ordinary roll
function makeVipItem() {
  const it = makeItem(Math.max(6, S.lv + 2), { s: 'gi', r: 3 });
  const lv = Math.max(6, S.lv + 2);
  it.n = 'Thiên Y VIP';
  it.vip = true; it.boss = true;
  it.st = { hp: Math.round(60 + lv * 9), arm: Math.round(14 + lv * 1.6) };
  return it;
}

/* ---------------------------------------------------------------- NPCs */
// f = frame in npc_*.png. Story NPCs talk; shop NPCs open the shop.
const NPCS = {
  home: [
    { id: 'homemom', f: 2, x: 168, name: 'Bà Nội', role: 'story' },
    { id: 'giftkeeper', f: 5, x: 820, name: 'Gift', role: 'gift', greet: 'Psst. I keep free gifts for fighters who know the right code.' },
  ],
  field: [
    { id: 'master', f: 0, x: 62, name: 'Lão Rùa', role: 'story' },
    { id: 'merchant', f: 1, x: 246, name: 'Chú Bán Hàng', role: 'shop', greet: 'Potions and Power Charms! Best prices in Làng Kame!' },
    { id: 'smith', f: 3, x: 430, name: 'Thợ Rèn Già', role: 'smith', greet: 'Bring me vàng and materials. I will make your gear stronger than the day you found it.' },
    { id: 'lam', f: 2, x: 1180, name: 'Bé Lam', role: 'story' },
  ],
  waste: [
    { id: 'trader_w', f: 5, x: 214, name: 'Thương Nhân Bí Ẩn', role: 'shop', greet: 'Heh heh... the desert is cruel. Buy something, traveller.' },
    { id: 'smith_w', f: 3, x: 420, name: 'Thợ Rèn Sa Mạc', role: 'smith', greet: 'The desert eats armour for breakfast. Let me put some of it back.' },
    { id: 'monk', f: 3, x: 1240, name: 'Sư Sa Mạc', role: 'story' },
  ],
  namek: [
    { id: 'elder', f: 4, x: 282, name: 'Trưởng Lão', role: 'story' },
    { id: 'trader_n', f: 5, x: 196, name: 'Thương Nhân Bí Ẩn', role: 'shop', greet: 'You again! I travel far for good customers. Heh heh.' },
    { id: 'smith_n', f: 3, x: 430, name: 'Thợ Rèn Namek', role: 'smith', greet: 'Our crystal grows under the green sky. Give me a shard and your gear will sing.' },
  ],
  grind: [
    { id: 'trader_g', f: 5, x: 150, name: 'Thương Nhân Bí Ẩn', role: 'shop', greet: 'A fighter who farms this cursed field? Buy potions. You will need them.' },
    { id: 'veteran', f: 3, x: 760, name: 'Lão Võ Sĩ', role: 'story' },
  ],
  arena: [
    { id: 'referee', f: 0, img: 'arena_npc_0', x: 980, name: 'Trọng Tài', role: 'arena' },
    { id: 'champ', f: 0, img: 'arena_npc_1', x: 700, name: 'Cựu Vô Địch', role: 'story' },
    { id: 'vendor_a', f: 1, x: 420, name: 'Bà Bán Nước', role: 'shop', greet: 'Potions and Power Charms for the challenger! A champion never enters the ring dry.' },
  ],
};
function npcLines(id) {
  const lv = S.lv, bk = S.bossKills || {}, met = (S.talked || {})[id] || 0;
  const wl = tv('waste_level'), nl = tv('namek_level');
  if (id === 'homemom') {
    if (!met) return { lines: [
      'Welcome home, child. Rest here whenever the world gets too loud.',
      'The Magic Bean Plant by the door grows healing beans over time. Plant a seed and come back for it.',
      'The Storage Chest holds what your bag cannot carry. Put gear in and it waits for you.',
      'And the Gift keeper down the road hands out free gifts to anyone with the right code.',
    ], give: { beans: 1 } };
    return { lines: ['Off to train again? Then go with a full belly, and come home when you need to rest.'] };
  }
  if (id === 'master') {
    if (!met) return { lines: [
      'Ho ho ho! A new fighter in Làng Kame? I am the old master of this village.',
      'Train on the dinosaurs to the east. Each level up gives you Potential Points: spend them in STATS.',
      'The pot by the path grows Magic Beans. One bean restores all your HP and Ki.',
      'Here, take 2 beans. And visit the merchant next door: his Power Charms make you stronger for a while.',
    ], give: { beans: 2 } };
    if (lv < wl) return { lines: ['Still Lv ' + lv + '? The Wasteland gate opens at Lv ' + wl + '.', 'Keep training. A real fighter never skips leg day. Ho ho!'] };
    if (!bk.field) return { lines: ['You have grown strong! But the Vua Khủng Long waits at the eastern gate.', 'He charges and stomps. Jump over his shockwave, then strike. A Fist Charm would help!'] };
    return { lines: ['You beat the Vua Khủng Long! The whole village is talking about it.', 'Out in the Wasteland, the bandits of Râu Đỏ rob travellers. Show them what Kame training means!'] };
  }
  if (id === 'lam') {
    if (!met) return { lines: [
      'Oh! You scared me. I am out picking herbs, but these dinosaurs keep chasing me!',
      'Grandpa says the orange ones further east are much tougher. Be careful.',
      'Here, I found some gold in the grass. Buy yourself a Health Potion!',
    ], give: { gold: 20 } };
    if (!bk.field) return { lines: ['They say the Vua Khủng Long wears a crown of bone. I hope you knock it off!'] };
    return { lines: ['You really beat the Dinosaur King? Wow!', 'Someday I want to build a radar that finds anything. Dragon Balls, maybe!'] };
  }
  if (id === 'monk') {
    if (!met) return { lines: [
      'Peace, traveller. I walk this desert to clear my mind.',
      'The bandit warlord Râu Đỏ throws bombs and leaps from afar. Keep moving and never stand still.',
      'A Stone Charm hardens the body. The mysterious trader at the gate sells them.',
      'Take this bean. A calm mind and a full belly win more fights than anger.',
    ], give: { beans: 1 } };
    if (lv < nl) return { lines: ['Namek opens to fighters of Lv ' + nl + '. You are Lv ' + lv + '. Patience.'] };
    if (!bk.waste) return { lines: ['Râu Đỏ still rules these sands. Free us of him, and the road to Namek is truly yours.'] };
    return { lines: ['The bandits flee at your name now. The desert is quiet again.', 'Beyond the far gate lies Namek, a green world under a green sky.'] };
  }
  if (id === 'elder') {
    if (!met) return { lines: [
      'Welcome to Namek, child of another world. Few outsiders reach this place.',
      'A demon, Quỷ Vương Hắc Ma, has poisoned our skies. His beam crosses the whole arena.',
      'When you see the red line, get out of its path. Then answer with your own beam.',
      'Accept this gift of gold. Use it well.',
    ], give: { gold: 120 } };
    if (!bk.namek) return { lines: ['The Demon King still flies over the far plains. Our people are counting on you.'] };
    return { lines: ['You have defeated the Demon King! Namek breathes again.', 'You are a true hero of three worlds. Keep training: the bosses always return.'] };
  }
  if (id === 'champ') {
    const best = (S.arena && S.arena.best) || 0;
    if (!met) return { lines: [
      'Ho! Another challenger. I held that belt for nine years, until a boy with a tail knocked me out in one blow.',
      'The referee there runs the ladder. Every round the fighter is stronger, and so is the prize.',
      'Lose once and you start again at round one. That is the rule of the ring.',
      'Take this purse. Buy a Power Charm before you step up. This is what I am good for now.',
    ], give: { gold: 150 } };
    if (best < 2) return { lines: ['Round one is a warm-up. Do not let it fool you.'] };
    if (best < 5) return { lines: ['Round ' + best + '! You have some spine after all. The real fighters start at round five.'] };
    return { lines: ['Round ' + best + ' is further than I ever went on my bad knee.', 'You carry the belt better than I did. Go on, keep climbing.'] };
  }
  if (id === 'veteran') {
    const best = (S.arena && S.arena.best) || 0;
    if (!met) return { lines: [
      'Hah! Another fighter drawn to this cursed field. These monsters rise again in seconds.',
      'Farm them as long as your arms hold out. Every kill pays vàng and EXP, and the field never runs dry.',
      'East of here stands the Đấu Trường. One fighter at a time, each one stronger than the last, and a prize to match.',
      'Take these beans. A farmer always shares his crop.',
    ], give: { beans: 2 } };
    if (lv < Math.round(tv('arena_level'))) return { lines: ['The tournament gate opens at Lv ' + Math.round(tv('arena_level')) + '. You are Lv ' + lv + '. Keep culling Saibamen until then.'] };
    if (best < 1) return { lines: ['You are ready for the ring. Step up to the referee and take the first round.'] };
    if (best < 4) return { lines: ['Round ' + best + '? Not bad. The real monsters start at round four, when they learn to dash.'] };
    return { lines: ['Round ' + best + ' and still farming for more. You are the reason the Saibamen hide.'] };
  }
  return { lines: ['...'] };
}

/* ---------------------------------------------------------------- quests */
// a short beginner chain that teaches the loop: talk, hunt, gather, slay.
const QUEST_ITEM = { key: 'shell', n: 'Mai Rùa', icon: 'shellpx', col: '#7DD37D' };
const QUEST_CHAIN = [
  { id: 'meet', kind: 'talk', npc: 'master', biome: 'field', exp: 30, gold: 50,
    title: 'A place to begin', desc: 'Talk to Lão Rùa in Làng Kame' },
  { id: 'hunt', kind: 'kill', need: 5, biome: 'field', exp: 80, gold: 120,
    title: 'Train your fists', desc: 'Defeat 5 dinosaurs in Làng Kame' },
  { id: 'shells', kind: 'collect', need: 3, biome: 'field', exp: 120, gold: 200,
    title: 'Turtle shells', desc: 'Collect 3 Mai Rùa from dinosaurs' },
  { id: 'boss', kind: 'boss', boss: 'field', biome: 'field', exp: 300, gold: 500,
    title: 'The Dinosaur King', desc: 'Defeat Vua Khủng Long at the east gate' },
];
function questState() {
  if (!S) return { step: 0, kills: 0, drops: 0, done: false };
  if (!S.quest || typeof S.quest !== 'object') S.quest = {};
  const q = S.quest;
  if (typeof q.step !== 'number' || q.step < 0) q.step = 0;
  if (typeof q.kills !== 'number') q.kills = 0;
  if (typeof q.drops !== 'number') q.drops = 0;
  if (typeof q.done !== 'boolean') q.done = q.step >= QUEST_CHAIN.length;
  return q;
}
function questStep() {
  const q = questState();
  return q.done || q.step >= QUEST_CHAIN.length ? null : QUEST_CHAIN[q.step];
}
function questHave() {
  const q = questStep(); if (!q) return 0;
  const st = questState();
  return q.kind === 'kill' ? st.kills : q.kind === 'collect' ? st.drops : 0;
}
function questStepText(s, i, st) {
  if (i < st.step || st.done) return 'Done';
  if (i > st.step) return s.desc;
  if (s.kind === 'kill') return 'Defeated ' + Math.min(st.kills, s.need) + '/' + s.need;
  if (s.kind === 'collect') return 'Mai Rùa ' + Math.min(st.drops, s.need) + '/' + s.need;
  return s.desc;
}
function questTalkLines(id) {
  const q = questStep();
  if (!q || q.kind !== 'talk' || q.npc !== id) return null;
  return [
    'Ho ho! A new face. Every great fighter starts with one small task.',
    'Go out and defeat 5 dinosaurs. They leave Mai Rùa when they fall: bring me 3 of them.',
    'Then the Dinosaur King himself waits at the eastern gate. Beat him, and the road is yours.',
  ];
}
function questGrant(step) {
  S.gold = (S.gold || 0) + step.gold;
  const exp = Math.max(1, Math.round(step.exp * tv('exp_rate')));
  if (W) W.gainExp(exp); else S.exp = (S.exp || 0) + exp;
  sdk((m) => m.event && m.event('quest_step', { quest: step.id, value: questState().step + 1 }));
}
function questComplete(step) {
  if (!step) return;
  questGrant(step);
  const q = questState();
  q.step += 1; q.kills = 0; q.drops = 0;
  if (q.step >= QUEST_CHAIN.length) q.done = true;
  saveProgress();
  if (HUD) { if (q.done) HUD.questAllDone(step); else HUD.questStepDone(step); }
}
function questOnTalk(npcId) {
  const q = questStep();
  if (q && q.kind === 'talk' && q.npc === npcId) questComplete(q);
}
function questOnKill(e) {
  if (!e || e.boss || e.fighter || !W) return;
  const q = questStep();
  if (!q || q.kind !== 'kill' || W.biome !== q.biome) return;
  const st = questState(); st.kills += 1;
  if (st.kills >= q.need) questComplete(q);
  else { if (HUD) HUD.questPing(); saveProgress(); }
}
function questOnBoss(biome) {
  const q = questStep();
  if (q && q.kind === 'boss' && q.boss === biome) questComplete(q);
}
function questOnDrop() {
  const q = questStep();
  if (!q || q.kind !== 'collect') return;
  const st = questState(); st.drops += 1;
  if (st.drops >= q.need) questComplete(q);
  else { if (HUD) HUD.questPing(); saveProgress(); }
}
// where the player must go for the current step, in world coords (or null)
function questObjective() {
  if (!W || !W.p) return null;
  const q = questStep();
  if (!q) return null;
  const here = W.biome;
  if (q.biome && q.biome !== here) {
    const ti = BIOME_ORDER.indexOf(q.biome), hi = BIOME_ORDER.indexOf(here);
    if (ti < 0 || hi < 0) return null;
    const right = ti > hi;
    let pt = null;
    for (const p of W.portals || []) if (right ? p.x > LW / 2 : p.x < LW / 2) pt = p;
    return pt ? { x: pt.x, y: GY - 24, via: q.biome } : null;
  }
  if (q.kind === 'talk') {
    const n = (W.npcs || []).find((x) => x.id === q.npc);
    return n ? { x: n.x, y: GY - 20 } : null;
  }
  if (q.kind === 'collect') {
    let best = null, bd = Infinity;
    for (const d of W.drops || []) if (!d.dead && d.type === 'quest') { const dd = Math.abs(d.x - W.p.x); if (dd < bd) { bd = dd; best = d; } }
    if (best) return { x: best.x, y: best.y - 6 };
  }
  if (q.kind === 'kill' || q.kind === 'collect') {
    let best = null, bd = Infinity;
    for (const e of W.ents || []) if (!e.dead && !e.boss && !e.fighter) { const dd = Math.abs(e.x - W.p.x); if (dd < bd) { bd = dd; best = e; } }
    if (best) return { x: best.x, y: best.y - best.h / 2 };
    return { x: LW - ARENA, y: GY - 30 };
  }
  if (q.kind === 'boss') {
    const b = (W.ents || []).find((e) => e.boss && !e.dead);
    if (b) return { x: b.x, y: b.y - b.h / 2 };
    return { x: LW - 300, y: GY - 30 };
  }
  return null;
}

/* ---------------------------------------------------------------- state */
let S = null;          // saved progress
let saveMeta = { loaded: false, dirty: false, busy: false };
function freshSave(race) {
  return { schemaVersion: 1, race, lv: 1, exp: 0, pts: 0, alloc: { hp: 0, ki: 0, atk: 0, arm: 0, crit: 0 },
    gold: 0, gems: 40, tickets: 3, mat: { ore: 0, shard: 0 }, daily: { last: null, day: 0 }, summon: 0,
    str: 0, vip: 0, pendingWish: false,
    beans: tv('start_beans'), inv: [], eq: {}, garden: { planted: null, lvl: 1 }, plant: { planted: null, lvl: 1 }, chest: [], codes: {},
    biome: 'home', kills: 0, seenHelp: false, uid: 1, bossKills: {}, bagc: {}, talked: {}, balls: {}, rchests: [],
    quest: { step: 0, kills: 0, drops: 0, done: false } };
}
const expNeed = (lv) => Math.round(30 * Math.pow(lv, 1.55) + 20);
function stats() {
  const r = RACES[S.race].base, L = S.lv - 1, a = S.alloc;
  const s = { hp: r.hp + L * 12 + a.hp * 20, ki: r.ki + L * 6 + a.ki * 12, atk: r.atk + L * 1.6 + a.atk * 2,
    arm: r.arm + L * 0.8 + a.arm * 2, crit: r.crit + a.crit * 0.6 };
  for (const k in S.eq) { const it = S.eq[k]; if (it) { const e = effSt(it); for (const sk in e) s[sk] += e[sk]; } }
  s.atk += (S.str || 0);               // permanent Strength wishes, banked on Attack
  s.crit = Math.min(75, s.crit);
  const bf = W && W.p && W.p.buffs;
  if (bf) { if (bf.atk > 0) s.atk *= BUFF_MUL.atk; if (bf.arm > 0) s.arm *= BUFF_MUL.arm; }
  return s;
}
function itemSell(it) { return Math.round((6 + it.lv * 3) * RARITY[it.r].m); }
const itemName = (it) => it.n || slotOf(it.s).name;
function makeItem(lv, o = {}) {
  const roll = Math.random();
  const r = o.r !== undefined ? o.r : roll < 0.03 ? 3 : roll < 0.14 ? 2 : roll < 0.42 ? 1 : 0;
  const slot = o.s ? slotOf(o.s) : GEAR_SLOTS[Math.floor(Math.random() * GEAR_SLOTS.length)];
  const m = RARITY[r].m, st = {};
  for (const k of slot.stat) {
    const base = { hp: 10 + lv * 4, ki: 6 + lv * 3, atk: 1 + lv * 0.6, arm: 1 + lv * 0.5, crit: 0.8 + lv * 0.12 }[k];
    st[k] = Math.max(1, Math.round(base * m * (0.85 + Math.random() * 0.3) * (k === 'crit' ? 10 : 1)) / (k === 'crit' ? 10 : 1));
  }
  S.uid = (S.uid || 1) + 1;
  const it = { id: S.uid, s: slot.k, r, lv, st };
  if (o.n) { it.n = o.n; it.boss = true; }
  return it;
}
const slotOf = (k) => SLOTS.find((s) => s.k === k);

/* ---------------------------------------------------------------- sdk helpers */
function sdk(fn) { try { const m = MB(); if (m) return fn(m); } catch (e) { console.warn(e); } }
async function loadProgress() {
  const m = MB();
  if (m && m.load) {
    try { const r = await m.load('progress'); saveMeta.loaded = true; saveMeta.scope = r && r.scope; return r && r.value; }
    catch (e) { console.warn('load failed', e); saveMeta.loadError = e; return null; }
  }
  try { return JSON.parse(localStorage.getItem('kirealm_dev') || 'null'); } catch (e) { return null; }
}
async function saveProgress(force) {
  if (!S) return;
  saveMeta.dirty = true;
  if (saveMeta.busy && !force) return;
  const m = MB();
  if (!(m && m.save)) { try { localStorage.setItem('kirealm_dev', JSON.stringify(S)); } catch (e) {} saveMeta.dirty = false; return; }
  saveMeta.busy = true;
  try {
    if (!saveMeta.loaded) { await m.load('progress'); saveMeta.loaded = true; }
    await m.save('progress', S); saveMeta.dirty = false;
  } catch (e) {
    const why = e && e.reason;
    if (why === 'REVISION_CONFLICT' || why === 'LOAD_FIRST' || why === 'AUTH_CHANGED') {
      try {
        const cur = await m.load('progress');
        if (cur && cur.value && cur.value.lv > S.lv && cur.value.race === S.race) { /* newer elsewhere: keep higher progress */
          Object.assign(S, cur.value);
        } else { await m.save('progress', S); }
        saveMeta.dirty = false;
      } catch (e2) { console.warn('save retry failed', e2); }
    } else console.warn('save failed', e);
  }
  saveMeta.busy = false;
}

/* ---------------------------------------------------------------- audio */
const SFX = ['roar', 'hit', 'kick', 'kiblast', 'beam', 'pop', 'coin', 'item', 'levelup', 'jump', 'transform', 'bean', 'hurt', 'die', 'click', 'bell'];
let soundOn = true, music = null, flyLoop = null, game = null;
function play(key, vol = 0.5, rate = 1) {
  if (!soundOn || !game) return;
  try { const snd = game.sound; if (snd.locked) return; if (!game.cache.audio.exists(key)) return; snd.play(key, { volume: vol, rate }); } catch (e) {}
}
function setMusic(biome) {
  if (!game) return;
  const key = 'bgm_' + biome;
  if (music && music.key === key) { music.setMute(!soundOn || !tv('music')); if (!music.isPlaying) music.play(); return; }
  if (music) { music.stop(); music.destroy(); music = null; }
  if (!game.cache.audio.exists(key)) return;
  music = game.sound.add(key, { loop: true, volume: 0.32 });
  music.setMute(!soundOn || !tv('music'));
  music.play();
}
function applySound(on) {
  soundOn = !!on;
  if (music) music.setMute(!soundOn || !tv('music'));
  if (flyLoop) flyLoop.setMute(!soundOn);
}

/* ---------------------------------------------------------------- text */
const noLig = (v) => (typeof v === 'string' ? v.replace(/f(?=[ilft])/g, 'f\u200C').replace(/ /g, '  ') : v);
const _setText = Phaser.GameObjects.Text.prototype.setText;
Phaser.GameObjects.Text.prototype.setText = function (v) { return _setText.call(this, noLig(Array.isArray(v) ? v.join('\n') : v)); };
function mkText(scene, x, y, s, size, color, res) {
  size = Math.max(7, size);
  const t = scene.add.text(x, y, noLig(s), { fontFamily: FONT, fontSize: size + 'px', color: color || '#ffffff',
    stroke: '#1a1a2e', strokeThickness: Math.max(2, Math.round(size / 3.5)) });
  t.setResolution(res || scene.textRes || 2);
  return t;
}

/* ---------------------------------------------------------------- pixel textures */
function pixTex(scene, key, rows, pal) {
  const h = rows.length, w = rows[0].length;
  const tex = scene.textures.createCanvas(key, w, h); const ctx = tex.getContext();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ch = rows[y][x]; if (ch === '.' || !pal[ch]) continue; ctx.fillStyle = pal[ch]; ctx.fillRect(x, y, 1, 1);
  }
  tex.refresh();
}
/* a Dragon Ball: an orange sphere with a red highlight and N red stars */
function ballTex(scene, key, stars) {
  const N = 12, c = 0;
  const tex = scene.textures.createCanvas(key, N, N); const ctx = tex.getContext();
  const cx = 5.5, cy = 5.5, r = 5.3;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    if (d > r) continue;
    ctx.fillStyle = d > r - 1 ? '#B05A10' : (x + y < cx + cy - 1 ? '#FFD24A' : '#F08A24');
    ctx.fillRect(x, y, 1, 1);
  }
  const spots = {
    1: [[5, 5]],
    2: [[3, 4], [7, 6]],
    3: [[4, 5], [6, 4], [5, 7]],
    4: [[3, 3], [7, 3], [3, 7], [7, 7]],
    5: [[3, 3], [7, 3], [3, 7], [7, 7], [5, 5]],
    6: [[3, 3], [6, 2], [7, 5], [6, 8], [3, 7], [2, 5]],
    7: [[5, 2], [7, 4], [6, 7], [3, 8], [2, 6], [3, 3], [7, 6]],
  }[Math.min(7, stars)] || [[5, 5]];
  ctx.fillStyle = '#C81E1E';
  for (const [sx, sy] of spots) ctx.fillRect(sx, sy, 1, 1);
  tex.refresh();
}
function makePixelTextures(scene) {
  const pal = { o: '#8a5a00', y: '#ffd400', l: '#fff3a0', d: '#d99a00', w: '#ffffff' };
  pixTex(scene, 'coin0', ['..ooo..', '.oyyyo.', 'oylyydo', 'oyyyydo', 'oyyyydo', '.oyddo.', '..ooo..'], pal);
  pixTex(scene, 'coin1', ['..oo...', '.oyyo..', '.olyo..', '.oyyo..', '.oydo..', '.oydo..', '..oo...'].map((r) => '.' + r.slice(0, 6)), pal);
  pixTex(scene, 'coin2', ['...o...', '..oyo..', '..oyo..', '..oyo..', '..odo..', '..odo..', '...o...'], pal);
  pixTex(scene, 'beanpx', ['..gggg..', '.gwgggg.', 'gwgggggd', 'ggggggdd', '.ggggdd.', '..dddd..'],
    { g: '#6FD13A', d: '#3E8F1F', w: '#ffffff' });
  pixTex(scene, 'hammerpx', ['.aaaaaaa.', 'aaaaaaaaa', 'aaaaaaaaa', '.aaaaaaa.', '...bbb...', '...bbb...', '...bbb...', '...bbb...', '...bbb...'],
    { a: '#B8C0CE', b: '#8A5A2A' });
  pixTex(scene, 'gempx', ['....a....', '...aba...', '..abbba..', '.abbcbba.', 'abbcccbba', '.abbcbba.', '..abbba..', '...aba...', '....a....'],
    { a: '#6A3FA0', b: '#B070E8', c: '#F0DCFF' });
  pixTex(scene, 'ticketpx', ['.ppppppp.', 'pwwwwwwwp', 'pwpppppwp', 'pwpwwwpwp', 'pwpppppwp', 'pwwwwwwwp', '.ppppppp.'],
    { p: '#2F7BE0', w: '#BDE0FF' });
  // the hoverboard gear icon (slot icon 8), drawn in code so it needs no file
  pixTex(scene, 'item_8', ['..cccccc..', '.cAAAAAAc.', 'cAaaaaaaAc', 'cAaaaaaaAc', '.cAAAAAAc.', '..cccccc..'],
    { c: '#5EE0FF', A: '#6A3FA0', a: '#C46BFF' });
  // the storage chest, and the Gift keeper's mark
  pixTex(scene, 'chestpx', ['DDDDDDDDDDDDDD', 'DkkkkkkkkkkkkD', 'DkKKKKKKKKKKkD', 'DkkkkkkkkkkkkD', 'DggggggggggggD', 'DkkkkllllkkkkD', 'DkKKlGGGGlKKkD', 'DkkklGllGlkkkD', 'DkkklGGGGlkkkD', 'DkKKKKKKKKKKkD', 'DDDDDDDDDDDDDD'],
    { D: '#3A2410', k: '#8A5426', K: '#B8763A', g: '#F4C542', G: '#FFF0A0', l: '#3A3A4A' });
  pixTex(scene, 'giftpx', ['..gggggg..', '..rrrrrr..', '..rrrrrr..', 'gggggggggg', 'gggggggggg', '..rrrrrr..', '..rrrrrr..', '..rrrrrr..', '..rrrrrr..', '..dddddd..'],
    { g: '#F4C542', r: '#E0302A', d: '#8A1A14' });
  // the quest drop: a Mai Rùa (turtle shell), drawn in code so it needs no file
  pixTex(scene, 'shellpx', ['.cccccc..', 'cSSSSSSc.', 'cSddddSc.', 'cSdSSdSc.', 'cSddddSc.', '.cSSSSc..', '..cccc...'],
    { c: '#2E7A3A', S: '#6FCF6A', d: '#3E9A46', });
  // the seven Dragon Balls, drawn in code so they need no files
  for (let s = 1; s <= 7; s++) ballTex(scene, 'ball_' + s, s);
}

/* ================================================================ BOOT */
class Boot extends Phaser.Scene {
  constructor() { super('boot'); }
  preload() {
    const L = this.load;
    L.path = 'assets/';
    L.json('meta', 'meta.json');
    for (const b of BIOME_ORDER) { L.image(b + '_far', b + '_far.jpg'); L.image(b + '_mid', b + '_mid.webp'); L.image(b + '_ground', b + '_ground.jpg'); L.image(b + '_plat', b + '_plat.png'); }
    L.image('water', 'water.jpg');
    for (const r of ['earth', 'saiyan', 'namek', 'ssj']) for (let i = 0; i < 8; i++) L.image(r + '_' + i, r + '_' + i + '.png');
    for (const b of BIOME_ORDER) if (BOSSES[b]) for (let i = 0; i < 4; i++) L.image('boss_' + b + '_' + i, 'boss_' + b + '_' + i + '.png');
    for (const m of ['dino', 'bandit', 'bat', 'saiba']) for (let i = 0; i < 4; i++) L.image(m + '_' + i, m + '_' + i + '.png');
    for (let i = 0; i < 3; i++) L.image('portrait_' + i, 'portraits_' + i + '.png');
    for (let i = 0; i < 8; i++) L.image('item_' + i, 'items_' + i + '.png');
    for (let i = 0; i < 4; i++) L.image('garden_' + i, 'garden_' + i + '.png');
    L.image('portal', 'signpost_0.png');
    L.image('kamesign', 'kamesign_0.png');
    for (let i = 0; i < 6; i++) { L.image('npc_' + i, 'npc_' + i + '.png'); L.image('good_' + i, 'shopitems_' + i + '.png'); }
    for (const k of ['arena_npc_0', 'arena_npc_1']) L.image(k, k + '.png');
    for (let i = 0; i < 5; i++) L.image('sk' + i, 'ui_sk' + i + '.png');
    L.image('ui_bean', 'ui_bean.png'); L.image('ui_jump', 'ui_jump.png'); L.image('ui_coin', 'ui_coin.png');
    L.image('dragon', 'dragon.png');
    for (const s of SFX) L.audio(s, 'sfx/' + s + '.mp3');
    L.audio('fly', 'sfx/fly.mp3');
    for (const b of BIOME_ORDER) L.audio('bgm_' + b, 'sfx/bgm_' + b + '.mp3');
    L.on('loaderror', (f) => console.warn('missing', f.key));
  }
  create() {
    makePixelTextures(this);
    const el = document.getElementById('boot'); if (el) el.remove();
    if (S && S.race && RACES[S.race]) startWorld(this.game); else this.scene.start('select');
  }
}

/* ---------------------------------------------------------------- viewport */
function view() {
  const W = game.scale.width, H = game.scale.height; // device px
  const portrait = H > W;
  let z = H / VIEW_H; if (portrait) z = Math.min(z, W / 205);
  const cssMin = Math.min(W, H) / DPR;
  const uz = Math.min(W, H) / (cssMin < 520 ? 240 : 270);
  return { W, H, z, uz, UW: W / uz, UH: H / uz, portrait };
}

/* ================================================================ BUTTONS (manual hit tests, multitouch safe) */
class Hits {
  constructor() { this.list = []; }
  clear(tag) { this.list = tag ? this.list.filter((b) => b.tag !== tag) : []; }
  add(x, y, w, h, cb, tag, opts = {}) { const b = { x, y, w, h, cb, tag, ...opts }; this.list.push(b); return b; }
  find(px, py, tags) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const b = this.list[i]; if (tags && !tags.includes(b.tag)) continue; if (b.off) continue;
      const pad = b.pad || 0;
      if (px >= b.x - pad && px <= b.x + b.w + pad && py >= b.y - pad && py <= b.y + b.h + pad) return b;
    }
    return null;
  }
}

/* ---------------------------------------------------------------- panel drawing */
function drawFrame(g, x, y, w, h, fill = C.navy, alpha = 0.92) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  g.fillStyle(0x0B0F1E, 1); g.fillRect(x - 2, y - 2, w + 4, h + 4);
  g.fillStyle(C.gold, 1); g.fillRect(x, y, w, h);
  g.fillStyle(0xFFF0A0, 1); g.fillRect(x + 1, y, w - 2, 1); g.fillRect(x, y + 1, 1, h - 2);
  g.fillStyle(0x9A6E12, 1); g.fillRect(x + 3, y + 3, w - 6, h - 6);
  g.fillStyle(fill, alpha); g.fillRect(x + 4, y + 4, w - 8, h - 8);
  g.fillStyle(0x2C3A66, alpha); g.fillRect(x + 4, y + 4, w - 8, 1);
  for (const [sx, sy] of [[x - 2, y - 2], [x + w - 5, y - 2], [x - 2, y + h - 5], [x + w - 5, y + h - 5]]) {
    g.fillStyle(0x0B0F1E, 1); g.fillRect(sx - 1, sy - 1, 9, 9);
    g.fillStyle(0xB07A10, 1); g.fillRect(sx, sy, 7, 7);
    g.fillStyle(C.gold, 1); g.fillRect(sx, sy, 6, 6);
    g.fillStyle(0xFFF6C0, 1); g.fillRect(sx + 1, sy + 1, 2, 2);
  }
}
function drawSlot(g, x, y, s, border = C.gold, fill = 0x111833) {
  g.fillStyle(0x0B0F1E, 1); g.fillRect(x - 1, y - 1, s + 2, s + 2);
  g.fillStyle(border, 1); g.fillRect(x, y, s, s);
  g.fillStyle(fill, 1); g.fillRect(x + 2, y + 2, s - 4, s - 4);
  g.fillStyle(0x060A18, 1); g.fillRect(x + 2, y + 2, s - 4, 1);
}
function drawBtn(g, x, y, w, h, col = C.green) {
  const hi = Phaser.Display.Color.IntegerToColor(col).lighten(25).color, lo = Phaser.Display.Color.IntegerToColor(col).darken(30).color;
  g.fillStyle(0x0B0F1E, 1); g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle(lo, 1); g.fillRect(x, y, w, h);
  g.fillStyle(col, 1); g.fillRect(x, y, w, h - 2);
  g.fillStyle(hi, 1); g.fillRect(x + 1, y + 1, w - 2, 1);
}

/* ================================================================ RACE SELECT */
class Select extends Phaser.Scene {
  constructor() { super('select'); }
  create() {
    this.hits = new Hits(); this.sel = 'earth'; this.t = 0;
    this.far = this.add.image(0, 0, 'field_far').setOrigin(0.5, 1);
    this.mid = this.add.image(0, 0, 'field_mid').setOrigin(0.5, 1);
    this.ground = this.add.tileSprite(0, 0, 10, 10, 'field_ground').setOrigin(0, 0);
    this.hill = this.add.image(0, 0, 'field_plat').setOrigin(0.5, 0);
    this.fx = this.add.graphics();
    this.chars = {};
    for (const k of Object.keys(RACES)) this.chars[k] = this.add.image(0, 0, k + '_0').setOrigin(0.5, 1);
    this.fxFront = this.add.graphics();
    this.ui = this.add.graphics();
    this.texts = [];
    this.input.addPointer(2);
    this.drag = null;
    this.input.on('pointerdown', (p) => {
      const v = view(); const b = this.hits.find(p.x / v.uz, p.y / v.uz); if (b && b.tag !== 'char') { play('click', 0.4); b.cb(); return; }
      this.drag = { id: p.id, x: p.x / v.uz, y: p.y / v.uz, b };
    });
    // a swipe from wherever the finger lands flips through the warriors
    this.input.on('pointermove', (p) => {
      const d = this.drag; if (!d || d.id !== p.id || !p.isDown) return;
      const v = view(), ux = p.x / v.uz, uy = p.y / v.uz, dx = ux - d.x, dy = uy - d.y;
      if (d.done || Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      const ks = Object.keys(RACES); const i = ks.indexOf(this.sel);
      const step = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy > 0 ? 1 : 2);
      this.sel = ks[(i + step) % 3]; play('click', 0.3); this.layout();
      d.done = true;
    });
    const end = (p) => { const d = this.drag; if (d && d.id === p.id) { this.drag = null; if (!d.done && d.b) { play('click', 0.4); d.b.cb(); } } };
    this.input.on('pointerup', end); this.input.on('pointerupoutside', end);
    this.input.keyboard.on('keydown', (e) => {
      const ks = Object.keys(RACES); let i = ks.indexOf(this.sel);
      if (e.key === 'ArrowLeft' || e.key === 'a') { this.sel = ks[(i + 2) % 3]; this.layout(); }
      if (e.key === 'ArrowRight' || e.key === 'd') { this.sel = ks[(i + 1) % 3]; this.layout(); }
      if (e.key === 'Enter' || e.key === ' ') this.begin();
    });
    this.scale.on('resize', () => this.layout());
    this.layout();
  }
  begin() {
    S = freshSave(this.sel);
    sdk((m) => m.event && m.event('race_chosen', { race: this.sel }));
    saveProgress(true);
    startWorld(this.game);
  }
  layout() {
    const v = view(); const cam = this.cameras.main; cam.setZoom(v.uz); cam.setOrigin(0, 0); cam.setScroll(0, 0);
    this.textRes = v.uz;
    const UW = v.UW, UH = v.UH;
    this.texts.forEach((t) => t.destroy()); this.texts = []; this.hits.clear(); this.ui.clear();
    const groundY = Math.round(UH * (v.portrait ? 0.56 : 0.6));
    const fs = Math.max(UH / 540 * 1.25, UW / 1080 * 1.1);
    this.far.setScale(fs).setPosition(UW / 2, groundY + 40 * fs);
    this.mid.setScale(Math.max(0.5, UH / 300 * 0.4)).setPosition(UW / 2, groundY + 8);
    this.ground.setPosition(0, groundY).setSize(UW, UH - groundY + 2).setTileScale(0.5, 0.5);
    this.cameras.main.setBackgroundColor(0x46A8F5);
    const ks = Object.keys(RACES); const colW = Math.min(110, UW / 3.2);
    this.hill.setScale((colW * 3.2) / this.hill.width).setPosition(UW / 2, groundY - 34);
    const hillTop = groundY - 30;
    this.pos = {};
    ks.forEach((k, i) => {
      const x = UW / 2 + (i - 1) * colW; this.pos[k] = { x, y: hillTop };
      const c = this.chars[k]; c.setScale(SPR * 1.15).setPosition(x, hillTop);
      this.hits.add(x - colW / 2, hillTop - 70, colW, 80, () => { this.sel = k; this.layout(); }, 'char');
    });
    // header
    const title = mkText(this, UW / 2, 4, 'APPLE DRA', 20, '#FFE14D', this.textRes).setOrigin(0.5, 0);
    const sub = mkText(this, UW / 2, 26, 'Choose your race', 9, '#ffffff', this.textRes).setOrigin(0.5, 0);
    this.texts.push(title, sub);
    // info panel
    const r = RACES[this.sel];
    const pw = Math.min(UW - 16, 330), ph = Math.min(UH - groundY - 8, 104);
    const px = (UW - pw) / 2, py = Math.min(UH - ph - 6, groundY + 6);
    drawFrame(this.ui, px, py, pw, ph);
    const rib = mkText(this, px + 12, py - 6, r.name + ' · ' + r.vn, 10, '#ffffff', this.textRes);
    this.ui.fillStyle(0x0B0F1E, 1); this.ui.fillRect(px + 6, py - 8, rib.width + 14, 16);
    this.ui.fillStyle(C.orange, 1); this.ui.fillRect(px + 7, py - 7, rib.width + 12, 14);
    this.ui.fillStyle(0xFFB060, 1); this.ui.fillRect(px + 7, py - 7, rib.width + 12, 1);
    this.texts.push(rib);
    this.texts.push(mkText(this, px + 10, py + 12, r.blurb, 8, '#FFE14D', this.textRes).setWordWrapWidth(pw - 20));
    const names = ['HP', 'Ki', 'Attack', 'Armor', 'Speed'];
    const barW = Math.min(90, (pw - 120) / 2 + 30);
    const colA = px + 10, colB = px + pw / 2 - 10;
    names.forEach((n, i) => {
      const cx = i < 3 ? colA : colB, cy = py + 30 + (i % 3) * 12;
      this.texts.push(mkText(this, cx, cy - 1, n, 7, '#ffffff', this.textRes));
      const bx = cx + 34;
      this.ui.fillStyle(0x0B0F1E, 1); this.ui.fillRect(bx - 1, cy + 1, 52, 8);
      for (let s = 0; s < 5; s++) { this.ui.fillStyle(s < r.bars[i] ? [0xE0302A, 0x2F7BE0, 0xF08A24, 0x9AA6B8, 0x3CC24A][i] : 0x2A3150, 1); this.ui.fillRect(bx + s * 10, cy + 2, 9, 6); }
    });
    const bw = 92, bh = 20, bx = px + pw - bw - 10, by = py + ph - bh - 8;
    drawBtn(this.ui, bx, by, bw, bh, C.green);
    this.texts.push(mkText(this, bx + bw / 2, by + bh / 2, 'START', 11, '#ffffff', this.textRes).setOrigin(0.5));
    this.hits.add(bx, by, bw, bh, () => this.begin(), 'go', { pad: 4 });
    this.texts.push(mkText(this, px + 10, by + 4, 'Tap or swipe to pick', 7, '#9fb0d8', this.textRes));
    // name tags above chars
    ks.forEach((k) => {
      const t = mkText(this, this.pos[k].x, this.pos[k].y + 2, RACES[k].name, k === this.sel ? 9 : 8, k === this.sel ? '#FFE14D' : '#ffffff', this.textRes).setOrigin(0.5, 0).setDepth(5);
      this.texts.push(t);
    });
  }
  update(time, dt) {
    this.t += dt / 1000;
    const f = Math.floor(this.t * 8);
    this.fx.clear(); this.fxFront.clear();
    for (const k of Object.keys(RACES)) {
      const c = this.chars[k], p = this.pos[k]; if (!p) continue;
      const sel = k === this.sel;
      const pose = sel ? (Math.floor(this.t * 3) % 2 ? 0 : 3) : 0;
      c.setTexture((sel && k === 'saiyan' && this.textures.exists('ssj_0') ? 'ssj_' : k + '_') + pose);
      c.setAlpha(sel ? 1 : 0.8);
      c.y = p.y + (Math.floor(this.t * 2 + p.x) % 2);
      if (sel) {
        // gold ring on the ground, a flame aura and a bouncing gold arrow over the head
        const fx = this.fx;
        for (let yy = -3; yy <= 3; yy++) { const hw = Math.round(24 * Math.sqrt(1 - (yy * yy) / 10)); fx.fillStyle(yy === -3 || yy === 3 ? 0xFFF0A0 : 0xF4C542, yy === -3 || yy === 3 ? 1 : 0.35); fx.fillRect(p.x - hw, p.y + yy, hw * 2, 1); }
        drawAura(fx, p.x, p.y, 21, 36, RACES[k].aura, f);
        const ay = Math.round(p.y - 80 + (Math.floor(this.t * 4) % 2) * 3);
        const g = this.fxFront, A = (rows, col) => rows.forEach(([dx, dy, w, h]) => { g.fillStyle(col, 1); g.fillRect(p.x + dx, ay + dy, w, h); });
        A([[-9, -1, 19, 6], [-6, 5, 13, 4], [-4, 9, 9, 3], [-2, 12, 5, 2]], 0x0B0F1E);
        A([[-8, 0, 17, 4], [-5, 4, 11, 4], [-3, 8, 7, 3], [-1, 11, 3, 2]], 0xF4C542);
        A([[-8, 0, 17, 1], [-5, 4, 3, 1]], 0xFFF6C0);
        A([[-3, 10, 7, 1], [6, 1, 3, 3]], 0xB07A10);
      }
    }
  }
}

/* ---------------------------------------------------------------- shared fx drawing */
function drawAura(g, cx, feet, rx, ry, cols, f, alpha = 0.9) {
  const top = feet - ry * 2 - 4;
  for (let layer = 0; layer < 2; layer++) {
    const col = cols[(f + layer) % 2], sc = layer ? 0.7 : 1, t0 = top + (layer ? 8 : 0);
    for (let y = t0; y < feet; y += 2) {
      const t = (y - t0) / (feet - t0);
      let hw = rx * sc * (t < 0.72 ? Math.sqrt(t / 0.72) : 1 - ((t - 0.72) / 0.28) * 0.3);
      if (t < 0.5) hw += (((Math.floor(y / 2) + f) % 3) - 1) * 1.5;
      hw = Math.max(1, Math.round(hw));
      g.fillStyle(col, (layer ? 0.3 : 0.24) * alpha); g.fillRect(cx - hw, y, hw * 2, 2);
      g.fillStyle(col, alpha); g.fillRect(cx - hw - 1, y, 2, 2); g.fillRect(cx + hw - 1, y, 2, 2);
    }
    // flame tongues at the top
    for (let k = -2; k <= 2; k++) {
      const hgt = 3 + ((f * 3 + k * 7 + layer * 5) % 5) * 2;
      g.fillStyle(col, alpha); g.fillRect(cx + k * Math.round(rx * sc * 0.35) - 1, t0 - hgt + 4 + Math.abs(k) * 3, 2, hgt);
    }
  }
}
function drawRingPop(g, x, y, r, col, step) {
  g.fillStyle(col, 1);
  const n = 8 + step * 3;
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; g.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 2, 2); }
}
function drawStar(g, x, y, s, f) {
  g.fillStyle(0xffffff, 1);
  const rays = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7]];
  const n = f % 2 ? 5 : 4;
  for (let i = 0; i < n; i++) { const [dx, dy] = rays[(i * 3 + f) % 8]; for (let k = 2; k < s; k++) g.fillRect(Math.round(x + dx * k), Math.round(y + dy * k), 1, 1); }
  g.fillRect(x - 1, y - 1, 3, 3); g.fillStyle(0xFFF6A8, 1); g.fillRect(x, y, 1, 1);
}

/* ================================================================ WORLD */
const PLAT_PX = { home: 277, field: 277, waste: 257, namek: 227, grind: 346, arena: 228 };
function genLayout(key) {
  // the tournament stage is one unbroken floor: the only flat map in the game
  if (key === 'arena') return { segs: [{ x0: 0, x1: LW }], plats: [] };
  let seed = { field: 7, waste: 19, namek: 31, grind: 43 }[key] || 53;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const segs = []; let x = 0;
  while (x < LW) {
    const len = 380 + Math.floor(rnd() * 420);
    const x1 = Math.min(LW, x + len);
    segs.push({ x0: x, x1 });
    x = x1 + (x1 < LW - 200 ? 56 + Math.floor(rnd() * 26) : 0);
    if (x >= LW - 200) { segs[segs.length - 1].x1 = LW; break; }
  }
  // boss arena: one unbroken stretch of ground in front of the far gate
  while (segs.length > 1 && segs[segs.length - 1].x0 > LW - ARENA) { segs.pop(); segs[segs.length - 1].x1 = LW; }
  const plats = [];
  const pw = PLAT_PX[key] * 0.5;
  let px = 440;
  while (px < LW - 300) {
    const tier = rnd() < 0.5 ? 1 : 2;
    const y = GY - (tier === 1 ? 60 : 98) - Math.floor(rnd() * 6);
    const sc = 0.8 + rnd() * 0.25, w = pw * sc;
    plats.push({ px, y, sc, x0: px + w * 0.06, x1: px + w * 0.94 });
    if (tier === 2) { const sx = px - 70, sy = GY - 50, s2 = 0.7; plats.push({ px: sx, y: sy, sc: s2, x0: sx + pw * s2 * 0.06, x1: sx + pw * s2 * 0.94 }); }
    px += 300 + Math.floor(rnd() * 240);
  }
  return { segs, plats: plats.filter((pl) => pl.px + pw * pl.sc < LW - ARENA - 20) };
}
let W = null; // the world scene
function startWorld(g) {
  const sc = g.scene;
  ['select'].forEach((k) => { if (sc.isActive(k)) sc.stop(k); });
  if (!sc.isActive('bg')) sc.start('bg');
  if (!sc.isActive('world')) sc.start('world'); else sc.getScene('world').scene.restart();
  if (!sc.isActive('hud')) sc.start('hud');
  sc.bringToTop('hud');
}

class Bg extends Phaser.Scene {
  constructor() { super('bg'); }
  create() { this.far = this.add.tileSprite(0, 0, 10, 10, 'field_far').setOrigin(0, 0); this.cameras.main.setOrigin(0, 0); }
  update() {
    if (!W || !W.cam) return;
    const v = view(); const cam = W.cam; const b = BIOMES[W.biome];
    if (this.far.texture.key !== W.biome + '_far') this.far.setTexture(W.biome + '_far');
    this.cameras.main.setBackgroundColor(b.sky);
    // the far picture covers 300 world units of height and sits with its bottom near the ground line
    const groundScreen = (GY - cam.worldView.y) * v.z;
    const s = Math.max(300 * v.z, groundScreen + 24 * v.z) / 540;
    const h = 540 * s;
    const top = Math.round(groundScreen + 20 * v.z - h);
    this.far.setPosition(0, top).setSize(v.W / s + 2, 540).setScale(s).setTilePosition(cam.scrollX * 0.08 * v.z / s, 0);
  }
}

class World extends Phaser.Scene {
  constructor() { super('world'); }
  create() {
    W = this;
    this.biome = S.biome && BIOMES[S.biome] ? S.biome : 'field';
    this.cam = this.cameras.main;
    this.time0 = performance.now();
    this.ents = []; this.blasts = []; this.drops = []; this.fxList = []; this.nums = []; this.sparks = []; this.others = new Map();
    this.ebul = []; this.haz = []; this.foe = null; this.ring = null;
    this.textRes = view().z;
    this.beam = null; this.hitstop = 0; this.levelCol = 0; this.stars = [];
    this.buildLevel();
    this.makePlayer();
    this.fxBack = this.add.graphics().setDepth(4);
    this.fxFront = this.add.graphics().setDepth(20);
    this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S,SPACE,J,K,L,U,I,H,E,F,B,C,M,ONE,TWO,THREE,FOUR,FIVE,Q');
    this.input.keyboard.on('keydown', (e) => this.onKey(e));
    this.scale.on('resize', () => this.fit(), this);
    this.events.once('shutdown', () => this.scale.off('resize', this.fit, this));
    this.fit();
    this.cam.centerOn(this.p.x, this.p.y - 40);
    setMusic(this.biome);
    this.runStart();
    this.netT = 0; this.saveT = 0;
    sdk((m) => m.event && m.event('area_entered', { area: this.biome }));
  }
  runStart() { this.runT = performance.now(); this.runKills = 0; sdk((m) => m.run && m.run.start()); }
  fit() {
    const v = view();
    this.cam.setZoom(v.z);
    this.textRes = v.z;
    const viewW = v.W / v.z, viewH = v.H / v.z;
    const top = Math.min(-420, GY + 70 - viewH);
    this.cam.setBounds(0, top, LW, GY + 70 - top);
    this.followOff = Math.min(viewH * 0.18, 70);
    for (const e of this.allTagged()) e.setResolution(this.textRes);
  }
  allTagged() { const out = []; for (const e of this.ents) if (e.tag) out.push(e.tag); if (this.p && this.p.tag) out.push(this.p.tag); for (const o of this.others.values()) out.push(o.tag); for (const n of this.npcs || []) { out.push(n.tag); if (n.mark && n.mark.setResolution) out.push(n.mark); } return out; }

  /* ---------------- level */
  buildLevel() {
    const b = BIOMES[this.biome], key = this.biome;
    LW = levelWidth(key);
    const L_ = genLayout(key); this.segs = L_.segs;
    // mid layer (parallax 0.45)
    const mid = this.textures.get(key + '_mid').getSourceImage();
    const ms = 150 / mid.height;
    for (let mx = -40; mx < LW * 0.5 + 1400; mx += mid.width * ms - 1) {
      this.add.image(mx, GY + 12, key + '_mid').setOrigin(0, 1).setScale(ms).setScrollFactor(0.45, 1).setDepth(1);
    }
    // water under the gaps
    for (let i = 0; i < this.segs.length - 1; i++) {
      const gx0 = this.segs[i].x1 - 8, gx1 = this.segs[i + 1].x0 + 8;
      if (b.water) {
        const ws = this.add.tileSprite(gx0, GY + 26, gx1 - gx0, 120, 'water').setOrigin(0, 0).setTileScale(0.5).setDepth(2);
        ws.isWater = true; (this.waters = this.waters || []).push(ws);
      } else {
        this.add.rectangle(gx0, GY + 26, gx1 - gx0, 120, b.dirt).setOrigin(0, 0).setDepth(2);
      }
    }
    // ground
    for (const s of this.segs) {
      this.add.tileSprite(s.x0, GY - 4, s.x1 - s.x0, 110, key + '_ground').setOrigin(0, 0).setTileScale(0.5).setDepth(3);
      this.add.rectangle(s.x0, GY + 104, s.x1 - s.x0, 400, b.dirt).setOrigin(0, 0).setDepth(3);
    }
    // floating platforms
    this.plats = [];
    for (const pl of L_.plats) {
      this.add.image(pl.px, pl.y - 3, key + '_plat').setOrigin(0, 0).setScale(0.5 * pl.sc).setDepth(3);
      this.plats.push({ x0: pl.x0, x1: pl.x1, y: pl.y });
    }
    // portals at both ends
    this.portals = [];
    const idx = BIOME_ORDER.indexOf(key);
    if (idx > 0) this.portals.push({ x: 56, to: BIOME_ORDER[idx - 1] });
    if (idx < BIOME_ORDER.length - 1) this.portals.push({ x: LW - 56, to: BIOME_ORDER[idx + 1] });
    for (const p of this.portals) {
      const img = this.add.image(p.x, GY + 2, 'portal').setOrigin(0.5, 1).setScale(0.42).setDepth(5);
      if (p.x < LW / 2) img.setFlipX(true);
      p.img = img;
      p.tag = mkText(this, p.x, GY - 50, '→ ' + BIOMES[p.to].name, 8, '#7DF9FF', this.textRes).setOrigin(0.5, 1).setDepth(25);
    }
    // field extras: Kame sign and the bean garden
    this.garden = null; this.plant = null; this.chest = null;
    if (key === 'field') {
      this.add.image(140, GY + 3, 'kamesign').setOrigin(0.5, 1).setScale(0.34).setDepth(5);
      this.garden = { x: 300, img: this.add.image(300, GY + 3, 'garden_0').setOrigin(0.5, 1).setScale(0.3).setDepth(5) };
      this.garden.tag = mkText(this, 300, GY - 40, 'Vườn Đậu', 8, '#9CFF5A', this.textRes).setOrigin(0.5, 1).setDepth(25);
    }
    // home base: the Magic Bean Plant, the Storage Chest, and a welcome sign
    if (key === 'home') {
      this.add.image(120, GY + 3, 'kamesign').setOrigin(0.5, 1).setScale(0.34).setDepth(5);
      let px2 = 300; while (!this.groundAt(px2) && px2 < LW) px2 += 10;
      this.plant = { x: px2, img: this.add.image(px2, GY + 3, 'garden_0').setOrigin(0.5, 1).setScale(0.3).setDepth(5) };
      this.plant.tag = mkText(this, px2, GY - 40, 'Magic Bean Plant', 8, '#9CFF5A', this.textRes).setOrigin(0.5, 1).setDepth(25);
      let cx2 = 560; while (!this.groundAt(cx2) && cx2 < LW) cx2 += 10;
      this.chest = { x: cx2, img: this.add.image(cx2, GY + 3, 'chestpx').setOrigin(0.5, 1).setScale(2).setDepth(5) };
      this.chest.tag = mkText(this, cx2, GY - 40, 'Storage Chest', 8, '#FFD9A0', this.textRes).setOrigin(0.5, 1).setDepth(25);
    }
    this.spawnX = key === 'home' ? 220 : key === 'field' ? 200 : key === 'arena' ? 240 : 140;
    // villagers: story NPCs talk, shop NPCs trade
    this.npcs = [];
    for (const d of NPCS[key] || []) {
      let nx = d.x; while (!this.groundAt(nx) && nx < LW) nx += 10;
      const n = { ...d, x: nx, anim: Math.random() * 3 };
      n.spr = this.add.image(nx, GY, d.img || 'npc_' + d.f).setOrigin(0.5, 1).setScale(SPR).setDepth(8);
      n.tag = mkText(this, nx, GY - 56, (d.role === 'shop' ? '[Shop] ' : d.role === 'smith' ? '[Forge] ' : d.role === 'gift' ? '[Gift] ' : '') + d.name, 8, d.role === 'shop' || d.role === 'smith' || d.role === 'gift' ? '#FFE14D' : '#B8F0FF', this.textRes || 3).setOrigin(0.5, 1).setDepth(25);
      if (d.role === 'shop' || d.role === 'smith') n.mark = this.add.image(nx, GY - 70, d.role === 'smith' ? 'hammerpx' : 'ui_coin').setDisplaySize(9, 9).setDepth(25);
      else if (d.role === 'gift') n.mark = this.add.image(nx, GY - 70, 'giftpx').setDisplaySize(11, 11).setDepth(25);
      else n.mark = mkText(this, nx, GY - 66, '!', 13, '#FFE14D', this.textRes || 3).setOrigin(0.5, 1).setDepth(25);
      this.npcs.push(n);
    }
    // monsters
    const n = b.mons.length ? Math.round(b.farm ? tv('grind_monsters') : tv('monsters')) : 0;
    for (let i = 0; i < n; i++) this.spawnMonster(i, n);
    if (key === 'arena') this.buildRing();
    // the boss, and a warning post at the arena's mouth
    this.makeBoss();
    const gx = LW - ARENA + 30;
    if (!BOSSES[this.biome]) return;
    const bg = this.add.graphics().setDepth(5);
    for (const px of [gx - 18, gx + 14]) { bg.fillStyle(0x1A1A2E, 1); bg.fillRect(px - 1, GY - 47, 6, 50); bg.fillStyle(0x8A5426, 1); bg.fillRect(px, GY - 46, 4, 48); bg.fillStyle(0xC07A3A, 1); bg.fillRect(px, GY - 46, 1, 48); bg.fillStyle(0xF4C542, 1); bg.fillRect(px - 1, GY - 49, 6, 3); }
    bg.fillStyle(0x1A1A2E, 1); bg.fillRect(gx - 15, GY - 44, 31, 24); bg.fillStyle(0xC81E1E, 1); bg.fillRect(gx - 14, GY - 43, 29, 21); bg.fillStyle(0xFF5A4A, 1); bg.fillRect(gx - 14, GY - 43, 29, 2);
    for (let i = 0; i < 4; i++) { bg.fillStyle(0xC81E1E, 1); bg.fillRect(gx - 14 + i * 8, GY - 22, 5, 3 - (i % 2)); }
    bg.fillStyle(0xffffff, 1); bg.fillRect(gx - 5, GY - 39, 11, 8); bg.fillRect(gx - 3, GY - 31, 7, 3); bg.fillStyle(0x1A1A2E, 1); bg.fillRect(gx - 3, GY - 37, 3, 3); bg.fillRect(gx + 1, GY - 37, 3, 3); bg.fillRect(gx - 1, GY - 30, 1, 2); bg.fillRect(gx + 1, GY - 30, 1, 2);
    mkText(this, gx, GY - 52, 'BOSS: ' + BOSSES[this.biome].name, 8, '#FF4A3A', this.textRes).setOrigin(0.5, 1).setDepth(25);
  }
  buildRing() {
    // the tournament stage: a roped ring on the flat stone floor
    const cx = Math.round(LW / 2), hw = 270;
    this.ring = { x0: cx - hw, x1: cx + hw, cx };
    const g2 = this.add.graphics().setDepth(5);
    for (const px of [this.ring.x0, this.ring.x1]) {
      for (const off of [-18, 0, 18]) {
        g2.fillStyle(0x2A1A12, 1); g2.fillRect(px + off - 1, GY - 52, 6, 55);
        g2.fillStyle(0xB04A2A, 1); g2.fillRect(px + off, GY - 51, 4, 53);
        g2.fillStyle(0xE8885A, 1); g2.fillRect(px + off, GY - 51, 1, 53);
        g2.fillStyle(0xF4C542, 1); g2.fillRect(px + off - 1, GY - 55, 6, 4);
      }
      for (const ry of [-44, -28]) {
        g2.fillStyle(0x1A1A2E, 1); g2.fillRect(px - 20, GY + ry, 40, 6);
        g2.fillStyle(0xE0302A, 1); g2.fillRect(px - 20, GY + ry + 1, 40, 4);
        g2.fillStyle(0xFF7A6E, 1); g2.fillRect(px - 20, GY + ry + 1, 40, 1);
      }
    }
    g2.fillStyle(0xF4C542, 1); g2.fillRect(this.ring.x0, GY - 1, this.ring.x1 - this.ring.x0, 2);
    g2.fillStyle(0x0B0F1E, 0.25); g2.fillRect(this.ring.x0, GY + 2, this.ring.x1 - this.ring.x0, 1);
    mkText(this, cx, GY - 62, 'ĐẤU TRƯỜNG VÕ THUẬT', 10, '#FFE14D', this.textRes).setOrigin(0.5, 1).setDepth(25);
    mkText(this, this.ring.x0 - 30, GY - 30, 'VÕ', 7, '#FF9A1F', this.textRes).setOrigin(0.5).setDepth(25);
    mkText(this, this.ring.x1 + 30, GY - 30, 'ĐÀI', 7, '#FF9A1F', this.textRes).setOrigin(0.5).setDepth(25);
  }
  makeBoss() {
    const B = BOSSES[this.biome];
    if (!B) { this.boss = null; return null; }
    const pw = tv('monster_power');
    const x = LW - 300, y = B.fly ? GY - 70 : GY;
    const e = {
      kind: 'mon', boss: true, bd: B, def: { t: B.t, name: B.name }, md: { fly: B.fly, speed: B.speed, w: B.w, h: B.h }, t: B.t, lv: B.lv, name: B.name,
      x, y, vx: 0, vy: 0, home: x, face: -1, sc: 1, hp: 0, atk: (5 + B.lv * 3) * pw * B.atkMul, arm: B.lv * 2,
      w: B.w, h: B.h, flash: 0, hurtT: 0, wind: 0, cd: 0, aggro: false, dead: false, anim: 0, baseY: y,
      st: 'idle', stT: 1.2, mi: 0, onGround: !B.fly,
    };
    e.hp = e.maxHp = Math.round((26 + B.lv * 20 + B.lv * B.lv * 1.2) * pw * B.hpMul);
    e.spr = this.add.image(x, y, B.t + '_0').setOrigin(0.5, 1).setScale(B.scale).setDepth(9);
    e.tag = mkText(this, x, y, '★ ' + B.name + ' Lv' + B.lv, 9, '#FF4A3A', this.textRes || 3).setOrigin(0.5, 1).setDepth(25);
    this.ents.push(e); this.boss = e;
    return e;
  }
  groundAt(x) { for (const s of this.segs) if (x >= s.x0 && x <= s.x1) return true; return false; }
  spawnMonster(i, n) {
    const b = BIOMES[this.biome];
    const span = LW - 520;
    // the first two always stand inside the opening screen, just past the garden
    const x = i === 0 ? 345 : i === 1 ? 530 : 660 + ((LW - ARENA - 760) * (i - 1.5)) / (n - 1.5) + (Math.random() - 0.5) * 60;
    const tier = i >= n * 0.66 ? 1 : 0;
    const def = b.mons[tier];
    const lv = def.lv[0] + Math.floor(((x - 480) / span) * (def.lv[1] - def.lv[0] + 1));
    const e = this.makeMonster(def, Math.min(def.lv[1], Math.max(def.lv[0], lv)), x);
    e.slot = i;
    return e;
  }
  makeMonster(def, lv, x) {
    const md = MON[def.t];
    const pw = tv('monster_power');
    const sc = def.scale || 1;
    let gx = x; if (!md.fly) { while (!this.groundAt(gx) && gx < LW) gx += 20; }
    const e = {
      kind: 'mon', def, md, t: def.t, lv, name: def.name, x: gx, y: md.fly ? GY - 70 - Math.random() * 50 : GY, vx: 0, vy: 0,
      home: gx, face: -1, hp: Math.round((26 + lv * 20 + lv * lv * 1.2) * pw * sc * (def.hpMul || 1)), atk: (5 + lv * 3) * pw * sc * (def.atkMul || 1), arm: lv * 1.5,
      w: md.w * sc, h: md.h * sc, sc, flash: 0, hurtT: 0, atkT: 0, wind: 0, cd: 0, aggro: false, dead: false, anim: Math.random() * 10,
      baseY: 0,
    };
    e.maxHp = e.hp; e.baseY = e.y;
    e.spr = this.add.image(e.x, e.y, def.t + '_0').setOrigin(0.5, 1).setScale(SPR * sc).setDepth(9);
    if (def.tint) e.spr.setTint(def.tint);
    e.tag = mkText(this, e.x, e.y, def.name + ' Lv' + lv, 8, tv('monster_name_color'), this.textRes || 3).setOrigin(0.5, 1).setDepth(25);
    this.ents.push(e);
    return e;
  }

  /* ---------------- player */
  makePlayer() {
    const r = RACES[S.race];
    const st = stats();
    const p = this.p = {
      kind: 'player', race: S.race, x: this.spawnX, y: GY, vx: 0, vy: 0, face: 1, onGround: true, jumps: 0, flying: false,
      w: 14, h: 40, hp: st.hp, ki: st.ki, combo: 0, comboT: 0, atkCd: 0, pose: null, poseT: 0, inv: 0, cds: [0, 0, 0, 0, 0],
      trans: 0, beanCd: 0, buffs: { atk: 0, arm: 0, spd: 0 }, lastSafe: this.spawnX, anim: 0, moveTo: null, target: null, dead: false, combatT: 0,
    };
    p.spr = this.add.image(p.x, p.y, r.key + '_0').setOrigin(0.5, 1).setScale(SPR).setDepth(10);
    p.tag = mkText(this, p.x, p.y, playerName(), 9, tv('player_name_color'), this.textRes || 3).setOrigin(0.5, 1).setDepth(26);
    this.camTarget = this.add.zone(p.x, p.y, 1, 1);
    this.cam.startFollow(this.camTarget, true, 0.12, 0.12);
  }

  /* ---------------- input from HUD */
  input_() { return HUD ? HUD.inp : { x: 0, y: 0, jumpHeld: false }; }
  onKey(e) {
    if (HUD && HUD.panel && e.key === 'Escape') { HUD.closePanel(); return; }
    if (HUD && HUD.panel && HUD.panel.k === 'talk') { if ([' ', 'e', 'enter', 'j'].includes(e.key.toLowerCase())) HUD.talkNext(); return; }
    if (HUD && HUD.panel && HUD.panel.k === 'help') HUD.closePanel();
    if (HUD && HUD.panel && HUD.panel.k === 'daily') HUD.closePanel();
    if (HUD && HUD.panel) return;
    const k = e.key.toLowerCase();
    if (k === ' ' || k === 'w' || k === 'arrowup') this.jump();
    else if (k === 'j' || k === '1') this.skill(0);
    else if (k === 'k' || k === '2') this.skill(1);
    else if (k === 'l' || k === '3') this.skill(2);
    else if (k === 'u' || k === '4') this.skill(3);
    else if (k === 'i' || k === '5') this.skill(4);
    else if (k === 'h' || k === 'q') this.eatBean();
    else if (k === 'f') this.toggleFly();
    else if (k === 'e') this.interact();
    else if (k === 'b') HUD && HUD.open('bag');
    else if (k === 'c') HUD && HUD.open('stats');
    else if (k === 'm') HUD && HUD.open('map');
    else if (k === 'p') HUD && HUD.open('items');
    else if (k === 'g') HUD && HUD.open('summon', false, { result: null });
    else if (k === 'v') HUD && HUD.open('daily', false, {});
  }
  jump() {
    const p = this.p; if (p.dead) return;
    p.moveTo = null;
    if (p.flying) return; // held jump climbs while flying
    if (p.onGround) { p.vy = -tv('jump_power'); p.onGround = false; p.jumps = 1; play('jump', 0.35); this.puff(p.x, p.y); }
    else if (p.jumps < 2) { p.vy = -tv('jump_power') * 0.92; p.jumps = 2; play('jump', 0.35, 1.25); this.ringAt(p.x, p.y - 4, RACES[p.race].blast, 6); }
    else this.toggleFly(true);
  }
  toggleFly(on) {
    const p = this.p; if (p.dead) return;
    if (on === undefined) on = !p.flying;
    if (on && p.ki < 4) { this.say('Not enough Ki to fly', '#7DB8FF'); return; }
    p.flying = on;
    if (on) { p.vy = 0; p.onGround = false; if (!S.flown) { S.flown = true; this.say('Flying! Hold JUMP to rise, joystick to steer', '#FFE14D'); } }
  }
  nearNpc(r = 34) { let best = null, bd = r; for (const n of this.npcs || []) { const d = Math.abs(this.p.x - n.x); if (d < bd && this.p.y > GY - 60) { bd = d; best = n; } } return best; }
  talkTo(n) {
    if (!n || !HUD) return;
    this.p.face = n.x >= this.p.x ? 1 : -1; this.p.moveTo = null; this.p.target = null;
    play('click', 0.4);
    sdk((m) => m.event && m.event('npc_talk', { npc: n.id, role: n.role }));
    if (n.role === 'shop') { HUD.open('shop', false, { npc: n, tab: 'buy' }); return; }
    if (n.role === 'smith') { HUD.open('smith', false, { npc: n, sel: null }); return; }
    if (n.role === 'arena') { HUD.open('arena', false, { result: null }); return; }
    if (n.role === 'gift') { HUD.openCode(n); return; }
    const base = npcLines(n.id);
    const ql = questTalkLines(n.id);
    HUD.open('talk', false, { npc: n, lines: ql || base.lines, give: base.give, i: 0, shown: 0, quest: !!ql });
  }
  useGood(k) {
    const p = this.p, g = goodOf(k); if (!g || p.dead) return false;
    S.bagc = S.bagc || {};
    if (!(S.bagc[k] > 0)) { this.say('You have no ' + g.n + '. Buy one at a shop.', '#FF6A4A'); return false; }
    const st = stats();
    if (g.kind === 'potion') {
      const needHp = g.hp && p.hp < st.hp - 0.5, needKi = g.ki && p.ki < st.ki - 0.5;
      if (!needHp && !needKi) { this.say(g.hp ? 'HP is already full' : 'Ki is already full', '#9fb0d8'); return false; }
      if (g.hp) { const a = Math.round(Math.min(st.hp - p.hp, st.hp * g.hp)); p.hp = Math.min(st.hp, p.hp + st.hp * g.hp); if (a > 0) this.num(p.x - 6, p.y - 46, '+' + a + ' HP', '#6FFF6A', 9); }
      if (g.ki) { const a = Math.round(Math.min(st.ki - p.ki, st.ki * g.ki)); p.ki = Math.min(st.ki, p.ki + st.ki * g.ki); if (a > 0) this.num(p.x + 8, p.y - 36, '+' + a + ' KI', '#7DB8FF', 9, 0.12); }
      for (let r = 0; r < 3; r++) this.fxList.push({ k: 'ring', x: p.x, y: p.y - 20, r: 6 + r, col: g.hp ? 0xFF6A6A : 0x7DB8FF, t: -r * 0.06, dur: 0.3 });
      play('bean', 0.45, 1.15);
    } else {
      p.buffs[g.buff] = tv('charm_seconds');
      this.say(g.n + '! ' + g.d + ' for ' + Math.round(tv('charm_seconds')) + 's', g.col);
      for (let r = 0; r < 4; r++) this.fxList.push({ k: 'ring', x: p.x, y: p.y - 22, r: 8 + r * 2, col: g.c, t: -r * 0.07, dur: 0.35 });
      for (let i = 0; i < 12; i++) this.sparks.push({ x: p.x + (Math.random() - 0.5) * 26, y: p.y - Math.random() * 40, vy: -40 - Math.random() * 50, life: 0.7, col: g.c });
      play('transform', 0.35, 1.4);
    }
    S.bagc[k]--;
    sdk((m) => m.event && m.event('item_used', { item: k }));
    saveProgress();
    return true;
  }
  interact() {
    const p = this.p;
    { const n = this.nearNpc(); if (n) { this.talkTo(n); return true; } }
    if (this.garden && Math.abs(p.x - this.garden.x) < 40) { HUD && HUD.open('garden'); return true; }
    if (this.plant && Math.abs(p.x - this.plant.x) < 40) { HUD && HUD.open('plant'); return true; }
    if (this.chest && Math.abs(p.x - this.chest.x) < 40) { HUD && HUD.open('chest'); return true; }
    for (const pt of this.portals) if (Math.abs(p.x - pt.x) < 40) { HUD && HUD.open('map'); return true; }
    return false;
  }
  worldTap(wx, wy) {
    const p = this.p; if (p.dead) return;
    // tap a monster: walk to it and attack
    for (const e of this.ents) if (!e.dead && Math.abs(wx - e.x) < e.w / 2 + 10 && wy < e.y + 6 && wy > e.y - e.h - 10) { p.target = e; p.moveTo = null; return; }
    for (const n of this.npcs || []) if (Math.abs(wx - n.x) < 16 && wy > GY - 62 && wy < GY + 6) {
      if (Math.abs(p.x - n.x) < 30 && p.y > GY - 60) { this.talkTo(n); return; }
      p.target = null; p.moveTo = n.x + (p.x < n.x ? -20 : 20); p.after = 'npc:' + n.id; return;
    }
    if (this.garden && Math.abs(wx - this.garden.x) < 22 && wy > GY - 50 && wy < GY + 6) { p.moveTo = this.garden.x - 20; p.after = 'garden'; return; }
    if (this.plant && Math.abs(wx - this.plant.x) < 22 && wy > GY - 50 && wy < GY + 6) { p.moveTo = this.plant.x - 20; p.after = 'plant'; return; }
    if (this.chest && Math.abs(wx - this.chest.x) < 24 && wy > GY - 46 && wy < GY + 6) { p.moveTo = this.chest.x - 20; p.after = 'chest'; return; }
    for (const pt of this.portals) if (Math.abs(wx - pt.x) < 30 && wy > GY - 70 && wy < GY + 6) { p.moveTo = pt.x; p.after = 'map'; return; }
    p.target = null; p.moveTo = wx; p.after = null;
  }

  /* ---------------- skills */
  skill(i) {
    const p = this.p; if (p.dead) return;
    const r = RACES[p.race], st = stats();
    if (i === 0) return this.melee();
    if (p.cds[i] > 0) return;
    const cost = [0, 9, 34, 30, 22][i];
    if (p.ki < cost) { this.say('Not enough Ki', '#7DB8FF'); return; }
    if (i === 1) {
      p.ki -= cost; p.cds[1] = 0.55; this.setPose(5, 0.28);
      this.blasts.push({ x: p.x + p.face * 16, y: p.y - 24, vx: p.face * 270, life: 1.2, col: r.blast, dmg: 1.55, tail: [] });
      play('kiblast', 0.45);
    } else if (i === 2) {
      p.ki -= cost; p.cds[2] = 6; this.setPose(5, 0.6);
      this.beam = { x: p.x + p.face * 14, y: p.y - 24, dir: p.face, t: 0, len: 0, col: r.blast, hit: false };
      play('beam', 0.5);
      this.say(r.beam + '!', r.blastHex);
    } else if (i === 3) {
      p.ki -= cost; p.cds[3] = 30; p.trans = tv('transform_seconds');
      play('transform', 0.55); this.cam.shake(220, 0.006);
      this.say(r.trans + '!', '#FFE14D');
      for (let k = 0; k < 18; k++) this.sparks.push({ x: p.x + (Math.random() - 0.5) * 30, y: p.y - Math.random() * 40, vy: -40 - Math.random() * 60, life: 0.8, col: r.aura[k % 2] });
      sdk((m) => m.event && m.event('transform', { race: p.race }));
    } else if (i === 4) {
      p.ki -= cost; p.cds[4] = r.healCd;
      const amt = Math.round(st.hp * r.healPct);
      p.hp = Math.min(st.hp, p.hp + amt);
      this.num(p.x, p.y - 46, '+' + amt + ' HP', '#6FFF6A', 9);
      this.ringAt(p.x, p.y - 20, 0x6FFF6A, 14); play('bean', 0.35, 1.3);
      if (p.race === 'namek') { // support: soothe nearby fighters
        for (const o of this.others.values()) if (Math.abs(o.x - p.x) < 90) this.ringAt(o.x, o.y - 20, 0x6FFF6A, 12);
      }
    }
  }
  melee() {
    const p = this.p, r = RACES[p.race];
    if (p.atkCd > 0) return;
    let interval = r.atkInt; if (p.trans > 0 && p.race === 'earth') interval *= 0.72;
    p.atkCd = interval;
    p.combo = p.comboT > 0 ? (p.combo + 1) % 3 : 0; p.comboT = 0.75;
    this.setPose(p.combo === 2 ? 4 : 3, Math.max(0.14, interval * 0.8));
    const reach = p.combo === 2 ? 30 : 26;
    let hit = false;
    for (const e of this.ents) {
      if (e.dead) continue;
      const dx = (e.x - p.x) * p.face;
      if (dx > -6 && dx < reach + e.w / 2 && Math.abs((e.y - e.h / 2) - (p.y - 20)) < e.h / 2 + 18) {
        this.hurtMonster(e, [1, 1.1, 1.6][p.combo], p.face, p.combo === 2 ? 8 : 4);
        hit = true;
      }
    }
    if (hit) { play(p.combo === 2 ? 'kick' : 'hit', 0.5, 0.95 + Math.random() * 0.1); this.hitstop = 0.04; }
    else play('jump', 0.12, 1.8);
  }
  setPose(f, t) { this.p.pose = f; this.p.poseT = t; }
  dmgMult() { const p = this.p; if (p.trans > 0 && p.race === 'saiyan') return 1.6; if (p.trans > 0 && p.race === 'earth') return 1.3; return 1; }
  hurtMonster(e, mult, dir, kb) {
    const st = stats();
    let d = st.atk * mult * this.dmgMult() * (0.9 + Math.random() * 0.2);
    const crit = Math.random() * 100 < st.crit;
    if (crit) d *= 2;
    d = Math.max(1, Math.round(d * (100 / (100 + e.arm))));
    e.hp -= d; e.flash = 2; e.hurtT = e.boss ? 0.12 : 0.22; e.aggro = true; e.x += dir * kb * (e.boss || e.fighter ? 0.15 : 1); if (!e.boss) e.wind = 0;
    this.stars.push({ x: Math.round(e.x - dir * e.w * 0.3), y: Math.round(e.y - e.h * 0.55), t: 0 });
    if (crit) { this.num(e.x, e.y - e.h - 4, d + '!', '#FF9A1F', 15); this.cam.shake(90, 2 / (view().H / view().z)); }
    else this.num(e.x, e.y - e.h - 4, '-' + d, '#ffffff', 11);
    if (e.hp <= 0) this.killMonster(e);
  }
  killMonster(e) {
    e.dead = true;
    e.respawn = e.boss ? tv('boss_respawn_seconds') : e.fighter ? 1e9 : BIOMES[this.biome].farm ? tv('grind_respawn') : tv('respawn_seconds');
    play('die', 0.45);
    this.ringAt(e.x, e.y - e.h / 2, 0xffffff, 10);
    e.spr.setVisible(false); e.tag.setVisible(false);
    S.kills = (S.kills || 0) + 1; this.runKills++;
    if (e.fighter) { if (this.p.target === e) this.p.target = null; this.arenaWin(e); return; }
    const farm = BIOMES[this.biome].farm;
    const dy = e.y - e.h / 2, gold = (k) => Math.max(1, Math.round((3 + e.lv * 2.2) * tv('gold_rate') * (farm ? farm.gold : 1) * (0.8 + Math.random() * 0.4) * k));
    questOnKill(e);
    if (e.boss) {
      // a boss always spills a pile of gold, and on a 70% roll a named rare piece of its own gear
      const pile = gold(14);
      for (let i = 0; i < 6; i++) this.drop('coin', e.x, dy, { v: Math.max(1, Math.round(pile / 6)) });
      if (Math.random() < tv('boss_drop_chance')) {
        const [sl, n] = e.bd.gear[Math.floor(Math.random() * e.bd.gear.length)];
        this.drop('item', e.x, dy, { item: makeItem(e.lv + 2, { s: sl, n, r: Math.random() < 0.35 ? 3 : 2 }) });
        this.say('Rare drop: ' + n + '!', '#C46BFF');
      } else this.say('No rare drop this time. The boss returns soon.', '#9fb0d8');
      this.drop('bean', e.x, dy, {});
      // every boss always leaves one random Dragon Ball, 1 to 5 stars
      const ballStar = 1 + Math.floor(Math.random() * 5);
      this.drop('ball', e.x + 14, dy, { star: ballStar });
      this.dropMat(e.x, dy, 2); this.dropMat(e.x + 16, dy, 1);
      S.tickets = (S.tickets || 0) + 1;
      this.say('Ngọc Rồng ' + ballStar + ' sao và +1 vé triệu hồi!', ballStar >= 4 ? '#FFB060' : '#FFE14D');
      S.bossKills = S.bossKills || {}; S.bossKills[this.biome] = (S.bossKills[this.biome] || 0) + 1;
      questOnBoss(this.biome);
      this.ebul = []; this.haz = [];
      for (let k = 0; k < 4; k++) this.fxList.push({ k: 'ring', x: e.x, y: dy, r: 8 + k * 5, col: k % 2 ? 0xFFE14D : 0xFF4A3A, t: -k * 0.08, dur: 0.4 });
      this.cam.shake(300, 4 / (view().H / view().z));
      HUD && HUD.bossDown(e.bd.name);
      sdk((m) => m.event && m.event('boss_defeated', { boss: this.biome, level: S.lv }));
      this.gainExp(Math.round((8 + e.lv * 6) * tv('exp_rate') * 10));
      saveProgress();
    } else {
      // while the gathering quest is open, dinosaurs in the fields leave the shell it asks for
      { const qs = questStep();
        if (qs && qs.kind === 'collect' && this.biome === qs.biome) this.drop('quest', e.x, dy, { item: QUEST_ITEM }); }
      // the grinding zone always pays: a spray of coins on every kill
      if (farm) {
        const g = gold(4 * e.sc), c = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < c; i++) this.drop('coin', e.x, dy, { v: Math.max(1, Math.round(g / c)) });
        if (Math.random() < 0.6) this.dropMat(e.x, dy, 1);
      }
      // elsewhere a normal monster drops something one time in ten: mostly gold, sometimes gear or a magic bean
      else if (Math.random() < tv('mon_drop_chance')) {
        const roll = Math.random();
        if (roll < 0.55) { const g = gold(3 * e.sc), c = 2 + Math.floor(Math.random() * 2); for (let i = 0; i < c; i++) this.drop('coin', e.x, dy, { v: Math.max(1, Math.round(g / c)) }); }
        else if (roll < 0.85) this.drop('item', e.x, dy, { item: makeItem(e.lv) });
        else this.drop('bean', e.x, dy, {});
      }
      if (!farm && Math.random() < 0.28) this.dropMat(e.x, dy, Math.random() < 0.25 ? 2 : 1);
      this.gainExp(Math.round((8 + e.lv * 6) * tv('exp_rate') * e.sc * (farm ? farm.exp : 1)));
    }
    if (this.p.target === e) this.p.target = null;
  }
  gainExp(n) {
    S.exp += n;
    let leveled = false; const wasLv = S.lv;
    while (S.exp >= expNeed(S.lv)) { S.exp -= expNeed(S.lv); S.lv++; S.pts += Math.round(tv('points_per_level')); leveled = true; }
    if (leveled) {
      const st = stats(); this.p.hp = st.hp; this.p.ki = st.ki;
      this.levelCol = 1.2; play('levelup', 0.6);
      HUD && HUD.levelUp();
      if (S.lv >= 10 && wasLv < 10 && HUD) HUD.toast('Bảng xếp hạng đã mở! Mở STATS > LEADERBOARD', '#7DF9FF');
      sdk((m) => { m.event && m.event('level_up', { value: S.lv }); m.leaderboard && m.leaderboard.submit('level', S.lv).catch(() => {}); });
      saveProgress();
    }
  }
  drop(type, x, y, o) {
    const d = { type, x, y, vx: (Math.random() - 0.5) * 90, vy: -150 - Math.random() * 60, b: 0, t: 0, ...o };
    if (type === 'coin') d.img = this.add.image(x, y, 'coin0').setOrigin(0.5, 1).setDepth(8);
    else if (type === 'bean') d.img = this.add.image(x, y, 'beanpx').setOrigin(0.5, 1).setDepth(8);
    else if (type === 'ball') d.img = this.add.image(x, y, 'ball_' + d.star).setOrigin(0.5, 1).setScale(1.6).setDepth(8);
    else if (type === 'mat') d.img = this.add.image(x, y, MATS[d.mat].icon).setOrigin(0.5, 1).setScale(0.3).setDepth(8);
    else if (type === 'quest') d.img = this.add.image(x, y, QUEST_ITEM.icon).setOrigin(0.5, 1).setScale(0.42).setDepth(8);
    else d.img = this.add.image(x, y, 'item_' + slotOf(d.item.s).icon).setOrigin(0.5, 1).setScale(0.3).setDepth(8);
    this.drops.push(d);
  }
  dropMat(x, y, n) { this.drop('mat', x, y, { mat: Math.random() < 0.7 ? 'ore' : 'shard', v: n }); }
  pickup(d) {
    d.dead = true;
    const scr = this.toScreen(d.x, d.y - 6);
    if (d.type === 'coin') { S.gold += d.v; play('coin', 0.35, 1 + Math.random() * 0.2); this.num(d.x, d.y - 12, '+' + d.v + ' vàng', '#FFE14D', 8); HUD && HUD.fly(d.img.texture.key, scr, 'gold'); }
    else if (d.type === 'bean') { S.beans++; play('item', 0.4); this.num(d.x, d.y - 12, '+1 Đậu Thần', '#9CFF5A', 8); HUD && HUD.fly('beanpx', scr, 'bean'); }
    else if (d.type === 'ball') {
      S.balls = S.balls || {}; S.balls[d.star] = (S.balls[d.star] || 0) + 1;
      play('levelup', 0.5, 1.1);
      this.num(d.x, d.y - 14, '+' + d.star + '★ Ngọc Rồng', d.star >= 6 ? '#C46BFF' : '#FFB060', 9);
      if (HUD) { HUD.fly('ball_' + d.star, scr, 'bag', 0.7); HUD.flagBag(); }
      if (HUD && hasAllBalls() && !HUD.dragonAlerted) {
        HUD.dragonAlerted = true;
        play('roar', 0.6); HUD.bigText.setText('ĐỦ 7 NGỌC RỒNG!').setColor('#C46BFF').setVisible(true); HUD.bigT = 2.2; HUD.edgeFlash = 0.5;
        HUD.toast('Mở DB để triệu hồi Thần Rồng Thiêng Liêng!', '#C46BFF');
        sdk((m) => m.event && m.event('dragon_ready', {}));
      }
      saveProgress();
    }
    else if (d.type === 'mat') {
      S.mat = S.mat || {}; S.mat[d.mat] = (S.mat[d.mat] || 0) + d.v;
      play('item', 0.4, 1.2);
      this.num(d.x, d.y - 12, '+' + d.v + ' ' + MATS[d.mat].n, MATS[d.mat].col, 8);
      HUD && HUD.fly(MATS[d.mat].icon, scr, 'bag', 0.3);
      saveProgress();
    }
    else if (d.type === 'quest') {
      play('item', 0.5, 1.1);
      this.num(d.x, d.y - 12, '+' + QUEST_ITEM.n, QUEST_ITEM.col, 8);
      HUD && HUD.fly(QUEST_ITEM.icon, scr, 'bag', 0.42);
      questOnDrop();
    }
    else {
      const it = d.item;
      if (S.inv.length >= 18) { S.gold += itemSell(it); this.num(d.x, d.y - 12, 'Bag full: +' + itemSell(it) + ' vàng', '#FFE14D', 8); }
      else { S.inv.push(it); this.num(d.x, d.y - 12, '+' + itemName(it), RARITY[it.r].hex, 9); HUD && HUD.fly(d.img.texture.key, scr, 'bag', 0.3); HUD && HUD.flagBag(); }
      play('item', 0.45);
      saveProgress();
    }
    d.img.destroy();
  }
  eatBean() {
    const p = this.p; if (p.dead) return;
    if (S.beans <= 0) { this.say('No magic beans. Grow some in the garden!', '#9CFF5A'); return; }
    if (p.beanCd > 0) return;
    const st = stats();
    const hpGain = Math.round(st.hp - p.hp), kiGain = Math.round(st.ki - p.ki);
    S.beans--; p.beanCd = 3; p.hp = st.hp; p.ki = st.ki;
    this.num(p.x - 8, p.y - 46, '+' + Math.max(0, hpGain) + ' HP', '#6FFF6A', 9);
    this.num(p.x + 10, p.y - 36, '+' + Math.max(0, kiGain) + ' KI', '#7DB8FF', 9, 0.15);
    for (let r = 0; r < 4; r++) this.fxList.push({ k: 'ring', x: p.x, y: p.y - 20, r: 6 + r, col: 0x6FFF6A, t: -r * 0.06, dur: 0.32 });
    play('bean', 0.55);
    sdk((m) => m.event && m.event('bean_eaten', {}));
    saveProgress();
  }
  hurtPlayer(raw, fromX) {
    const p = this.p; if (p.dead || p.inv > 0) return;
    if (HUD && HUD.panel && (HUD.panel.k === 'talk' || HUD.panel.k === 'shop')) return; // villagers keep you safe while you chat
    const st = stats();
    let arm = st.arm; if (p.trans > 0 && p.race === 'namek') arm *= 1.6;
    const d = Math.max(1, Math.round(raw * (0.9 + Math.random() * 0.2) * (100 / (100 + arm * 2))));
    p.hp -= d; p.inv = 0.55; p.combatT = 4;
    this.setPose(7, 0.25);
    if (!p.flying) { p.vx = (p.x < fromX ? -1 : 1) * 90; p.vy = -110; p.onGround = false; }
    this.num(p.x, p.y - 50, '-' + d, '#FF3B3B', 11);
    play('hurt', 0.45);
    if (p.hp <= 0) this.die();
  }
  die() {
    const p = this.p; p.dead = true; p.hp = 0; p.flying = false;
    if (this.biome === 'arena') this.arenaLose();
    const secs = Math.round((performance.now() - this.runT) / 1000);
    sdk((m) => m.run && m.run.end({ seconds: secs, level: S.lv, kills: this.runKills }));
    sdk((m) => m.event && m.event('knocked_out', { level: S.lv, area: this.biome }));
    S.gold = Math.max(0, S.gold - Math.floor(S.gold * 0.05));
    saveProgress();
    HUD && HUD.open('dead');
  }
  respawn() {
    if (this.biome === 'arena') { this.arenaLose(); this.clearFoe(); }
    const p = this.p, st = stats();
    p.dead = false; p.hp = st.hp; p.ki = st.ki; p.x = this.spawnX; p.y = GY; p.vx = p.vy = 0; p.inv = 2; p.target = null; p.moveTo = null;
    this.runStart();
  }
  travel(to) {
    if (this.biome === 'arena' && this.foe && !this.foe.dead) this.arenaLose();
    S.biome = to; saveProgress(true);
    sdk((m) => m.world && m.world.act({ kind: 'leave' }).catch(() => {}));
    this.scene.restart();
  }

  /* ---------------- fx helpers */
  say(s, col) { HUD && HUD.toast(s, col); }
  num(x, y, s, col, size, delay = 0) {
    const t = mkText(this, Math.round(x), Math.round(y), s, size, col, this.textRes).setOrigin(0.5, 1).setDepth(30).setVisible(delay <= 0);
    this.nums.push({ t, y0: y, age: -delay });
  }
  ringAt(x, y, col, r) { this.fxList.push({ k: 'ring', x, y, r, col, t: 0, dur: 0.3 }); }
  puff(x, y) { for (let i = 0; i < 5; i++) this.sparks.push({ x: x + (Math.random() - 0.5) * 14, y: y - 1, vy: -10 - Math.random() * 10, vx: (Math.random() - 0.5) * 30, life: 0.3, col: 0xE8E0C8 }); }
  toScreen(x, y) { const v = view(), uz = HUD && HUD.v ? HUD.v.uz : v.uz; const wv = this.cam.worldView; return { x: ((x - wv.x) * v.z) / uz, y: ((y - wv.y) * v.z) / uz }; }

  /* ---------------- update */
  update(time, dtMs) {
    let dt = Math.min(0.05, dtMs / 1000);
    if (!this.stars) this.stars = [];
    if (this.hitstop > 0) { this.hitstop -= dt; dt *= 0.2; }
    const p = this.p, st = stats(), r = RACES[p.race];
    const inp = this.input_();
    const K = this.keys;
    const panelOpen = HUD && HUD.panel;
    let mx = inp.x, my = inp.y;
    if (!panelOpen) {
      if (K.LEFT.isDown || K.A.isDown) mx = -1; if (K.RIGHT.isDown || K.D.isDown) mx = 1;
      if (K.DOWN.isDown || K.S.isDown) my = 1; if (K.UP.isDown || K.W.isDown || K.SPACE.isDown) { if (p.flying) my = -1; }
    } else { mx = 0; my = 0; }
    if (inp.jumpHeld && p.flying) my = -1;
    if (Math.abs(mx) > 0.2 || (p.flying && Math.abs(my) > 0.3)) { p.moveTo = null; p.target = null; }
    // tap-to-move / tap-to-attack
    if (!p.dead && p.target) {
      const e = p.target;
      if (e.dead) p.target = null;
      else {
        const dx = e.x - p.x; p.face = dx >= 0 ? 1 : -1;
        if (Math.abs(dx) > 22 + e.w / 2) mx = Math.sign(dx);
        else { mx = 0; if (Math.abs((e.y - e.h / 2) - (p.y - 20)) < e.h / 2 + 18) this.melee(); else if (e.md.fly) this.skill(1); }
        if (p.flying || e.md.fly) my = Math.sign((e.y - e.h / 2) - (p.y - 20)) * (Math.abs((e.y - e.h / 2) - (p.y - 20)) > 10 ? 1 : 0);
      }
    } else if (!p.dead && p.moveTo !== null && p.moveTo !== undefined) {
      const dx = p.moveTo - p.x;
      if (Math.abs(dx) < 4) { p.moveTo = null; if (p.after === 'garden') HUD && HUD.open('garden'); if (p.after === 'plant') HUD && HUD.open('plant'); if (p.after === 'chest') HUD && HUD.open('chest'); if (p.after === 'map') HUD && HUD.open('map'); if (p.after && p.after.startsWith('npc:')) this.talkTo((this.npcs || []).find((n) => 'npc:' + n.id === p.after)); p.after = null; }
      else mx = Math.sign(dx);
    }
    // timers
    p.atkCd -= dt; p.comboT -= dt; p.inv -= dt; p.beanCd -= dt; p.poseT -= dt; p.combatT -= dt;
    for (let i = 0; i < 5; i++) p.cds[i] = Math.max(0, p.cds[i] - dt);
    for (const bk in p.buffs) if (p.buffs[bk] > 0) { p.buffs[bk] -= dt; if (p.buffs[bk] <= 0) { p.buffs[bk] = 0; this.say(goodOf('ch_' + bk).n + ' wore off', '#9fb0d8'); } }
    if (p.trans > 0) {
      p.trans -= dt;
      if (p.race === 'saiyan') p.ki -= 1.5 * dt;
      if (p.race === 'earth') p.hp = Math.max(1, p.hp - st.hp * 0.008 * dt);
      if (p.ki <= 0) p.trans = 0;
    }
    // regen
    if (!p.dead) {
      let reg = r.regen; if (p.trans > 0 && p.race === 'namek') reg *= 4;
      p.hp = Math.min(st.hp, p.hp + st.hp * (reg / 100) * dt * (p.combatT > 0 ? 0.5 : 1));
      if (!p.flying) p.ki = Math.min(st.ki, p.ki + st.ki * (tv('ki_regen') / 100) * dt);
    }
    // movement
    const spdBuff = p.buffs.spd > 0 ? BUFF_MUL.spd : 1;
    const boardMul = S.eq && S.eq.board ? 1.3 : 1;
    const spd = tv('walk_speed') * (p.trans > 0 && p.race === 'saiyan' ? 1.15 : 1) * spdBuff * boardMul;
    if (p.dead) { mx = 0; my = 0; }
    if (p.flying) {
      const fs = tv('fly_speed') * spdBuff * boardMul;
      p.vx += ((mx * fs) - p.vx) * Math.min(1, dt * 8);
      p.vy += ((my * fs * 0.85) - p.vy) * Math.min(1, dt * 8);
      p.ki -= tv('fly_drain') * dt;
      if (p.ki <= 0) { p.ki = 0; p.flying = false; this.say('Out of Ki!', '#7DB8FF'); }
    } else {
      const target = mx * spd;
      p.vx += (target - p.vx) * Math.min(1, dt * (p.onGround ? 14 : 6));
      p.vy += tv('gravity') * dt;
      if (p.vy > 520) p.vy = 520;
    }
    if (Math.abs(mx) > 0.1 && p.poseT <= 0) p.face = mx > 0 ? 1 : -1;
    const prevY = p.y;
    p.x = Phaser.Math.Clamp(p.x + p.vx * dt, 10, LW - 10);
    p.y += p.vy * dt;
    if (p.y < -380) { p.y = -380; p.vy = Math.max(0, p.vy); }
    this.collide(p, prevY);
    if (p.onGround) { p.jumps = 0; if (this.groundAt(p.x) && p.y >= GY - 1) p.lastSafe = p.x; if (p.flying && p.vy >= 0 && my >= 0) p.flying = false; }
    // fell into water / pit
    if (p.y > GY + 34) {
      this.fxList.push({ k: 'ring', x: p.x, y: GY + 28, r: 10, col: 0xffffff, t: 0, dur: 0.3 });
      p.x = p.lastSafe; p.y = GY - 30; p.vy = 0; p.vx = 0;
      if (!p.dead) this.hurtPlayer(st.hp * 0.08, p.x + 1);
    }
    // portal / garden hint
    let hint = null;
    if (this.garden && Math.abs(p.x - this.garden.x) < 40 && p.onGround) hint = 'garden';
    if (this.plant && Math.abs(p.x - this.plant.x) < 40 && p.onGround) hint = 'plant';
    if (this.chest && Math.abs(p.x - this.chest.x) < 44 && p.onGround) hint = 'chest';
    for (const pt of this.portals) if (Math.abs(p.x - pt.x) < 40) hint = 'portal';
    { const n = this.nearNpc(); if (n && p.onGround) hint = 'npc:' + n.id; }
    HUD && HUD.setHint(hint);
    // animation frame
    p.anim += dt;
    let f = 0;
    if (p.dead) f = 7;
    else if (p.poseT > 0 && p.pose !== null) f = p.pose;
    else if (p.flying) f = Math.abs(p.vx) > 20 ? 6 : 0;
    else if (!p.onGround) f = p.vy < 0 ? 1 : 2;
    else if (Math.abs(p.vx) > 15) f = 1 + (Math.floor(p.anim * 8) % 2);
    const sheet = p.trans > 0 && p.race === 'saiyan' ? 'ssj' : p.race;
    p.frame = f;
    p.spr.setTexture(sheet + '_' + f).setFlipX(p.face < 0);
    const bob = !p.dead && f === 0 && p.onGround ? Math.floor(p.anim * 2) % 2 : 0;
    const hover = p.flying ? Math.round(Math.sin(p.anim * 4) * 1.5) : 0;
    p.spr.setPosition(Math.round(p.x), Math.round(p.y + bob + hover + (f === 6 ? -8 : 0)));
    p.spr.setAlpha(p.inv > 0 && !p.dead && Math.floor(p.inv * 20) % 2 ? 0.45 : 1);
    if (p.dead) p.spr.setAngle(p.face * -80); else p.spr.setAngle(0);
    if (p.trans > 0 && p.race === 'earth') p.spr.setTint(Math.floor(p.anim * 10) % 2 ? 0xFFB0A0 : 0xFF8070); else p.spr.clearTint();
    p.tag.setPosition(Math.round(p.x), Math.round(p.y - 54));
    this.camTarget.setPosition(p.x + p.face * 18, p.y - this.followOff);
    // flight hum
    if (p.flying && !flyLoop && game.cache.audio.exists('fly')) { flyLoop = game.sound.add('fly', { loop: true, volume: 0.18 }); flyLoop.setMute(!soundOn); flyLoop.play(); }
    if (!p.flying && flyLoop) { flyLoop.stop(); flyLoop.destroy(); flyLoop = null; }

    this.updateMonsters(dt);
    this.updateBlasts(dt);
    this.updateDrops(dt);
    this.updateGarden();
    this.updatePlant();
    this.updateNpcs(dt);
    this.updateOthers(dt);
    this.drawFx(dt);
    for (const w of this.waters || []) w.tilePositionX += dt * 12;
    // periodic save & network
    this.saveT += dt; if (this.saveT > 25) { this.saveT = 0; if (saveMeta.dirty || true) saveProgress(); }
    this.netT -= dt; if (this.netT <= 0) { this.netT = 1.4; this.net(); }
  }
  collide(b, prevY) {
    b.onGround = false;
    if (b.vy >= 0) {
      if (prevY <= GY + 0.5 && b.y >= GY && this.groundAt(b.x)) { b.y = GY; b.vy = 0; b.onGround = true; return; }
      for (const pl of this.plats) {
        if (b.x >= pl.x0 && b.x <= pl.x1 && prevY <= pl.y + 0.5 && b.y >= pl.y) {
          if (b.kind === 'player' && b.flying && this.input_().y > 0.5) continue;
          b.y = pl.y; b.vy = 0; b.onGround = true; return;
        }
      }
    }
  }
  updateMonsters(dt) {
    const p = this.p;
    this.updateEnemyFx(dt);
    for (const e of this.ents) {
      if (e.fighter) { this.updateFighter(e, dt); continue; }
      if (e.boss) { this.updateBoss(e, dt); continue; }
      if (e.dead) {
        e.respawn -= dt;
        if (e.respawn <= 0 && Math.abs(e.home - p.x) > 140) {
          e.dead = false; e.hp = e.maxHp; e.x = e.home; e.y = e.md.fly ? GY - 70 - Math.random() * 50 : GY; e.baseY = e.y; e.aggro = false;
          e.spr.setVisible(true); e.tag.setVisible(true); this.ringAt(e.x, e.y - e.h / 2, 0xffffff, 8);
        }
        continue;
      }
      e.anim += dt; e.hurtT -= dt; e.cd -= dt;
      const dx = p.x - e.x, dist = Math.abs(dx), dy = (p.y - 20) - (e.y - e.h / 2);
      if (!p.dead && dist < 130 && Math.abs(dy) < 90) e.aggro = true;
      if (p.dead || dist > 260) e.aggro = false;
      let frame = 0;
      if (e.md.fly) {
        if (e.aggro && e.hurtT <= 0) {
          if (e.wind > 0) { // diving
            e.wind -= dt; e.x += e.dvx * dt; e.y += e.dvy * dt; frame = 2;
            if (Math.abs(p.x - e.x) < 14 && Math.abs((p.y - 20) - (e.y - e.h / 2)) < 20) { this.hurtPlayer(e.atk, e.x); e.wind = 0; e.cd = 1.4; }
          } else {
            const tx = p.x - Math.sign(dx || 1) * 50, ty = p.y - 50 + Math.sin(e.anim * 2) * 10;
            e.x += Phaser.Math.Clamp(tx - e.x, -1, 1) * e.md.speed * dt * (Math.abs(tx - e.x) > 4 ? 1 : 0);
            e.y += Phaser.Math.Clamp(ty - e.y, -1, 1) * e.md.speed * dt;
            if (e.cd <= 0 && dist < 80) { const L = Math.hypot(dx, dy) || 1; e.dvx = (dx / L) * 160; e.dvy = (dy / L) * 160; e.wind = 0.6; }
            frame = Math.floor(e.anim * 8) % 2;
          }
        } else {
          e.x += Math.sin(e.anim * 0.6 + e.home) * 18 * dt; e.y = e.baseY + Math.sin(e.anim * 2.2) * 6; frame = Math.floor(e.anim * 8) % 2;
        }
        e.y = Math.min(e.y, GY - 10); e.y = Math.max(e.y, -300);
        e.face = dx > 0 ? 1 : -1; if (!e.aggro) e.face = Math.cos(e.anim * 0.6 + e.home) > 0 ? 1 : -1;
      } else {
        let vx = 0;
        if (e.wind > 0) {
          e.wind -= dt; frame = 2;
          if (e.wind <= 0) {
            if (dist < 34 + e.w / 2 && Math.abs(dy) < 30) this.hurtPlayer(e.atk, e.x);
            e.cd = 1.1;
          }
        } else if (e.hurtT > 0) { frame = 3; }
        else if (e.aggro) {
          e.face = dx > 0 ? 1 : -1;
          if (dist > 24 + e.w / 2) vx = e.face * e.md.speed * 1.5;
          else if (e.cd <= 0) { e.wind = 0.42; }
        } else {
          const t = Math.sin(e.anim * 0.5 + e.home);
          if (Math.abs(t) > 0.35) { vx = Math.sign(t) * e.md.speed * 0.5; e.face = Math.sign(t); }
          if (Math.abs(e.x - e.home) > 90) { vx = Math.sign(e.home - e.x) * e.md.speed * 0.5; e.face = Math.sign(vx); }
        }
        const nx = e.x + vx * dt;
        if (this.groundAt(nx - e.w / 2) && this.groundAt(nx + e.w / 2)) e.x = nx;
        if (vx !== 0 && frame === 0) frame = Math.floor(e.anim * 7) % 2;
      }
      if (e.hurtT > 0) frame = 3;
      e.spr.setTexture(e.t + '_' + frame).setFlipX(e.face > 0).setPosition(Math.round(e.x), Math.round(e.y));
      if (e.flash > 0) { e.spr.setTintFill(0xffffff); e.flash -= 1; } else if (e.def.tint) e.spr.setTint(e.def.tint); else e.spr.clearTint();
      e.tag.setPosition(Math.round(e.x), Math.round(e.y - e.h - 2));
    }
  }
  /* ---------------- bosses: each one cycles through its own three moves, each with a readable wind-up */
  updateBoss(e, dt) {
    const p = this.p, B = e.bd;
    if (e.dead) {
      e.respawn -= dt;
      if (e.respawn <= 0 && Math.abs(e.home - p.x) > 260) {
        e.dead = false; e.hp = e.maxHp; e.x = e.home; e.y = e.baseY; e.vx = e.vy = 0; e.st = 'idle'; e.stT = 1.2; e.aggro = false; e.woke = false;
        e.spr.setVisible(true).setAlpha(1); e.tag.setVisible(true); this.ringAt(e.x, e.y - e.h / 2, 0xFF4A3A, 14);
      }
      return;
    }
    e.anim += dt; e.hurtT -= dt; e.stT -= dt;
    const dx = p.x - e.x, dist = Math.abs(dx), dy = (p.y - 20) - (e.y - e.h / 2);
    const minX = LW - ARENA + 50, maxX = LW - 110;
    if (!p.dead && p.x > LW - ARENA + 20 && dist < 300) {
      if (!e.woke) { e.woke = true; play('roar', 0.7); this.cam.shake(260, 3 / (view().H / view().z)); HUD && HUD.bossAlert(B.name); sdk((m) => m.event && m.event('boss_engaged', { boss: this.biome, level: S.lv })); }
      e.aggro = true;
    }
    if (p.dead || p.x < LW - ARENA - 120) { e.aggro = false; e.st = 'idle'; e.vx = 0; }
    let frame = Math.floor(e.anim * (B.fly ? 3 : 5)) % 2;
    const atk = e.atk;
    const toward = () => { e.face = dx >= 0 ? 1 : -1; };
    const gravity = () => {
      if (B.fly) return;
      if (!e.onGround) { e.vy += 900 * dt; e.y += e.vy * dt; if (e.y >= GY) { e.y = GY; e.vy = 0; e.onGround = true; return 'land'; } }
    };
    const touch = (mult, r = 0) => { if (!e.hitDone && Math.abs(p.x - e.x) < e.w / 2 + 8 + r && Math.abs((p.y - 20) - (e.y - e.h / 2)) < e.h / 2 + 10) { e.hitDone = true; this.hurtPlayer(atk * mult, e.x); } };
    if (!e.aggro) {
      if (B.fly) { e.y = e.baseY + Math.sin(e.anim * 2) * 6; }
      else { const t = Math.sin(e.anim * 0.4); if (Math.abs(t) > 0.45) { e.x += Math.sign(t) * B.speed * 0.4 * dt; e.face = Math.sign(t); } else frame = 0; gravity(); }
      e.x += (e.home - e.x) * 0.2 * dt;
    } else if (e.st === 'idle') {
      toward();
      if (B.fly) {
        const tx = p.x - e.face * 95, ty = Math.min(GY - 40, p.y - 34) + Math.sin(e.anim * 2.4) * 8;
        e.x += Phaser.Math.Clamp(tx - e.x, -1, 1) * B.speed * dt * (Math.abs(tx - e.x) > 4 ? 1 : 0);
        e.y += Phaser.Math.Clamp(ty - e.y, -1, 1) * B.speed * 0.8 * dt;
      } else if (dist > e.w / 2 + 28) { e.x += e.face * B.speed * dt; } else frame = 0;
      gravity();
      if (e.stT <= 0 && !p.dead) {
        let mv = B.moves[e.mi % B.moves.length]; e.mi++;
        if ((mv === 'bite' || mv === 'slash') && dist > 140) { mv = B.moves[e.mi % B.moves.length]; e.mi++; }
        e.move = mv; e.st = 'tele'; e.hitDone = false; e.n = 0;
        e.stT = { charge: 0.75, stomp: 0.55, bite: 0.4, bombs: 0.55, leap: 0.45, slash: 0.35, volley: 0.6, deathbeam: 0.9, warp: 0.35 }[mv];
        if (mv === 'deathbeam') { e.beamY = Math.round(Math.min(GY - 14, p.y - 22)); e.beamFace = e.face; }
        if (mv === 'charge' || mv === 'leap' || mv === 'bite') this.num(e.x, e.y - e.h - 16, '!', '#FF4A3A', 16);
      }
    } else if (e.st === 'tele') {
      frame = 2;
      if (e.move === 'stomp') frame = 0;
      if (e.move === 'warp') e.spr.setAlpha(Math.max(0, e.stT / 0.35));
      if (e.move === 'deathbeam') { e.y += Phaser.Math.Clamp(e.beamY + e.h * 0.45 - e.y, -1, 1) * 120 * dt; e.face = e.beamFace; }
      else if (e.move !== 'warp') toward();
      gravity();
      if (e.stT <= 0) {
        e.st = 'act';
        const mv = e.move;
        if (mv === 'charge') { e.vx = e.face * 300; e.stT = 1.0; play('kick', 0.5, 0.6); }
        else if (mv === 'stomp') { e.vy = -330; e.onGround = false; e.stT = 3; }
        else if (mv === 'bite') { e.stT = 0.18; play('hit', 0.6, 0.6); }
        else if (mv === 'bombs') { e.stT = 0.3; this.throwBombs(e); }
        else if (mv === 'leap') { const T = 0.8, tx = Phaser.Math.Clamp(p.x, minX, maxX); e.vx = (tx - e.x) / T; e.vy = -900 * T / 2; e.onGround = false; e.stT = 3; }
        else if (mv === 'slash') { e.stT = 0.24; e.vx = e.face * 240; e.hitDone = false; play('kick', 0.5, 1.2); }
        else if (mv === 'volley') { e.stT = 0.45; this.volley(e); }
        else if (mv === 'deathbeam') { e.stT = 0.45; play('beam', 0.6, 0.7); this.cam.shake(200, 2 / (view().H / view().z)); }
        else if (mv === 'warp') { e.x = Phaser.Math.Clamp(p.x - (dx >= 0 ? 1 : -1) * 20, minX, maxX); e.y = Math.max(GY - 200, p.y - 100); e.spr.setAlpha(1); this.ringAt(e.x, e.y - e.h / 2, 0xC46BFF, 12); toward(); const L = Math.hypot(p.x - e.x, p.y - 20 - (e.y - e.h / 2)) || 1; e.vx = ((p.x - e.x) / L) * 280; e.vy = ((p.y - 20 - (e.y - e.h / 2)) / L) * 280; e.stT = 0.55; }
      }
    } else if (e.st === 'act') {
      frame = 2;
      const mv = e.move;
      if (mv === 'charge') {
        e.x += e.vx * dt; touch(1.4);
        if (Math.random() < 0.6) this.sparks.push({ x: e.x - e.face * e.w / 2, y: GY - 2, vy: -30, vx: -e.face * 40, life: 0.35, col: 0xE0C090 });
        if (e.x <= minX || e.x >= maxX || e.stT <= 0) { e.vx = 0; this.done(e, 1.1); }
      } else if (mv === 'stomp') {
        frame = 0;
        if (gravity() === 'land') {
          for (const d of [-1, 1]) this.haz.push({ k: 'wave', x: e.x + d * e.w / 2, dir: d, life: 1.3, dmg: atk * 1.1, hit: false });
          this.cam.shake(220, 4 / (view().H / view().z)); play('die', 0.6, 0.5); this.ringAt(e.x, GY - 4, 0xE0C090, 18); this.done(e, 0.9);
        }
      } else if (mv === 'bite') {
        touch(1.3, 18);
        if (e.stT <= 0) this.done(e, 0.7);
      } else if (mv === 'bombs') {
        if (e.stT <= 0) { e.n++; if (e.n < 2) { e.stT = 0.5; this.throwBombs(e); } else this.done(e, 0.8); }
      } else if (mv === 'leap') {
        e.x = Phaser.Math.Clamp(e.x + e.vx * dt, minX, maxX);
        if (gravity() === 'land') {
          e.vx = 0; this.haz.push({ k: 'boom', x: e.x, y: GY - 8, r: 46, t: 0, dur: 0.35, dmg: atk * 1.5, hit: false });
          this.cam.shake(220, 4 / (view().H / view().z)); play('die', 0.6, 0.6); this.done(e, 1.0);
        }
      } else if (mv === 'slash') {
        e.x = Phaser.Math.Clamp(e.x + e.vx * dt, minX, maxX); touch(1.1, 20);
        this.haz.push({ k: 'slash', x: e.x + e.face * 26, y: e.y - e.h * 0.55, face: e.face, t: 0, dur: 0.12 });
        if (e.stT <= 0) { e.n++; if (e.n < 3) { toward(); e.stT = 0.24; e.vx = e.face * 240; e.hitDone = false; play('kick', 0.5, 1.2 + e.n * 0.1); } else { e.vx = 0; this.done(e, 0.9); } }
      } else if (mv === 'volley') {
        if (e.stT <= 0) { e.n++; if (e.n < 3) { e.stT = 0.45; this.volley(e); } else this.done(e, 0.7); }
      } else if (mv === 'deathbeam') {
        const x0 = e.x + e.beamFace * 14, x1 = x0 + e.beamFace * 460;
        if (!e.hitDone && Math.abs((p.y - 20) - e.beamY) < 16 && (p.x - x0) * e.beamFace > 0 && (p.x - x1) * e.beamFace < 0) { e.hitDone = true; this.hurtPlayer(atk * 1.7, e.x); }
        if (e.stT <= 0) this.done(e, 0.9);
      } else if (mv === 'warp') {
        e.x = Phaser.Math.Clamp(e.x + e.vx * dt, minX, maxX); e.y = Math.min(GY - 6, e.y + e.vy * dt); touch(1.3, 6);
        if (e.stT <= 0) this.done(e, 0.8);
      }
    } else if (e.st === 'rec') {
      frame = 0; gravity();
      if (B.fly) e.y += Phaser.Math.Clamp(GY - 70 - e.y, -1, 1) * 40 * dt;
      if (e.stT <= 0) { e.st = 'idle'; e.stT = 0.6 + Math.random() * 0.7; }
    }
    e.x = Phaser.Math.Clamp(e.x, minX - 60, maxX);
    if (e.hurtT > 0 && e.st !== 'act') frame = 3;
    const telFlash = e.st === 'tele' && Math.floor(e.anim * 14) % 2;
    e.spr.setTexture(e.t + '_' + frame).setFlipX(e.face > 0).setPosition(Math.round(e.x), Math.round(e.y));
    if (e.flash > 0) { e.spr.setTintFill(0xffffff); e.flash -= 1; } else if (telFlash) e.spr.setTint(0xFF8A7A); else e.spr.clearTint();
    e.tag.setPosition(Math.round(e.x), Math.round(e.y - e.h - 6)).setVisible(!e.aggro);
  }
  done(e, rec) { e.st = 'rec'; e.stT = rec; e.vx = 0; }

  /* ---------------- the tournament: one AI fighter at a time, harder every round */
  arenaState() { S.arena = S.arena || { round: 1, best: 0, wins: 0 }; S.arena.round = Math.max(1, S.arena.round | 0); return S.arena; }
  clearFoe() {
    const e = this.foe; if (!e) return;
    if (e.spr) e.spr.destroy(); if (e.tag) e.tag.destroy();
    this.ents = this.ents.filter((x) => x !== e); this.foe = null;
    if (this.p.target === e) this.p.target = null;
  }
  arenaStart() {
    const need = Math.round(tv('arena_level'));
    if (S.lv < need) { this.say('Đại hội Võ thuật cần cấp ' + need + '. Bạn đang cấp ' + S.lv + '.', '#FF6A4A'); return; }
    const A = this.arenaState(), r = A.round, info = arenaFoeInfo(r);
    this.clearFoe();
    const p = this.p, cx = this.ring ? this.ring.cx : Math.round(LW / 2);
    const st = stats();
    p.dead = false; p.flying = false; p.trans = 0; p.hp = st.hp; p.ki = st.ki; p.buffs = p.buffs || { atk: 0, arm: 0, spd: 0 };
    for (let i = 0; i < 5; i++) p.cds[i] = 0;
    p.x = Phaser.Math.Clamp(cx - 120, 40, LW - 40); p.y = GY; p.vx = p.vy = 0; p.target = null; p.moveTo = null;
    this.cam.centerOn(p.x, p.y - 40);
    const e = { kind: 'mon', fighter: true, race: info.race, t: info.race, def: { t: info.race, name: info.name },
      md: { fly: false, speed: info.speed, w: 14, h: 40 }, lv: info.lv, name: info.name, round: r, moves: info.moves, rec: info.rec,
      x: Phaser.Math.Clamp(cx + 120, 40, LW - 40), y: GY, vx: 0, vy: 0, face: -1, sc: 1, hp: info.hp, maxHp: info.hp, atk: info.atk, arm: info.arm,
      w: 14, h: 40, flash: 0, hurtT: 0, wind: 0, cd: 0.6, aggro: true, dead: false, anim: 0, baseY: GY, st: 'idle', stT: 1.1, mi: 0, onGround: true };
    e.spr = this.add.image(e.x, e.y, info.race + '_0').setOrigin(0.5, 1).setScale(SPR).setDepth(9);
    e.tag = mkText(this, e.x, e.y, '★ Vòng ' + r + ' · ' + e.name + ' Lv' + e.lv, 8, '#FF9A1F', this.textRes || 3).setOrigin(0.5, 1).setDepth(25);
    this.ents.push(e); this.foe = e;
    play('bell', 0.7);
    this.cam.shake(200, 2 / (view().H / view().z));
    HUD && HUD.roundStart(r, e.name + ' Lv' + e.lv);
    sdk((m) => m.event && m.event('arena_start', { round: r, level: e.lv }));
  }
  arenaWin(e) {
    const A = this.arenaState(), r = Math.max(1, e.round || A.round);
    const rw = arenaReward(e.lv, r);
    A.best = Math.max(A.best || 0, r); A.wins = (A.wins || 0) + 1; A.round = r + 1;
    const dy = e.y - e.h / 2;
    S.gold += rw.gold;
    S.gems = (S.gems || 0) + (r >= 4 ? 6 : 3);
    for (let i = 0; i < 3; i++) this.drop('coin', e.x, dy, { v: Math.max(1, Math.round(rw.gold * 0.1)) });
    this.drop('item', e.x, dy, { item: makeItem(e.lv, { r: rw.rarity }) });
    let prize = null;
    if (rw.prize) {
      const gd = GOODS[Math.floor(Math.random() * GOODS.length)];
      S.bagc = S.bagc || {}; S.bagc[gd.k] = Math.min(99, (S.bagc[gd.k] || 0) + 1);
      prize = gd.n;
      HUD && HUD.fly('good_' + gd.icon, this.toScreen(e.x, dy - 10), 'item');
    }
    this.gainExp(rw.exp);
    play('levelup', 0.5, 1.15);
    for (let k = 0; k < 5; k++) this.fxList.push({ k: 'ring', x: e.x, y: dy, r: 8 + k * 6, col: k % 2 ? 0xFFE14D : 0xFF9A1F, t: -k * 0.08, dur: 0.45 });
    HUD && HUD.roundWin(r);
    sdk((m) => {
      m.event && m.event('arena_win', { round: r, level: e.lv });
      m.leaderboard && m.leaderboard.submit('arena_round', A.best).catch(() => {});
    });
    saveProgress();
    HUD && HUD.open('arena', false, { result: { round: r, name: e.name, lv: e.lv, gold: rw.gold, exp: rw.exp, prize } });
  }
  arenaLose() {
    const A = this.arenaState(), was = A.round;
    A.round = 1;
    // losing a live match hands over a Reward Chest, richer the further you climbed
    if (this.foe && !this.foe.dead) {
      this.foe.dead = true; this.foe.spr.setVisible(false); this.foe.tag.setVisible(false);
      this.grantRewardChest(Math.max(1, was));
    }
    if (was > 1) this.say('Thua trận: trở lại Vòng 1', '#FF6A4A');
    sdk((m) => m.event && m.event('arena_lose', { round: was, value: A.best || 0 }));
  }
  grantRewardChest(tier) {
    S.rchests = S.rchests || [];
    S.rchests.push({ tier, lv: S.lv, at: Date.now() });
    play('levelup', 0.5, 1.05);
    const scr = this.toScreen(this.p.x, this.p.y - 40);
    HUD && HUD.fly('chestpx', scr, 'bag', 0.5);
    HUD && HUD.flagBag();
    this.say('Nhận Rương Phần thưởng (' + chestTierName(tier) + ')! Mở trong Ngọc Rồng.', '#FFD9A0');
    sdk((m) => m.event && m.event('reward_chest', { value: tier }));
    saveProgress();
  }
  fighterBlast(e) {
    play('kiblast', 0.4, 0.85);
    this.ebul.push({ k: 'orb', x: e.x + e.face * 14, y: e.y - 26, vx: e.face * 178, vy: 0, g: 0, life: 2.4, dmg: e.atk * 0.7, col: RACES[e.race].blast });
  }
  updateFighter(e, dt) {
    const p = this.p;
    if (e.dead) return;
    e.anim += dt; e.hurtT -= dt; e.stT -= dt; e.cd -= dt;
    const dx = p.x - e.x, dist = Math.abs(dx), dy = (p.y - 20) - (e.y - e.h / 2);
    const toward = () => { e.face = dx >= 0 ? 1 : -1; };
    const gravity = () => { if (!e.onGround) { e.vy += 900 * dt; e.y += e.vy * dt; if (e.y >= GY) { e.y = GY; e.vy = 0; e.onGround = true; return 'land'; } } };
    const touch = (mult, r = 0) => { if (!e.hitDone && Math.abs(p.x - e.x) < e.w / 2 + 10 + r && Math.abs((p.y - 20) - (e.y - e.h / 2)) < e.h / 2 + 10) { e.hitDone = true; this.hurtPlayer(e.atk * mult, e.x); } };
    let frame = 0;
    if (p.dead) { e.aggro = false; e.st = 'idle'; e.stT = 0.5; }
    else if (dist < 420) e.aggro = true;
    if (!e.aggro) { gravity(); frame = 0; }
    else if (e.st === 'idle') {
      toward();
      if (dist > 28) { e.x += e.face * e.md.speed * dt; frame = 1 + (Math.floor(e.anim * 9) % 2); }
      else if (dist < 12) { e.x -= e.face * e.md.speed * 0.6 * dt; frame = 1 + (Math.floor(e.anim * 9) % 2); }
      gravity();
      // chase: jump after a fighter in the air, and only shoot when the blast is off cooldown
      if (e.onGround && p.y < GY - 34 && dist < 110) { e.vy = -330; e.onGround = false; }
      if (e.stT <= 0) {
        let mv = null;
        if (dist > 150) { if (e.cd <= 0) mv = 'blast'; }
        else {
          mv = e.moves[e.mi % e.moves.length]; e.mi++;
          if (mv === 'blast' && dist < 64) mv = 'punch';
          if (mv === 'dash' && dist > 190) mv = 'kick';
        }
        if (!mv) e.stT = 0.26;   // nothing to do yet: keep closing in
        else {
          e.move = mv; e.st = 'tele'; e.hitDone = false; e.n = 0;
          e.stT = { punch: 0.22, kick: 0.28, blast: 0.34, dash: 0.24 }[mv];
          if (mv === 'blast') e.cd = 1.5 + Math.random() * 1.3;
          if (mv === 'dash' || mv === 'kick') this.num(e.x, e.y - e.h - 14, '!', '#FF9A1F', 12);
        }
      }
    } else if (e.st === 'tele') {
      frame = e.move === 'blast' ? 5 : 3;
      toward();
      if (dist > 34) e.x += e.face * e.md.speed * 0.7 * dt;   // it keeps walking while it winds up
      gravity();
      if (e.stT <= 0) {
        e.st = 'act';
        if (e.move === 'blast') { e.stT = 0.22; this.fighterBlast(e); }
        else if (e.move === 'dash') { e.vx = e.face * 265; e.stT = 0.34; play('kick', 0.35, 0.8); }
        else if (e.move === 'kick') { e.vx = e.face * 95; e.stT = 0.2; }
        else { e.stT = 0.16; }
      }
    } else if (e.st === 'act') {
      gravity();
      if (e.move === 'punch') { frame = 3; touch(0.9, 4); if (e.stT <= 0) this.done(e, e.rec); }
      else if (e.move === 'kick') { frame = 4; e.x += e.vx * dt; touch(1.2, 10); if (e.stT <= 0) this.done(e, e.rec); }
      else if (e.move === 'dash') { frame = 4; e.x += e.vx * dt; touch(1.3, 4); if (Math.random() < 0.5) this.sparks.push({ x: e.x - e.face * 8, y: GY - 2, vy: -25, vx: -e.face * 40, life: 0.3, col: 0xE0C090 }); if (e.stT <= 0) { e.vx = 0; this.done(e, e.rec); } }
      else { frame = 5; if (e.stT <= 0) this.done(e, e.rec); }
    } else if (e.st === 'rec') {
      frame = 0;
      toward();
      if (dist > 30) { e.x += e.face * e.md.speed * 0.7 * dt; frame = 1 + (Math.floor(e.anim * 9) % 2); }
      gravity();
      if (e.stT <= 0) { e.st = 'idle'; e.stT = 0.16 + Math.random() * 0.22; }
    }
    if (e.hurtT > 0 && e.st !== 'act') frame = 7;
    e.x = Phaser.Math.Clamp(e.x, 40, LW - 40);
    if (e.y > GY) e.y = GY;
    e.spr.setTexture(e.race + '_' + frame).setFlipX(e.face < 0).setPosition(Math.round(e.x), Math.round(e.y));
    if (e.flash > 0) { e.spr.setTintFill(0xffffff); e.flash -= 1; } else e.spr.clearTint();
    e.tag.setPosition(Math.round(e.x), Math.round(e.y - e.h - 10));
  }
  throwBombs(e) {
    const p = this.p, T = 0.9, g = 600, y0 = e.y - e.h * 0.8;
    play('jump', 0.4, 0.7);
    for (const off of [-46, 0, 46]) {
      const tx = Phaser.Math.Clamp(p.x + off + (Math.random() - 0.5) * 16, LW - ARENA, LW - 40);
      this.ebul.push({ k: 'bomb', x: e.x, y: y0, vx: (tx - e.x) / T, vy: (GY - 4 - y0 - 0.5 * g * T * T) / T, g, life: 3, dmg: e.atk * 1.2 });
    }
  }
  volley(e) {
    const p = this.p, ox = e.x + e.face * 16, oy = e.y - e.h * 0.55;
    const base = Math.atan2((p.y - 20) - oy, p.x - ox);
    play('kiblast', 0.45, 0.7);
    for (const a of [-0.36, -0.18, 0, 0.18, 0.36]) this.ebul.push({ k: 'orb', x: ox, y: oy, vx: Math.cos(base + a) * 150, vy: Math.sin(base + a) * 150, g: 0, life: 3, dmg: e.atk * 0.7 });
  }
  updateEnemyFx(dt) {
    const p = this.p; if (!this.ebul) return;
    for (const b of this.ebul) {
      b.vy += b.g * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.k === 'bomb' && b.y >= GY - 4) { b.done = true; this.haz.push({ k: 'boom', x: b.x, y: GY - 6, r: 28, t: 0, dur: 0.35, dmg: b.dmg, hit: false }); play('pop', 0.5, 0.6); }
      else if (b.k === 'orb' && Math.abs(b.x - p.x) < 9 && Math.abs(b.y - (p.y - 20)) < 18) { b.done = true; this.hurtPlayer(b.dmg, b.x); this.fxList.push({ k: 'pop', x: b.x, y: b.y, col: 0xFF3B3B, t: 0, dur: 0.3 }); }
      if (b.k === 'orb' && b.y > GY - 3 && !b.done) { b.done = true; this.fxList.push({ k: 'pop', x: b.x, y: GY - 3, col: 0xFF3B3B, t: 0, dur: 0.3 }); }
      if (b.life <= 0 || b.y > GY + 40) b.done = true;
    }
    this.ebul = this.ebul.filter((b) => !b.done);
    for (const h of this.haz) {
      if (h.k === 'wave') {
        h.x += h.dir * 210 * dt; h.life -= dt;
        if (!h.hit && Math.abs(p.x - h.x) < 9 && p.y > GY - 14) { h.hit = true; this.hurtPlayer(h.dmg, h.x - h.dir * 10); }
        if (!this.groundAt(h.x)) h.life = 0;
      } else {
        h.t += dt;
        if (h.k === 'boom' && !h.hit && h.t < 0.15 && Math.hypot(p.x - h.x, (p.y - 14) - h.y) < h.r) { h.hit = true; this.hurtPlayer(h.dmg, h.x); }
      }
    }
    this.haz = this.haz.filter((h) => (h.k === 'wave' ? h.life > 0 : h.t < h.dur));
  }
  updateBlasts(dt) {
    for (const b of this.blasts) {
      b.tail.unshift({ x: b.x, y: b.y }); if (b.tail.length > 3) b.tail.pop();
      b.x += b.vx * dt; b.life -= dt;
      for (const e of this.ents) {
        if (e.dead || b.done) continue;
        if (Math.abs(e.x - b.x) < e.w / 2 + 4 && b.y > e.y - e.h - 4 && b.y < e.y + 4) { this.hurtMonster(e, b.dmg, Math.sign(b.vx), 6); b.done = true; play('pop', 0.35); }
      }
      if (b.life <= 0) b.done = true;
      if (b.done) this.fxList.push({ k: 'pop', x: b.x, y: b.y, col: b.col, t: 0, dur: 0.33 });
    }
    this.blasts = this.blasts.filter((b) => !b.done);
    if (this.beam) {
      const bm = this.beam, p = this.p; bm.t += dt;
      bm.x = p.x + bm.dir * 14; bm.y = p.y - 24;
      bm.len = Math.min(230, bm.t * 900);
      if (!bm.hit && bm.t > 0.18) {
        bm.hit = true;
        for (const e of this.ents) {
          if (e.dead) continue; const dx = (e.x - bm.x) * bm.dir;
          if (dx > -4 && dx < 236 && Math.abs((e.y - e.h / 2) - bm.y) < e.h / 2 + 8) this.hurtMonster(e, 3.6, bm.dir, 10);
        }
        this.cam.shake(160, 0.004);
      }
      if (bm.t > 0.6) this.beam = null;
    }
  }
  updateDrops(dt) {
    const p = this.p;
    for (const d of this.drops) {
      d.t += dt;
      if (d.b < 3) {
        d.vy += 600 * dt; d.x += d.vx * dt; d.y += d.vy * dt;
        const floor = this.groundAt(d.x) ? GY : GY + 60;
        if (d.y >= floor && d.vy > 0) { d.y = floor; d.b++; d.vy = d.b === 1 ? -110 : d.b === 2 ? -50 : 0; d.vx *= 0.5; if (d.b >= 3) d.vx = 0; }
        if (d.y > GY + 40) { d.x = p.lastSafe; d.y = GY - 10; }
      } else if (d.t > 0.5 && Math.abs(p.x - d.x) < 70 && Math.abs(p.y - d.y) < 60) {
        d.x += Math.sign(p.x - d.x) * 160 * dt; d.y += Math.sign(p.y - 10 - d.y) * 120 * dt;
      }
      if (d.type === 'coin') d.img.setTexture('coin' + (Math.floor(d.t * 9) % 3));
      d.img.setPosition(Math.round(d.x), Math.round(d.y));
      if (!p.dead && d.t > 0.35 && Math.abs(p.x - d.x) < 16 && Math.abs((p.y - 18) - (d.y - 4)) < 28) this.pickup(d);
      if (d.t > 60 && !d.dead) { d.dead = true; d.img.destroy(); }
    }
    this.drops = this.drops.filter((d) => !d.dead);
  }
  gardenStage() {
    const g = S.garden; if (!g.planted) return -1;
    const ms = tv('bean_stage_seconds') * 1000 * Math.pow(0.85, (g.lvl || 1) - 1);
    return Math.min(3, Math.floor((Date.now() - g.planted) / ms));
  }
  updateGarden() {
    if (!this.garden) return;
    const st = this.gardenStage();
    this.garden.img.setTexture('garden_' + Math.max(0, st)).setAlpha(st < 0 ? 0.75 : 1);
    this.garden.ready = st === 3;
  }
  plantStage() {
    const g = S.plant; if (!g || !g.planted) return -1;
    const ms = tv('bean_stage_seconds') * 1000 * Math.pow(0.85, (g.lvl || 1) - 1);
    return Math.min(3, Math.floor((Date.now() - g.planted) / ms));
  }
  updatePlant() {
    if (!this.plant) return;
    const st = this.plantStage();
    this.plant.img.setTexture('garden_' + Math.max(0, st)).setAlpha(st < 0 ? 0.75 : 1);
    this.plant.ready = st === 3;
  }
  async net() {
    const m = MB(); if (!(m && m.world && m.viewer && m.viewer.signedIn)) return;
    const p = this.p;
    try {
      const res = await m.world.act({ kind: 'pos', b: this.biome, x: p.x, y: p.y, r: p.race, f: p.face, lv: S.lv, a: p.frame || 0, s: p.trans > 0 && p.race === 'saiyan' ? 1 : 0 });
      if (!this.sys.isActive()) return;
      const seen = new Set();
      for (const o of (res.answer && res.answer.others) || []) {
        seen.add(o.id);
        let g = this.others.get(o.id);
        if (!g) {
          const race = RACES[o.r] ? o.r : 'earth';
          g = { id: o.id, race, x: o.x, y: o.y, tx: o.x, ty: o.y, anim: 0 };
          g.spr = this.add.image(o.x, o.y, race + '_0').setOrigin(0.5, 1).setScale(SPR).setDepth(9);
          g.tag = mkText(this, o.x, o.y, (o.n || 'Fighter') + ' Lv' + o.lv, 7, '#ffffff', this.textRes).setOrigin(0.5, 1).setDepth(24);
          this.others.set(o.id, g);
        }
        g.tx = o.x; g.ty = o.y; g.f = o.f; g.a = o.a; g.s = o.s; g.lv = o.lv;
        g.tag.setText((o.n || 'Fighter') + ' Lv' + o.lv);
      }
      for (const [id, g] of this.others) if (!seen.has(id)) { g.spr.destroy(); g.tag.destroy(); this.others.delete(id); }
    } catch (e) { if (e && e.reason === 'RATE_LIMITED') this.netT = 3; }
  }
  updateNpcs(dt) {
    const p = this.p, fr = Math.floor(this.time.now / 500) % 2;
    for (const n of this.npcs || []) {
      n.anim += dt;
      if (Math.abs(p.x - n.x) < 120) n.spr.setFlipX(p.x < n.x);
      n.spr.setY(GY - (Math.floor(n.anim * 2) % 2));
      const show = n.role === 'shop' || n.role === 'smith' || n.role === 'gift' || !(S.talked || {})[n.id];
      n.mark.setVisible(show).setY((n.role === 'shop' || n.role === 'smith' || n.role === 'gift' ? GY - 74 : GY - 66) - fr * 2);
    }
  }
  updateOthers(dt) {
    for (const g of this.others.values()) {
      g.x += (g.tx - g.x) * Math.min(1, dt * 5); g.y += (g.ty - g.y) * Math.min(1, dt * 5); g.anim += dt;
      let f = g.a || 0; if ((f === 1 || f === 2)) f = 1 + (Math.floor(g.anim * 8) % 2);
      g.spr.setTexture((g.s && g.race === 'saiyan' ? 'ssj' : g.race) + '_' + f).setFlipX(g.f < 0).setPosition(Math.round(g.x), Math.round(g.y + (f === 6 ? -8 : 0)));
      g.tag.setPosition(Math.round(g.x), Math.round(g.y - 54));
    }
  }
  drawFx(dt) {
    const gb = this.fxBack, gf = this.fxFront, p = this.p, r = RACES[p.race];
    gb.clear(); gf.clear();
    // point-and-click: a small pixel target where the player is walking to
    if (!p.dead && (p.moveTo !== null && p.moveTo !== undefined || p.target)) {
      const tx = Math.round(p.target ? p.target.x : p.moveTo), ty = p.target ? Math.round(p.target.y) : GY;
      const k = (Math.floor(this.time.now / 160) % 2) * 2, w = 7 + k;
      const col = p.target ? 0xFF4A3A : 0xFFE14D;
      gb.fillStyle(0x0B0F1E, 0.9); gb.fillRect(tx - w - 1, ty - 2, w * 2 + 2, 4);
      gb.fillStyle(col, 1); gb.fillRect(tx - w, ty - 1, 4, 2); gb.fillRect(tx + w - 4, ty - 1, 4, 2); gb.fillRect(tx - 1, ty - 1, 2, 2);
      if (!p.target) { gb.fillStyle(0x0B0F1E, 1); gb.fillRect(tx - 3, ty - 12, 7, 5); gb.fillStyle(col, 1); gb.fillRect(tx - 2, ty - 11, 5, 2); gb.fillRect(tx - 1, ty - 9, 3, 1); }
    }
    const fr = Math.floor(p.anim * 10);
    // aura (transform) and flight aura at the feet
    if (!p.dead && p.trans > 0) {
      drawAura(gb, Math.round(p.x), Math.round(p.y + 1), 15, 29, p.race === 'earth' ? [0xFF5A4A, 0xFF9A7A] : r.aura, fr);
      if (Math.random() < 0.5) this.sparks.push({ x: p.x + (Math.random() - 0.5) * 26, y: p.y - Math.random() * 10, vy: -50 - Math.random() * 40, life: 0.5, col: (p.race === 'earth' ? [0xFF5A4A, 0xFFB0A0] : r.aura)[fr % 2] });
    }
    if (!p.dead && p.flying) {
      gb.fillStyle(r.aura[fr % 2], 0.9);
      const fy = Math.round(p.y + (p.frame === 6 ? -12 : 0)), fx = Math.round(p.x - (p.frame === 6 ? p.face * 14 : 0));
      for (let i = -5; i <= 5; i += 2) gb.fillRect(fx + i, fy - 1 + (Math.abs(i) > 3 ? -1 : 0) + ((fr + i) % 2), 2, 2 + ((fr + i) & 1));
      if (Math.abs(p.vx) > 40 || Math.abs(p.vy) > 40) {
        gf.fillStyle(0xffffff, 0.8);
        for (let i = 0; i < 4; i++) {
          const ly = Math.round(p.y - 8 - ((fr * 7 + i * 11) % 34)), lx = Math.round(p.x - p.face * (20 + ((fr * 5 + i * 13) % 20)));
          if (Math.abs(p.vx) > Math.abs(p.vy)) gf.fillRect(lx - (p.face > 0 ? 10 : 0), ly, 10, 1); else gf.fillRect(Math.round(p.x - 14 + i * 9), Math.round(p.y + 4 - (p.vy > 0 ? 54 : 0) + ((fr * 3 + i * 5) % 6)), 1, 9);
        }
      }
    }
    // hoverboard under the feet when one is equipped
    if (!p.dead && S.eq && S.eq.board) {
      const byy = Math.round(p.y + (p.flying ? 2 : 1)), fl = Math.floor(p.anim * 12) % 2, bx0 = Math.round(p.x);
      gb.fillStyle(0x0B0F1E, 1); gb.fillRect(bx0 - 12, byy - 4, 24, 7);
      gb.fillStyle(0x6A3FA0, 1); gb.fillRect(bx0 - 11, byy - 3, 22, 5);
      gb.fillStyle(0xC46BFF, 1); gb.fillRect(bx0 - 11, byy - 3, 22, 1);
      gb.fillStyle(0x5EE0FF, fl ? 0.9 : 0.5); gb.fillRect(bx0 - 8, byy + 3, 16, 1);
      gb.fillStyle(0xffffff, fl ? 0.8 : 0.4); gb.fillRect(bx0 - 4, byy + 4, 8, 1);
    }
    // sparks
    for (const s of this.sparks) { s.life -= dt; s.y += s.vy * dt; s.x += (s.vx || 0) * dt; gf.fillStyle(s.col, 1); gf.fillRect(Math.round(s.x), Math.round(s.y), 1, s.life > 0.25 ? 2 : 1); }
    this.sparks = this.sparks.filter((s) => s.life > 0);
    // star bursts
    for (const s of this.stars) { s.t += dt; drawStar(gf, s.x, s.y, s.t < 0.06 ? 7 : 5, Math.floor(s.t * 30)); }
    this.stars = this.stars.filter((s) => s.t < 0.12);
    // ki blasts
    for (const b of this.blasts) {
      const fl = Math.floor(b.life * 20) % 2;
      b.tail.forEach((t, i) => { gf.fillStyle(b.col, 0.7 - i * 0.2); gf.fillRect(Math.round(t.x - Math.sign(b.vx) * (2 + i * 2)) - 1, Math.round(t.y) - 1, 2, 2); });
      gf.fillStyle(b.col, 1); gf.fillRect(Math.round(b.x) - 3, Math.round(b.y) - 2, 7, 5); gf.fillRect(Math.round(b.x) - 2, Math.round(b.y) - 3, 5, 7);
      if (fl) { gf.fillStyle(b.col, 0.5); gf.fillRect(Math.round(b.x) - 4, Math.round(b.y) - 1, 9, 3); gf.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 4, 3, 9); }
      gf.fillStyle(0xffffff, 1); gf.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 1, 3, 3);
    }
    // beam
    if (this.beam) {
      const bm = this.beam, x0 = Math.round(bm.x), y = Math.round(bm.y), L = Math.round(bm.len), d = bm.dir, f = Math.floor(bm.t * 24) % 2;
      const thick = bm.t < 0.12 ? 3 : bm.t > 0.48 ? 4 : 9 + f;
      const xa = d > 0 ? x0 : x0 - L;
      const rim = Phaser.Display.Color.IntegerToColor(bm.col).darken(28).color;
      gf.fillStyle(rim, 0.9); gf.fillRect(xa, y - Math.ceil(thick / 2) - 2, L, thick + 4);
      gf.fillStyle(bm.col, 1); gf.fillRect(xa, y - Math.ceil(thick / 2), L, thick);
      gf.fillStyle(0xffffff, 1); gf.fillRect(xa, y - 1, L, 3);
      const tipX = x0 + d * L; gf.fillStyle(bm.col, 1); gf.fillRect(tipX - 7, y - 7 - f, 14, 14 + 2 * f); gf.fillStyle(0xffffff, 1); gf.fillRect(tipX - 4, y - 4, 8, 8);
      gf.fillStyle(bm.col, 1); gf.fillRect(x0 - 5, y - 5, 10, 10); gf.fillStyle(0xffffff, 1); gf.fillRect(x0 - 3, y - 3, 6, 6);
    }
    // boss attacks: wind-up lines, shockwaves, bombs, blasts
    const B = this.boss, tf = Math.floor(this.time.now / 70) % 2;
    if (B && !B.dead && B.move === 'deathbeam' && (B.st === 'tele' || B.st === 'act')) {
      const x0 = Math.round(B.x + B.beamFace * 14), L = 460, xa = B.beamFace > 0 ? x0 : x0 - L, y = B.beamY;
      if (B.st === 'tele') { gf.fillStyle(0xFF3B3B, tf ? 0.9 : 0.4); for (let i = 0; i < L; i += 8) gf.fillRect(xa + i, y, 5, 1); }
      else { const th = 7 + tf * 2; gf.fillStyle(0x7A0010, 0.9); gf.fillRect(xa, y - th / 2 - 2, L, th + 4); gf.fillStyle(0xFF2A4A, 1); gf.fillRect(xa, y - th / 2, L, th); gf.fillStyle(0xffffff, 1); gf.fillRect(xa, y - 1, L, 2); }
    }
    if (B && !B.dead && B.st === 'tele' && B.move === 'stomp') { gf.fillStyle(0xE0C090, tf ? 1 : 0.5); gf.fillRect(Math.round(B.x - 50), GY - 1, 100, 2); }
    if (B && !B.dead && B.st === 'tele' && B.move === 'leap') { const tx = Math.round(Phaser.Math.Clamp(this.p.x, LW - ARENA + 50, LW - 110)); gf.fillStyle(0xFF3B3B, tf ? 0.8 : 0.35); gf.fillRect(tx - 40, GY - 1, 80, 2); gf.fillRect(tx - 1, GY - 7, 2, 6); }
    for (const h of this.haz || []) {
      if (h.k === 'wave') {
        const x = Math.round(h.x);
        gf.fillStyle(0x1A1A2E, 1); gf.fillRect(x - 4, GY - 15, 9, 15);
        gf.fillStyle(0xE0C090, 1); gf.fillRect(x - 3, GY - 12 - tf * 2, 7, 12 + tf * 2); gf.fillStyle(0xFFF0C8, 1); gf.fillRect(x - 1, GY - 10 - tf * 2, 3, 8);
        if (Math.random() < 0.5) this.sparks.push({ x: h.x, y: GY - 4, vy: -60, vx: -h.dir * 20, life: 0.3, col: 0xB08A5A });
      } else if (h.k === 'boom') {
        const k = h.t / h.dur, r = Math.round(h.r * (0.4 + k * 0.6));
        drawRingPop(gf, Math.round(h.x), Math.round(h.y), r, k < 0.5 ? 0xFFE14D : 0xFF6A1A, Math.floor(k * 4));
        if (k < 0.4) { gf.fillStyle(0xFFF6C0, 1); gf.fillRect(Math.round(h.x - r / 2), Math.round(h.y - r / 2), r, r); gf.fillStyle(0xFF8A1A, 1); gf.fillRect(Math.round(h.x - r / 3), Math.round(h.y - r / 3), Math.round(r * 0.66), Math.round(r * 0.66)); }
      } else if (h.k === 'slash') {
        const x = Math.round(h.x), y = Math.round(h.y);
        gf.fillStyle(0xffffff, 0.9); for (let i = 0; i < 6; i++) gf.fillRect(x + h.face * (i * 3 - 6), y - 14 + i * 5, 4, 3);
      }
    }
    for (const b of this.ebul || []) {
      const x = Math.round(b.x), y = Math.round(b.y);
      if (b.k === 'bomb') { gf.fillStyle(0x0B0F1E, 1); gf.fillRect(x - 4, y - 4, 9, 9); gf.fillStyle(0x3A3A4A, 1); gf.fillRect(x - 3, y - 3, 7, 7); gf.fillStyle(0x7A7A8A, 1); gf.fillRect(x - 2, y - 2, 2, 2); gf.fillStyle(tf ? 0xFFE14D : 0xFF4A1A, 1); gf.fillRect(x + 1, y - 6, 2, 2); }
      else { gf.fillStyle(0xFF2A4A, 0.35); gf.fillRect(x - 6 - tf, y - 6 - tf, 13 + tf * 2, 13 + tf * 2); gf.fillStyle(0x7A0010, 1); gf.fillRect(x - 4, y - 4, 9, 9); gf.fillStyle(0xFF2A4A, 1); gf.fillRect(x - 3, y - 3, 7, 7); gf.fillStyle(0xffffff, 1); gf.fillRect(x - 1, y - 1, 3, 3); gf.fillStyle(0xFF7A8A, 0.7); gf.fillRect(Math.round(x - b.vx * 0.04) - 2, Math.round(y - b.vy * 0.04) - 2, 4, 4); }
    }
    // rings and pops
    for (const fx of this.fxList) {
      fx.t += dt; if (fx.t < 0) continue;
      const step = Math.min(3, Math.floor((fx.t / fx.dur) * 4));
      if (fx.k === 'pop') { drawRingPop(gf, Math.round(fx.x), Math.round(fx.y), 2 + step * 3, step % 2 ? 0xffffff : fx.col, step); }
      else drawRingPop(gf, Math.round(fx.x), Math.round(fx.y), fx.r + step * 4, fx.col, step);
    }
    this.fxList = this.fxList.filter((f) => f.t < f.dur);
    // equipment drop sparkles + garden ready sparkle
    for (const d of this.drops) if (d.type === 'item') {
      const a = d.t * 6, cx = Math.round(d.x), cy = Math.round(d.y - 8);
      gf.fillStyle(RARITY[d.item.r].c, 1);
      for (let k = 0; k < 4; k++) { const ang = a + (k * Math.PI) / 2; gf.fillRect(Math.round(cx + Math.cos(ang) * 10), Math.round(cy + Math.sin(ang) * 10), 2, 2); }
      gf.fillStyle(0xffffff, 1); gf.fillRect(cx + Math.round(Math.cos(a) * 10), cy - 12, 1, 1);
    }
    if (this.garden && this.garden.ready) {
      const gx = this.garden.x, f2 = Math.floor(p.anim * 4) % 2;
      gf.fillStyle(0xFFF6A8, 1); gf.fillRect(gx - 9 + f2 * 14, GY - 34 + f2 * 6, 2, 2); gf.fillRect(gx + 6 - f2 * 10, GY - 22, 1, 1);
      this.garden.tag.setText(f2 ? 'Vườn Đậu  ★ READY' : 'Vườn Đậu  ☆ READY');
    } else if (this.garden) this.garden.tag.setText('Vườn Đậu');
    if (this.plant && this.plant.ready) {
      const gx = this.plant.x, f2 = Math.floor(p.anim * 4) % 2;
      gf.fillStyle(0xFFF6A8, 1); gf.fillRect(gx - 9 + f2 * 14, GY - 34 + f2 * 6, 2, 2); gf.fillRect(gx + 6 - f2 * 10, GY - 22, 1, 1);
      this.plant.tag.setText(f2 ? 'Magic Bean Plant  ★ READY' : 'Magic Bean Plant  ☆ READY');
    } else if (this.plant) this.plant.tag.setText('Magic Bean Plant');
    // portals glow
    for (const pt of this.portals) { const f2 = Math.floor(p.anim * 6) % 3; gf.fillStyle(0xFFE55C, 1); gf.fillRect(Math.round(pt.x - 8 + f2 * 6), Math.round(GY - 26 - f2 * 5), 1, 2); }
    // enemy hp bars
    for (const e of this.ents) if (!e.dead && !e.boss && e.hp < e.maxHp) {
      const w = 22, x = Math.round(e.x - w / 2), y = Math.round(e.y - e.h - 12);
      gf.fillStyle(0x1A1A2E, 1); gf.fillRect(x - 1, y - 1, w + 2, 4); gf.fillStyle(0x3A1418, 1); gf.fillRect(x, y, w, 2);
      gf.fillStyle(0xE0302A, 1); gf.fillRect(x, y, Math.max(1, Math.round((w * e.hp) / e.maxHp)), 2);
    }
    // target marker
    if (p.target && !p.target.dead) { const e = p.target; const ay = Math.round(e.y - e.h - 20 + (Math.floor(p.anim * 4) % 2)); gf.fillStyle(0xFF6A4A, 1); gf.fillRect(Math.round(e.x) - 3, ay, 7, 2); gf.fillRect(Math.round(e.x) - 2, ay + 2, 5, 1); gf.fillRect(Math.round(e.x) - 1, ay + 3, 3, 1); }
    // level up column
    if (this.levelCol > 0) {
      this.levelCol -= dt;
      const steps = [[22, 0.25], [16, 0.4], [10, 0.6], [4, 0.95]];
      const fl = Math.floor(this.levelCol * 12) % 2;
      for (const [w, a] of steps) { gb.fillStyle(fl ? 0xFFE55C : 0xFFF6A8, a); gb.fillRect(Math.round(p.x - w / 2), Math.round(p.y - 420), w, 420); }
      if (Math.random() < 0.7) this.sparks.push({ x: p.x + (Math.random() - 0.5) * 22, y: p.y, vy: -120, life: 0.6, col: 0xFFE14D });
    }
    // damage numbers: pop up, rise ~14 and fade over 3 steps
    for (const n of this.nums) {
      n.age += dt; if (n.age < 0) continue; n.t.setVisible(true);
      const k = Math.min(1, n.age / 0.75);
      const pop = n.age < 0.08 ? -2 : 0;
      n.t.y = Math.round(n.y0 - 14 * Math.min(1, n.age / 0.4) + pop);
      n.t.setAlpha(n.age < 0.45 ? 1 : n.age < 0.6 ? 0.66 : 0.33);
      if (k >= 1) { n.t.destroy(); n.dead = true; }
    }
    this.nums = this.nums.filter((n) => !n.dead);
  }
}

function playerName() {
  const m = MB();
  const u = m && m.viewer && m.viewer.username;
  return u || 'Chiến Binh';
}

/* ================================================================ HUD */
let HUD = null;
/* the quest tracker can be hidden by the player so it never covers the play area (kept for the session) */
let questTrackerHidden = false;
/* the Gift code field is a DOM overlay so a real keyboard can type into it */
let codeUI = null, codeInput = null, codeMsgEl = null;
function initCodeUI() {
  codeUI = document.getElementById('codeui');
  if (!codeUI) return;
  codeInput = document.getElementById('codeinput');
  codeMsgEl = document.getElementById('codemsg');
  const red = document.getElementById('coderedeem'), cl = document.getElementById('codeclose');
  if (red) red.addEventListener('click', () => { if (HUD) HUD.redeemCode(codeInput ? codeInput.value : ''); });
  if (cl) cl.addEventListener('click', () => { if (HUD) HUD.closePanel(); });
  if (codeInput) codeInput.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); if (HUD) HUD.redeemCode(codeInput.value); }
  });
}
function showCodeUI(focus) {
  if (!codeUI) return;
  codeUI.style.display = 'flex';
  if (focus && codeInput) { try { codeInput.focus(); } catch (e) {} }
}
function hideCodeUI() { if (codeUI) codeUI.style.display = 'none'; }
class Hud extends Phaser.Scene {
  constructor() { super('hud'); }
  create() {
    HUD = this;
    this.hits = new Hits();
    this.inp = { x: 0, y: 0, jumpHeld: false };
    this.joy = { id: null, bx: 0, by: 0, kx: 0, ky: 0 };
    this.jumpPtr = null;
    this.panel = null; this.flies = []; this.toasts = []; this.hint = null; this.edgeFlash = 0; this.bagFlag = false;
    this.g = this.add.graphics().setDepth(1);
    this.gTop = this.add.graphics().setDepth(3);
    this.pg = this.add.graphics().setDepth(50);
    this.pTexts = []; this.pImgs = [];
    this.input.addPointer(3);
    this.input.on('pointerdown', (p) => this.down(p));
    this.input.on('pointermove', (p) => this.move(p));
    this.input.on('pointerup', (p) => this.up(p));
    this.input.on('pointerupoutside', (p) => this.up(p));
    this.scale.on('resize', () => this.layout(), this);
    this.layout();
    if (dailyAvailable()) this.time.delayedCall(700, () => { if (dailyAvailable() && !this.panel) { play('bell', 0.5, 1.1); sdk((m) => m.event && m.event('daily_open', {})); this.open('daily'); } });
    if (!S.seenHelp) {
      S.seenHelp = true;
      const touch = this.sys.game.device.input.touch;
      this.time.delayedCall(300, () => this.toast(touch ? 'Drag to move, up to jump. Tap fist to attack. ? for help' : 'A/D move, Space jump x2, F fly, J attack. ? for help', '#FFE14D') || (this.toastT = 6));
    }
    if (questStep()) this.time.delayedCall(1400, () => { if (!this.panel) this.toast('New quest! Follow the yellow arrow.', '#9CFF5A'); });
    sdk((m) => m.sound && m.sound.onchange && m.sound.onchange((on) => applySound(on)));
    initCodeUI();
  }
  layout() {
    const v0 = view(), huz = v0.uz * Number(tv('hud_scale') || 1.15); const v = { ...v0, uz: huz, UW: v0.W / huz, UH: v0.H / huz }; this.v = v;
    const cam = this.cameras.main; cam.setZoom(v.uz); cam.setOrigin(0, 0); cam.setScroll(0, 0);
    this.textRes = v.uz;
    const UW = v.UW, UH = v.UH;
    // controls are made smaller on a phone (or any small window) so they sit close to the corners
    const cssMin = Math.min(v0.W, v0.H) / DPR;
    const uiScale = (v.portrait || cssMin < 560) ? 0.68 : 1;
    this.uiScale = uiScale;
    // static HUD pieces are rebuilt
    (this.hudObjs || []).forEach((o) => o.destroy()); this.hudObjs = [];
    this.hits.clear('hud');
    const add = (o) => { this.hudObjs.push(o); return o; };
    // avatar
    const ax = 5, ay = 5, as = 34;
    this.av = { x: ax, y: ay, s: as };
    const port = add(this.add.image(ax + as / 2, ay + as - 2, 'portrait_' + RACES[S.race].portrait).setOrigin(0.5, 1).setDepth(2));
    port.setScale((as - 6) / Math.max(port.width, port.height) * 1.05);
    this.portImg = port;
    const crop = port; crop.setCrop(0, 0, port.width, port.height);
    this.lvText = add(mkText(this, ax + 11, ay + as + 1, 'Lv' + S.lv, 9, '#ffffff', this.textRes).setOrigin(0.5).setDepth(6));
    // bars
    const bx = ax + as + 5, bw = Math.min(118, UW - bx - 82);
    this.bars = { x: bx, w: bw, y: ay };
    this.hpText = add(mkText(this, bx + bw / 2, ay + 5.5, '', 8, '#ffffff', this.textRes).setOrigin(0.5).setDepth(4));
    this.kiText = add(mkText(this, bx + bw / 2, ay + 16.5, '', 8, '#ffffff', this.textRes).setOrigin(0.5).setDepth(4));
    this.expLbl = add(mkText(this, bx, ay + 22, 'EXP', 7, '#FFE14D', this.textRes).setDepth(4));
    // menu buttons row
    const my = ay + as + 9;
    this.menu = [];
    const items = [['stats', 'STATS'], ['bag', 'BAG'], ['balls', 'DB'], ['map', 'MAP'], ['summon', 'SPIN'], ['gift', 'GIFT'], ['help', '?'], ['sound', '♪']];
    let mx = ax;
    for (const [k, lbl] of items) {
      const w = k === 'help' || k === 'sound' ? 15 : k === 'gift' ? 25 : k === 'balls' ? 22 : 27;
      const t = add(mkText(this, mx + w / 2, my + 7, lbl, 8, '#ffffff', this.textRes).setOrigin(0.5).setDepth(4));
      this.menu.push({ k, x: mx, y: my, w, h: 14, t });
      this.hits.add(mx, my, w, 14, () => { play('click', 0.4); if (k === 'sound') this.toggleSound(); else this.open(k); }, 'hud', { pad: 2 });
      mx += w + 3;
    }
    // gold + minimap top-right
    const gw = 72;
    this.goldBox = { x: UW - gw - 5, y: 5, w: gw, h: 17 };
    add(this.add.image(this.goldBox.x + 10, 13.5, 'ui_coin').setDisplaySize(11, 11).setDepth(4));
    this.goldText = add(mkText(this, this.goldBox.x + 18, 13.5, '', 9, '#ffffff', this.textRes).setOrigin(0, 0.5).setDepth(4));
    this.mini = { x: UW - gw - 5, y: 24, w: gw, h: 34 };
    this.miniText = add(mkText(this, this.mini.x + gw / 2, this.mini.y + 11, BIOMES[W ? W.biome : S.biome].name, 8, '#ffffff', this.textRes).setOrigin(0.5).setDepth(4));
    // quest tracker (top right, under the minimap); tapping it opens the quest log
    this.questHead = add(mkText(this, 0, 0, '', 7, '#F08A24', this.textRes).setDepth(4));
    this.questTitle = add(mkText(this, 0, 0, '', 8, '#FFE14D', this.textRes).setDepth(4));
    this.questDesc = add(mkText(this, 0, 0, '', 7, '#ffffff', this.textRes).setDepth(4));
    this.questDist = add(mkText(this, 0, 0, '', 7, '#FFE14D', this.textRes).setOrigin(0.5).setDepth(4));
    this.questBox = { x: 0, y: 0, w: 132, h: 40 };
    this.questHit = this.hits.add(0, 0, 1, 1, () => { play('click', 0.4); this.open('quest'); }, 'hud', { pad: 2 });
    // a small toggle for the quest tracker, so the player can clear it off the screen
    this.questTog = { x: Math.round(UW - 50), y: 59, w: 45, h: 15 };
    this.questTogT = add(mkText(this, this.questTog.x + this.questTog.w / 2, this.questTog.y + this.questTog.h / 2, '', 7, '#ffffff', this.textRes).setOrigin(0.5).setDepth(5));
    this.hits.add(this.questTog.x, this.questTog.y, this.questTog.w, this.questTog.h, () => { play('click', 0.4); questTrackerHidden = !questTrackerHidden; }, 'hud', { pad: 3 });
    // joystick
    const jr = 27 * uiScale;
    this.joyBase = { x: 12 + jr + 4, y: UH - jr - 12, r: jr };
    this.joyLbl = add(mkText(this, this.joyBase.x, this.joyBase.y + jr + 2, this.sys.game.device.input.touch ? 'DRAG ANYWHERE' : 'A/D  W  S', 6, '#ffffff', this.textRes).setOrigin(0.5, 0).setDepth(4).setAlpha(0.7));
    // a visible Leaderboard button on the HUD, above the joystick where there is always room
    this.topBtn = { x: 6, y: UH - 96, w: 62, h: 15 };
    this.topT = add(mkText(this, this.topBtn.x + this.topBtn.w / 2, this.topBtn.y + 7, 'LEADERBOARD', 7, '#ffffff', this.textRes).setOrigin(0.5).setDepth(4));
    this.hits.add(this.topBtn.x, this.topBtn.y, this.topBtn.w, this.topBtn.h, () => { play('click', 0.4); this.open('rank'); }, 'hud', { pad: 2 });
    // skill cluster
    const margin = uiScale < 1 ? 30 * uiScale + 6 : 30;
    const cx = UW - margin, cy = UH - margin;
    this.skills = [];
    const big = 36 * uiScale, sm = 27 * uiScale, rad = 52 * uiScale;
    this.skills.push({ i: 0, x: cx - big / 2, y: cy - big / 2, s: big });
    [180, 148, 116, 84].forEach((deg, k) => {
      const a = (deg * Math.PI) / 180; const x = cx + Math.cos(a) * rad, y = cy - Math.sin(a) * rad;
      this.skills.push({ i: k + 1, x: x - sm / 2, y: y - sm / 2, s: sm });
    });
    const keys = ['J', 'K', 'L', 'U', 'I'];
    const touch = this.sys.game.device.input.touch;
    for (const s of this.skills) {
      add(this.add.image(s.x + s.s / 2, s.y + s.s / 2, 'sk' + s.i).setDisplaySize(s.s, s.s).setDepth(2));
      s.cdText = add(mkText(this, s.x + s.s / 2, s.y + s.s / 2, '', 9, '#ffffff', this.textRes).setOrigin(0.5).setDepth(4));
      if (!touch) add(mkText(this, s.x + s.s - 3, s.y + s.s - 2, keys[s.i], 6, '#FFE14D', this.textRes).setOrigin(1, 1).setDepth(4));
      this.hits.add(s.x, s.y, s.s, s.s, () => W && W.skill(s.i), 'hud', { pad: 2, hold: s.i === 0 ? 'atk' : null });
    }
    // jump & bean
    const bs = uiScale;
    this.jumpBtn = { x: cx - 100 * bs, y: cy + 4 * bs, r: 17 * bs };
    if (UW < 330) { this.jumpBtn.x = cx - 96 * bs; }
    add(this.add.image(this.jumpBtn.x, this.jumpBtn.y, 'ui_jump').setDisplaySize(34 * bs, 34 * bs).setDepth(2));
    this.hits.add(this.jumpBtn.x - 19 * bs, this.jumpBtn.y - 19 * bs, 38 * bs, 38 * bs, () => { W && W.jump(); }, 'hud', { hold: 'jump' });
    this.beanBtn = { x: cx - 112 * bs, y: cy - 44 * bs, s: 24 * bs };
    add(this.add.image(this.beanBtn.x + 12 * bs, this.beanBtn.y + 12 * bs, 'ui_bean').setDisplaySize(15 * bs, 15 * bs).setDepth(3));
    this.beanText = add(mkText(this, this.beanBtn.x + 22 * bs, this.beanBtn.y + 21 * bs, '', 7, '#ffffff', this.textRes).setOrigin(1, 1).setDepth(4));
    this.hits.add(this.beanBtn.x, this.beanBtn.y, 24 * bs, 24 * bs, () => W && W.eatBean(), 'hud', { pad: 2 });
    this.itemBtn = { x: this.beanBtn.x, y: this.beanBtn.y - 28 * bs, s: 24 * bs };
    add(this.add.image(this.itemBtn.x + 12 * bs, this.itemBtn.y + 12 * bs, 'good_0').setDisplaySize(16 * bs, 16 * bs).setDepth(3));
    this.itemText = add(mkText(this, this.itemBtn.x + 22 * bs, this.itemBtn.y + 21 * bs, '', 7, '#ffffff', this.textRes).setOrigin(1, 1).setDepth(4));
    this.hits.add(this.itemBtn.x, this.itemBtn.y, 24 * bs, 24 * bs, () => { play('click', 0.4); this.open('items'); }, 'hud', { pad: 2 });
    if (!touch) add(mkText(this, this.itemBtn.x + 2, this.itemBtn.y + 1, 'P', 6, '#FFE14D', this.textRes).setDepth(4));
    // active Power Charm timers, stacked under the menu row
    this.buffTexts = [0, 1, 2].map((i) => add(mkText(this, 19, 70 + i * 14, '', 7, '#ffffff', this.textRes).setOrigin(0, 0.5).setDepth(4)));
    this.buffImgs = [0, 1, 2].map((i) => add(this.add.image(11, 70 + i * 14, 'good_3').setDisplaySize(11, 11).setDepth(4).setVisible(false)));
    if (!touch) { add(mkText(this, this.jumpBtn.x, this.jumpBtn.y + 19, 'SPACE', 6, '#FFE14D', this.textRes).setOrigin(0.5, 0).setDepth(4)); add(mkText(this, this.beanBtn.x + 2, this.beanBtn.y + 1, 'H', 6, '#FFE14D', this.textRes).setDepth(4)); }
    // interact hint button
    this.hintBtn = add(mkText(this, UW / 2, (v.portrait ? 92 + 36 : 66 + 22), '', 9, '#FFE14D', this.textRes).setOrigin(0.5).setDepth(4));
    this.hintHit = this.hits.add(UW / 2 - 50, UH - 80, 100, 20, () => W && W.interact(), 'hud', { off: true });
    // toast text
    this.toastText = add(mkText(this, UW / 2, v.portrait ? 92 : 66, '', 9, '#ffffff', this.textRes).setOrigin(0.5).setDepth(6))
    this.toastText.setWordWrapWidth(Math.min(UW - 20, 300)).setAlign('center');
    this.bigText = add(mkText(this, UW / 2, UH * 0.38, '', 22, '#FFE14D', this.textRes).setOrigin(0.5).setDepth(7).setVisible(false));
    this.toastY = this.toastText.y; this.hintY = this.hintBtn.y;
    this.bossBox = { x: Math.round((UW - Math.min(240, UW - 14)) / 2), y: 68, w: Math.min(240, UW - 14), h: 15 };
    this.bossText = add(mkText(this, UW / 2, 68 + 7.5, '', 8, '#ffffff', this.textRes).setOrigin(0.5).setDepth(6));
    if (this.panel) { const old = this.panel; this.panel = null; this.open(old.k, true, old); }
  }
  toggleSound() {
    const m = MB();
    if (m && m.sound && m.sound.toggle) applySound(m.sound.toggle()); else applySound(!soundOn);
  }
  /* ---- pointer handling */
  down(p) {
    const v = this.v, ux = p.x / v.uz, uy = p.y / v.uz;
    if (this.panel) {
      const b = this.hits.find(ux, uy, ['panel']);
      if (b) { play('click', 0.4); b.cb(); return; }
      if (this.panel.k === 'dead') return;
      if (this.panel.k === 'talk') { this.talkNext(); return; }
      // the help card and the daily gift never hold a finger: touching anywhere off their buttons closes them and the touch steers
      if (this.panel.k === 'help' || this.panel.k === 'daily' || (this.panel.box && !inBox(ux, uy, this.panel.box))) this.closePanel();
      else return;
    }
    const b = this.hits.find(ux, uy, ['hud']);
    if (b) {
      if (b.hold === 'jump') { this.jumpPtr = p.id; this.inp.jumpHeld = true; }
      if (b.hold === 'atk') { this.atkPtr = p.id; }
      b.cb(); return;
    }
    // any other touch starts a floating joystick anchored where THIS finger landed;
    // if it never moves it was a tap in the world
    if (this.joy.id === null) {
      this.joy.id = p.id; this.joy.bx = ux; this.joy.by = uy; this.joy.kx = this.joy.ky = 0;
      this.joy.moved = false; this.joy.jumped = false; this.joy.tx = p.x; this.joy.ty = p.y;
      this.updJoy(); return;
    }
    if (W) { const wp = W.cam.getWorldPoint(p.x, p.y); W.worldTap(wp.x, wp.y); }
  }
  move(p) {
    if (p.id === this.joy.id) {
      const v = this.v, r = this.joyBase.r; let dx = p.x / v.uz - this.joy.bx, dy = p.y / v.uz - this.joy.by;
      const L = Math.hypot(dx, dy);
      if (L > 5) this.joy.moved = true;
      if (L > r) { dx *= r / L; dy *= r / L; }
      this.joy.kx = dx; this.joy.ky = dy; this.updJoy();
      // an upward drag on the ground jumps (once per drag; back to centre re-arms it)
      if (W && W.p && !W.p.flying) {
        if (dy < -r * 0.6 && !this.joy.jumped) { this.joy.jumped = true; W.jump(); }
        else if (dy > -r * 0.3) this.joy.jumped = false;
      }
    }
  }
  up(p) {
    if (p.id === this.joy.id) {
      const tap = !this.joy.moved;
      this.joy.id = null; this.joy.kx = this.joy.ky = 0; this.updJoy();
      if (tap && W) { const wp = W.cam.getWorldPoint(this.joy.tx, this.joy.ty); W.worldTap(wp.x, wp.y); }
    }
    if (p.id === this.jumpPtr) { this.jumpPtr = null; this.inp.jumpHeld = false; }
    if (p.id === this.atkPtr) this.atkPtr = null;
  }
  updJoy() {
    const r = this.joyBase.r;
    let x = this.joy.kx / r, y = this.joy.ky / r;
    this.inp.x = Math.abs(x) > 0.25 ? x : 0; this.inp.y = Math.abs(y) > 0.35 ? y : 0;
  }
  setHint(h) {
    if (h === this.hint) return; this.hint = h;
    const touch = this.sys.game.device.input.touch;
    if (!h) { this.hintBtn.setText(''); this.hintHit.off = true; return; }
    let what = h === 'garden' ? 'Open bean garden' : h === 'plant' ? 'Open Magic Bean Plant' : h === 'chest' ? 'Open Storage Chest' : 'Travel';
    if (h.startsWith('npc:')) { const n = W && (W.npcs || []).find((q) => 'npc:' + q.id === h); what = n ? (n.role === 'shop' ? 'Shop with ' + n.name : n.role === 'smith' ? 'Forge gear with ' + n.name : n.role === 'arena' ? 'Enter the ring' : n.role === 'gift' ? 'Gift codes from ' + n.name : 'Talk to ' + n.name) : 'Talk'; }
    this.hintBtn.setText((touch ? 'TAP: ' : '[E] ') + what);
    this.hintHit.off = false;
  }
  toast(s, col) { this.toastText.setText(s).setColor(col || '#ffffff'); this.toastT = 2.2; }
  bossAlert(name) { this.bigText.setText('BOSS!').setColor('#FF4A3A').setVisible(true); this.bigT = 1.6; this.toast(name + ' appears!', '#FF6A4A'); }
  roundStart(r, nm) { this.bigText.setText('ROUND ' + r + '!').setColor('#FFE14D').setVisible(true); this.bigT = 1.4; this.edgeFlash = 0.4; this.toast('Đối thủ: ' + nm, '#FF9A1F'); }
  roundWin(r) { this.bigText.setText('ROUND ' + r + ' CLEAR!').setColor('#FFE14D').setVisible(true); this.bigT = 1.6; this.edgeFlash = 0.5; }
  bossDown(name) { this.bigText.setText('BOSS DEFEATED!').setColor('#FFE14D').setVisible(true); this.bigT = 1.8; this.edgeFlash = 0.5; }
  levelUp() {
    this.bigText.setText('LEVEL UP!').setColor('#FFE14D').setVisible(true); this.bigT = 1.6; this.edgeFlash = 0.5;
    this.toast('+' + Math.round(tv('points_per_level')) + ' Potential Points: tap STATS', '#FFE14D');
  }
  flagBag() { this.bagFlag = true; }
  questPing() { this.questFlash = 0.5; }
  questStepDone(step) {
    play('levelup', 0.5, 1.2); this.questFlash = 0.9;
    this.bigText.setText('QUEST COMPLETE!').setColor('#9CFF5A').setVisible(true); this.bigT = 1.5; this.edgeFlash = 0.4;
    this.toast('+' + step.exp + ' EXP   +' + step.gold + ' vàng', '#9CFF5A');
    sdk((m) => m.event && m.event('quest_done', { quest: step.id }));
  }
  questAllDone() {
    play('levelup', 0.6, 1.05); this.questFlash = 1.4;
    this.bigText.setText('QUEST CHAIN COMPLETE!').setColor('#FFE14D').setVisible(true); this.bigT = 2.2; this.edgeFlash = 0.6;
    this.toast('The road is open. Keep training, fighter!', '#FFE14D');
    sdk((m) => m.event && m.event('quest_chain_done', {}));
  }
  drawQuest(g, time, dt) {
    const qb = this.questBox, v = this.v, UW = v.UW;
    if (this.questFlash > 0) this.questFlash -= dt;
    // the show/hide toggle for this tracker, always visible so it can be brought back
    const tg = this.questTog;
    drawBtn(g, tg.x, tg.y, tg.w, tg.h, questTrackerHidden ? C.green : 0x2A3A70);
    const tgl = questTrackerHidden ? 'QUEST \u25B8' : 'QUEST \u25BE';
    if (this.questTogT.text !== tgl) this.questTogT.setText(tgl);
    if (questTrackerHidden) {
      this.questHead.setText(''); this.questTitle.setText(''); this.questDesc.setText('');
      this.questHit.x = -100000; this.questHit.y = -100000; this.questHit.w = 1; this.questHit.h = 1;
    } else {
    const bo = W.foe && !W.foe.dead ? W.foe : W.boss;
    const bossUp = !!(bo && !bo.dead && bo.aggro);
    const qw = Math.min(qb.w, UW - 12);
    qb.w = qw; qb.x = Math.round(UW - qw - 5); qb.y = Math.round(76 + (bossUp && v.portrait ? 22 : 0)); qb.h = 40;
    this.questHit.x = qb.x; this.questHit.y = qb.y; this.questHit.w = qw; this.questHit.h = qb.h;
    const q = questStep(), st = questState();
    const flash = this.questFlash > 0 && Math.floor(time / 110) % 2;
    drawFrame(g, qb.x, qb.y, qb.w, qb.h, flash ? 0x1E4A24 : 0x1B2340, 0.94);
    const tx = qb.x + 6, tw = qb.w - 12;
    if (q) {
      this.questHead.setText('QUEST  ' + (st.step + 1) + '/' + QUEST_CHAIN.length).setPosition(tx, qb.y + 3);
      this.questTitle.setText(q.title).setPosition(tx, qb.y + 13);
      this.questDesc.setText(questStepText(q, st.step, st)).setPosition(tx, qb.y + 24);
      if (q.kind === 'kill' || q.kind === 'collect') {
        const frac = Math.min(1, questHave() / q.need);
        const by2 = qb.y + 34;
        g.fillStyle(0x0B0F1E, 1); g.fillRect(tx - 1, by2 - 1, tw + 2, 6);
        g.fillStyle(0x3A3010, 1); g.fillRect(tx, by2, tw, 4);
        const fw = Math.round(tw * frac);
        g.fillStyle(0x9CFF5A, 1); g.fillRect(tx, by2, fw, 4); g.fillStyle(0xD6FFB0, 1); g.fillRect(tx, by2, fw, 1);
      }
    } else {
      this.questHead.setText('QUEST  DONE').setPosition(tx, qb.y + 3);
      this.questTitle.setText('Chain complete!').setPosition(tx, qb.y + 13);
      this.questDesc.setText('You are ready for the road.').setPosition(tx, qb.y + 24);
    }
    }
    // the objective arrow: floats over the player and always points at the next thing to do
    const obj = questObjective();
    if (!obj || !W.p) { this.questDist.setText(''); return; }
    const scr = W.toScreen(W.p.x, W.p.y);
    const cx = scr.x, cy = scr.y - 42;
    const dx = obj.x - W.p.x, dy = obj.y - (W.p.y - 18);
    const ang = Math.atan2(dy, dx);
    const r = 11 * (0.86 + 0.14 * Math.sin(time / 220));
    const disc = (rr, col, a) => { g.fillStyle(col, a); for (let yy = -rr; yy <= rr; yy++) { const hw = Math.round(Math.sqrt(Math.max(0, rr * rr - yy * yy))); g.fillRect(Math.round(cx - hw), Math.round(cy + yy), hw * 2, 1); } };
    const tri = (rr, col) => { const pts = []; for (const a of [0, 2.35, 4.0]) pts.push(new Phaser.Geom.Point(cx + Math.cos(ang + a) * rr, cy + Math.sin(ang + a) * rr)); g.fillStyle(col, 1); g.fillPoints(pts, true); };
    disc(13, 0x0B0F1E, 0.30);
    tri(r + 2, 0x0B0F1E); tri(r, 0xFFE14D); tri(r * 0.5, 0xFFFFFF);
    const dist = Math.round(Math.hypot(obj.x - W.p.x, obj.y - W.p.y));
    this.questDist.setOrigin(0.5, 1).setPosition(cx, cy - 12).setText(dist + 'm');
  }
  fly(tex, from, to, scale = 1) {
    const img = this.add.image(from.x, from.y, tex).setDepth(8).setScale(scale);
    const dest = to === 'gold' ? { x: this.goldBox.x + 8, y: 12 } : to === 'bean' ? { x: this.beanBtn.x + this.beanBtn.s / 2, y: this.beanBtn.y + this.beanBtn.s / 2 } : to === 'item' ? { x: this.itemBtn.x + this.itemBtn.s / 2, y: this.itemBtn.y + this.itemBtn.s / 2 } : { x: this.menu[1].x + 13, y: this.menu[1].y + 7 };
    this.tweens.add({ targets: img, x: dest.x, y: dest.y, duration: 420, ease: 'Quad.easeIn', onComplete: () => img.destroy() });
  }
  /* ---- panels */
  closePanel() {
    if (this.panel && this.panel.k === 'dead') return;
    this.clearPanel(); this.panel = null; hideCodeUI(); saveProgress();
  }
  clearPanel() { this.talkText = null; this.talkMore = null; this.wg = null; this.wheel = null; this.pg.clear(); this.pTexts.forEach((t) => t.destroy()); this.pImgs.forEach((t) => t.destroy()); this.pTexts = []; this.pImgs = []; this.hits.clear('panel'); }
  open(k, instant, extra) {
    if (!W) return;
    if (k === 'rank' && !instant) this.rankBoard = null;
    if (this.panel && this.panel.k === 'dead' && k !== 'dead') return;
    if (this.joy.id !== null) { this.joy.id = null; this.joy.kx = this.joy.ky = 0; this.updJoy(); }
    this.inp.jumpHeld = false;
    const keep = extra || (this.panel && this.panel.k === k ? this.panel : null);
    this.panel = { k, sel: this.panel && this.panel.k === k ? this.panel.sel : null, t: instant ? 1 : 0 };
    if (keep) for (const q of ['npc', 'tab', 'lines', 'give', 'i', 'shown', 'sel', 'result', 'phase', 'phaseT', 'quest']) if (keep[q] !== undefined) this.panel[q] = keep[q];
    if (k === 'bag') this.bagFlag = false;
    if (k !== 'code') hideCodeUI();
    this.renderPanel();
  }
  renderPanel() {
    this.clearPanel();
    const P = this.panel; if (!P) return;
    const v = this.v, UW = v.UW, UH = v.UH;
    const g = this.pg, T_ = (x, y, s, size = 8, col = '#ffffff') => { const t = mkText(this, x, y, s, size, col, this.textRes).setDepth(52); this.pTexts.push(t); return t; };
    const I = (x, y, key, s) => { const im = this.add.image(x, y, key).setDepth(52); if (s) im.setDisplaySize(s.w, s.h); this.pImgs.push(im); return im; };
    const btn = (x, y, w, h, label, cb, col = C.green, size = 8) => { drawBtn(g, x, y, w, h, col); T_(x + w / 2, y + h / 2, label, size).setOrigin(0.5); this.hits.add(x, y, w, h, cb, 'panel', { pad: 3 }); };
    // dim
    g.fillStyle(0x0B0F1E, P.k === 'talk' ? 0.2 : 0.45); g.fillRect(0, 0, UW, UH);
    const dims = { stats: [250, 190], bag: [300, 206], balls: [340, 276], map: [300, 180], garden: [250, 170], plant: [250, 170], chest: [330, 212], help: [320, 230], dead: [220, 110], shop: [330, 220], items: [310, 200], talk: [400, 74], arena: [340, 236], smith: [330, 252], daily: [330, 118], summon: [340, 284], code: [330, 172], dragon: [348, 300], rank: [330, 244], quest: [330, 214] }[P.k];
    if (P.k === 'quest' && UW < 340) dims[1] = 290;
    if (P.k === 'talk' && UW < 330) dims[1] = 104;
    if ((P.k === 'shop' || P.k === 'items') && UW < 330) dims[1] = P.k === 'shop' ? 380 : 340;
    if (P.k === 'arena' && UW < 330) dims[1] = 430;
    if (P.k === 'smith' && UW < 340) dims[1] = 430;
    if (P.k === 'daily' && UW < 360) dims[1] = 158;
    if (P.k === 'summon' && UW < 340) dims[1] = 330;
    if (P.k === 'dragon' && UW < 360) dims[1] = 360;
    if (P.k === 'rank' && UW < 360) dims[1] = 320;
    if (P.k === 'map' && UW < 330) dims[1] = 300;
    if (P.k === 'chest' && UW < 360) dims[1] = 300;
    if (P.k === 'code' && UW < 360) dims[1] = 224;
    if (P.k === 'balls' && UW < 360) dims[1] = 320;
    const w = Math.min(UW - 12, dims[0]), h = Math.min(UH - 22, dims[1]);
    const x = Math.round((UW - w) / 2), y = P.k === 'talk' ? Math.round(UH - h - 8) : Math.round(Math.max(14, (UH - h) / 2 + 4));
    P.box = { x, y: y - 10, w, h: h + 10 };
    drawFrame(g, x, y, w, h);
    const title = { stats: 'Potential Points', bag: 'Inventory', balls: 'Ngọc Rồng', map: 'World Map', garden: 'Magic Bean Garden', plant: 'Magic Bean Plant', chest: 'Storage Chest', help: 'How to play', dead: 'Knocked out!', shop: P.npc ? P.npc.name + ': Shop' : 'Shop', items: 'Potions & Charms', talk: P.npc ? P.npc.name : '', arena: 'Đấu Trường Võ Thuật', smith: P.npc ? P.npc.name + ': Forge' : 'Blacksmith Forge', daily: 'Daily Login Reward', summon: 'Lucky Spin', code: 'Gift Codes', dragon: 'Thần Rồng Thiêng Liêng', rank: 'Bảng Xếp Hạng', quest: 'Quest Log' }[P.k];
    const tt = T_(x + 14, y - 3, title, 10);
    g.fillStyle(0x0B0F1E, 1); g.fillRect(x + 7, y - 11, tt.width + 16, 18);
    g.fillStyle(C.orange, 1); g.fillRect(x + 8, y - 10, tt.width + 14, 16); g.fillStyle(0xFFB060, 1); g.fillRect(x + 8, y - 10, tt.width + 14, 1);
    g.fillStyle(0xB05A10, 1); g.fillRect(x + 8, y + 5, tt.width + 14, 1);
    tt.setY(y - 2).setOrigin(0, 0.5);
    if (P.k !== 'dead') { // close X
      const cx = x + w - 17, cy = y - 7;
      g.fillStyle(0x0B0F1E, 1); g.fillRect(cx - 1, cy - 1, 16, 16); g.fillStyle(0xC81E1E, 1); g.fillRect(cx, cy, 14, 14); g.fillStyle(0xFF5A4A, 1); g.fillRect(cx, cy, 14, 1);
      g.fillStyle(0xffffff, 1); for (let i = 0; i < 8; i++) { g.fillRect(cx + 3 + i, cy + 3 + i, 2, 1); g.fillRect(cx + 10 - i, cy + 3 + i, 2, 1); }
      this.hits.add(cx, cy, 14, 14, () => this.closePanel(), 'panel', { pad: 5 });
    }
    const ix = x + 10, iy = y + 14, iw = w - 20, ih = h - 22;
    this['panel_' + P.k]({ g, T_, I, btn, x: ix, y: iy, w: iw, h: ih });
  }
  panel_stats({ g, T_, btn, x, y, w, h }) {
    const st = stats();
    T_(x, y, RACES[S.race].name + '  Lv ' + S.lv, 8, '#F08A24');
    this.ptsText = T_(x + w, y, 'Unspent: ' + S.pts, 9, '#FFE14D').setOrigin(1, 0);
    const rowH = Math.min(26, (h - 22) / 5);
    STAT_INFO.forEach((s, i) => {
      const ry = Math.round(y + 16 + i * rowH);
      g.fillStyle(0x0B0F1E, 1); g.fillRect(x, ry, w, rowH - 3); g.fillStyle(0x24305A, 1); g.fillRect(x + 1, ry + 1, w - 2, rowH - 5);
      g.fillStyle(0x0B0F1E, 1); g.fillRect(x + 4, ry + (rowH - 3) / 2 - 5, 10, 10); g.fillStyle(s.c, 1); g.fillRect(x + 5, ry + (rowH - 3) / 2 - 4, 8, 8);
      g.fillStyle(0xffffff, 0.8); g.fillRect(x + 6, ry + (rowH - 3) / 2 - 3, 2, 2);
      T_(x + 20, ry + (rowH - 3) / 2, s.n, 8).setOrigin(0, 0.5);
      const val = s.k === 'crit' ? st.crit.toFixed(1) + '%' : Math.round(st[s.k]);
      T_(x + w * 0.5, ry + (rowH - 3) / 2, '' + val, 8, '#FFE14D').setOrigin(0, 0.5);
      T_(x + w * 0.5 + 34, ry + (rowH - 3) / 2, '+' + s.per + (s.k === 'crit' ? '%' : ''), 6, '#9fb0d8').setOrigin(0, 0.5);
      const bs = rowH - 6;
      if (S.pts > 0) btn(x + w - bs - 3, ry + 1.5, bs, bs, '+', () => { S.pts--; S.alloc[s.k]++; const st2 = stats(); if (s.k === 'hp') W.p.hp += 20; if (s.k === 'ki') W.p.ki += 12; W.p.hp = Math.min(W.p.hp, st2.hp); sdk((m) => m.event && m.event('point_spent', { stat: s.k })); this.renderPanel(); }, C.green, 11);
      else { g.fillStyle(0x0B0F1E, 1); g.fillRect(x + w - bs - 4, ry + 0.5, bs + 2, bs + 2); g.fillStyle(0x3A4466, 1); g.fillRect(x + w - bs - 3, ry + 1.5, bs, bs); T_(x + w - bs / 2 - 3, ry + 1.5 + bs / 2, '+', 11, '#6a7394').setOrigin(0.5); }
    });
    T_(x, y + h - 8, 'Strength +' + (S.str || 0) + (S.vip ? '   VIP x' + S.vip : ''), 7, '#FF9A1F').setOrigin(0, 1);
    btn(x + w - 86, y + h - 18, 86, 16, 'LEADERBOARD', () => this.open('rank', false, {}), C.orange, 7);
  }
  panel_bag({ g, T_, I, btn, x, y, w, h }) {
    const P = this.panel;
    // equipped row
    T_(x, y - 1, 'Equipped', 7, '#F08A24');
    const es = Math.min(26, (w - 5 * 4) / 6 - 2);
    GEAR_SLOTS.forEach((sl, i) => {
      const sx = Math.round(x + i * (es + 4)), sy = y + 9;
      const it = S.eq[sl.k];
      drawSlot(g, sx, sy, es, it ? RARITY[it.r].c : 0x4A5070);
      if (it) I(sx + es / 2, sy + es / 2, 'item_' + sl.icon, { w: es - 7, h: es - 7 });
      else { const im = I(sx + es / 2, sy + es / 2, 'item_' + sl.icon, { w: es - 9, h: es - 9 }); im.setAlpha(0.22); }
      if (P.sel && P.sel.eq === sl.k) { g.fillStyle(0xFFE14D, 1); g.fillRect(sx - 2, sy - 2, es + 4, 1); g.fillRect(sx - 2, sy + es + 1, es + 4, 1); }
      this.hits.add(sx, sy, es, es, () => { if (it) { P.sel = { eq: sl.k }; this.renderPanel(); } }, 'panel');
    });
    // the dedicated Hoverboard slot, kept apart from ordinary gear
    {
      const bx0 = Math.round(x + GEAR_SLOTS.length * (es + 4) + 6), by0 = y + 9, bit = S.eq.board;
      drawSlot(g, bx0, by0, es, bit ? RARITY[bit.r].c : 0x7A5AA0, 0x1A1030);
      if (bit) I(bx0 + es / 2, by0 + es / 2, 'item_8', { w: es - 7, h: es - 7 });
      else { const im = I(bx0 + es / 2, by0 + es / 2, 'item_8', { w: es - 9, h: es - 9 }); im.setAlpha(0.22); }
      if (P.sel && P.sel.eq === 'board') { g.fillStyle(0xC46BFF, 1); g.fillRect(bx0 - 2, by0 - 2, es + 4, 1); g.fillRect(bx0 - 2, by0 + es + 1, es + 4, 1); }
      T_(bx0 + es / 2, by0 + es + 1, 'Hoverboard', 5, '#C46BFF').setOrigin(0.5, 0);
      this.hits.add(bx0, by0, es, es, () => { if (bit) { P.sel = { eq: 'board' }; this.renderPanel(); } }, 'panel');
    }
    // grid
    const gy = y + 9 + es + 8;
    T_(x, gy - 1, 'Bag ' + S.inv.length + '/18', 7, '#F08A24');
    const cols = 6, rows = 3;
    const detailH = 44;
    const cs = Math.max(16, Math.min(26, (w - (cols - 1) * 3) / cols, (h - (gy - y) - 10 - detailH) / rows - 3));
    for (let i = 0; i < cols * rows; i++) {
      const sx = Math.round(x + (i % cols) * (cs + 3)), sy = Math.round(gy + 9 + Math.floor(i / cols) * (cs + 3));
      const it = S.inv[i];
      drawSlot(g, sx, sy, cs, it ? RARITY[it.r].c : 0x2E3658, 0x0E1430);
      if (it) {
        I(sx + cs / 2, sy + cs / 2, 'item_' + slotOf(it.s).icon, { w: cs - 7, h: cs - 7 });
        if (it.boss) { g.fillStyle(0x0B0F1E, 1); g.fillRect(sx + cs - 8, sy + 1, 7, 7); g.fillStyle(0xFFE14D, 1); g.fillRect(sx + cs - 7, sy + 4, 5, 1); g.fillRect(sx + cs - 5, sy + 2, 1, 5); g.fillRect(sx + cs - 6, sy + 3, 3, 3); }
        this.hits.add(sx, sy, cs, cs, () => { P.sel = { inv: it.id }; this.renderPanel(); }, 'panel');
        if (P.sel && P.sel.inv === it.id) { g.fillStyle(0xFFE14D, 1); g.fillRect(sx - 2, sy - 2, cs + 4, 1); g.fillRect(sx - 2, sy + cs + 1, cs + 4, 1); g.fillRect(sx - 2, sy - 2, 1, cs + 4); g.fillRect(sx + cs + 1, sy - 2, 1, cs + 4); }
      }
    }
    // detail area (right side if room, otherwise bottom)
    const gridW = cols * (cs + 3);
    const side = w - gridW > 90;
    const dx = side ? x + gridW + 6 : x, dy = side ? gy + 6 : gy + 9 + rows * (cs + 3) + 4, dw = side ? w - gridW - 6 : w;
    let it = null, eqd = false;
    if (P.sel && P.sel.inv) it = S.inv.find((q) => q.id === P.sel.inv);
    if (P.sel && P.sel.eq) { it = S.eq[P.sel.eq]; eqd = true; }
    if (!it) { T_(dx, dy + 4, S.inv.length ? 'Tap an item to see it' : 'Defeat monsters for equipment', 7, '#9fb0d8').setWordWrapWidth(dw); return; }
    const sl = slotOf(it.s);
    T_(dx, dy + 2, (it.boss ? '★ ' : '') + itemName(it) + ' Lv' + it.lv, 8, RARITY[it.r].hex).setWordWrapWidth(dw);
    T_(dx, dy + 12, RARITY[it.r].n + ' ' + sl.name + (it.boss ? ' · Boss drop' : ''), 6, RARITY[it.r].hex);
    const statStr = Object.entries(it.st).map(([k, v2]) => '+' + v2 + (k === 'crit' ? '% ' : ' ') + STAT_INFO.find((s) => s.k === k).n).join('  ');
    T_(dx, dy + 21, statStr, 7, '#ffffff').setWordWrapWidth(dw);
    const cur = !eqd && S.eq[it.s];
    if (cur) T_(dx, dy + (side ? 40 : 30), 'Worn: ' + Object.entries(cur.st).map(([k, v2]) => '+' + v2 + ' ' + STAT_INFO.find((s) => s.k === k).n).join(' '), 6, '#9fb0d8').setWordWrapWidth(dw);
    const by = side ? dy + 60 : dy + 22, bxx = side ? dx : dx + dw - 112;
    if (eqd) btn(side ? dx : dx + dw - 54, side ? by : by, 52, 16, 'Unequip', () => { if (S.inv.length < 18) { S.inv.push(it); delete S.eq[it.s]; P.sel = null; this.clampVitals(); this.renderPanel(); } else this.toast('Bag is full', '#FF6A4A'); }, C.orange);
    else {
      btn(bxx, by, 52, 16, 'Equip', () => { const old = S.eq[it.s]; S.inv = S.inv.filter((q) => q.id !== it.id); if (old) S.inv.push(old); S.eq[it.s] = it; P.sel = { eq: it.s }; play('item', 0.3); this.clampVitals(); this.renderPanel(); });
      btn(side ? dx : bxx + 58, side ? by + 22 : by, 54, 16, 'Sell ' + itemSell(it), () => { S.inv = S.inv.filter((q) => q.id !== it.id); S.gold += itemSell(it); P.sel = null; play('coin', 0.4); this.renderPanel(); }, C.orange);
    }
  }
  clampVitals() { const st = stats(); W.p.hp = Math.min(W.p.hp, st.hp); W.p.ki = Math.min(W.p.ki, st.ki); }
  panel_map({ g, T_, I, btn, x, y, w, h }) {
    // five destinations, one row each: a thumbnail, the name, and what waits there
    const n = BIOME_ORDER.length, gap = 3;
    const rowH = Math.floor((h - gap * (n - 1)) / n);
    BIOME_ORDER.forEach((k, i) => {
      const b = BIOMES[k], need = levelNeed(k), locked = S.lv < need, here = W.biome === k;
      const ry = Math.round(y + i * (rowH + gap));
      g.fillStyle(0x0B0F1E, 1); g.fillRect(x, ry, w, rowH);
      g.fillStyle(here ? 0x3A3200 : locked ? 0x20263E : 0x24305A, 1); g.fillRect(x + 1, ry + 1, w - 2, rowH - 2);
      if (here) { g.fillStyle(0xFFE14D, 1); g.fillRect(x + 1, ry + 1, w - 2, 1); g.fillRect(x + 1, ry + rowH - 2, w - 2, 1); }
      const bw = Math.min(58, w * 0.34);
      let tx = x + 5;
      if (w > 250) {
        const ih = rowH - 8, iw = Math.round(ih * 1.6);
        const im = I(x + 5 + iw / 2, ry + rowH / 2, k + '_far');
        const s2 = ih / im.height; im.setScale(s2);
        const cw2 = Math.min(im.width, iw / s2); im.setCrop((im.width - cw2) / 2, 0, cw2, im.height);
        if (locked) im.setTint(0x555566);
        tx = x + 8 + iw + 4;
      }
      const tw = w - (tx - x) - bw - 10;
      let cy = ry + 2;
      const t1 = T_(tx, cy, (here ? '> ' : '') + b.name, 8, here ? '#FFE14D' : locked ? '#8b93ad' : '#ffffff').setWordWrapWidth(tw);
      cy += t1.height + 1;
      const sub = b.sub + (w > 250 && b.mons.length ? '  ·  Monsters Lv ' + b.lv[0] + '-' + b.lv[1] : '');
      const t2 = T_(tx, cy, sub, 6, '#9fb0d8').setWordWrapWidth(tw);
      cy += t2.height + 1;
      let third = '', col = '#FF4A3A';
      if (k === 'arena') { const best = (S.arena && S.arena.best) || 0; third = best ? 'Record: round ' + best : 'No rounds won yet'; col = best ? '#9CFF5A' : '#FF9A1F'; }
      else if (k === 'home') { third = 'Safe home base: beans, chest and the Gift keeper'; col = '#9CFF5A'; }
      else if (b.farm) third = 'Farm EXP and vàng, fast respawns';
      else { const kills = (S.bossKills || {})[k] || 0; third = (kills ? 'Beaten: ' : 'Boss: ') + BOSSES[k].name; col = kills ? '#9CFF5A' : '#FF4A3A'; }
      if (cy + 8 <= ry + rowH) T_(tx, cy, third, 6, col).setWordWrapWidth(tw);
      const by = ry + rowH - 18;
      if (here) T_(x + w - 6, by + 8, 'You are here', 7, '#FFE14D').setOrigin(1, 0.5);
      else if (locked) T_(x + w - 6, by + 8, 'Needs Lv ' + need, 7, '#FF6A4A').setOrigin(1, 0.5);
      else btn(x + w - bw - 5, by, bw, 15, 'Travel', () => { this.clearPanel(); this.panel = null; W.travel(k); }, k === 'arena' ? C.orange : C.green, 8);
    });
  }
  panel_garden({ g, T_, I, btn, x, y, w, h }) {
    const gd = S.garden, stg = W.gardenStage ? W.gardenStage() : -1;
    const pot = I(x + 38, y + h - 18, 'garden_' + Math.max(0, stg)); pot.setOrigin(0.5, 1); pot.setScale(Math.min(0.9, (h - 30) / pot.height)); if (stg < 0) pot.setAlpha(0.6);
    const names = ['Seed mound', 'Sprout', 'Leafy vine', 'Ready to harvest!'];
    const tx = x + 84;
    T_(tx, y, 'Garden Lv ' + gd.lvl, 9, '#F08A24');
    T_(tx, y + 13, stg < 0 ? 'The pot is empty.' : names[stg], 8, stg === 3 ? '#9CFF5A' : '#ffffff');
    if (stg >= 0 && stg < 3) {
      const ms = tv('bean_stage_seconds') * 1000 * Math.pow(0.85, gd.lvl - 1);
      const frac = Math.min(1, (Date.now() - gd.planted) / (ms * 3));
      const bw = w - 84;
      g.fillStyle(0x1A1A2E, 1); g.fillRect(tx, y + 27, bw, 8); g.fillStyle(0x0E2A10, 1); g.fillRect(tx + 1, y + 28, bw - 2, 6);
      for (let s = 0; s < 3; s++) { g.fillStyle(0x1A1A2E, 1); g.fillRect(tx + Math.round((bw * (s + 1)) / 3), y + 27, 1, 8); }
      g.fillStyle(0x6FD13A, 1); g.fillRect(tx + 1, y + 28, Math.round((bw - 2) * frac), 6); g.fillStyle(0xB8FF8A, 1); g.fillRect(tx + 1, y + 28, Math.round((bw - 2) * frac), 1);
      const left = Math.max(0, Math.ceil((ms * 3 - (Date.now() - gd.planted)) / 1000));
      this.gardenLeft = T_(tx, y + 38, 'Harvest in ' + fmtTime(left), 7, '#9fb0d8');
    }
    T_(tx, y + 52, 'Beans: ' + S.beans + '   Yield: ' + (2 + gd.lvl), 8, '#ffffff');
    T_(tx, y + 64, 'A bean fully restores HP and Ki.', 6, '#9fb0d8').setWordWrapWidth(w - 84);
    const by = y + h - 22;
    if (stg < 0) btn(tx, by, 70, 18, 'Plant seed', () => { gd.planted = Date.now(); play('item', 0.3); sdk((m) => m.event && m.event('bean_planted', {})); saveProgress(); this.renderPanel(); });
    else if (stg === 3) btn(tx, by, 70, 18, 'Harvest', () => { const n = 2 + gd.lvl; S.beans += n; gd.planted = null; play('item', 0.5); this.toast('+' + n + ' magic beans', '#9CFF5A'); sdk((m) => m.event && m.event('bean_harvest', { value: n })); saveProgress(); this.renderPanel(); });
    else { g.fillStyle(0x3A4466, 1); g.fillRect(tx, by, 70, 18); T_(tx + 35, by + 9, 'Growing...', 8, '#9fb0d8').setOrigin(0.5); }
    if (gd.lvl < 5) {
      const cost = 120 * gd.lvl;
      btn(tx + 76, by, Math.min(92, w - 84 - 76), 18, 'Upgrade ' + cost, () => { if (S.gold >= cost) { S.gold -= cost; gd.lvl++; play('levelup', 0.3, 1.3); saveProgress(); this.renderPanel(); } else this.toast('Need ' + cost + ' vàng', '#FF6A4A'); }, C.orange, 7);
    }
  }
  panel_plant({ g, T_, I, btn, x, y, w, h }) {
    const gd = S.plant, stg = W.plantStage ? W.plantStage() : -1;
    const pot = I(x + 38, y + h - 18, 'garden_' + Math.max(0, stg)); pot.setOrigin(0.5, 1); pot.setScale(Math.min(0.9, (h - 30) / pot.height)); if (stg < 0) pot.setAlpha(0.6);
    const names = ['Seed mound', 'Sprout', 'Leafy vine', 'Ready to harvest!'];
    const tx = x + 84;
    T_(tx, y, 'Plant Lv ' + gd.lvl, 9, '#F08A24');
    T_(tx, y + 13, stg < 0 ? 'Nothing planted yet.' : names[stg], 8, stg === 3 ? '#9CFF5A' : '#ffffff');
    if (stg >= 0 && stg < 3) {
      const ms = tv('bean_stage_seconds') * 1000 * Math.pow(0.85, gd.lvl - 1);
      const frac = Math.min(1, (Date.now() - gd.planted) / (ms * 3));
      const bw = w - 84;
      g.fillStyle(0x1A1A2E, 1); g.fillRect(tx, y + 27, bw, 8); g.fillStyle(0x0E2A10, 1); g.fillRect(tx + 1, y + 28, bw - 2, 6);
      for (let s = 0; s < 3; s++) { g.fillStyle(0x1A1A2E, 1); g.fillRect(tx + Math.round((bw * (s + 1)) / 3), y + 27, 1, 8); }
      g.fillStyle(0x6FD13A, 1); g.fillRect(tx + 1, y + 28, Math.round((bw - 2) * frac), 6); g.fillStyle(0xB8FF8A, 1); g.fillRect(tx + 1, y + 28, Math.round((bw - 2) * frac), 1);
      const left = Math.max(0, Math.ceil((ms * 3 - (Date.now() - gd.planted)) / 1000));
      T_(tx, y + 38, 'Beans ready in ' + fmtTime(left), 7, '#9fb0d8');
    }
    T_(tx, y + 52, 'Beans: ' + S.beans + '   Yield: ' + (2 + gd.lvl), 8, '#ffffff');
    T_(tx, y + 64, 'A healing bean fully restores HP and Ki.', 6, '#9fb0d8').setWordWrapWidth(w - 84);
    const by = y + h - 22;
    if (stg < 0) btn(tx, by, 70, 18, 'Plant seed', () => { gd.planted = Date.now(); play('item', 0.3); sdk((m) => m.event && m.event('bean_planted', { home: 1 })); saveProgress(); this.renderPanel(); });
    else if (stg === 3) btn(tx, by, 70, 18, 'Harvest', () => { const n = 2 + gd.lvl; S.beans += n; gd.planted = null; play('item', 0.5); this.toast('+' + n + ' healing beans', '#9CFF5A'); sdk((m) => m.event && m.event('bean_harvest', { value: n })); saveProgress(); this.renderPanel(); });
    else { g.fillStyle(0x3A4466, 1); g.fillRect(tx, by, 70, 18); T_(tx + 35, by + 9, 'Growing...', 8, '#9fb0d8').setOrigin(0.5); }
    if (gd.lvl < 5) {
      const cost = 120 * gd.lvl;
      btn(tx + 76, by, Math.min(92, w - 84 - 76), 18, 'Upgrade ' + cost, () => { if (S.gold >= cost) { S.gold -= cost; gd.lvl++; play('levelup', 0.3, 1.3); saveProgress(); this.renderPanel(); } else this.toast('Need ' + cost + ' vàng', '#FF6A4A'); }, C.orange, 7);
    }
  }
  panel_chest({ g, T_, I, btn, x, y, w, h }) {
    S.chest = S.chest || [];
    const CAP = 24, two = w >= 250, gap = 10;
    const colW = two ? Math.floor((w - gap) / 2) : w;
    const cs = 24, perRow = Math.max(1, Math.floor((colW + 3) / (cs + 3)));
    const grid = (items, ox, oy, cap, label, col2, onTap) => {
      T_(ox, oy, label + '  ' + items.length + '/' + cap, 7, col2);
      const gy = oy + 11;
      for (let i = 0; i < cap; i++) {
        const sx = Math.round(ox + (i % perRow) * (cs + 3)), sy = Math.round(gy + Math.floor(i / perRow) * (cs + 3));
        const it = items[i];
        drawSlot(g, sx, sy, cs, it ? RARITY[it.r].c : 0x2E3658, 0x0E1430);
        if (it) { I(sx + cs / 2, sy + cs / 2, 'item_' + slotOf(it.s).icon, { w: cs - 7, h: cs - 7 }); this.hits.add(sx, sy, cs, cs, () => onTap(it), 'panel'); }
      }
      return gy + Math.ceil(cap / perRow) * (cs + 3);
    };
    const deposit = (it) => { if (S.chest.length >= CAP) { this.toast('The chest is full', '#FF6A4A'); return; } S.inv = S.inv.filter((q) => q.id !== it.id); S.chest.push(it); play('item', 0.35); sdk((m) => m.event && m.event('chest_store', {})); saveProgress(); this.renderPanel(); };
    const withdraw = (it) => { if (S.inv.length >= 18) { this.toast('Your bag is full', '#FF6A4A'); return; } S.chest = S.chest.filter((q) => q.id !== it.id); S.inv.push(it); play('item', 0.35); sdk((m) => m.event && m.event('chest_take', {})); saveProgress(); this.renderPanel(); };
    const top = y + 2;
    const chestEnd = grid(S.chest, x, top, CAP, 'In the chest', '#FFD9A0', withdraw);
    if (two) grid(S.inv, x + colW + gap, top, 18, 'In your bag', '#F08A24', deposit);
    else grid(S.inv, x, chestEnd + 6, 18, 'In your bag', '#F08A24', deposit);
    T_(x, y + h - 8, 'Tap a chest item to take it, tap a bag item to store it.', 6, '#9fb0d8').setWordWrapWidth(w);
  }
  panel_code() {
    // the real input is a DOM field laid over this panel (see showCodeUI)
    showCodeUI(false);
  }
  openCode(npc) {
    this.panel = null;
    this.open('code', false, { npc, codeMsg: '', codeOk: false });
    if (codeInput) codeInput.value = '';
    if (codeMsgEl) { codeMsgEl.textContent = ''; }
    showCodeUI(true);
  }
  redeemCode(raw) {
    const r = grantCode(raw);
    const P = this.panel && this.panel.k === 'code' ? this.panel : null;
    if (r.ok) {
      play('item', 0.5); this.toast('Gift: ' + r.msg, '#9CFF5A');
      sdk((m) => m.event && m.event('gift_code', { value: 1 }));
      saveProgress();
      if (codeInput) codeInput.value = '';
      if (codeMsgEl) { codeMsgEl.textContent = r.msg; codeMsgEl.style.color = '#9CFF5A'; }
      if (P) { P.codeMsg = r.msg; P.codeOk = true; this.renderPanel(); }
    } else {
      play('click', 0.3, 0.7);
      if (codeMsgEl) { codeMsgEl.textContent = r.msg; codeMsgEl.style.color = '#FF8A6A'; }
      if (P) { P.codeMsg = r.msg; P.codeOk = false; this.renderPanel(); }
    }
  }
  talkNext() {
    const P = this.panel; if (!P || P.k !== 'talk') return;
    if (P.shown < (P.wrapLen || 0)) { P.shown = P.wrapLen; return; }
    if (P.i < P.lines.length - 1) { P.i++; P.shown = 0; play('click', 0.25, 1.3); this.renderPanel(); return; }
    const n = P.npc; S.talked = S.talked || {};
    const first = !S.talked[n.id]; S.talked[n.id] = (S.talked[n.id] || 0) + 1;
    if (first && P.give) {
      if (P.give.beans) { S.beans += P.give.beans; this.toast('+' + P.give.beans + ' magic beans from ' + n.name, '#9CFF5A'); play('item', 0.45); }
      if (P.give.gold) { S.gold += P.give.gold; this.toast('+' + P.give.gold + ' vàng from ' + n.name, '#FFE14D'); play('coin', 0.45); }
    }
    this.clearPanel(); this.panel = null;
    if (P.quest) questOnTalk(n.id);
    saveProgress();
  }
  panel_talk({ g, T_, I, x, y, w, h }) {
    const P = this.panel, n = P.npc;
    const im = I(x + 20, y + h + 3, n.img || 'npc_' + n.f); im.setOrigin(0.5, 1); im.setScale(Math.min(1, (h + 4) / im.height, 62 / im.width)); im.setFlipX(false);
    const tx = x + 54, tw = w - 66;
    // wrap once up front (by measuring), so the typewriter never makes a word jump lines
    const t = T_(tx, y - 2, '', 8, '#ffffff');
    const out = []; let cur = '';
    for (const word of P.lines[P.i].split(' ')) {
      const test = cur ? cur + ' ' + word : word;
      t.setText(test);
      if (t.width > tw && cur) { out.push(cur); cur = word; } else cur = test;
    }
    if (cur) out.push(cur);
    const wrapped = out.map((l) => noLig(noLig(l))).join('\n');
    P.wrapped = wrapped; P.wrapLen = wrapped.length;
    _setText.call(t, wrapped.slice(0, Math.floor(P.shown || 0)));
    this.talkText = t;
    const touch = this.sys.game.device.input.touch;
    T_(x + w, y + h + 1, (P.i + 1) + '/' + P.lines.length, 6, '#9fb0d8').setOrigin(1, 1);
    this.talkMore = T_(x + w - 22, y + h + 1, (P.i < P.lines.length - 1 ? 'Next ' : 'Bye ') + (touch ? '(tap)' : '[E]') + ' >', 7, '#FFE14D').setOrigin(1, 1).setAlpha(0);
  }
  goodsGrid({ g, T_, I, btn, x, y, w, h }, top, mode, maxBottom) {
    const cols = w >= 250 ? 2 : 1, rows = Math.ceil(GOODS.length / cols), gap = 4;
    const bottom = maxBottom != null ? maxBottom : y + h;
    const cw = Math.floor((w - gap * (cols - 1)) / cols), ch = Math.floor(Math.min(46, (bottom - top - gap * (rows - 1)) / rows));
    S.bagc = S.bagc || {};
    GOODS.forEach((gd, i) => {
      const cx = Math.round(x + (i % cols) * (cw + gap)), cy = Math.round(top + Math.floor(i / cols) * (ch + gap));
      g.fillStyle(0x0B0F1E, 1); g.fillRect(cx, cy, cw, ch); g.fillStyle(gd.kind === 'charm' ? 0x2A2C5E : 0x24305A, 1); g.fillRect(cx + 1, cy + 1, cw - 2, ch - 2);
      const is = Math.min(ch - 6, 26), sy = Math.round(cy + (ch - is) / 2);
      drawSlot(g, cx + 3, sy, is, gd.kind === 'charm' ? gd.c : 0xF4C542);
      I(cx + 3 + is / 2, sy + is / 2, 'good_' + gd.icon, { w: is - 5, h: is - 5 });
      const own = S.bagc[gd.k] || 0, price = gd.price();
      const lx = cx + is + 7, bw = mode === 'buy' ? 42 : 36, bh = 16, tw = cw - is - bw - 14;
      T_(lx, cy + 3, gd.n, 8, gd.kind === 'charm' ? gd.col : '#ffffff');
      T_(lx, cy + 14, gd.d, 7, '#ffffff').setWordWrapWidth(tw);
      T_(lx, cy + 24, gd.kind === 'charm' ? 'Power Charm, ' + Math.round(tv('charm_seconds')) + 's' : 'Potion, instant', 6, gd.kind === 'charm' ? gd.col : '#9fb0d8');
      T_(cx + cw - 4 - bw / 2, cy + ch - 2, 'Have ' + own, 6, own ? '#FFE14D' : '#6a7394').setOrigin(0.5, 1);
      const bx = cx + cw - bw - 4, by = Math.round(cy + 4);
      if (mode === 'buy') {
        const ok = S.gold >= price;
        // the price is drawn dark and without an outline: a white outlined 5 on green reads as an 8
        const plate = ok ? C.green : 0x5A6488;
        drawBtn(g, bx, by, bw, bh, plate);
        I(bx + 7, by + bh / 2, 'ui_coin', { w: 8, h: 8 });
        T_(bx + bw / 2 + 4, by + bh / 2, ' ' + price, 9).setOrigin(0.5).setStroke('#' + plate.toString(16).padStart(6, '0'), 0).setColor('#0B0F1E');
        this.hits.add(bx, by, bw, bh, () => {
          if (S.gold < price) { this.toast('Need ' + price + ' vàng. Sell gear or beat monsters!', '#FF6A4A'); return; }
          if (own >= 99) { this.toast('You cannot carry more', '#FF6A4A'); return; }
          S.gold -= price; S.bagc[gd.k] = own + 1; play('coin', 0.45);
          this.toast('Bought ' + gd.n + '. Use it from the potion slot.', gd.kind === 'charm' ? gd.col : '#ffffff');
          sdk((m) => m.event && m.event('shop_buy', { item: gd.k, value: price }));
          saveProgress(); this.renderPanel();
        }, plate, 8);
      } else {
        btn(bx, by, bw, bh, 'Use', () => { if (W.useGood(gd.k)) { this.clearPanel(); this.panel = null; } else this.renderPanel(); }, own ? C.green : 0x5A6488, 8);
      }
    });
  }
  panel_items(ctx) {
    this.goodsGrid(ctx, ctx.y, 'use');
  }
  panel_arena({ g, T_, I, btn, x, y, w, h }) {
    const P = this.panel, A = W.arenaState(), r = A.round, info = arenaFoeInfo(r), rw = arenaReward(info.lv, r);
    const live = W.foe && !W.foe.dead;
    const res = P.result;
    let cy = y + 2;
    const line = (str, size, col, tw) => { const t = T_(x, cy, str, size, col).setWordWrapWidth(tw || w); cy += Math.max(size + 3, t.height + 3); return t; };
    line('Best round: ' + (A.best || 0) + '    Wins: ' + (A.wins || 0) + '    Gold: ' + S.gold.toLocaleString('vi-VN'), 7, '#FFE14D');
    const need = Math.round(tv('arena_level'));
    if (S.lv < need) {
      line('Cấp ' + S.lv + ' / yêu cầu cấp ' + need, 9, '#FF6A4A');
      line('Đại hội Võ thuật chỉ mở cho võ sĩ từ cấp ' + need + ' trở lên.', 8, '#ffffff');
      line('Luyện tập thêm rồi quay lại. Đối thủ mạnh dần qua từng vòng, và mỗi trận thua đều có Rương Phần thưởng.', 7, '#9fb0d8');
      cy += 4;
      btn(x, cy, 120, 20, 'Đóng', () => this.closePanel(), C.orange, 8);
      this.arenaBoardList({ g, T_, x, y: cy + 28, w, h: y + h - cy - 28 });
      return;
    }
    if (res) {
      line('ROUND ' + res.round + ' WON!', 13, '#FFE14D');
      line('You beat ' + res.name + ' Lv' + res.lv, 8, '#ffffff');
      line('+' + res.gold + ' vàng, +' + res.exp + ' EXP, + 1 piece of gear', 8, '#9CFF5A');
      if (res.prize) line('Prize: ' + res.prize + ' (it is in your potion slot)', 7, '#7DF9FF');
      const nx = arenaFoeInfo(A.round);
      line('Next: ' + nx.name + ' Lv' + nx.lv + (nx.moves.indexOf('dash') >= 0 ? ', and he dashes' : ''), 7, '#FF9A1F');
      cy += 3;
      const by = cy;
      btn(x, by, 100, 20, 'Next round', () => { this.clearPanel(); this.panel = null; W.arenaStart(); }, C.green, 8);
      btn(x + 106, by, 58, 20, 'Rest', () => this.closePanel(), C.orange, 8);
      this.arenaBoardList({ g, T_, x, y: by + 28, w, h: y + h - by - 28 });
      return;
    }
    // the card of the next opponent
    const cardY = cy + 4, isz = 44;
    drawSlot(g, x, cardY, isz, 0xF4C542);
    { const im = I(x + isz / 2, cardY + isz - 4, info.race + '_0'); im.setOrigin(0.5, 1).setScale((isz - 8) / im.height); }
    const tx = x + isz + 8, tw = w - isz - 10;
    cy = cardY + 1;
    const cline = (str, size, col) => { const t = T_(tx, cy, str, size, col).setWordWrapWidth(tw); cy += Math.max(size + 3, t.height + 3); return t; };
    cline('Round ' + r + ': ' + info.name, 10, '#FF9A1F');
    cline(RACES[info.race].name + ' Lv ' + info.lv + ' · ' + (info.moves.indexOf('dash') >= 0 ? 'dashes and blasts' : 'strikes and blasts'), 7, '#ffffff');
    cline('Reward: ' + rw.gold + ' vàng, ' + rw.exp + ' EXP, 1 gear' + (rw.prize ? ', 1 item' : ''), 7, '#9CFF5A');
    cline('Full HP and Ki at the bell. Every round the fighter is stronger. Lose and you start again at round 1, with a Reward Chest for how far you climbed.', 6, '#9fb0d8');
    const cy2 = Math.max(cy, cardY + isz) + 5;
    if (live) {
      T_(x, cy2, 'In the ring now: ' + W.foe.name + ' Lv' + W.foe.lv + '  ' + Math.max(0, Math.ceil(W.foe.hp)) + '/' + W.foe.maxHp, 8, '#FF6A4A').setWordWrapWidth(w);
      btn(x, cy2 + 14, 70, 20, 'Close', () => this.closePanel(), C.orange, 8);
      this.arenaBoardList({ g, T_, x, y: cy2 + 40, w, h: y + h - cy2 - 40 });
    } else {
      btn(x, cy2, 132, 22, 'ENTER THE RING', () => { this.clearPanel(); this.panel = null; W.arenaStart(); }, C.green, 9);
      this.arenaBoardList({ g, T_, x, y: cy2 + 30, w, h: y + h - cy2 - 30 });
    }
  }
  arenaBoardList({ g, T_, x, y, w, h }) {
    if (!this.arenaBoard) {
      this.arenaBoard = { rows: null };
      sdk((mb) => {
        if (!mb.leaderboard) { this.arenaBoard = { rows: [] }; return; }
        mb.leaderboard.top('arena_round', { limit: 5 })
          .then((rows) => { this.arenaBoard = { rows: rows || [] }; if (this.panel && this.panel.k === 'arena') this.renderPanel(); })
          .catch(() => { this.arenaBoard = { rows: [] }; });
      });
    }
    T_(x, y, 'Tournament champions', 7, '#F08A24');
    const rows = this.arenaBoard.rows;
    if (!rows) { T_(x, y + 12, 'Loading...', 6, '#9fb0d8'); return; }
    if (!rows.length) { T_(x, y + 12, 'Nobody has won a round yet. Be the first.', 6, '#9fb0d8'); return; }
    const rh = Math.min(14, (h - 14) / rows.length);
    rows.forEach((row, i) => {
      const ry = y + 12 + i * rh;
      T_(x, ry, row.rank + '.', 7, '#FFE14D');
      const t = T_(x + 16, ry, (row.username || 'guest') + '  round ' + row.value, 7, row.mine ? '#9CFF5A' : '#ffffff');
      if (row.profile_url) { t.setColor(row.mine ? '#9CFF5A' : '#7DF9FF'); this.hits.add(x, ry - 2, Math.min(w, t.width + 16), rh, () => window.open(row.profile_url, '_blank'), 'panel'); }
    });
  }
  panel_shop(ctx) {
    const { g, T_, I, btn, x, y, w, h } = ctx, P = this.panel;
    P.tab = P.tab || 'buy';
    const tab = (tx, k, label) => { const on = P.tab === k; btn(tx, y - 1, 52, 15, label, () => { P.tab = k; P.sel = null; this.renderPanel(); }, on ? C.orange : 0x3A4A80, 8); };
    tab(x, 'buy', 'BUY'); tab(x + 56, 'sell', 'SELL');
    I(x + w - 6, y + 6, 'ui_coin', { w: 10, h: 10 });
    T_(x + w - 13, y + 6, S.gold.toLocaleString('vi-VN'), 8, '#FFE14D').setOrigin(1, 0.5);
    if (P.npc && P.npc.greet && w > 200) T_(x, y + 18, '"' + P.npc.greet + '"', 6, '#B8F0FF').setWordWrapWidth(w);
    const top = y + 30;
    if (P.tab === 'buy') {
      const boardH = 46, boardTop = y + h - boardH;
      this.goodsGrid(ctx, top, 'buy', boardTop - 6);
      this.shopBoardCard({ g, T_, I, btn, x, y: boardTop, w, h: boardH });
      return;
    }
    // SELL: potions and charms at half price, gear at its usual price
    S.bagc = S.bagc || {};
    const list = [];
    for (const gd of GOODS) if (S.bagc[gd.k] > 0) list.push({ key: 'g:' + gd.k, icon: 'good_' + gd.icon, border: gd.kind === 'charm' ? gd.c : C.gold, name: gd.n, price: goodSell(gd), count: S.bagc[gd.k], sell: () => { S.bagc[gd.k]--; return goodSell(gd); } });
    for (const it of S.inv) list.push({ key: 'i:' + it.id, icon: 'item_' + slotOf(it.s).icon, border: RARITY[it.r].c, name: (it.boss ? '★ ' : '') + itemName(it) + ' Lv' + it.lv, sub: RARITY[it.r].n + ' gear', col: RARITY[it.r].hex, price: itemSell(it), sell: () => { S.inv = S.inv.filter((q) => q.id !== it.id); return itemSell(it); } });
    if (!list.length) { T_(x, top + 4, 'Nothing to sell. Monsters drop gear you can sell here.', 7, '#9fb0d8').setWordWrapWidth(w); return; }
    const cs = 24, cols = Math.max(1, Math.floor((w + 3) / (cs + 3)));
    list.forEach((e, i) => {
      const sx = Math.round(x + (i % cols) * (cs + 3)), sy = Math.round(top + Math.floor(i / cols) * (cs + 3));
      drawSlot(g, sx, sy, cs, e.border, 0x0E1430);
      I(sx + cs / 2, sy + cs / 2, e.icon, { w: cs - 7, h: cs - 7 });
      if (e.count) T_(sx + cs - 2, sy + cs - 1, '' + e.count, 6, '#ffffff').setOrigin(1, 1);
      if (P.sel === e.key) { g.fillStyle(0xFFE14D, 1); g.fillRect(sx - 2, sy - 2, cs + 4, 1); g.fillRect(sx - 2, sy + cs + 1, cs + 4, 1); g.fillRect(sx - 2, sy - 2, 1, cs + 4); g.fillRect(sx + cs + 1, sy - 2, 1, cs + 4); }
      this.hits.add(sx, sy, cs, cs, () => { P.sel = e.key; this.renderPanel(); }, 'panel');
    });
    const dy = y + h - 20, sel = list.find((e) => e.key === P.sel);
    if (!sel) { T_(x, dy + 8, 'Tap an item to sell it', 7, '#9fb0d8').setOrigin(0, 0.5); return; }
    T_(x, dy + 3, sel.name, 8, sel.col || '#ffffff').setOrigin(0, 0.5);
    T_(x, dy + 13, 'Sells for ' + sel.price + ' vàng' + (sel.sub ? '  ·  ' + sel.sub : ''), 6, '#9fb0d8').setOrigin(0, 0.5);
    drawBtn(g, x + w - 62, dy, 62, 17, C.orange);
    T_(x + w - 31, dy + 8.5, 'Sell ' + sel.price, 8).setOrigin(0.5).setStroke('#F08A24', 0).setColor('#2A1400');
    this.hits.add(x + w - 62, dy, 62, 17, () => {
      const got = sel.sell(); S.gold += got; play('coin', 0.45);
      sdk((m) => m.event && m.event('shop_sell', { value: got }));
      if (!(sel.count > 1)) P.sel = null;
      saveProgress(); this.renderPanel();
    }, 'panel', { pad: 3 });
  }
  shopBoardCard({ g, T_, I, btn, x, y, w, h }) {
    const price = Math.round(tv('board_price'));
    const ch = Math.min(46, h);
    g.fillStyle(0x0B0F1E, 1); g.fillRect(x, y, w, ch); g.fillStyle(0x2A1A4E, 1); g.fillRect(x + 1, y + 1, w - 2, ch - 2);
    const is = Math.min(ch - 6, 30), sy = Math.round(y + (ch - is) / 2);
    drawSlot(g, x + 3, sy, is, 0xC46BFF);
    I(x + 3 + is / 2, sy + is / 2, 'item_8', { w: is - 5, h: is - 5 });
    const lx = x + is + 7, bw = 52, bh = 16, tw = w - is - bw - 14;
    T_(lx, y + 3, 'Hoverboard', 8, '#C46BFF');
    T_(lx, y + 15, 'Ván bay, +30% tốc chạy và bay.', 6, '#ffffff').setWordWrapWidth(tw);
    const bx = x + w - bw - 4, by = Math.round(y + 4);
    const ok = S.gold >= price, plate = ok ? C.green : 0x5A6488;
    drawBtn(g, bx, by, bw, bh, plate);
    I(bx + 7, by + bh / 2, 'ui_coin', { w: 8, h: 8 });
    T_(bx + bw / 2 + 4, by + bh / 2, ' ' + price, 9).setOrigin(0.5).setStroke('#' + plate.toString(16).padStart(6, '0'), 0).setColor('#0B0F1E');
    this.hits.add(bx, by, bw, bh, () => this.buyBoard(price), 'panel', { pad: 3 });
  }
  buyBoard(price) {
    if (S.gold < price) { this.toast('Cần ' + price + ' vàng. Bán đồ hoặc đánh trùm để có thêm!', '#FF6A4A'); return; }
    if (S.inv.length >= 18) { this.toast('Túi đã đầy. Bán hoặc trang bị bớt đồ.', '#FF6A4A'); return; }
    S.gold -= price; S.inv.push(makeBoard(S.lv)); play('coin', 0.45);
    this.toast('Đã mua Hoverboard. Mặc vào ô riêng trong Túi (BAG).', '#C46BFF');
    sdk((m) => m.event && m.event('shop_buy', { item: 'board', value: price }));
    saveProgress(); this.renderPanel();
  }
  panel_smith({ g, T_, I, btn, x, y, w, h }) {
    const P = this.panel;
    S.mat = S.mat || {};
    T_(x, y, 'Vàng ' + S.gold.toLocaleString('vi-VN'), 8, '#FFE14D');
    let mx = x + 96;
    for (const k of ['ore', 'shard']) {
      drawSlot(g, mx, y - 1, 12, MATS[k].col, 0x0E1430);
      I(mx + 6, y + 5, MATS[k].icon, { w: 9, h: 9 });
      T_(mx + 14, y + 5, '' + (S.mat[k] || 0), 8, '#ffffff').setOrigin(0, 0.5);
      mx += 42;
    }
    T_(x, y + 15, 'Forge your gear stronger with vàng and materials. Each level adds more.', 6, '#9fb0d8').setWordWrapWidth(w);
    const top = y + 40;
    const items = [];
    for (const sl of GEAR_SLOTS) { const it = S.eq[sl.k]; if (it) items.push({ it, eq: true }); }
    for (const it of S.inv) if (it.s !== 'board') items.push({ it, eq: false });
    if (!items.length) { T_(x, top + 4, 'No gear to forge. Defeat monsters or summon equipment at the Summon Altar.', 7, '#9fb0d8').setWordWrapWidth(w); return; }
    const cs = 24, cols = Math.max(1, Math.floor((w + 3) / (cs + 3))), maxRows = 3;
    items.slice(0, cols * maxRows).forEach((e, i) => {
      const sx = Math.round(x + (i % cols) * (cs + 3)), sy = Math.round(top + Math.floor(i / cols) * (cs + 3));
      const it = e.it;
      drawSlot(g, sx, sy, cs, RARITY[it.r].c, 0x0E1430);
      I(sx + cs / 2, sy + cs / 2, 'item_' + slotOf(it.s).icon, { w: cs - 7, h: cs - 7 });
      if (e.eq) { g.fillStyle(0xFFE14D, 1); g.fillRect(sx + 1, sy + 1, 4, 4); }
      if (it.up) T_(sx + cs - 2, sy + cs - 1, '+' + it.up, 6, '#9CFF5A').setOrigin(1, 1);
      if (P.sel && P.sel.it === it.id) { g.fillStyle(0xFFE14D, 1); g.fillRect(sx - 2, sy - 2, cs + 4, 1); g.fillRect(sx - 2, sy + cs + 1, cs + 4, 1); g.fillRect(sx - 2, sy - 2, 1, cs + 4); g.fillRect(sx + cs + 1, sy - 2, 1, cs + 4); }
      this.hits.add(sx, sy, cs, cs, () => { P.sel = { it: it.id }; this.renderPanel(); }, 'panel');
    });
    const dy = top + maxRows * (cs + 3) + 6;
    let it = null;
    if (P.sel && P.sel.it != null) for (const e of items) if (e.it.id === P.sel.it) it = e.it;
    if (!it) { T_(x, dy, 'Tap a piece of gear to forge it.', 7, '#9fb0d8'); return; }
    const up = it.up || 0;
    T_(x, dy, (it.boss ? '★ ' : '') + itemName(it) + ' Lv' + it.lv + (up ? '  +' + up : ''), 8, RARITY[it.r].hex).setWordWrapWidth(w);
    const e2 = effSt(it);
    const statStr = Object.keys(it.st).map((k) => {
      const d2 = e2[k] - it.st[k];
      const v = k === 'crit' ? e2[k].toFixed(1) : Math.round(e2[k]);
      const dv = d2 ? (k === 'crit' ? ' (+' + d2.toFixed(1) + ')' : ' (+' + Math.round(d2) + ')') : '';
      return '+' + v + (k === 'crit' ? '% ' : ' ') + STAT_INFO.find((s) => s.k === k).n + dv;
    }).join('  ');
    T_(x, dy + 11, statStr, 6, '#ffffff').setWordWrapWidth(w);
    if (up >= MAX_UP) { T_(x, dy + 22, 'Fully forged (max +' + MAX_UP + ')', 8, '#9CFF5A'); return; }
    const c = upCost(it);
    const have = S.gold >= c.gold && (S.mat.ore || 0) >= c.mat.ore && (S.mat.shard || 0) >= c.mat.shard;
    T_(x, dy + 22, 'Next +' + (up + 1) + ': ' + c.gold + ' vàng' + (c.mat.ore ? '  ·  ' + c.mat.ore + ' ' + MATS.ore.n : '') + (c.mat.shard ? '  ·  ' + c.mat.shard + ' ' + MATS.shard.n : ''), 7, have ? '#9CFF5A' : '#FF9A1F').setWordWrapWidth(w);
    btn(x, dy + 36, 104, 18, 'FORGE  +' + (up + 1), () => {
      if (S.gold < c.gold || (S.mat.ore || 0) < c.mat.ore || (S.mat.shard || 0) < c.mat.shard) { this.toast('Not enough vàng or materials', '#FF6A4A'); return; }
      S.gold -= c.gold; S.mat.ore = (S.mat.ore || 0) - c.mat.ore; S.mat.shard = (S.mat.shard || 0) - c.mat.shard;
      it.up = up + 1;
      play('levelup', 0.5, 1.25); this.clampVitals();
      this.toast(itemName(it) + ' forged to +' + (up + 1) + '!', '#9CFF5A');
      sdk((m) => m.event && m.event('gear_upgraded', { value: up + 1 }));
      saveProgress(); this.renderPanel();
    }, have ? C.green : 0x5A6488, 8);
  }
  panel_daily({ g, T_, I, btn, x, y, w, h }) {
    const D = S.daily = S.daily || { last: null, day: 0 };
    const today = todayKey(), claimed = D.last === today;
    T_(x, y, claimed ? 'Gift claimed. Come back tomorrow!' : 'A free gift, once a day!', 8, '#FFE14D');
    const n = DAILY.length, gap = 3, cols = w < 230 ? 4 : 7, rows = Math.ceil(n / cols);
    const cw = Math.floor((w - gap * (cols - 1)) / cols);
    const ch = 40;
    DAILY.forEach((r, i) => {
      const cx = Math.round(x + (i % cols) * (cw + gap)), cy = y + 14 + Math.floor(i / cols) * (ch + gap);
      const isNext = i === D.day;
      const done = claimed ? !isNext : i < D.day;
      g.fillStyle(0x0B0F1E, 1); g.fillRect(cx, cy, cw, ch);
      g.fillStyle(isNext ? 0x3A3200 : 0x24305A, 1); g.fillRect(cx + 1, cy + 1, cw - 2, ch - 2);
      if (isNext && !claimed) { g.fillStyle(0xFFE14D, 1); g.fillRect(cx + 1, cy + 1, cw - 2, 1); g.fillRect(cx + 1, cy + ch - 2, cw - 2, 1); }
      T_(cx + cw / 2, cy + 1, 'Day ' + (i + 1), 5, isNext ? '#FFE14D' : '#9fb0d8').setOrigin(0.5, 0);
      const icons = rewardIcons(r), shown = Math.min(3, icons.length);
      icons.slice(0, shown).forEach((ic, k) => {
        const ix = cx + cw / 2 - (shown - 1) * 7 + k * 14;
        I(ix, cy + 16, ic.icon, { w: 12, h: 12 });
        T_(ix, cy + 25, '' + ic.n, 6, '#ffffff').setOrigin(0.5, 0);
      });
      if (icons.length > shown) T_(cx + cw - 3, cy + 13, '+', 7, '#FFE14D').setOrigin(1, 0);
      if (done) { g.fillStyle(0x0B0F1E, 0.55); g.fillRect(cx + 1, cy + 1, cw - 2, ch - 2); T_(cx + cw / 2, cy + ch / 2, 'OK', 9, '#9CFF5A').setOrigin(0.5); }
    });
    const by = y + h - 22;
    if (claimed) { T_(x, by + 7, 'Hunt monsters for materials, or visit the blacksmith to forge your gear.', 6, '#9fb0d8').setWordWrapWidth(w); return; }
    btn(x + w / 2 - 62, by, 124, 20, 'CLAIM  DAY ' + (D.day + 1), () => {
      giveReward(DAILY[D.day]);
      D.last = today; D.day = (D.day + 1) % DAILY.length;
      play('levelup', 0.55, 1.2); this.toast('Daily gift: ' + dailyDesc(DAILY[(D.day + DAILY.length - 1) % DAILY.length]), '#FFE14D');
      sdk((m) => m.event && m.event('daily_claim', { value: 1 }));
      saveProgress(); this.renderPanel();
    }, C.green, 9);
  }
  panel_summon({ g, T_, I, btn, x, y, w, h }) {
    const P = this.panel; S.gems = S.gems || 0; S.tickets = S.tickets || 0;
    T_(x + 5, y, 'SPIN', 9, '#F08A24');
    I(x + 52, y + 5, 'ticketpx', { w: 12, h: 12 });
    T_(x + 61, y, '' + S.tickets, 9, '#7DF9FF');
    I(x + 108, y + 5, 'gempx', { w: 12, h: 12 });
    T_(x + 117, y, '' + S.gems, 9, '#C46BFF');
    T_(x, y + 14, 'Lucky Spin: quay bánh xe để nhận vàng, ngọc, vé, đậu và trang bị. Mỗi 10 lượt quay chắc chắn ra Rare trở lên.', 6, '#9fb0d8').setWordWrapWidth(w);
    // the wheel
    const r = Math.max(34, Math.min(w * 0.36, (h - 96) * 0.5, 76));
    const cx = Math.round(x + w / 2), cy = Math.round(y + 40 + r);
    const SS = this.spinState = this.spinState || { angle: 0, spinning: false, result: null };
    const wg = this.add.graphics().setDepth(52); wg.__noSnap = true; this.pImgs.push(wg); this.wg = wg;
    const icons = WHEEL.map((p) => { const im = I(cx, cy, p.icon, { w: r * 0.42, h: r * 0.42 }); im.__noSnap = true; return im; });
    this.wheel = { cx, cy, r, prizes: WHEEL, icons };
    this.drawWheel();
    // spin buttons, side by side under the wheel
    const by = Math.round(cy + r + 8), bh = 19, bw = Math.min(140, (w - 8) / 2);
    btn(x, by, bw, bh, 'QUAY 1 VÉ', () => this.spin('ticket'), (S.tickets >= 1 && !SS.spinning) ? C.green : 0x5A6488, 8);
    btn(x + w - bw, by, bw, bh, 'QUAY ' + GEM_COST + ' NGỌC', () => this.spin('gem'), (S.gems >= GEM_COST && !SS.spinning) ? 0x8A4FD0 : 0x5A6488, 8);
    // pity + last result
    const ry = by + bh + 5;
    const pity = 10 - ((S.summon || 0) % 10);
    T_(x, ry, 'Chắc chắn Rare sau ' + pity + ' lượt', 6, '#FFE14D');
    const res = SS.result;
    if (SS.spinning) { T_(x, ry + 11, 'Đang quay...', 7, '#ffffff'); return; }
    if (!res) { T_(x, ry + 11, 'Kiếm vé từ trùm, hoặc ngọc từ đấu trường.', 6, '#9fb0d8').setWordWrapWidth(w); return; }
    T_(x, ry + 11, 'Bạn nhận: ' + res.label, 8, res.col || '#FFE14D').setWordWrapWidth(w);
  }
  drawWheel() {
    const Wl = this.wheel, g = this.wg, SS = this.spinState; if (!Wl || !g || !SS) return;
    g.clear();
    const n = Wl.prizes.length, seg = (Math.PI * 2) / n;
    const a0 = SS.angle - Math.PI / 2 - seg / 2;
    const cx = Wl.cx, cy = Wl.cy, r = Wl.r;
    for (let i = 0; i < n; i++) {
      const s = a0 + i * seg, e = s + seg;
      g.fillStyle(Wl.prizes[i].col, 1); g.slice(cx, cy, r, s, e, false); g.fillPath();
      g.lineStyle(1, 0x0B0F1E, 0.5); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(s) * r, cy + Math.sin(s) * r); g.strokePath();
    }
    g.lineStyle(4, 0x0B0F1E, 1); g.strokeCircle(cx, cy, r + 2);
    g.lineStyle(2, C.gold, 1); g.strokeCircle(cx, cy, r);
    g.lineStyle(1, 0xFFF0A0, 0.7); g.strokeCircle(cx, cy, r - 3);
    // hub
    g.fillStyle(0x0B0F1E, 1); g.fillCircle(cx, cy, r * 0.24 + 3);
    g.fillStyle(C.gold, 1); g.fillCircle(cx, cy, r * 0.24 + 1);
    g.fillStyle(0x7A5510, 1); g.fillCircle(cx, cy, r * 0.17);
    g.fillStyle(0xFFF0A0, 1); g.fillCircle(cx - r * 0.06, cy - r * 0.06, r * 0.05);
    // pointer at the top
    g.fillStyle(0x0B0F1E, 1); g.fillTriangle(cx - 8, cy - r - 4, cx + 8, cy - r - 4, cx, cy - r + 10);
    g.fillStyle(0xffffff, 1); g.fillTriangle(cx - 5, cy - r - 4, cx + 5, cy - r - 4, cx, cy - r + 7);
    // prize icons orbit their segment
    Wl.icons.forEach((im, i) => {
      const mid = a0 + i * seg + seg / 2;
      im.setPosition(cx + Math.cos(mid) * r * 0.64, cy + Math.sin(mid) * r * 0.64).setRotation(mid + Math.PI / 2);
    });
  }
  spin(kind) {
    const SS = this.spinState = this.spinState || { angle: 0, spinning: false, result: null };
    if (SS.spinning) return;
    S.gems = S.gems || 0; S.tickets = S.tickets || 0;
    const cost = kind === 'gem' ? GEM_COST : 1;
    if (kind === 'ticket' && S.tickets < cost) { this.toast('Không đủ vé. Đánh trùm để có thêm.', '#FF6A4A'); return; }
    if (kind === 'gem' && S.gems < cost) { this.toast('Không đủ ngọc. Thắng đấu trường để có thêm.', '#FF6A4A'); return; }
    if (kind === 'ticket') S.tickets -= cost; else S.gems -= cost;
    S.summon = (S.summon || 0) + 1;
    let p = pickWheel();
    if (WHEEL[p].k === 'gear' && (S.summon % 10) === 0) p = WHEEL.findIndex((q) => q.k === 'rare');
    const prize = WHEEL[p];
    const n = WHEEL.length, seg = (Math.PI * 2) / n, two = Math.PI * 2;
    const base = -p * seg;
    let delta = ((base - SS.angle) % two + two) % two;
    const target = SS.angle + two * 5 + delta;
    const res = this.giveWheelPrize(prize, kind);
    play('click', 0.5); SS.spinning = true; SS.result = null;
    this.tweens.add({ targets: SS, angle: target, duration: 2600, ease: 'Cubic.easeOut',
      onComplete: () => { SS.spinning = false; SS.result = res; play('levelup', 0.6, 1.2); saveProgress(); if (this.panel && this.panel.k === 'summon') this.renderPanel(); } });
    sdk((m) => m.event && m.event('lucky_spin', { value: 1 }));
    this.renderPanel();
  }
  grantGear(it) {
    if (S.inv.length < 18) { S.inv.push(it); this.clampVitals(); return true; }
    S.gold += itemSell(it); return false;
  }
  giveWheelPrize(prize, kind) {
    const lv = Math.max(1, S.lv);
    switch (prize.k) {
      case 'gold': { const n = Math.round((60 + lv * 14) * (0.8 + Math.random() * 0.5) * tv('gold_rate')); S.gold += n; return { label: n + ' vàng', col: '#FFE14D' }; }
      case 'gold2': { const n = Math.round((320 + lv * 40) * (0.9 + Math.random() * 0.4) * tv('gold_rate')); S.gold += n; return { label: n + ' vàng', col: '#FFE14D' }; }
      case 'bean': { const n = 1 + Math.floor(Math.random() * 2); S.beans += n; return { label: n + ' Đậu Thần', col: '#9CFF5A' }; }
      case 'ticket': { const n = 1 + Math.floor(Math.random() * 2); S.tickets = (S.tickets || 0) + n; return { label: n + ' vé', col: '#7DF9FF' }; }
      case 'gem': { const n = 15 + Math.floor(Math.random() * 25); S.gems = (S.gems || 0) + n; return { label: n + ' ngọc', col: '#C46BFF' }; }
      case 'gear': { const it = makeItem(lv, { r: Math.random() < 0.5 ? 0 : 1 }); const ok = this.grantGear(it); return { label: itemName(it) + ' (' + RARITY[it.r].n + ')' + (ok ? '' : ' + ' + itemSell(it) + ' vàng (túi đầy)'), col: RARITY[it.r].hex }; }
      case 'rare': { const it = makeItem(lv, { r: 2 }); const ok = this.grantGear(it); return { label: itemName(it) + ' (' + RARITY[it.r].n + ')' + (ok ? '' : ' + ' + itemSell(it) + ' vàng (túi đầy)'), col: RARITY[it.r].hex }; }
      case 'jack': { const it = makeItem(lv, { r: 3 }); const ok = this.grantGear(it); const gg = Math.round((220 + lv * 30) * tv('gold_rate')), g2 = 60; S.gold += gg; S.gems = (S.gems || 0) + g2; return { label: 'JACKPOT! ' + itemName(it) + ' + ' + gg + ' vàng + ' + g2 + ' ngọc', col: '#FF4A3A' }; }
      default: { S.gold += 50; return { label: '50 vàng', col: '#FFE14D' }; }
    }
  }
  panel_balls({ g, T_, I, btn, x, y, w, h }) {
    S.balls = S.balls || {}; S.rchests = S.rchests || [];
    const owned = ballsOwned();
    let total = 0; for (let s = 1; s <= 7; s++) total += S.balls[s] || 0;
    T_(x, y, 'Đã thu thập: ' + owned.length + '/7 loại  ·  ' + total + ' viên', 8, '#FFE14D');
    T_(x, y + 12, 'Trùm luôn rơi 1 viên 1-5 sao. Rương có ' + Math.round(Number(tv('chest_rare_chance')) * 100) + '% ra Ngọc Rồng 6 hoặc 7 sao quý hiếm.', 6, '#9fb0d8').setWordWrapWidth(w);
    const n = 7, gap = 4, isz = Math.max(18, Math.min(34, Math.floor((w - gap * (n - 1)) / n)));
    const by = y + 30;
    for (let i = 0; i < n; i++) {
      const star = i + 1, own = S.balls[star] || 0, sx = Math.round(x + i * (isz + gap));
      drawSlot(g, sx, by, isz, star >= 6 ? 0xC46BFF : 0xF4C542, 0x0E1430);
      I(sx + isz / 2, by + isz / 2 - 1, 'ball_' + star, { w: isz - 6, h: isz - 6 });
      T_(sx + isz / 2, by + isz - 1, 'x' + own, 6, own ? '#9CFF5A' : '#6a7394').setOrigin(0.5, 1);
      T_(sx + isz / 2, by + isz + 1, star + '★', 5, star >= 6 ? '#C46BFF' : '#FFD9A0').setOrigin(0.5, 0);
    }
    const dy = by + isz + 15;
    const ready = hasAllBalls() || S.pendingWish;
    if (ready) {
      const pulse = 0.5 + 0.4 * Math.abs(Math.sin((this.panel.t || 0) * 3));
      drawFrame(g, x, dy, w, 46, 0x1A0B2E, 0.96);
      g.fillStyle(0xC46BFF, pulse); g.fillRect(x, dy, w, 2); g.fillRect(x, dy + 44, w, 2);
      I(x + 18, dy + 23, 'ball_7', { w: 26, h: 26 });
      T_(x + 36, dy + 5, S.pendingWish ? 'THẦN RỒNG ĐANG CHỜ!' : 'ĐỦ 7 NGỌC RỒNG!', 8, '#FFE14D');
      T_(x + 36, dy + 16, S.pendingWish ? 'Hãy nói điều ước của ngươi' : 'Chọn một trong bốn điều ước', 6, '#C8B0FF').setWordWrapWidth(w - 44);
      const bw = Math.min(150, w - 12);
      btn(x + (w - bw) / 2, dy + 27, bw, 15, S.pendingWish ? 'CHỌN ĐIỀU ƯỚC' : 'TRIỆU HỒI THẦN RỒNG', () => this.summonDragon(), 0x8A4FD0, 7);
    } else {
      T_(x, dy + 2, 'Còn thiếu ' + (7 - owned.length) + ' loại Ngọc Rồng nữa để triệu hồi Thần Rồng Thiêng Liêng.', 6, '#9fb0d8').setWordWrapWidth(w);
    }
    const ry = dy + (ready ? 52 : 16);
    T_(x, ry, 'Rương Phần thưởng: ' + S.rchests.length, 8, '#FFD9A0');
    if (!S.rchests.length) {
      T_(x, ry + 14, 'Thua một trận ở Đại hội Võ thuật để nhận rương. Càng lên cao, rương càng giá trị.', 6, '#9fb0d8').setWordWrapWidth(w);
      return;
    }
    const cs = 30, cgap = 4, cols = Math.max(1, Math.floor((w + cgap) / (cs + cgap)));
    const gy = ry + 14, maxShow = Math.min(S.rchests.length, cols * 2);
    for (let i = 0; i < maxShow; i++) {
      const c = S.rchests[i];
      const sx = Math.round(x + (i % cols) * (cs + cgap)), sy = Math.round(gy + Math.floor(i / cols) * (cs + cgap));
      drawSlot(g, sx, sy, cs, c.tier >= 5 ? 0xC46BFF : c.tier >= 3 ? 0x4FA3FF : 0x9AA6B8, 0x0E1430);
      I(sx + cs / 2, sy + cs / 2, 'chestpx', { w: cs - 6, h: cs - 6 });
      T_(sx + cs - 2, sy + cs - 1, 'T' + c.tier, 5, '#FFE14D').setOrigin(1, 1);
      this.hits.add(sx, sy, cs, cs, () => this.openRewardChest(i), 'panel', { pad: 2 });
    }
    if (S.rchests.length > maxShow) T_(x + w, gy + 2, '+' + (S.rchests.length - maxShow), 7, '#FFE14D').setOrigin(1, 0);
    const hy = gy + (maxShow > cols ? 2 : 1) * (cs + cgap) + 4;
    btn(x, hy, 130, 20, 'MỞ RƯƠNG (' + chestTierName(S.rchests[0].tier) + ')', () => this.openRewardChest(0), C.green, 8);
    T_(x, hy + 24, 'Chạm một rương để mở. Mỗi rương cho vàng, ngọc, và cơ hội Ngọc Rồng 6-7 sao.', 6, '#9fb0d8').setWordWrapWidth(w);
  }
  openRewardChest(i) {
    S.rchests = S.rchests || [];
    const c = S.rchests[i]; if (!c) return;
    S.rchests.splice(i, 1);
    const v = chestValue(c.tier, c.lv || S.lv);
    S.gold += v.gold; S.gems = (S.gems || 0) + v.gems;
    let ball = 0;
    if (Math.random() < Number(tv('chest_rare_chance'))) ball = Math.random() < 0.5 ? 6 : 7;
    if (ball) { S.balls = S.balls || {}; S.balls[ball] = (S.balls[ball] || 0) + 1; }
    play('levelup', 0.6, ball ? 1.3 : 1.1);
    this.toast(ball ? ('Rương ' + chestTierName(c.tier) + ': Ngọc Rồng ' + ball + ' sao!!!') : ('Rương ' + chestTierName(c.tier) + ': +' + v.gold + ' vàng, +' + v.gems + ' ngọc'), ball ? '#C46BFF' : '#FFE14D');
    sdk((m) => m.event && m.event('chest_open', { value: c.tier }));
    saveProgress(); this.renderPanel();
  }
  /* ---- Divine Dragon */
  summonDragon() {
    if (S.pendingWish) { this.open('dragon', false, { phase: 'choose', result: null }); return; }
    if (!hasAllBalls()) { this.toast('Cần đủ 7 loại Ngọc Rồng.', '#FF6A4A'); return; }
    takeAllBalls(); S.pendingWish = true; saveProgress();
    play('roar', 0.75); play('beam', 0.5, 0.7);
    sdk((m) => m.event && m.event('dragon_summon', {}));
    this.open('dragon', false, { phase: 'summon', result: null, phaseT: 0 });
  }
  tickDragon(dt) {
    const P = this.panel; if (!P || P.phase !== 'summon') return;
    P.phaseT = (P.phaseT || 0) + dt;
    if (P.phaseT > 1.7) { P.phase = 'choose'; this.renderPanel(); }
  }
  panel_dragon({ g, T_, I, btn, x, y, w, h }) {
    const P = this.panel;
    if (P.phase === 'summon') {
      g.fillStyle(0x0E2A10, 0.32); g.fillRect(0, 0, this.v.UW, this.v.UH);
      T_(x + w / 2, y + 2, 'SHENRON!', 14, '#FFE14D').setOrigin(0.5, 0);
      const im = I(x + w / 2, y + h * 0.58, 'dragon');
      const target = Math.min((w * 0.94) / im.width, (h * 0.92) / im.height);
      im.__noSnap = true; im.setScale(target * 0.06);
      this.tweens.add({ targets: im, scaleX: target, scaleY: target, duration: 1500, ease: 'Cubic.easeOut' });
      T_(x + w / 2, y + h - 8, 'Thần Rồng hiện ra, hãy nói điều ước của ngươi...', 7, '#C8B0FF').setOrigin(0.5, 1);
      return;
    }
    const dh = Math.min(h * 0.28, 86);
    const im = I(x + w / 2, y + dh * 0.5, 'dragon'); im.setOrigin(0.5, 0.5);
    im.setScale(Math.min(dh / im.height, (w * 0.42) / im.width));
    T_(x + w / 2, y + dh + 2, P.result ? 'Điều ước đã thành hiện thực!' : 'Chọn một điều ước', 8, '#FFE14D').setOrigin(0.5, 0);
    if (P.result) {
      const r = P.result;
      drawFrame(g, x, y + dh + 18, w, 44, 0x1A0B2E, 0.95);
      I(x + 20, y + dh + 40, r.icon || 'ball_7', { w: 24, h: 24 });
      T_(x + 38, y + dh + 24, r.title, 9, r.col).setWordWrapWidth(w - 46);
      T_(x + 38, y + dh + 36, r.label, 7, '#ffffff').setWordWrapWidth(w - 46);
      btn(x + w / 2 - 45, y + h - 20, 90, 18, 'Đóng', () => this.closePanel(), C.orange, 8);
      return;
    }
    const top = y + dh + 16, avail = h - dh - 20, gap = 4;
    const rh = Math.max(22, (avail - gap * (WISHES.length - 1)) / WISHES.length);
    WISHES.forEach((wi, i) => {
      const ry = Math.round(top + i * (rh + gap));
      g.fillStyle(0x0B0F1E, 1); g.fillRect(x, ry, w, rh);
      g.fillStyle(0x24305A, 1); g.fillRect(x + 1, ry + 1, w - 2, rh - 2);
      g.fillStyle(wi.c, 1); g.fillRect(x + 1, ry + 1, 3, rh - 2);
      I(x + 16, ry + rh / 2, wi.icon, { w: 18, h: 18 });
      T_(x + 30, ry + 3, wi.n, 7, wi.col).setWordWrapWidth(w - 30 - 64);
      T_(x + 30, ry + rh / 2 + 4, wi.d, 6, '#c9d4ee').setWordWrapWidth(w - 30 - 64);
      const bw = 58, bh = Math.min(16, rh - 8);
      btn(x + w - bw - 6, ry + (rh - bh) / 2, bw, bh, 'CHỌN', () => this.pickWish(wi.k), wi.c, 7);
    });
  }
  pickWish(k) {
    if (!S.pendingWish) { if (!hasAllBalls()) { this.toast('Cần đủ 7 loại Ngọc Rồng.', '#FF6A4A'); return; } takeAllBalls(); }
    S.pendingWish = false;
    let title = '', label = '', col = '#FFE14D', icon = 'ball_7';
    if (k === 'str') { S.str = (S.str || 0) + 6; title = 'Sức Mạnh Vĩnh Viễn'; label = 'Attack tăng vĩnh viễn +6 (tổng +' + S.str + ').'; col = '#FF9A1F'; icon = 'sk0'; }
    else if (k === 'gold') { const n = Math.round((1200 + S.lv * 120) * tv('gold_rate')); S.gold += n; title = 'Kho Báu Vô Tận'; label = '+' + n.toLocaleString('vi-VN') + ' vàng.'; col = '#FFE14D'; icon = 'ui_coin'; }
    else if (k === 'ticket') { S.tickets = (S.tickets || 0) + 10; title = 'Vé Triệu Hồi'; label = '+10 vé Lucky Spin.'; col = '#7DF9FF'; icon = 'ticketpx'; }
    else if (k === 'vip') {
      const it = makeVipItem(); S.vip = (S.vip || 0) + 1;
      if (S.inv.length < 18) S.inv.push(it); else S.eq[it.s] = it;
      title = 'Thiên Y VIP'; label = itemName(it) + ' (Epic) đã vào túi.'; col = '#C46BFF'; icon = 'item_0';
      if (HUD) HUD.flagBag();
    }
    play('levelup', 0.7, 0.85); this.clampVitals();
    sdk((m) => m.event && m.event('dragon_wish', { wish: k }));
    saveProgress();
    this.panel.phase = 'done'; this.panel.result = { title, label, col, icon };
    this.renderPanel();
  }
  /* ---- level leaderboard */
  panel_rank({ g, T_, I, btn, x, y, w, h }) {
    if (!this.rankBoard) {
      this.rankBoard = { rows: null };
      sdk((mb) => {
        if (!mb.leaderboard) { this.rankBoard = { rows: [] }; return; }
        mb.leaderboard.top('level', { limit: 100 })
          .then((rows) => { this.rankBoard = { rows: (rows || []).filter((r) => Number(r.value) >= 10).slice(0, 10) }; if (this.panel && this.panel.k === 'rank') this.renderPanel(); })
          .catch(() => { this.rankBoard = { rows: [] }; if (this.panel && this.panel.k === 'rank') this.renderPanel(); });
      });
    }
    T_(x, y, 'Xếp hạng theo Cấp độ', 8, '#F08A24');
    T_(x + w, y, 'Lv 10+', 7, '#FFE14D').setOrigin(1, 0);
    const rows = this.rankBoard.rows;
    if (!rows) { T_(x, y + 16, 'Đang tải...', 7, '#9fb0d8'); return; }
    if (!rows.length) { T_(x, y + 16, 'Chưa ai đạt Cấp 10. Hãy là người đầu tiên!', 7, '#9fb0d8').setWordWrapWidth(w); return; }
    const top = y + 15, rh = Math.min(17, (h - 16) / rows.length);
    rows.forEach((row, i) => {
      const ry = Math.round(top + i * rh);
      g.fillStyle(row.mine ? 0x24402A : (i % 2 ? 0x1D2746 : 0x18203C), 1); g.fillRect(x, ry - 1, w, Math.round(rh) - 1);
      const medal = row.rank === 1 ? '#FFE14D' : row.rank === 2 ? '#D8E0F0' : row.rank === 3 ? '#E09850' : '#9fb0d8';
      T_(x + 4, ry, '#' + row.rank, 7, medal);
      const t = T_(x + 32, ry, (row.username || 'guest') + '  Lv' + Math.round(row.value), 7, row.mine ? '#9CFF5A' : '#ffffff');
      if (row.profile_url) { t.setColor(row.mine ? '#9CFF5A' : '#7DF9FF'); this.hits.add(x + 28, ry - 2, Math.min(w - 32, t.width + 8), Math.max(10, Math.round(rh)), () => window.open(row.profile_url, '_blank'), 'panel'); }
    });
    T_(x, y + h - 6, 'Chỉ hiển thị người chơi từ Cấp 10 trở lên.', 6, '#9fb0d8').setOrigin(0, 1);
  }
  panel_quest({ T_, g, x, y, w, h }) {
    const st = questState();
    const lh = Math.min(38, (h - 16) / QUEST_CHAIN.length);
    QUEST_CHAIN.forEach((s, i) => {
      const ry = Math.round(y + i * lh);
      const done = st.done || i < st.step;
      const cur = !st.done && i === st.step;
      g.fillStyle(0x0B0F1E, 1); g.fillRect(x, ry, w, lh - 5);
      g.fillStyle(cur ? 0x2A2C5E : 0x24305A, 1); g.fillRect(x + 1, ry + 1, w - 2, lh - 7);
      const col = done ? 0x3CC24A : cur ? 0xFFE14D : 0x5A6488;
      g.fillStyle(col, 1); g.fillRect(x + 4, ry + 4, 13, 13);
      if (done) {
        g.fillStyle(0x0B0F1E, 1);
        for (let k = 0; k < 4; k++) g.fillRect(x + 6 + k, ry + 10 + k, 2, 2);
        for (let k = 0; k < 4; k++) g.fillRect(x + 11 + k, ry + 14 - k, 2, 2);
      } else T_(x + 10.5, ry + 10.5, '' + (i + 1), 8, '#0B0F1E').setOrigin(0.5);
      T_(x + 22, ry + 3, s.title, 8, done ? '#9fb0d8' : cur ? '#ffffff' : '#c8d2ee');
      T_(x + 22, ry + 14, questStepText(s, i, st), 7, '#9fb0d8');
      T_(x + w, ry + 3, '+' + s.exp + ' XP · +' + s.gold + 'g', 7, '#FFE14D').setOrigin(1, 0);
    });
    const q = questStep();
    if (!q) T_(x, y + h - 10, 'All steps complete. The road is yours!', 8, '#9CFF5A');
    else T_(x, y + h - 10, 'Follow the yellow arrow to the next objective.', 7, '#FFE14D');
  }
  panel_help({ T_, x, y, w, h }) {
    const touch = this.sys.game.device.input.touch;
    const lines = touch ? [
      ['Move', 'Joystick (bottom left), or tap the ground'],
      ['Jump', 'Arrow button. Tap again in air: double jump'],
      ['Fly', 'Third tap in the air. Hold arrow to rise. Uses Ki'],
      ['Fight', 'Fist = 3-hit combo. Tap a monster to auto-attack'],
      ['Skills', 'Ki blast, beam, transform, heal (cost Ki)'],
      ['Bean', 'Green bean slot: full HP and Ki'],
      ['People', 'Tap a villager to talk or shop. Potion slot uses items'],
      ['Forge', 'Blacksmith: upgrade gear with vàng and materials'],
      ['Home', 'Nhà: grow beans, store gear in the chest, Gift codes'],
      ['Summon', 'SPIN: Lucky Spin prize wheel, spend vé or ngọc'],
      ['Balls', 'DB: Dragon Balls from bosses. All 7 summon the Dragon'],
      ['Daily', 'GIFT: a free reward once a day'],
    ] : [
      ['Move', 'A / D or arrows, or click the ground'],
      ['Jump', 'Space or W. Again in air: double jump'],
      ['Fly', 'Third jump in air or F. Hold Space/W to rise, S down'],
      ['Fight', 'J combo, K ki blast, L beam, U transform, I heal'],
      ['Bean', 'H eats a magic bean: full HP and Ki'],
      ['Menus', 'C stats, B bag, M map, P potions, G spin, V gift'],
      ['Balls', 'DB button: Dragon Balls from bosses. All 7 summon the Dragon'],
      ['Home', 'Your base: bean plant, storage chest, Gift codes'],
      ['People', 'E near a villager to talk, shop or forge'],
    ];
    const lh = Math.min(24, (h - 34) / lines.length);
    lines.forEach(([a, b], i) => { T_(x, y + i * lh, a, 9, '#F08A24'); T_(x + 46, y + i * lh, b, 8, '#ffffff').setWordWrapWidth(w - 46); });
    T_(x, y + h - 14, 'Beat monsters for gold, gear and EXP. Spend Potential Points in STATS. Grow beans in the pot near spawn.', 6, '#FFE14D').setWordWrapWidth(w);
  }
  panel_dead({ T_, btn, x, y, w, h }) {
    T_(x + w / 2, y + 6, 'You lost 5% of your gold.', 8, '#ffffff').setOrigin(0.5, 0);
    T_(x + w / 2, y + 20, 'Kills this run: ' + (W ? W.runKills : 0), 7, '#9fb0d8').setOrigin(0.5, 0);
    if (W && W.biome === 'arena') T_(x + w / 2, y + 32, 'Out of the tournament: back to round 1. Reward Chest added, open it in DB.', 7, '#FF6A4A').setOrigin(0.5, 0).setWordWrapWidth(w - 8);
    btn(x + w / 2 - 45, y + h - 30, 90, 20, 'Get up', () => { this.clearPanel(); this.panel = null; W.respawn(); });
  }
  /* ---- per-frame HUD drawing */
  update(time, dtMs) {
    if (!W || !W.p) return;
    const dt = dtMs / 1000;
    const g = this.g, p = W.p, st = stats(), v = this.v;
    g.clear(); this.gTop.clear();
    if (this.panel) { this.panel.t += dt; }
    if (this.panel && this.panel.k === 'summon') this.drawWheel();
    if (this.panel && this.panel.k === 'dragon') this.tickDragon(dt);
    // panel snap-open: 2-step 90% -> 100%
    const cam = this.cameras.main;
    // avatar frame
    const { x: ax, y: ay, s: as } = this.av;
    g.fillStyle(0x0B0F1E, 1); g.fillRect(ax - 1, ay - 1, as + 2, as + 2);
    g.fillStyle(C.gold, 1); g.fillRect(ax, ay, as, as);
    g.fillStyle(0x7A5510, 1); g.fillRect(ax + 2, ay + 2, as - 4, as - 4);
    g.fillStyle(0x1E3A8A, 1); g.fillRect(ax + 3, ay + 3, as - 6, as - 6);
    g.fillStyle(0x2A56C0, 1); g.fillRect(ax + 3, ay + 3, as - 6, 8);
    // level chip
    const lx = ax + 11, ly = ay + as + 1, hw = Math.ceil(this.lvText.width / 2) + 4;
    this.gTop.fillStyle(0x0B0F1E, 1); this.gTop.fillRect(lx - hw - 1, ly - 5, hw * 2 + 2, 10); this.gTop.fillRect(lx - hw + 1, ly - 7, hw * 2 - 2, 14);
    this.gTop.fillStyle(C.orange, 1); this.gTop.fillRect(lx - hw, ly - 4, hw * 2, 8); this.gTop.fillRect(lx - hw + 2, ly - 6, hw * 2 - 4, 12);
    this.gTop.fillStyle(0xFFB060, 1); this.gTop.fillRect(lx - hw + 2, ly - 6, hw * 2 - 4, 1);
    const bn = BIOMES[W.biome].name; if (this.miniText.text.replace(/\s+/g, ' ') !== bn) this.miniText.setText(bn);
    if (this.lvText.text !== 'Lv' + S.lv) this.lvText.setText('Lv' + S.lv);
    // bars
    const { x: bx, w: bw, y: by } = this.bars;
    const bar = (yy, hh, frac, full, hi, empty) => {
      g.fillStyle(0x1A1A2E, 1); g.fillRect(bx - 1, yy - 1, bw + 2, hh + 2);
      g.fillStyle(empty, 1); g.fillRect(bx, yy, bw, hh);
      const fw = Math.round(bw * Phaser.Math.Clamp(frac, 0, 1));
      g.fillStyle(full, 1); g.fillRect(bx, yy, fw, hh); g.fillStyle(hi, 1); g.fillRect(bx, yy, fw, 1);
    };
    bar(by, 9, p.hp / st.hp, C.red, C.redHi, C.hpEmpty);
    bar(by + 11, 9, p.ki / st.ki, C.blue, C.blueHi, C.kiEmpty);
    { const ex = bx + 18, ew = bw - 18; g.fillStyle(0x1A1A2E, 1); g.fillRect(ex - 1, by + 23, ew + 2, 6); g.fillStyle(0x3A3010, 1); g.fillRect(ex, by + 24, ew, 4);
      const fw = Math.round(ew * Phaser.Math.Clamp(S.exp / expNeed(S.lv), 0, 1)); g.fillStyle(C.exp, 1); g.fillRect(ex, by + 24, fw, 4); g.fillStyle(0xFFF6A8, 1); g.fillRect(ex, by + 24, fw, 1); }
    this.expLbl.setPosition(bx, by + 21.5);
    const hpS = Math.ceil(p.hp) + '/' + Math.round(st.hp), kiS = Math.floor(p.ki) + '/' + Math.round(st.ki);
    if (this.hpText.text !== hpS) this.hpText.setText(hpS);
    if (this.kiText.text !== kiS) this.kiText.setText(kiS);
    // flying: ki bar pulses
    if (p.flying && Math.floor(time / 120) % 2) { g.fillStyle(0xffffff, 0.35); g.fillRect(bx, by + 11, Math.round(bw * p.ki / st.ki), 9); }
    // menu buttons
    for (const m of this.menu) {
      let col = 0x2A3A70;
      if (m.k === 'stats' && S.pts > 0 && Math.floor(time / 300) % 2) col = 0xB08A10;
      if (m.k === 'bag' && this.bagFlag && Math.floor(time / 300) % 2) col = 0x2F8A3A;
      if (m.k === 'balls' && (hasAllBalls() || S.pendingWish) && Math.floor(time / 300) % 2) col = 0x7A3AC8;
      if (m.k === 'gift' && dailyAvailable() && Math.floor(time / 300) % 2) col = 0xB08A10;
      if (m.k === 'sound' && !soundOn) col = 0x5A2A2A;
      g.fillStyle(0x0B0F1E, 1); g.fillRect(m.x - 1, m.y - 1, m.w + 2, m.h + 2); g.fillStyle(C.gold, 1); g.fillRect(m.x, m.y, m.w, m.h);
      g.fillStyle(col, 1); g.fillRect(m.x + 1, m.y + 1, m.w - 2, m.h - 2); g.fillStyle(0xffffff, 0.18); g.fillRect(m.x + 1, m.y + 1, m.w - 2, 1);
    }
    if (S.pts > 0) { const m = this.menu[0]; this.gTop.fillStyle(0xFFE14D, 1); this.gTop.fillRect(m.x + m.w - 4, m.y - 3, 6, 6); this.gTop.fillStyle(0xC81E1E, 1); this.gTop.fillRect(m.x + m.w - 3, m.y - 2, 4, 4); }
    // gold
    const gb = this.goldBox;
    g.fillStyle(0x0B0F1E, 1); g.fillRect(gb.x - 1, gb.y - 1, gb.w + 2, gb.h + 2); g.fillStyle(C.gold, 1); g.fillRect(gb.x, gb.y, gb.w, gb.h); g.fillStyle(0x9A6E12, 1); g.fillRect(gb.x + 2, gb.y + 2, gb.w - 4, gb.h - 4); g.fillStyle(0x1B2340, 1); g.fillRect(gb.x + 3, gb.y + 3, gb.w - 6, gb.h - 6);
    g.fillStyle(0x2C3A66, 1); g.fillRect(gb.x, gb.y, gb.w, 1);
    const gs = S.gold.toLocaleString('vi-VN'); if (this.goldText.text !== gs) this.goldText.setText(gs);
    // minimap
    const mm = this.mini; drawFrame(g, mm.x, mm.y, mm.w, mm.h, 0x0E3A24, 0.92);
    const sx = (wx) => mm.x + 4 + ((mm.w - 8) * wx) / LW;
    g.fillStyle(0x4CBB2C, 1);
    for (const s of W.segs) g.fillRect(Math.round(sx(s.x0)), mm.y + mm.h - 8, Math.max(1, Math.round(sx(s.x1) - sx(s.x0))), 2);
    for (const pt of W.portals) { g.fillStyle(0x7DF9FF, 1); g.fillRect(Math.round(sx(pt.x)) - 1, mm.y + mm.h - 12, 2, 4); }
    for (const n of W.npcs || []) { g.fillStyle(n.role === 'shop' ? 0xFFE14D : 0xB8F0FF, 1); g.fillRect(Math.round(sx(n.x)), mm.y + mm.h - 11, 2, 3); }
    if (W.garden) { g.fillStyle(0x9CFF5A, 1); g.fillRect(Math.round(sx(W.garden.x)), mm.y + mm.h - 11, 2, 3); }
    if (W.plant) { g.fillStyle(0x6FD13A, 1); g.fillRect(Math.round(sx(W.plant.x)), mm.y + mm.h - 11, 2, 3); }
    if (W.chest) { g.fillStyle(0xFFD9A0, 1); g.fillRect(Math.round(sx(W.chest.x)), mm.y + mm.h - 11, 2, 3); }
    for (const e of W.ents) if (!e.dead && e.boss) { const bx2 = Math.round(sx(e.x)); g.fillStyle(0x0B0F1E, 1); g.fillRect(bx2 - 2, mm.y + mm.h - 15, 5, 5); g.fillStyle(Math.floor(time / 300) % 2 ? 0xFF4A3A : 0xffffff, 1); g.fillRect(bx2 - 1, mm.y + mm.h - 14, 3, 3); }
    for (const e of W.ents) if (!e.dead && !e.boss) { g.fillStyle(0xFF4A3A, 1); g.fillRect(Math.round(sx(e.x)), mm.y + mm.h - 11 - (e.md.fly ? 3 : 0), 1, 2); }
    for (const o of W.others.values()) { g.fillStyle(0xffffff, 1); g.fillRect(Math.round(sx(o.x)), mm.y + mm.h - 12, 2, 2); }
    const pf = Math.floor(time / 250) % 2; g.fillStyle(pf ? 0xFFE14D : 0xFFFFFF, 1); g.fillRect(Math.round(sx(p.x)) - 1, mm.y + mm.h - 13, 3, 3);
    this.drawQuest(g, time, dt);
    // leaderboard button
    { const tb = this.topBtn;
      g.fillStyle(0x0B0F1E, 1); g.fillRect(tb.x - 1, tb.y - 1, tb.w + 2, tb.h + 2);
      g.fillStyle(C.gold, 1); g.fillRect(tb.x, tb.y, tb.w, tb.h);
      g.fillStyle(S.lv >= 10 && Math.floor(time / 400) % 2 ? 0x2F7BE0 : 0x2A3A70, 1); g.fillRect(tb.x + 1, tb.y + 1, tb.w - 2, tb.h - 2);
      g.fillStyle(0xffffff, 0.18); g.fillRect(tb.x + 1, tb.y + 1, tb.w - 2, 1); }
    // joystick
    // one joystick, always in the corner: a drag anywhere moves its knob
    const jb = this.joyBase;
    const ring = (cx, cy, r, col, a, th = 2) => { g.fillStyle(col, a); for (let t = 0; t < Math.PI * 2; t += 1 / r) g.fillRect(Math.round(cx + Math.cos(t) * r) - 1, Math.round(cy + Math.sin(t) * r) - 1, th, th); };
    const disc = (cx, cy, r, col, a) => { g.fillStyle(col, a); for (let yy = -r; yy <= r; yy++) { const hw = Math.round(Math.sqrt(r * r - yy * yy)); g.fillRect(Math.round(cx - hw), Math.round(cy + yy), hw * 2, 1); } };
    disc(jb.x, jb.y, jb.r, 0xffffff, 0.12); ring(jb.x, jb.y, jb.r, 0xffffff, 0.35, 2);
    const kx = jb.x + this.joy.kx, ky = jb.y + this.joy.ky;
    const kr = this.uiScale < 1 ? jb.r * 0.44 : 12;
    disc(kx, ky, kr, 0x0B0F1E, 0.9); disc(kx, ky, kr - 1, C.gold, 1); disc(kx, ky, Math.max(4, kr - 3), 0x3A64C8, 1); disc(kx - kr * 0.2, ky - kr * 0.25, Math.max(2, kr * 0.25), 0x7DB8FF, 1);
    // skills cooldown wedges
    for (const s of this.skills) {
      const cdMax = [0, 0.55, 6, 30, RACES[S.race].healCd][s.i];
      const cd = p.cds[s.i];
      const cost = [0, 9, 34, 30, 22][s.i];
      if (s.i === 3 && p.trans > 0) { this.gTop.fillStyle(0xFFE14D, (Math.floor(time / 150) % 2) ? 0.35 : 0.15); this.gTop.fillRect(s.x + 2, s.y + 2, s.s - 4, s.s - 4); }
      if (cd > 0 && cdMax > 0) {
        const frac = cd / cdMax; const steps = 16, filled = Math.ceil(frac * steps);
        const cx = s.x + s.s / 2, cy = s.y + s.s / 2, R = s.s / 2 - 2;
        this.gTop.fillStyle(0x000000, 0.6);
        for (let yy = -R; yy < R; yy++) for (let xx = -R; xx < R; xx += 1) {
          let a = Math.atan2(xx + 0.5, -(yy + 0.5)); if (a < 0) a += Math.PI * 2;
          const seg = Math.floor((a / (Math.PI * 2)) * steps);
          if (seg >= steps - filled) this.gTop.fillRect(Math.round(cx + xx), Math.round(cy + yy), 1, 1);
        }
        const tx = cd >= 1 ? '' + Math.ceil(cd) : ''; if (s.cdText.text !== tx) s.cdText.setText(tx);
      } else if (s.cdText.text !== '') s.cdText.setText('');
      if (p.ki < cost) { this.gTop.fillStyle(0x13224A, 0.55); this.gTop.fillRect(s.x + 2, s.y + 2, s.s - 4, s.s - 4); }
    }
    // hold-to-repeat attack
    if (this.atkPtr != null && !this.panel) W.skill(0);
    // jump button flying glow
    if (p.flying) ring(this.jumpBtn.x, this.jumpBtn.y, this.jumpBtn.r, RACES[S.race].aura[Math.floor(time / 100) % 2], 1, 2);
    // bean slot
    const bb = this.beanBtn; drawSlot(g, bb.x, bb.y, bb.s);
    const bs = '' + S.beans; if (this.beanText.text !== bs) this.beanText.setText(bs);
    if (p.beanCd > 0) { g.fillStyle(0x000000, 0.5); g.fillRect(bb.x + 2, bb.y + 2, bb.s - 4, Math.round((bb.s - 4) * p.beanCd / 3)); }
    if (p.hp < st.hp * 0.3 && S.beans > 0 && Math.floor(time / 250) % 2) ring(bb.x + bb.s / 2, bb.y + bb.s / 2, bb.s * 0.62, 0x9CFF5A, 1, 1);
    // hint pill
    if (this.hint) { const t = this.hintBtn; const w = t.width + 12; drawFrame(g, Math.round(t.x - w / 2), Math.round(t.y - 9), Math.round(w), 18); this.hintHit.x = t.x - w / 2; this.hintHit.w = w; this.hintHit.y = t.y - 9; this.hintHit.h = 18; }
    // boss health bar
    const bo = W.foe && !W.foe.dead ? W.foe : W.boss, showBoss = bo && !bo.dead && bo.aggro;
    if (showBoss) {
      const bb2 = this.bossBox; drawFrame(g, bb2.x, bb2.y, bb2.w, bb2.h, 0x2A0A10, 1);
      const iw = bb2.w - 8, fw = Math.max(0, Math.round(iw * bo.hp / bo.maxHp));
      g.fillStyle(0x3A1418, 1); g.fillRect(bb2.x + 4, bb2.y + 4, iw, bb2.h - 8);
      g.fillStyle(0xE0302A, 1); g.fillRect(bb2.x + 4, bb2.y + 4, fw, bb2.h - 8); g.fillStyle(0xFF7A6E, 1); g.fillRect(bb2.x + 4, bb2.y + 4, fw, 1);
      for (let i = 1; i < 10; i++) { g.fillStyle(0x1A1A2E, 0.6); g.fillRect(bb2.x + 4 + Math.round(iw * i / 10), bb2.y + 4, 1, bb2.h - 8); }
      const bt = (bo.round ? 'Vòng ' + bo.round + ' · ' : '★ ') + bo.name + ' Lv' + bo.lv + '  ' + Math.max(0, Math.ceil(bo.hp)) + '/' + bo.maxHp;
      if (this.bossText.text !== bt) this.bossText.setText(bt);
    } else if (this.bossText.text) this.bossText.setText('');
    this.toastText.y = this.toastY + (showBoss ? 22 : 0); this.hintBtn.y = this.hintY + (showBoss ? 22 : 0);
    // toasts / big text
    if (this.toastT > 0) { this.toastT -= dt; this.toastText.setAlpha(this.toastT > 0.4 ? 1 : 0.5); if (this.toastT <= 0) this.toastText.setText(''); }
    if (this.bigT > 0) { this.bigT -= dt; this.bigText.setScale(this.bigT > 1.45 ? 1.25 : 1).setVisible(Math.floor(this.bigT * 8) % 4 !== 0 || this.bigT > 0.6); if (this.bigT <= 0) this.bigText.setVisible(false); }
    // level-up edge flash (stepped)
    if (this.edgeFlash > 0) {
      this.edgeFlash -= dt; const k = Math.ceil(this.edgeFlash / 0.125);
      for (let i = 0; i < k; i++) { const a = 0.5 - i * 0.1; this.gTop.fillStyle(0xFFE14D, a); const d = i * 3; this.gTop.fillRect(d, d, v.UW - d * 2, 3); this.gTop.fillRect(d, v.UH - d - 3, v.UW - d * 2, 3); this.gTop.fillRect(d, d, 3, v.UH - d * 2); this.gTop.fillRect(v.UW - d - 3, d, 3, v.UH - d * 2); }
    }
    // potion slot count, charm timers, dialogue typewriter
    { const tot = GOODS.reduce((a, gd) => a + ((S.bagc || {})[gd.k] || 0), 0); const ts = '' + tot; if (this.itemText.text !== ts) this.itemText.setText(ts); drawSlot(g, this.itemBtn.x, this.itemBtn.y, this.itemBtn.s, 0xE0302A); }
    { const act = ['atk', 'arm', 'spd'].filter((k) => p.buffs && p.buffs[k] > 0), off = showBoss && v.portrait ? 22 : 0;
      for (let i = 0; i < 3; i++) {
        const t = this.buffTexts[i], im = this.buffImgs[i], k = act[i];
        if (!k) { if (t.text) t.setText(''); im.setVisible(false); continue; }
        const gd = goodOf('ch_' + k), left = p.buffs[k];
        if (im.texture.key !== 'good_' + gd.icon) im.setTexture('good_' + gd.icon).setDisplaySize(11, 11);
        im.setVisible(left > 5 || Math.floor(time / 200) % 2 === 0).setY(70 + i * 14 + off); t.setY(70 + i * 14 + off);
        const s2 = Math.ceil(left) + 's'; if (t.text !== s2) t.setText(s2).setColor(gd.col);
      } }
    if (this.panel && this.panel.k === 'talk' && this.talkText) {
      const P = this.panel;
      if (P.shown < P.wrapLen) { P.shown = Math.min(P.wrapLen, P.shown + dt * 95); _setText.call(this.talkText, P.wrapped.slice(0, Math.floor(P.shown))); }
      if (this.talkMore) this.talkMore.setAlpha(P.shown >= P.wrapLen ? (Math.floor(time / 350) % 2 ? 1 : 0.4) : 0);
    }
    // garden panel countdown live
    if (this.panel && this.panel.k === 'garden') { this.gardenTick = (this.gardenTick || 0) + dt; if (this.gardenTick > 1) { this.gardenTick = 0; this.renderPanel(); } }
    // panel snap scale (2 steps)
    if (this.panel && this.panel.box) {
      const s = this.panel.t < 0.06 ? 0.9 : 1; const bx2 = this.panel.box;
      const ox = bx2.x + bx2.w / 2, oy = bx2.y + bx2.h / 2;
      for (const o of [this.pg, ...this.pTexts, ...this.pImgs]) { if (o.__bx === undefined) { o.__bx = o.x; o.__by = o.y; o.__sx = o.scaleX; o.__sy = o.scaleY; } }
      if (s !== this.panel.lastS) {
        this.panel.lastS = s;
        this.pg.setScale(s).setPosition(ox * (1 - s), oy * (1 - s));
        for (const o of [...this.pTexts, ...this.pImgs]) if (!o.__noSnap) o.setPosition(ox + (o.__bx - ox) * s, oy + (o.__by - oy) * s).setScale(o.__sx * s, o.__sy * s);
      }
    } else { this.pg.setScale(1).setPosition(0, 0); }
  }
}
function inBox(x, y, b) { return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; }
function fmtTime(s) { const m = Math.floor(s / 60), r = s % 60; return m ? m + 'm ' + (r < 10 ? '0' : '') + r + 's' : r + 's'; }

/* ================================================================ world check hook */
window.mindblownWorld = () => {
  const src = W && W.segs ? W : (() => { const L_ = genLayout('field'); return { segs: L_.segs, plats: L_.plats, garden: { x: 300 }, portals: [{ x: LW - 56 }], p: { x: 200, y: GY } }; })();
  const base = GY + 110; // world bottom; y up from there
  const solids = src.segs.map((s, i) => ({ id: 'ground' + i, kind: 'ground', x: s.x0, y: 0, w: s.x1 - s.x0, h: base - GY }));
  src.plats.forEach((p, i) => solids.push({ id: 'ledge' + i, kind: 'platform', x: p.x0, y: base - p.y - 8, w: p.x1 - p.x0, h: 8 }));
  if (src.garden) solids.push({ id: 'garden', kind: 'prop', x: src.garden.x - 10, y: base - GY, w: 20, h: 24 });
  src.portals.forEach((p, i) => solids.push({ id: 'portal' + i, kind: 'prop', x: p.x - 30, y: base - GY, w: 60, h: 40 }));
  const g = tv('gravity'), j = tv('jump_power');
  const single = (j * j) / (2 * g), dbl = single + ((j * 0.92) * (j * 0.92)) / (2 * g);
  return { solids, body: { x: src.p.x - 7, y: base - src.p.y, w: 14, h: 40, jump_height: Math.round(dbl), jump_length: Math.round(tv('walk_speed') * (2 * j / g) * 1.6) } };
};
window.__ki = () => ({ W, HUD, S, game });

/* ================================================================ start */
async function boot() {
  const m = MB();
  const fromFile = () => fetch('tune.json').then((r) => r.json()).then((f) => Object.fromEntries(Object.entries(f).map(([k, e]) => [k, e.value]))).catch(() => ({}));
  try { T = await (m && m.tune ? m.tune() : fromFile()); } catch (e) { T = {}; }
  if (m && m.tune && m.tune.on) m.tune.on((next) => { T = next || T; });
  sdk((mb) => mb.measure && mb.measure([
    { name: 'race_chosen', kind: 'step', label: 'Picked a race' },
    { name: 'level_up', kind: 'value', label: 'Level reached' },
    { name: 'bean_eaten', kind: 'count', label: 'Magic beans eaten' },
    { name: 'area_entered', kind: 'step', label: 'Entered an area' },
    { name: 'knocked_out', kind: 'count', label: 'Knock-outs' },
    { name: 'quest_step', kind: 'step', label: 'Quest steps done' },
  ]));
  try { await Promise.all([document.fonts.load('10px PixelifySans'), document.fonts.load('10px VT323')]); } catch (e) {}
  const saved = await loadProgress();
  if (saved && saved.race && RACES[saved.race] && saved.schemaVersion === 1) {
    S = Object.assign(freshSave(saved.race), saved);
    S.garden = Object.assign({ planted: null, lvl: 1 }, saved.garden || {});
    S.plant = Object.assign({ planted: null, lvl: 1 }, saved.plant || {});
    S.chest = Array.isArray(saved.chest) ? saved.chest : [];
    S.codes = saved.codes || {};
    S.bagc = S.bagc || {}; S.talked = S.talked || {};
    S.mat = Object.assign({ ore: 0, shard: 0 }, S.mat || {});
    S.daily = Object.assign({ last: null, day: 0 }, S.daily || {});
    S.gems = S.gems || 0; S.tickets = S.tickets || 0; S.summon = S.summon || 0;
    S.str = S.str || 0; S.vip = S.vip || 0; S.pendingWish = !!S.pendingWish;
    S.balls = (saved.balls && typeof saved.balls === 'object') ? saved.balls : {};
    S.rchests = Array.isArray(saved.rchests) ? saved.rchests : [];
    S.quest = Object.assign({ step: 0, kills: 0, drops: 0, done: false }, S.quest || {});
  }
  if (m && m.sound) soundOn = !!m.sound.on;
  game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', backgroundColor: '#0B0F1E', pixelArt: true, roundPixels: true,
    scale: { mode: Phaser.Scale.NONE, width: Math.round(innerWidth * DPR), height: Math.round(innerHeight * DPR), zoom: 1 / DPR },
    input: { activePointers: 4 },
    audio: { disableWebAudio: false },
    scene: [Boot, Select, Bg, World, Hud],
  });
  const resize = () => { game.scale.resize(Math.round(innerWidth * DPR), Math.round(innerHeight * DPR)); game.scale.setZoom(1 / DPR); };
  addEventListener('resize', resize);
  addEventListener('orientationchange', () => setTimeout(resize, 200));
  document.addEventListener('visibilitychange', () => { if (document.hidden && S) saveProgress(); });
  game.sound.once('unlocked', () => { if (W && W.biome) setMusic(W.biome); });
  addEventListener('pagehide', () => { if (W && W.p && !W.p.dead && W.runT) { sdk((mb) => mb.run && mb.run.end({ seconds: Math.round((performance.now() - W.runT) / 1000), level: S.lv, kills: W.runKills })); W.runT = 0; } });
  if (m && m.viewer && m.viewer.onchange) m.viewer.onchange(() => { if (W && W.p && W.p.tag) W.p.tag.setText(playerName()); });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
