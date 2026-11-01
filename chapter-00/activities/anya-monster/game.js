// 安妮亞打怪獸 — 遊戲邏輯
'use strict';

const H = 540, STEP = 1 / 60, GRAV = 1800;
const $ = (id) => document.getElementById(id);
const cv = $('c'), ctx = cv.getContext('2d');
let W = 960, SCALE = 1, DPR = 1;
const SAFE = { t: 0, r: 0, b: 0, l: 0 };
// 手機（短邊小於 600px 的觸控裝置）：畫面拉近一點、按鈕和選單縮小。網址加 ?phone=1 可強制測試
const PHONE = /phone=1/.test(location.search)
  || ((navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches) && Math.min(screen.width, screen.height) < 600);
document.documentElement.classList.toggle('phone', PHONE);
const VIEW_H = PHONE ? 430 : H;     // 畫面顯示的世界高度（手機切掉最上面的天空和最下面一點地面，角色變大）
const VIEW_TOP = PHONE ? 100 : 0;
const HUD_S = PHONE ? 1.2 : 1;      // 手機上的分數、愛心放大一點
// 進入遊戲時自動全螢幕，把瀏覽器上下的網址列與工具列收起來（iPad、Android 支援；iPhone 請用「加入主畫面」）
const STANDALONE = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
function goFullscreen() {
  if (STANDALONE || document.fullscreenElement || document.webkitFullscreenElement) return;
  const el = document.documentElement;
  const fn = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!fn) return;
  try { const r = fn.call(el, { navigationUI: 'hide' }); if (r && r.catch) r.catch(() => {}); } catch (e) { /* 不支援就算了 */ }
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sign = (v) => (v < 0 ? -1 : 1);
const rand = (a, b) => a + Math.random() * (b - a);
const approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
const boxOf = (e) => ({ l: e.x - e.w / 2, r: e.x + e.w / 2, t: e.y - e.h, b: e.y });
const ov = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- 存檔 ----------
const SAVE_KEY = 'anyaMonster.v1';
const save = { unlocked: 1, stars: [0, 0, 0, 0], best: 0, diff: 1, muted: false };
try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY)) || {}); } catch (e) { /* 無痕模式等情況就不存 */ }
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } }

// ---------- 音效與音樂（WebAudio 合成，不用音檔） ----------
const AU = { ctx: null, master: null, music: null, noiseBuf: null, song: null, step: 0, nextT: 0, paused: false };
function audioInit() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  AU.ctx = new AC();
  AU.master = AU.ctx.createGain(); AU.master.gain.value = save.muted ? 0 : 0.6; AU.master.connect(AU.ctx.destination);
  AU.music = AU.ctx.createGain(); AU.music.gain.value = 0.2; AU.music.connect(AU.master);
  const len = AU.ctx.sampleRate * 0.6;
  AU.noiseBuf = AU.ctx.createBuffer(1, len, AU.ctx.sampleRate);
  const d = AU.noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  if (AU.pendingSong != null) playSong(AU.pendingSong);
}
function tone(f, dur, type = 'square', vol = 0.2, slide = null, delay = 0, dest = null) {
  if (!AU.ctx || !f) return;
  const t0 = AU.ctx.currentTime + delay;
  const o = AU.ctx.createOscillator(), g = AU.ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g); g.connect(dest || AU.master); o.start(t0); o.stop(t0 + dur + 0.02);
}
function noise(dur, vol = 0.3, freq = 1000, delay = 0) {
  if (!AU.ctx) return;
  const t0 = AU.ctx.currentTime + delay;
  const s = AU.ctx.createBufferSource(); s.buffer = AU.noiseBuf;
  const f = AU.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const g = AU.ctx.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(AU.master); s.start(t0); s.stop(t0 + dur + 0.02);
}
const SFX = {
  swing: () => noise(0.07, 0.15, 2500),
  hit: () => { noise(0.12, 0.4, 900); tone(160, 0.1, 'square', 0.12, 70); },
  big: () => { noise(0.2, 0.5, 700); tone(110, 0.2, 'sawtooth', 0.18, 45); },
  jump: () => tone(420, 0.14, 'square', 0.1, 820),
  jump2: () => tone(620, 0.12, 'square', 0.08, 1300),
  coin: () => { tone(988, 0.05, 'square', 0.07); tone(1319, 0.1, 'square', 0.07, null, 0.05); },
  throw: () => tone(760, 0.1, 'triangle', 0.14, 320),
  hurt: () => tone(320, 0.3, 'sawtooth', 0.18, 90),
  boom: () => { noise(0.5, 0.55, 420); tone(90, 0.4, 'sine', 0.35, 32); },
  heart: () => [660, 880, 1100].forEach((f, i) => tone(f, 0.12, 'triangle', 0.15, null, i * 0.07)),
  star: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.1, 'square', 0.08, null, i * 0.05)),
  super: () => { [400, 600, 800, 1000].forEach((f, i) => tone(f, 0.35, 'triangle', 0.14, f * 2, i * 0.06)); noise(0.6, 0.2, 3000); },
  partner: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.14, 'triangle', 0.13, null, i * 0.08)),
  boss: () => [196, 185, 175, 165].forEach((f, i) => tone(f, 0.28, 'sawtooth', 0.14, null, i * 0.25)),
  win: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, i === 6 ? 0.6 : 0.16, 'square', 0.1, null, i * 0.13)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'triangle', 0.16, null, i * 0.22)),
  break: () => { noise(0.18, 0.4, 1500); tone(240, 0.12, 'square', 0.1, 120); },
  warn: () => tone(880, 0.08, 'square', 0.06),
};
function nf(n) {
  const m = /^([A-G])(#?)(\d)$/.exec(n);
  if (!m) return 0;
  const midi = (+m[3] + 1) * 12 + { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0);
  return 440 * Math.pow(2, (midi - 69) / 12);
}
const song = (bpm, wave, mel, bass) => ({ bpm, wave, mel: mel.trim().split(/\s+/).map(nf), bass: bass.trim().split(/\s+/).map(nf) });
const SONGS = [
  song(128, 'square', 'E5 - G5 E5 C5 - D5 E5 F5 - A5 F5 D5 - E5 F5 G5 - C6 B5 A5 G5 F5 E5 D5 E5 F5 D5 C5 - - -',
    'C3 G3 C3 G3 C3 G3 C3 G3 F2 C3 F2 C3 F2 C3 F2 C3 E2 B2 E2 B2 A2 E3 A2 E3 D3 A2 G2 D3 C3 G2 C3 -'),
  song(136, 'square', 'C5 F5 A5 F5 G5 - E5 C5 D5 G5 A#5 G5 A5 - F5 - C5 F5 A5 C6 A#5 A5 G5 F5 E5 G5 F5 E5 F5 - - -',
    'F2 C3 F2 C3 C3 G2 C3 G2 G2 D3 C3 G2 F2 C3 F2 C3 F2 C3 A2 C3 A#2 F3 C3 G2 C3 G2 C3 E3 F2 C3 F2 -'),
  song(118, 'triangle', 'D5 - F5 A5 G5 F5 E5 - C5 - E5 G5 F5 E5 D5 - A#4 - D5 F5 E5 D5 C#5 - D5 E5 F5 E5 D5 - - -',
    'D3 A2 D3 A2 D3 A2 D3 A2 C3 G2 C3 G2 C3 G2 C3 G2 A#2 F2 A#2 F2 A2 E2 A2 E2 D3 A2 D3 A2 D3 - - -'),
  song(132, 'square', 'A4 C5 E5 A5 G5 E5 C5 E5 F5 E5 D5 C5 B4 C5 D5 - A4 C5 E5 A5 B5 A5 G5 E5 F5 G5 A5 G5 E5 - - -',
    'A2 E3 A2 E3 A2 E3 A2 E3 F2 C3 F2 C3 G2 D3 G2 D3 A2 E3 A2 E3 G2 D3 G2 D3 F2 C3 E2 B2 A2 E3 A2 -'),
  song(156, 'sawtooth', 'E5 E5 G5 E5 A5 G5 F#5 D5 E5 E5 G5 B5 A5 G5 F#5 - E5 E5 G5 E5 C6 B5 A5 G5 F#5 G5 A5 F#5 E5 - E4 -',
    'E2 E3 E2 E3 E2 E3 E2 E3 C2 C3 C2 C3 D2 D3 D2 D3 E2 E3 E2 E3 C2 C3 C2 C3 B1 B2 B1 B2 E2 E3 E2 E3'),
];
function playSong(i) {
  AU.pendingSong = i;
  if (!AU.ctx) return;
  AU.song = SONGS[i]; AU.step = 0; AU.nextT = AU.ctx.currentTime + 0.1;
}
function stopSong() { AU.song = null; AU.pendingSong = null; }
setInterval(() => {
  if (!AU.ctx || !AU.song || AU.paused) return;
  const s = AU.song, dt = 60 / s.bpm / 2;
  if (AU.nextT < AU.ctx.currentTime) AU.nextT = AU.ctx.currentTime + 0.05;
  while (AU.nextT < AU.ctx.currentTime + 0.3) {
    const d = AU.nextT - AU.ctx.currentTime;
    tone(s.mel[AU.step % s.mel.length], dt * 0.85, s.wave, 0.32, null, d, AU.music);
    tone(s.bass[AU.step % s.bass.length], dt * 0.9, 'triangle', 0.55, null, d, AU.music);
    AU.step++; AU.nextT += dt;
  }
}, 80);
function setMuted(m) {
  save.muted = m; persist();
  $('btnMute').textContent = m ? '🔇' : '🔊';
  if (AU.master) AU.master.gain.value = m ? 0 : 0.6;
}

// ---------- 關卡設定 ----------
const LEVELS = [
  { name: '柏林特街頭', sub: '炸彈客凱斯的陰謀', theme: 'city', len: 4200, seed: 11, song: 0,
    pool: [['goon', 3], ['bombdog', 2], ['crow', 2], ['thrower', 1]], thrower: 'thrower1',
    partner: 'bond', boss: 'keith', bossName: '炸彈客 凱斯', bossHp: 40,
    waves: [['goon', 'goon', 'bombdog'], ['goon', 'thrower', 'bombdog', 'crow']] },
  { name: '伊甸學園', sub: '紅色馬戲團來襲', theme: 'school', len: 4600, seed: 23, song: 1,
    pool: [['redgoon', 3], ['thrower', 2], ['plane', 2]], thrower: 'thrower2',
    partner: 'loid', boss: 'circus', bossName: '紅色馬戲團首領', bossHp: 50,
    waves: [['redgoon', 'redgoon', 'plane'], ['redgoon', 'thrower', 'redgoon', 'plane']] },
  { name: '豪華郵輪', sub: '殺手集團的夜宴', theme: 'ship', len: 5000, seed: 37, song: 2,
    pool: [['assassin', 3], ['knifer', 2], ['gull', 2]], thrower: 'thrower1',
    partner: 'yor', boss: 'killer', bossName: '郵輪殺手首領', bossHp: 60,
    waves: [['assassin', 'knifer', 'gull'], ['assassin', 'assassin', 'knifer', 'gull']] },
  { name: '夜晚的柏林特', sub: '企鵝大魔王出現！', theme: 'night', len: 5200, seed: 53, song: 3,
    pool: [['goon', 2], ['redgoon', 2], ['assassin', 2], ['bombdog', 2], ['crow', 2], ['knifer', 1]], thrower: 'thrower2',
    partner: 'all', boss: 'penguin', bossName: '巨大企鵝大魔王', bossHp: 70,
    waves: [['goon', 'redgoon', 'bombdog', 'crow'], ['assassin', 'knifer', 'redgoon', 'bombdog', 'crow']] },
];
const EDEF = {
  goon: { w: 30, h: 60, hp: 3, speed: 72, kind: 'melee', style: 'goon' },
  redgoon: { w: 30, h: 60, hp: 3, speed: 80, kind: 'melee', style: 'redgoon' },
  assassin: { w: 30, h: 60, hp: 3, speed: 66, kind: 'dasher', style: 'assassin' },
  thrower: { w: 30, h: 60, hp: 2, speed: 60, kind: 'thrower' },
  knifer: { w: 30, h: 60, hp: 2, speed: 60, kind: 'knifer', style: 'knifer' },
  bombdog: { w: 40, h: 34, hp: 1, speed: 150, kind: 'bombdog' },
  // 飛行怪：放大、飛慢一點，比較好打
  crow: { w: 54, h: 36, hp: 1, speed: 70, kind: 'flyer' },
  plane: { w: 54, h: 34, hp: 1, speed: 75, kind: 'flyer' },
  gull: { w: 56, h: 36, hp: 1, speed: 72, kind: 'flyer' },
};
const FLY_SCALE = 1.5;                       // 飛行怪畫面放大倍數
const FLY_Y = () => 300 + Math.random() * 40;  // 飛行高度：跳起來就打得到
const FLY_LAND_TIME = 3;                     // 俯衝落地後停在地上的秒數
const PDEF = {
  bond: { speed: 310, range: 42, cd: 0.55, name: '彭德', hello: '汪！汪汪！', bye: '汪～（先走囉）' },
  loid: { speed: 270, range: 50, cd: 0.45, name: '爸爸', hello: '安妮亞，我來幫妳！', bye: '任務完成，我先走了。' },
  yor: { speed: 290, range: 58, cd: 0.4, name: '媽媽', hello: '安妮亞，媽媽來了！', bye: '要小心喔，安妮亞～' },
};

// ---------- 遊戲狀態 ----------
const G = {
  mode: 'title', lv: 0, t: 0, camX: 0, shake: 0, hitstop: 0, slowT: 0, flash: 0, flashColor: '#fff',
  score: 0, lock: null, boss: null, bossStarted: false, wave: null, waveDone: false, waveX: 0,
  winT: -1, deadT: -1, ring: null, banner: null, triggers: [], scoreAtBoss: 0, reachedBoss: false,
};
let P = null;
let enemies = [], eshots = [], shots = [], items = [], crates = [], platforms = [], parts = [], hazards = [], partners = [], bubbles = [], booms = [];
const L = () => LEVELS[G.lv];

// ---------- 輸入 ----------
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', KeyW: 'jump', Space: 'jump',
  KeyZ: 'punch', KeyJ: 'punch', KeyX: 'throw', KeyK: 'throw', KeyC: 'super', KeyL: 'super',
};
const kbHeld = {}, touchHeld = {}, pressed = {};
const isHeld = (k) => !!(kbHeld[k] || touchHeld[k]);
addEventListener('keydown', (e) => {
  audioInit();
  const k = KEYMAP[e.code];
  if (k) { e.preventDefault(); if (!kbHeld[k]) pressed[k] = true; kbHeld[k] = true; }
  if (e.code === 'KeyP' || e.code === 'Escape') { if (G.mode === 'play') pauseGame(); else if (G.mode === 'pause') resumeGame(); }
  if (e.code === 'Enter') {
    const vis = ['title', 'clear', 'over', 'ending', 'pause'].find((s) => !$(s).classList.contains('hidden'));
    const btn = vis && $(vis).querySelector('.big-btn');
    if (btn) btn.click();
  }
});
addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) kbHeld[k] = false; });
addEventListener('blur', () => { for (const k in kbHeld) kbHeld[k] = false; });

const ptrKey = new Map();
const pad = $('pad');
function keyAt(x, y) {
  const el = document.elementFromPoint(x, y);
  const b = el && el.closest && el.closest('#pad [data-k]');
  return b ? b.dataset.k : null;
}
function refreshTouch() {
  for (const k in touchHeld) touchHeld[k] = false;
  for (const k of ptrKey.values()) if (k) touchHeld[k] = true;
  pad.querySelectorAll('[data-k]').forEach((b) => b.classList.toggle('on', !!touchHeld[b.dataset.k]));
}
pad.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('[data-k]');
  if (!b) return;
  e.preventDefault(); audioInit();
  const k = b.dataset.k;
  ptrKey.set(e.pointerId, k); pressed[k] = true;
  try { b.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  refreshTouch();
});
pad.addEventListener('pointermove', (e) => {
  if (!ptrKey.has(e.pointerId)) return;
  const old = ptrKey.get(e.pointerId);
  if (old !== 'left' && old !== 'right') return;   // 只有左右鍵可以滑動切換
  const k = keyAt(e.clientX, e.clientY);
  if ((k === 'left' || k === 'right') && k !== old) { ptrKey.set(e.pointerId, k); refreshTouch(); }
});
const ptrUp = (e) => { if (ptrKey.delete(e.pointerId)) refreshTouch(); };
['pointerup', 'pointercancel', 'lostpointercapture'].forEach((n) => pad.addEventListener(n, ptrUp));

// 防止 iPad 縮放、長按選單、橡皮筋捲動
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => { if (!e.target.closest('.scroll')) e.preventDefault(); }, { passive: false });
document.addEventListener('dblclick', (e) => e.preventDefault());
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('pointerdown', audioInit, { capture: true });
document.addEventListener('touchend', audioInit, { capture: true });

// ---------- 畫面大小 ----------
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  const vw = innerWidth, vh = innerHeight;
  if (!vw || !vh) return;   // 視窗暫時是 0 大小時（例如被隱藏）先不算，避免座標變成 NaN
  cv.width = Math.round(vw * DPR); cv.height = Math.round(vh * DPR);
  SCALE = vh / VIEW_H; W = vw / SCALE;
  const cs = getComputedStyle($('safe'));
  SAFE.t = (parseFloat(cs.paddingTop) || 0) / SCALE; SAFE.r = (parseFloat(cs.paddingRight) || 0) / SCALE;
  SAFE.b = (parseFloat(cs.paddingBottom) || 0) / SCALE; SAFE.l = (parseFloat(cs.paddingLeft) || 0) / SCALE;
  const portrait = vw < vh;
  $('rotate').classList.toggle('hidden', !portrait);
  if (portrait && G.mode === 'play') pauseGame();
}
addEventListener('resize', resize);
document.addEventListener('fullscreenchange', resize);
document.addEventListener('webkitfullscreenchange', resize);
addEventListener('orientationchange', () => setTimeout(resize, 200));
document.addEventListener('visibilitychange', () => { if (document.hidden && G.mode === 'play') pauseGame(); });

// ---------- 實體建立 ----------
function makeEnemy(type, x, y) {
  const d = EDEF[type];
  const hp = d.hp;
  return {
    type, x, y, vx: 0, vy: 0, w: d.w, h: d.h, hp, maxHp: hp, face: -1, t: Math.random() * 5,
    state: 'walk', st: 0, stun: 0, flash: 0, active: false, dead: false, baseY: y,
    fly: d.kind === 'flyer', kind: d.kind, style: d.style || (type === 'thrower' ? L().thrower : null),
    cd: 0.8 + Math.random() * 1.2, speed: d.speed * (save.diff === 0 ? 0.85 : 1), entered: true,
  };
}
function makePlayer(x, maxHp) {
  return {
    x, y: GY, vx: 0, vy: 0, w: 28, h: 62, face: 1, onGround: true, jumps: 0, coyote: 0,
    hp: maxHp, maxHp, inv: 0, hurtT: 0, punchT: 0, punchDur: 0.22, punchStep: 0, comboT: 0, hitSet: null,
    throwT: 0, peanuts: 12, meter: 0, starT: 0, superT: 0, anim: 0, dead: false, flash: 0,
  };
}
const item = (kind, x, y, vy = null) => ({ kind, x, y, vy, fall: vy !== null, vx: 0 });
function peanutRow(x, y, n) { for (let i = 0; i < n; i++) items.push(item('peanut', x + i * 34, y)); }

function genLevel() {
  const lv = L(), rng = mulberry32(lv.seed);
  enemies = []; eshots = []; shots = []; items = []; crates = []; platforms = []; parts = []; hazards = []; partners = []; bubbles = []; booms = [];
  const tot = lv.pool.reduce((s, p) => s + p[1], 0);
  const pick = () => { let r = rng() * tot; for (const [t, w] of lv.pool) { if ((r -= w) < 0) return t; } return lv.pool[0][0]; };
  const waveX = Math.round(lv.len * 0.5);
  const boost = G.lv * 0.45;
  let x = 700;
  while (x < lv.len - 320) {
    if (x > waveX - 320 && x < waveX + 320) { x = waveX + 400; continue; }
    const r = rng();
    if (r < 0.5) {
      const n = 1 + Math.floor(rng() * (1.6 + boost));
      for (let i = 0; i < n; i++) {
        const t = pick();
        enemies.push(makeEnemy(t, x + i * 80, EDEF[t].kind === 'flyer' ? 300 + rng() * 40 : GY));
      }
      peanutRow(x - 70, GY - 30, 2);
    } else if (r < 0.76) {
      const w = 150 + rng() * 110, y = GY - 112 - rng() * 50;
      platforms.push({ x, y, w });
      peanutRow(x + 22, y - 26, Math.floor(w / 40));
      if (rng() < 0.4) {
        const y2 = y - 100;
        platforms.push({ x: x + w * 0.45, y: y2, w: 120 });
        items.push(item(rng() < 0.6 ? 'bag' : 'star', x + w * 0.45 + 60, y2 - 6));
      }
    } else if (r < 0.9) {
      crates.push({ x, y: GY, w: 44, h: 44, hp: 2, flash: 0 });
      peanutRow(x + 50, GY - 30, 3);
    } else {
      for (let i = 0; i < 6; i++) items.push(item('peanut', x + i * 36, GY - 30 - Math.sin((i / 5) * Math.PI) * 120));
    }
    x += 300 + rng() * 170;
  }
  for (const f of [0.34, 0.75]) items.push(item('heart', lv.len * f, GY - 36));
  G.waveX = waveX;
  const fam = ['bond', 'loid', 'yor'];
  const first = lv.partner === 'all' ? fam[Math.floor(rng() * 3)] : lv.partner;
  const others = fam.filter((k) => k !== first);
  const second = others[Math.floor(rng() * 2)];
  G.partnerOrder = [first, second, others.find((k) => k !== second)];
  G.triggers = [
    { x: lv.len * 0.22, fn: () => callPartner(G.partnerOrder[0], 16) },
    { x: lv.len * 0.66, fn: () => callPartner(G.partnerOrder[1], 15) },
  ];
}

// ---------- 特效 ----------
function spark(x, y, big) {
  const n = big ? 12 : 7;
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), s = rand(120, big ? 420 : 300);
    parts.push({ kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.3, max: 0.3, color: i % 2 ? '#fff6a8' : '#ffffff' });
  }
  parts.push({ kind: 'burst', x, y, life: 0.16, max: 0.16, size: big ? 34 : 24 });
  if (big || Math.random() < 0.45) {
    const words = ['碰！', 'POW!', 'BAM!', '咚！', '啪！'];
    parts.push({ kind: 'text', x: x + rand(-10, 10), y: y - 20, vy: -60, life: 0.6, max: 0.6, text: words[Math.floor(Math.random() * words.length)], color: big ? '#ff5d7a' : '#ffd84a', size: big ? 30 : 22 });
  }
}
function poof(x, y, n = 10, color = '#ffffff') {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), s = rand(30, 140);
    parts.push({ kind: 'smoke', x: x + rand(-10, 10), y: y + rand(-10, 10), vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, life: rand(0.4, 0.7), max: 0.7, size: rand(8, 16), color });
  }
}
function popText(x, y, text, color = '#fff', size = 20) { parts.push({ kind: 'text', x, y, vy: -50, life: 0.9, max: 0.9, text, color, size }); }
function dust(x, y) { for (let i = 0; i < 5; i++) parts.push({ kind: 'smoke', x: x + rand(-12, 12), y: y - 3, vx: rand(-60, 60), vy: rand(-40, -10), life: 0.35, max: 0.35, size: rand(4, 8), color: '#f3eadb' }); }
function bubble(ent, text, dur = 2.2, delay = 0) {
  bubbles = bubbles.filter((b) => b.ent !== ent);
  bubbles.push({ ent, text, t: -delay, dur });
}
function banner(title, sub = '', dur = 2.2) { G.banner = { title, sub, t: 0, dur }; }

// ---------- 傷害處理 ----------
function hurtPlayer(fromX, dmg = 1) {
  if (P.dead || P.inv > 0 || G.winT >= 0) return;
  if (P.starT > 0) return;
  P.hp -= dmg; P.inv = 1.3; P.hurtT = 0.35; P.flash = 0.3;
  const d = sign(P.x - fromX);
  P.vx = d * 260; P.vy = -330; P.onGround = false; P.punchT = 0;
  G.shake = Math.max(G.shake, 7); SFX.hurt();
  spark(P.x, P.y - 35, false);
  if (P.hp <= 0) {
    P.hp = 0; P.dead = true; P.vy = -520; G.deadT = 0; stopSong(); SFX.lose();
    bubble(P, '嗚嗚…');
  } else if (P.hp === 1) bubble(P, '危險…要撐住！', 1.6);
  else if (Math.random() < 0.3) bubble(P, '好痛！', 1);
}
function hitEnemy(e, dmg, kx, big = false) {
  if (e.dead) return;
  e.hp -= dmg; e.flash = 0.15; e.stun = big ? 0.6 : 0.35;
  e.vx = kx; e.vy = e.fly ? -60 : (big ? -320 : -150);
  if (e.state === 'fuse') e.state = 'walk';
  spark(e.x, e.y - e.h / 2, big);
  big ? SFX.big() : SFX.hit();
  G.hitstop = Math.max(G.hitstop, big ? 0.07 : 0.035);
  if (P) P.meter = Math.min(100, P.meter + 6);
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  e.dead = true;
  G.score += 100;
  popText(e.x, e.y - e.h - 10, '+100', '#fff', 18);
  poof(e.x, e.y - e.h / 2, 12);
  for (let i = 0; i < 4; i++) parts.push({ kind: 'star', x: e.x, y: e.y - e.h / 2, vx: rand(-160, 160), vy: rand(-260, -80), life: 0.7, max: 0.7, size: 7 });
  if (e.type === 'bombdog') explode(e.x, e.y - 15, 72, 'friendly');
  const r = Math.random();
  if (r < 0.06) items.push(item('heart', e.x, e.y - 30, -300));
  else if (r < 0.3) items.push(item('peanut', e.x, e.y - 30, -300));
}
function hitBoss(dmg, kx, src = 'anya') {
  const b = G.boss;
  if (!b || b.dead || b.state === 'intro' || b.invis) return;
  let m = b.state === 'dizzy' ? 1.5 : 1;
  if (src === 'partner') m *= 0.5;
  b.hp -= dmg * m; b.flash = 0.15;
  spark(b.x + rand(-15, 15), b.y - b.h * 0.6, dmg >= 2);
  SFX.hit();
  if (src !== 'partner') { G.hitstop = Math.max(G.hitstop, 0.04); if (P) P.meter = Math.min(100, P.meter + 4); }
  if (b.hp <= 0) bossDefeated();
}
function hitCrate(c, dmg) {
  c.hp -= dmg; c.flash = 0.15; SFX.break();
  if (c.hp <= 0) {
    c.dead = true; poof(c.x, c.y - 22, 10, '#e9d3a9');
    for (let i = 0; i < 6; i++) parts.push({ kind: 'chip', x: c.x, y: c.y - 22, vx: rand(-200, 200), vy: rand(-380, -120), life: 0.8, max: 0.8, size: 6 });
    const r = Math.random();
    const k = r < 0.45 ? 'bag' : r < 0.7 ? 'heart' : r < 0.85 ? 'star' : 'peanut';
    items.push(item(k, c.x, c.y - 30, -380));
    if (k === 'peanut') { items.push(item('peanut', c.x - 20, c.y - 30, -330)); items.push(item('peanut', c.x + 20, c.y - 30, -330)); }
    G.score += 50;
  }
}
// mode：'enemy' 只傷安妮亞、'all' 都傷、'friendly' 只傷壞人
function explode(x, y, r, mode) {
  booms.push({ x, y, r, t: 0 });
  SFX.boom(); G.shake = Math.max(G.shake, 9);
  poof(x, y, 14, '#d9d2c8');
  if (mode !== 'friendly' && P && !P.dead) {
    const dx = P.x - x, dy = (P.y - 30) - y;
    if (dx * dx + dy * dy < (r + 16) * (r + 16)) hurtPlayer(x);
  }
  if (mode !== 'enemy') {
    for (const e of enemies) {
      if (e.dead || !e.active) continue;
      const dx = e.x - x, dy = (e.y - e.h / 2) - y;
      if (dx * dx + dy * dy < (r + e.w / 2) * (r + e.w / 2)) hitEnemy(e, 3, sign(dx) * 320, true);
    }
    if (mode === 'friendly' && G.boss && !G.boss.dead) {
      const b = G.boss;
      if (Math.abs(b.x - x) < r + b.w / 2 && y > b.y - b.h - r) hitBoss(3, 0);
    }
  }
}

// 安妮亞與夥伴的近身攻擊判定
function meleeHit(box, dmg, kx, set, big, src = 'anya') {
  let hit = false;
  for (const e of enemies) {
    if (e.dead || !e.active || set.has(e)) continue;
    if (ov(box, boxOf(e))) { set.add(e); hitEnemy(e, dmg, kx, big); hit = true; }
  }
  const b = G.boss;
  if (b && !b.dead && !set.has(b) && ov(box, boxOf(b))) { set.add(b); hitBoss(dmg, kx, src); hit = true; }
  if (src === 'anya') {
    for (const c of crates) {
      if (c.dead || set.has(c)) continue;
      if (ov(box, boxOf(c))) { set.add(c); hitCrate(c, 1); hit = true; }
    }
    // 把飛過來的東西打回去
    for (const s of eshots) {
      if (s.dead || !s.deflect) continue;
      if (s.x > box.l - s.r && s.x < box.r + s.r && s.y > box.t - s.r && s.y < box.b + s.r) {
        s.dead = true;
        shots.push({ kind: s.kind, x: s.x, y: s.y, vx: sign(kx) * 620, vy: -40, g: 0, dmg: 2, life: 1.5, rot: 0, r: s.r });
        popText(s.x, s.y - 20, '打回去！', '#7ff0ff', 18);
        SFX.big(); hit = true;
      }
    }
  }
  return hit;
}

// ---------- 夥伴 ----------
function callPartner(kind, dur) {
  const cur = partners.find((p) => p.kind === kind && p.state !== 'leave');
  if (cur) { cur.dur = Math.max(cur.dur, dur); return; }
  const fromRight = G.lock && P.x < (G.lock.l + G.lock.r) / 2;
  const pt = {
    kind, x: fromRight ? G.camX + W + 40 : G.camX - 40, y: GY - 160, vx: 0, vy: -250, face: fromRight ? -1 : 1,
    w: kind === 'bond' ? 60 : 30, h: kind === 'bond' ? 50 : 86, t: 0, dur, state: 'enter', cd: 0.4, act: null, actT: 0, actDur: 0,
    combo: 0, hitSet: new Set(), onGround: false, enterDir: fromRight ? -1 : 1,
  };
  partners.push(pt);
  bubble(pt, PDEF[kind].hello, 2.4);
  SFX.partner();
  popText(G.camX + W / 2, 150, `${PDEF[kind].name}來幫忙了！`, '#fff', 28);
}
function nearestTarget(pt) {
  let best = null, bd = 1e9;
  for (const e of enemies) {
    if (e.dead || !e.active) continue;
    if (e.x < G.camX - 20 || e.x > G.camX + W + 20) continue;
    const d = Math.abs(e.x - pt.x) + (e.fly ? 60 : 0);
    if (d < bd) { bd = d; best = e; }
  }
  const b = G.boss;
  if (b && !b.dead && !b.invis && b.state !== 'intro') {
    const d = Math.abs(b.x - pt.x) + 40;
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}
function updatePartner(pt, dt) {
  const def = PDEF[pt.kind];
  pt.t += dt; pt.dur -= dt;
  pt.vy += GRAV * dt;
  pt.x += pt.vx * dt; pt.y += pt.vy * dt;
  if (pt.y >= GY) { if (!pt.onGround) dust(pt.x, GY); pt.y = GY; pt.vy = 0; pt.onGround = true; } else pt.onGround = false;
  if (pt.state === 'enter') {
    pt.vx = pt.enterDir * 300; pt.face = pt.enterDir;
    const inside = pt.enterDir > 0 ? pt.x > G.camX + 70 : pt.x < G.camX + W - 70;
    if (pt.onGround && inside) pt.state = 'fight';
    return;
  }
  if (pt.state === 'leave') {
    pt.vx = -pt.enterDir * 340; pt.face = -pt.enterDir;
    if (pt.x < G.camX - 100 || pt.x > G.camX + W + 100) pt.gone = true;
    return;
  }
  if (pt.dur <= 0 || G.winT >= 0 && pt.dur < 0) {
    pt.state = 'leave'; pt.act = null; bubble(pt, def.bye, 2); pt.vy = -420; return;
  }
  if (pt.act) {
    pt.actT += dt;
    const el = pt.actT, a = pt.act;
    if (a === 'dash') {
      pt.vx = pt.face * 560;
      if (el < 0.3) meleeHit(boxOf(pt), 1, pt.face * 260, pt.hitSet, false, 'partner');
    } else {
      pt.vx = a === 'flykick' ? pt.face * 360 : 0;
      const reach = a === 'slash' || a === 'spin' ? 62 : 48;
      if (el > 0.06 && el < 0.2) {
        const bx = a === 'spin'
          ? { l: pt.x - reach, r: pt.x + reach, t: pt.y - 80, b: pt.y - 10 }
          : { l: pt.face > 0 ? pt.x : pt.x - reach, r: pt.face > 0 ? pt.x + reach : pt.x, t: pt.y - 76, b: pt.y - 10 };
        const dmg = pt.kind === 'yor' ? 2 : a === 'flykick' ? 2 : 1;
        meleeHit(bx, dmg, pt.face * (dmg > 1 ? 380 : 240), pt.hitSet, dmg > 1, 'partner');
      }
    }
    if (el >= pt.actDur) { pt.act = null; if (pt.kind === 'bond') pt.vx = 0; }
    return;
  }
  const tg = nearestTarget(pt);
  if (tg) {
    const dx = tg.x - pt.x;
    pt.face = sign(dx);
    const range = def.range + (tg.w || 30) / 2;
    if (Math.abs(dx) > range) pt.vx = pt.face * def.speed;
    else {
      pt.vx = 0; pt.cd -= dt;
      if (pt.cd <= 0) {
        pt.combo++; pt.hitSet = new Set(); pt.actT = 0; pt.cd = def.cd;
        if (pt.kind === 'bond') { pt.act = 'dash'; pt.actDur = 0.32; if (Math.random() < 0.4) bubble(pt, '汪！', 0.7); }
        else if (pt.kind === 'loid') {
          if (pt.combo % 3 === 0) { pt.act = 'flykick'; pt.actDur = 0.45; pt.vy = -420; }
          else { pt.act = pt.combo % 2 ? 'kick' : 'punch'; pt.actDur = 0.3; }
        } else {
          pt.act = pt.combo % 4 === 0 ? 'spin' : 'slash'; pt.actDur = 0.3;
          parts.push({ kind: 'slash', x: pt.x + pt.face * 30, y: pt.y - 48, face: pt.face, life: 0.22, max: 0.22, spin: pt.act === 'spin' });
        }
        SFX.swing();
      }
    }
    if (tg.y < GY - 90 && pt.onGround && Math.abs(dx) < 140) pt.vy = -720;
  } else {
    const tx = P.x - P.face * 70;
    const dx = tx - pt.x;
    if (Math.abs(dx) > 30) { pt.vx = sign(dx) * def.speed * 0.85; pt.face = sign(dx); } else { pt.vx = 0; pt.face = P.face; }
  }
}

// ---------- 魔王 ----------
const BOSS_SEQ = {
  keith: ['throw', 'dogs', 'throw', 'detonate', 'dashwind'],
  circus: ['shout', 'balls', 'summon', 'shout', 'jumpwind'],
  killer: ['knives', 'vanish', 'knives', 'summon', 'dashwind'],
  penguin: ['stomp', 'spit', 'summon', 'stomp', 'dashwind'],
};
const BOSS_LINES = {
  keith: ['哼，小鬼！看我的炸彈！', '可惡…我的計畫！'],
  circus: ['紅色馬戲團參上！', '這、這不可能…'],
  killer: ['嘿嘿，妳逃不掉的。', '竟然被小孩子…'],
  penguin: ['嘎嘎——！不准過去！', '嘎…嘎嘎…'] ,
};

function startBoss() {
  const lv = L();
  G.bossStarted = true; G.reachedBoss = true; G.scoreAtBoss = G.score;
  G.lock = { l: lv.len, r: lv.len + W };
  for (const e of enemies) if (!e.dead && e.active) { e.dead = true; poof(e.x, e.y - e.h / 2, 8); }
  const big = lv.boss === 'penguin';
  const hp = Math.round(lv.bossHp * (save.diff === 0 ? 0.7 : 1));
  G.boss = {
    kind: lv.boss, x: lv.len + W * 0.74, y: -80, vx: 0, vy: 0, w: big ? 120 : 48, h: big ? 160 : 108,
    hp, maxHp: hp, face: -1, state: 'intro', k: 0, t: 0, seqI: 0, flash: 0, onGround: false,
    invis: false, phase2: false, calledHelp: false, ev: {}, tx: 0,
  };
  banner(lv.bossName, '魔王出現！', 2.4);
  playSong(4); SFX.boss();
  setTimeout(() => { if (G.boss && G.mode === 'play') callPartner(G.partnerOrder[0], 22); }, 1200);
}
function setState(b, s) { b.state = s; b.k = 0; b.ev = {}; }
function once(b, name, cond) { if (cond && !b.ev[name]) { b.ev[name] = true; return true; } return false; }
function nextAction(b) { const seq = BOSS_SEQ[b.kind]; setState(b, seq[b.seqI++ % seq.length]); }
function bossThrow(b, kind, tx, T = 0.9, g = 900) {
  const sx = b.x + b.face * 30, sy = b.y - b.h * 0.75;
  const vx = (tx - sx) / T, vy = (GY - 12 - sy - 0.5 * g * T * T) / T;
  const s = { kind, x: sx, y: sy, vx, vy, g, r: kind === 'bomb' ? 10 : kind === 'snow' ? 13 : 9, deflect: true, fuse: -1, life: 6, t: 0, bounce: kind === 'ball' ? 2 : 0 };
  eshots.push(s); SFX.throw();
}
function spawnFromEdge(type, side) {
  const lk = G.lock;
  const x = side < 0 ? lk.l - 30 : lk.r + 30;
  const e = makeEnemy(type, x, EDEF[type].kind === 'flyer' ? FLY_Y() : GY);
  e.active = true; e.entered = false; e.face = -side;
  enemies.push(e);
  return e;
}
function warnAt(x, delay, fn, kind = 'circle', w = 60) { hazards.push({ x, w, t: 0, delay, fn, kind }); SFX.warn(); }

function updateBoss(b, dt) {
  b.t += dt; b.k += dt; if (b.flash > 0) b.flash -= dt;
  const lk = G.lock;
  if (!b.float) b.vy += GRAV * dt;
  b.x += b.vx * dt; b.y += b.vy * dt;
  let landed = false;
  if (b.y >= GY) { if (!b.onGround && b.vy > 300) landed = true; b.y = GY; b.vy = 0; b.onGround = true; } else b.onGround = false;
  const minX = lk.l + b.w / 2, maxX = lk.r - b.w / 2;
  let wall = false;
  if (b.x < minX) { b.x = minX; wall = b.vx < 0; } else if (b.x > maxX) { b.x = maxX; wall = b.vx > 0; }
  if (!b.phase2 && b.hp < b.maxHp * 0.5) { b.phase2 = true; bubble(b, '可惡…我要認真了！', 1.8); }
  if (!b.calledHelp && b.hp < b.maxHp * 0.45) { b.calledHelp = true; callPartner(G.partnerOrder[1], 15); }
  const dx = P.x - b.x, adx = Math.abs(dx);
  const fast = b.phase2 ? 1.25 : 1;
  switch (b.state) {
    case 'intro':
      b.vx = 0;
      if (landed) { G.shake = 10; dust(b.x, GY); SFX.boom(); }
      if (b.onGround && b.k > 1.0) { bubble(b, BOSS_LINES[b.kind][0], 2); setState(b, 'idle'); }
      break;
    case 'idle':
      b.face = sign(dx);
      b.vx = adx > 280 ? b.face * 80 : adx < 140 ? -b.face * 70 : 0;
      if (b.k > (b.phase2 ? 0.45 : 0.85)) { b.vx = 0; nextAction(b); }
      break;
    case 'dizzy':
      b.vx = 0;
      if (b.k > 2.2) setState(b, 'idle');
      break;
    // --- 凱斯 ---
    case 'throw': {
      b.vx = 0; b.face = sign(dx);
      const n = b.phase2 ? 5 : 3;
      for (let i = 0; i < n; i++) if (once(b, 't' + i, b.k > 0.4 + i * 0.2)) bossThrow(b, 'bomb', clamp(P.x + (i - (n - 1) / 2) * 75, lk.l + 20, lk.r - 20));
      if (b.k > 0.6 + n * 0.2 + 0.3) setState(b, 'idle');
      break;
    }
    case 'dogs':
      b.vx = 0;
      if (once(b, 'd', b.k > 0.35)) { bubble(b, '去吧，炸彈狗！', 1.2); spawnFromEdge('bombdog', -1); spawnFromEdge('bombdog', 1); if (b.phase2) spawnFromEdge('crow', 1); }
      if (b.k > 1.1) setState(b, 'idle');
      break;
    case 'detonate':
      b.vx = 0;
      if (once(b, 'w', b.k > 0.2)) {
        const xs = [P.x, P.x - 140, P.x + 140, lk.l + Math.random() * W];
        if (b.phase2) xs.push(P.x + 280, P.x - 280);
        xs.forEach((x, i) => { const cx = clamp(x, lk.l + 30, lk.r - 30); warnAt(cx, 0.95 + i * 0.06, () => explode(cx, GY - 22, 52, 'enemy')); });
      }
      if (b.k > 2.0) setState(b, 'idle');
      break;
    // --- 紅色馬戲團 ---
    case 'shout': {
      b.vx = 0; b.face = sign(dx);
      const n = b.phase2 ? 5 : 3;
      for (let i = 0; i < n; i++) if (once(b, 's' + i, b.k > 0.35 + i * 0.45 / fast)) {
        const low = i % 2 === 0;
        eshots.push({ kind: 'sound', x: b.x + b.face * 50, y: low ? GY - 22 : GY - 96, vx: b.face * 300 * fast, vy: 0, g: 0, r: 17, life: 4, t: 0 });
        tone(300, 0.15, 'sawtooth', 0.08, 600);
      }
      if (b.k > 0.5 + n * 0.45 / fast + 0.4) setState(b, 'idle');
      break;
    }
    case 'balls': {
      b.vx = 0; b.face = sign(dx);
      const n = b.phase2 ? 5 : 4;
      for (let i = 0; i < n; i++) if (once(b, 'b' + i, b.k > 0.35 + i * 0.22)) bossThrow(b, 'ball', clamp(P.x + rand(-120, 120), lk.l + 20, lk.r - 20), 0.8);
      if (b.k > 0.6 + n * 0.22 + 0.3) setState(b, 'idle');
      break;
    }
    case 'summon':
      b.vx = 0;
      if (once(b, 'm', b.k > 0.3)) {
        const t = { circus: ['redgoon', 'redgoon'], killer: ['assassin', 'knifer'], penguin: ['crow', 'bombdog'], keith: ['goon', 'goon'] }[b.kind];
        bubble(b, b.kind === 'penguin' ? '嘎嘎！' : '手下們，上！', 1.2);
        spawnFromEdge(t[0], -1); spawnFromEdge(t[1], 1);
        if (b.phase2 && b.kind === 'penguin') spawnFromEdge('crow', -1);
      }
      if (b.k > 1.1) setState(b, 'idle');
      break;
    case 'jumpwind':
      b.vx = 0;
      if (b.k > 0.45) { setState(b, 'jumpair'); b.vy = -1150; SFX.jump(); }
      break;
    case 'jumpair':
      if (b.y < GY - 200) b.vx = clamp((P.x - b.x) * 2.5, -520, 520);
      if (b.k > 0.3 && b.onGround) {
        b.vx = 0; G.shake = 14; SFX.boom(); dust(b.x - 30, GY); dust(b.x + 30, GY);
        for (const d of [-1, 1]) eshots.push({ kind: 'shock', x: b.x + d * 40, y: GY - 14, vx: d * 340, vy: 0, g: 0, r: 14, life: 2.5, t: 0 });
        setState(b, 'dizzy');
      }
      break;
    // --- 郵輪殺手 ---
    case 'knives': {
      b.vx = 0; b.face = sign(dx);
      if (once(b, 'k', b.k > 0.35)) {
        const n = b.phase2 ? 5 : 3;
        const sx = b.x + b.face * 30, sy = b.y - b.h * 0.6;
        const base = Math.atan2(P.y - 32 - sy, P.x - sx);
        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * 0.16;
          eshots.push({ kind: 'knife', x: sx, y: sy, vx: Math.cos(a) * 400, vy: Math.sin(a) * 400, g: 0, r: 8, deflect: true, life: 3, t: 0 });
        }
        SFX.throw();
      }
      if (b.k > 1.0) setState(b, 'idle');
      break;
    }
    case 'vanish':
      b.vx = 0;
      if (once(b, 'v', true)) { poof(b.x, b.y - 50, 16, '#5a5560'); b.invis = true; }
      if (once(b, 'm', b.k > 0.55)) {
        b.tx = clamp(P.x - P.face * 90, lk.l + 40, lk.r - 40);
        warnAt(b.tx, 0.6, () => {}, 'x', 50);
      }
      if (once(b, 'a', b.k > 1.15)) { b.x = b.tx; b.y = GY; b.invis = false; b.face = sign(P.x - b.x); poof(b.x, b.y - 50, 14, '#5a5560'); setState(b, 'slash'); }
      break;
    case 'slash':
      b.vx = 0;
      if (b.k > 0.15 && b.k < 0.35) {
        const reach = 70;
        const bx = { l: b.face > 0 ? b.x : b.x - reach, r: b.face > 0 ? b.x + reach : b.x, t: b.y - 90, b: b.y - 10 };
        if (ov(bx, boxOf(P))) hurtPlayer(b.x);
        if (once(b, 'fx', true)) { parts.push({ kind: 'slash', x: b.x + b.face * 40, y: b.y - 60, face: b.face, life: 0.25, max: 0.25, spin: false, big: true }); SFX.swing(); }
      }
      if (b.k > 0.7) setState(b, 'idle');
      break;
    // --- 大怪獸 ---
    case 'stomp':
      b.vx = 0;
      if (once(b, 'j', b.k > 0.4)) { b.face = sign(dx); b.vy = -820; b.vx = clamp(dx / 1.0, -420, 420); }
      if (b.ev.j && b.k > 0.6 && b.onGround) {
        b.vx = 0; G.shake = 14; SFX.boom();
        for (const d of [-1, 1]) eshots.push({ kind: 'shock', x: b.x + d * 70, y: GY - 14, vx: d * 320, vy: 0, g: 0, r: 14, life: 2.5, t: 0 });
        if (b.phase2 && !b.ev.twice) { b.ev = { twice: true }; b.k = 0; } else setState(b, 'idle');
      }
      break;
    case 'spit': {
      b.vx = 0; b.face = sign(dx);
      const n = b.phase2 ? 5 : 3;
      for (let i = 0; i < n; i++) if (once(b, 'f' + i, b.k > 0.4 + i * 0.2)) bossThrow(b, 'snow', clamp(P.x + (i - (n - 1) / 2) * 90, lk.l + 20, lk.r - 20), 1.0);
      if (b.k > 0.6 + n * 0.2 + 0.4) setState(b, 'idle');
      break;
    }
    // --- 共用：衝刺撞牆後頭暈 ---
    case 'dashwind':
      b.vx = 0; b.face = sign(dx);
      if (b.k > 0.65) { setState(b, 'dash'); }
      break;
    case 'dash':
      b.vx = b.face * (b.kind === 'killer' ? 620 : 500) * fast;
      if (Math.random() < 0.5) dust(b.x - b.face * 20, GY);
      if (b.kind === 'killer' && Math.random() < 0.3) parts.push({ kind: 'smoke', x: b.x, y: b.y - 50, vx: 0, vy: 0, life: 0.25, max: 0.25, size: 18, color: '#3a3540' });
      if (wall) {
        b.vx = 0; G.shake = 12; SFX.boom(); spark(b.x + b.face * b.w / 2, b.y - b.h / 2, true);
        bubble(b, '哎唷！', 1);
        setState(b, 'dizzy');
      }
      break;
  }
  // 碰到魔王身體會受傷（頭暈時不會）
  if (!b.invis && b.state !== 'dizzy' && b.state !== 'intro' && !P.dead) {
    const bb = boxOf(b); bb.l += 6; bb.r -= 6;
    if (ov(bb, boxOf(P))) {
      if (P.starT > 0) { if (P.inv <= 0) { hitBoss(2, 0); P.inv = 0.4; } }
      else hurtPlayer(b.x);
    }
  }
}
function bossDefeated() {
  const b = G.boss;
  b.dead = true; b.vx = 0;
  G.slowT = 1.2; G.score += 2000; G.winT = 0;
  G.flash = 0.8; G.flashColor = '#fff';
  bubble(b, BOSS_LINES[b.kind][1], 2);
  for (const e of enemies) if (!e.dead) { e.dead = true; poof(e.x, e.y - e.h / 2, 8); }
  eshots = []; hazards = [];
  for (let i = 0; i < 5; i++) setTimeout(() => { if (G.boss) { booms.push({ x: b.x + rand(-40, 40), y: b.y - rand(20, b.h), r: 50, t: 0 }); SFX.boom(); } }, 150 + i * 220);
  stopSong();
  setTimeout(() => SFX.win(), 1100);
  banner('打倒了！', '任務成功', 2.6);
  bubble(P, '安妮亞贏了！哇庫哇庫！', 2.6, 0.8);
}

// ---------- 主要更新 ----------
function updatePlayer(dt) {
  const p = P;
  p.anim += dt;
  for (const k of ['inv', 'comboT', 'throwT', 'starT', 'superT', 'punchT', 'flash']) if (p[k] > 0) p[k] -= dt;
  if (p.dead || G.winT >= 0) {
    p.vx *= Math.pow(0.05, dt);
    p.vy = Math.min(p.vy + GRAV * dt, 900); p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.y > GY) { p.y = GY; p.vy = 0; p.onGround = true; }
    return;
  }
  const ctl = p.hurtT <= 0;
  if (p.hurtT > 0) p.hurtT -= dt;
  let dir = 0;
  if (ctl) { if (isHeld('left')) dir -= 1; if (isHeld('right')) dir += 1; }
  if (dir && p.punchT <= 0) p.face = dir;
  const maxV = 245 * (p.punchT > 0 && p.onGround ? 0.3 : 1);
  if (ctl) p.vx = approach(p.vx, dir * maxV, (p.onGround ? 2600 : 1600) * dt);
  else p.vx *= Math.pow(0.2, dt);
  if (ctl && pressed.jump) {
    if (p.onGround || p.coyote > 0) { p.vy = -650; p.onGround = false; p.coyote = 0; p.jumps = 1; SFX.jump(); dust(p.x, p.y); }
    else if (p.jumps < 2) {
      p.vy = -590; p.jumps = 2; SFX.jump2();
      parts.push({ kind: 'ring', x: p.x, y: p.y - 5, life: 0.3, max: 0.3, size: 26 });
    }
  }
  if (ctl && pressed.punch && p.punchT <= 0) {
    p.punchStep = p.comboT > 0 ? (p.punchStep + 1) % 3 : 0;
    p.punchDur = p.punchStep === 2 ? 0.3 : 0.2;
    p.punchT = p.punchDur; p.comboT = p.punchDur + 0.28; p.hitSet = new Set();
    SFX.swing();
    if (!p.onGround && p.vy > 0) p.vy *= 0.4;
  }
  if (ctl && pressed.throw && p.throwT <= 0) {
    if (p.peanuts > 0) {
      p.peanuts--; p.throwT = 0.28;
      shots.push({ kind: 'peanut', x: p.x + p.face * 18, y: p.y - 42, vx: p.face * 560 + p.vx * 0.3, vy: -30, g: 120, dmg: 1, life: 1.1, rot: 0, r: 8 });
      SFX.throw();
    } else { popText(p.x, p.y - 90, '沒有花生了！', '#fff', 18); p.throwT = 0.5; }
  }
  if (ctl && pressed.super) {
    if (p.meter >= 100) doSuper();
    else popText(p.x, p.y - 90, '超能力還沒集滿', '#fff', 16);
  }
  let g = GRAV;
  if (p.vy < 0 && !isHeld('jump')) g *= 2.1;
  p.vy = Math.min(p.vy + g * dt, 950);
  const prevB = p.y;
  p.x += p.vx * dt; p.y += p.vy * dt;
  const lk = G.lock;
  const minX = lk ? lk.l : 0, maxX = lk ? lk.r : L().len + W;
  p.x = clamp(p.x, minX + p.w / 2, maxX - p.w / 2);
  const was = p.onGround;
  p.onGround = false;
  if (p.y >= GY) { p.y = GY; p.vy = 0; p.onGround = true; }
  else if (p.vy >= 0) {
    for (const pl of platforms) {
      if (p.x > pl.x - 6 && p.x < pl.x + pl.w + 6 && prevB <= pl.y + 1 && p.y >= pl.y) { p.y = pl.y; p.vy = 0; p.onGround = true; break; }
    }
  }
  if (p.onGround) { if (!was) dust(p.x, p.y); p.jumps = 0; p.coyote = 0.1; } else if (p.coyote > 0) p.coyote -= dt;
  // 出拳判定
  if (p.punchT > 0) {
    const el = p.punchDur - p.punchT;
    if (el > 0.03 && el < 0.15) {
      const big = p.punchStep === 2, reach = big ? 56 : 46;
      const bx = { l: p.face > 0 ? p.x - 4 : p.x - reach, r: p.face > 0 ? p.x + reach : p.x + 4, t: p.y - 62, b: p.y - 10 };
      meleeHit(bx, big ? 2 : 1, p.face * (big ? 430 : 220), p.hitSet, big);
    }
  }
  // 踩怪與碰撞
  const pb = boxOf(p);
  for (const e of enemies) {
    if (e.dead || !e.active) continue;
    const eb = boxOf(e);
    if (!ov(pb, eb)) continue;
    if (p.vy > 100 && prevB <= eb.t + 14) {
      hitEnemy(e, 1, p.face * 120); p.vy = -480; p.jumps = 1;
      popText(e.x, eb.t - 10, '踩！', '#ffd84a', 20);
      continue;
    }
    if (p.starT > 0) { hitEnemy(e, 5, sign(e.x - p.x) * 400, true); continue; }
    if (e.stun > 0 || e.kind === 'bombdog') continue;
    if (e.fly && (e.state === 'land' || e.state === 'rise' || e.state === 'wind')) continue;
    hurtPlayer(e.x);
  }
  // 撿道具
  for (const it of items) {
    if (it.taken) continue;
    if (Math.abs(p.x - it.x) < 28 && it.y - 12 > p.y - p.h - 16 && it.y - 12 < p.y + 12) {
      it.taken = true;
      if (it.kind === 'peanut') { p.peanuts++; G.score += 10; p.meter = Math.min(100, p.meter + 1.5); SFX.coin(); }
      else if (it.kind === 'bag') { p.peanuts += 5; G.score += 50; SFX.coin(); popText(it.x, it.y - 30, '花生 +5', '#ffe9a8', 20); }
      else if (it.kind === 'heart') {
        if (p.hp < p.maxHp) { p.hp++; popText(it.x, it.y - 30, '回復！', '#ff8fa3', 22); } else { G.score += 300; popText(it.x, it.y - 30, '+300', '#fff', 20); }
        SFX.heart();
      } else if (it.kind === 'star') { p.starT = 7; SFX.star(); bubble(p, '無敵星星！超強的！', 1.6); }
      for (let i = 0; i < 4; i++) parts.push({ kind: 'spark', x: it.x, y: it.y - 12, vx: rand(-120, 120), vy: rand(-160, 0), life: 0.3, max: 0.3, color: '#fff6a8' });
    }
  }
}
function doSuper() {
  P.meter = 0; P.superT = 0.7;
  G.ring = { x: P.x, y: P.y - 36, r: 10, hit: new Set() };
  for (const s of eshots) poof(s.x, s.y, 3, '#ffc2dc');
  eshots = [];
  G.flash = 0.5; G.flashColor = '#ffb3d1';
  SFX.super(); G.shake = 8;
  bubble(P, '心電感應超能力！', 1.8);
  const fam = ['bond', 'loid', 'yor'].filter((k) => !partners.some((p) => p.kind === k && p.state !== 'leave'));
  if (fam.length) setTimeout(() => { if (G.mode === 'play' && G.winT < 0) callPartner(fam[Math.floor(Math.random() * fam.length)], 10); }, 500);
}
function updateEnemy(e, dt) {
  e.t += dt; if (e.flash > 0) e.flash -= dt;
  if (!e.active) { if (e.x < G.camX + W + 60) e.active = true; else return; }
  const dx = P.x - e.x, adx = Math.abs(dx);
  const pdead = P.dead || G.winT >= 0;
  if (e.stun > 0) {
    e.stun -= dt; e.vx *= Math.pow(0.03, dt);
  } else if (e.kind === 'melee') {
    if (e.state === 'walk') {
      e.face = sign(dx);
      e.vx = adx > 38 && !pdead ? e.face * e.speed : 0;
      e.cd -= dt;
      if (adx < 54 && Math.abs(P.y - e.y) < 50 && e.cd <= 0 && !pdead) { e.state = 'wind'; e.st = 0.45; e.vx = 0; }
    } else if (e.state === 'wind') { e.vx = 0; e.st -= dt; if (e.st <= 0) { e.state = 'atk'; e.st = 0.2; } }
    else if (e.state === 'atk') {
      e.st -= dt;
      const bx = { l: e.face > 0 ? e.x : e.x - 44, r: e.face > 0 ? e.x + 44 : e.x, t: e.y - 55, b: e.y - 10 };
      if (ov(bx, boxOf(P))) hurtPlayer(e.x);
      if (e.st <= 0) { e.state = 'walk'; e.cd = 1.1 + Math.random() * 0.8; }
    }
  } else if (e.kind === 'thrower' || e.kind === 'knifer') {
    e.face = sign(dx);
    if (e.state === 'walk') {
      e.vx = adx < 170 ? -e.face * e.speed : adx > 330 ? e.face * e.speed : 0;
      if (e.vx < 0 && e.x < G.camX + 30 || e.vx > 0 && e.x > G.camX + W - 30) e.vx = 0;
      e.cd -= dt;
      if (e.cd <= 0 && adx < 520 && !pdead) { e.state = 'wind'; e.st = 0.45; e.vx = 0; }
    } else if (e.state === 'wind') {
      e.vx = 0; e.st -= dt;
      if (e.st <= 0) {
        e.state = 'walk'; e.cd = 2.2 + Math.random();
        if (e.kind === 'knifer') eshots.push({ kind: 'knife', x: e.x + e.face * 20, y: e.y - 38, vx: e.face * 360, vy: 0, g: 0, r: 8, deflect: true, life: 3, t: 0 });
        else {
          const T = 0.9, g = 900, sy = e.y - 50;
          eshots.push({ kind: e.style === 'thrower2' ? 'ball' : 'rock', x: e.x, y: sy, vx: dx / T, vy: (P.y - 20 - sy - 0.5 * g * T * T) / T, g, r: 8, deflect: true, life: 4, t: 0, bounce: e.style === 'thrower2' ? 1 : 0 });
        }
        SFX.throw();
      }
    }
  } else if (e.kind === 'dasher') {
    if (e.state === 'walk') {
      e.face = sign(dx); e.vx = adx > 40 && !pdead ? e.face * e.speed : 0; e.cd -= dt;
      if (adx < 240 && e.cd <= 0 && !pdead) { e.state = 'wind'; e.st = 0.55; e.vx = 0; }
    } else if (e.state === 'wind') { e.vx = 0; e.st -= dt; if (e.st <= 0) { e.state = 'dash'; e.st = 0.42; } }
    else if (e.state === 'dash') {
      e.vx = e.face * 440; e.st -= dt;
      if (ov(boxOf(e), boxOf(P))) hurtPlayer(e.x);
      if (e.st <= 0) { e.state = 'rest'; e.st = 0.6; }
    } else if (e.state === 'rest') { e.vx = 0; e.st -= dt; if (e.st <= 0) { e.state = 'walk'; e.cd = 1.4 + Math.random(); } }
  } else if (e.kind === 'bombdog') {
    if (e.state === 'walk') {
      e.face = sign(dx); e.vx = e.face * e.speed;
      if (adx < 44 && Math.abs(P.y - e.y) < 60 && !pdead) { e.state = 'fuse'; e.st = 0.7; e.vx = 0; }
    } else if (e.state === 'fuse') {
      e.vx = 0; e.st -= dt;
      if (e.st <= 0) { e.dead = true; explode(e.x, e.y - 16, 66, 'all'); }
    }
  } else if (e.kind === 'flyer') {
    if (e.state === 'walk') {
      const tx = P.x + Math.sin(e.t * 0.9) * 140;
      e.vx = approach(e.vx, sign(tx - e.x) * e.speed, 200 * dt);
      e.vy = (e.baseY + Math.sin(e.t * 2) * 14 - e.y) * 3;
      e.face = sign(e.vx);
      e.cd -= dt;
      if (e.cd <= 0 && adx < 160 && !pdead) { e.state = 'wind'; e.st = 0.7; e.vx = 0; e.vy = 0; }
    } else if (e.state === 'wind') {
      // 俯衝前先停在空中抖一下，頭上出現「!」
      e.vx = 0; e.vy = 0; e.face = sign(dx); e.st -= dt;
      if (e.st <= 0) {
        e.state = 'dive';
        const d = Math.hypot(dx, GY - e.y) || 1;
        e.vx = (dx / d) * 230; e.vy = ((GY - e.y) / d) * 230;
      }
    } else if (e.state === 'dive') {
      if (e.y >= GY - 1) { e.y = GY; e.vx = 0; e.vy = 0; e.state = 'land'; e.st = FLY_LAND_TIME; dust(e.x, GY); }
    } else if (e.state === 'land') {
      // 落地後頭暈停在地上，可以用拳頭或花生打
      e.vx = 0; e.vy = 0; e.st -= dt;
      if (e.st <= 0) e.state = 'rise';
    } else if (e.state === 'rise') {
      e.vy = -110; e.vx *= Math.pow(0.3, dt);
      if (e.y <= e.baseY) { e.state = 'walk'; e.cd = 2.5 + Math.random() * 1.5; }
    }
  }
  if (!e.fly) {
    e.vy += GRAV * dt; e.y += e.vy * dt;
    if (e.y >= GY) { e.y = GY; e.vy = 0; }
  } else if (e.stun > 0) { e.vy *= Math.pow(0.05, dt); e.y += e.vy * dt; }
  else e.y += e.vy * dt;
  e.x += e.vx * dt;
  if (G.lock) {
    const lk = G.lock;
    if (!e.entered) { if (e.x > lk.l + 20 && e.x < lk.r - 20) e.entered = true; else { e.x += sign((lk.l + lk.r) / 2 - e.x) * 120 * dt; } }
    else e.x = clamp(e.x, lk.l + e.w / 2, lk.r - e.w / 2);
  }
  if (e.x < G.camX - 500 && !G.lock) e.dead = true;
}
function updateShots(dt) {
  for (const s of shots) {
    s.life -= dt; s.vy += s.g * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += dt * 18;
    if (s.life <= 0 || s.y > GY) { s.dead = true; if (s.kind === 'bomb') explode(s.x, Math.min(s.y, GY - 10), 60, 'friendly'); continue; }
    const sb = { l: s.x - s.r, r: s.x + s.r, t: s.y - s.r, b: s.y + s.r };
    let hit = false;
    for (const e of enemies) {
      if (e.dead || !e.active || !ov(sb, boxOf(e))) continue;
      hitEnemy(e, s.dmg, sign(s.vx) * 200, s.dmg > 1); hit = true; break;
    }
    if (!hit && G.boss && !G.boss.dead && ov(sb, boxOf(G.boss)) && !G.boss.invis && G.boss.state !== 'intro') { hitBoss(s.dmg, 0); hit = true; }
    if (!hit) for (const c of crates) { if (!c.dead && ov(sb, boxOf(c))) { hitCrate(c, 1); hit = true; break; } }
    if (hit) { s.dead = true; if (s.kind === 'bomb') explode(s.x, s.y, 60, 'friendly'); }
  }
  shots = shots.filter((s) => !s.dead);
  for (const s of eshots) {
    s.t += dt; s.life -= dt;
    s.vy += (s.g || 0) * dt; s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.kind === 'bomb') {
      if (s.y >= GY - s.r) { s.y = GY - s.r; s.vx = 0; s.vy = 0; if (s.fuse < 0) s.fuse = 0.65; }
      if (s.fuse >= 0) { s.fuse -= dt; if (s.fuse <= 0) { s.dead = true; explode(s.x, s.y - 8, 58, 'enemy'); continue; } }
    } else if (s.kind === 'ball' || s.kind === 'rock') {
      if (s.y >= GY - s.r) { if (s.bounce > 0) { s.y = GY - s.r; s.vy *= -0.62; s.bounce--; } else { s.dead = true; poof(s.x, s.y, 4, '#e6ddd0'); continue; } }
    } else if (s.kind === 'fire') {
      if (s.y >= GY - s.r) { s.dead = true; explode(s.x, GY - 16, 44, 'enemy'); continue; }
    } else if (s.kind === 'snow') {
      if (s.y >= GY - s.r) {
        s.dead = true; poof(s.x, GY - 10, 12, '#f4fbff'); SFX.break();
        if (Math.abs(P.x - s.x) < 42 && P.y > GY - 30) hurtPlayer(s.x);
        continue;
      }
    } else if (s.kind === 'shock') {
      if (Math.random() < 0.4) dust(s.x, GY);
    }
    if (s.life <= 0 || s.x < G.camX - 200 || s.x > G.camX + W + 200) { s.dead = true; continue; }
    if (!P.dead && P.inv <= 0) {
      const pb = boxOf(P);
      const cx = clamp(s.x, pb.l, pb.r), cy = clamp(s.y, pb.t, pb.b);
      if ((s.x - cx) ** 2 + (s.y - cy) ** 2 < s.r * s.r) {
        if (s.kind === 'bomb') { s.dead = true; explode(s.x, s.y, 58, 'enemy'); }
        else { hurtPlayer(s.x); if (s.kind !== 'shock' && s.kind !== 'sound') s.dead = true; }
      }
    }
  }
  eshots = eshots.filter((s) => !s.dead);
}
function updateItems(dt) {
  for (const it of items) {
    if (it.taken || !it.fall) continue;
    it.vy += GRAV * 0.8 * dt; const prev = it.y; it.y += it.vy * dt;
    if (it.y >= GY - 6) { it.y = GY - 6; it.fall = false; }
    else if (it.vy > 0) for (const pl of platforms) if (it.x > pl.x && it.x < pl.x + pl.w && prev <= pl.y - 6 && it.y >= pl.y - 6) { it.y = pl.y - 6; it.fall = false; }
  }
  items = items.filter((it) => !it.taken && it.x > G.camX - 600);
}
function updateWave(dt) {
  const lv = L();
  if (!G.waveDone && !G.wave && P.x > G.waveX) {
    G.wave = { i: 0, pause: 0 };
    G.lock = { l: G.camX, r: G.camX + W };
    banner('壞人來了！', '把他們全部打倒！', 1.6);
    spawnWave(0);
  }
  if (!G.wave) return;
  const alive = enemies.some((e) => e.wave && !e.dead);
  if (!alive) {
    G.wave.pause += dt;
    if (G.wave.pause > 0.8) {
      G.wave.i++;
      if (G.wave.i < lv.waves.length) { G.wave.pause = 0; spawnWave(G.wave.i); }
      else { G.wave = null; G.waveDone = true; G.lock = null; banner('GO ➜', '', 1.2); G.score += 300; }
    }
  }
}
function spawnWave(i) {
  L().waves[i].forEach((t, k) => {
    const e = spawnFromEdge(t, k % 2 ? 1 : -1);
    e.wave = true; e.x += (k % 2 ? 1 : -1) * Math.floor(k / 2) * 60;
  });
}

function update(dt) {
  G.t += dt;
  if (G.flash > 0) G.flash -= dt * 1.5;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 30);
  for (const p of parts) {
    p.life -= dt;
    if (p.vx !== undefined) { p.x += p.vx * dt; p.y += p.vy * dt; }
    else if (p.vy !== undefined) p.y += p.vy * dt;
    if (p.kind === 'star' || p.kind === 'chip') p.vy += 900 * dt;
    if (p.kind === 'spark') { p.vx *= 0.9; p.vy *= 0.9; }
  }
  parts = parts.filter((p) => p.life > 0);
  for (const b of bubbles) b.t += dt;
  bubbles = bubbles.filter((b) => b.t < b.dur && !b.ent.gone && !(b.ent.dead && b.ent !== P && b.ent !== G.boss));
  if (G.banner) { G.banner.t += dt; if (G.banner.t > G.banner.dur) G.banner = null; }
  if (G.mode !== 'play') return;
  const lv = L();

  updatePlayer(dt);
  for (const tr of G.triggers) if (!tr.done && P.x > tr.x) { tr.done = true; tr.fn(); }
  updateWave(dt);
  if (!G.bossStarted && P.x > lv.len + W * 0.3) startBoss();
  for (const e of enemies) updateEnemy(e, dt);
  // 敵人不要疊在一起
  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i]; if (a.dead || !a.active || a.fly) continue;
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j]; if (b.dead || !b.active || b.fly) continue;
      const d = b.x - a.x;
      if (Math.abs(d) < 22) { const push = (22 - Math.abs(d)) * 0.5 * sign(d || 1); a.x -= push; b.x += push; }
    }
  }
  enemies = enemies.filter((e) => !e.dead);
  if (G.boss && !G.boss.dead) updateBoss(G.boss, dt);
  for (const pt of partners) updatePartner(pt, dt);
  partners = partners.filter((p) => !p.gone);
  updateShots(dt);
  updateItems(dt);
  for (const c of crates) if (c.flash > 0) c.flash -= dt;
  crates = crates.filter((c) => !c.dead);
  for (const h of hazards) { h.t += dt; if (h.t >= h.delay) { h.done = true; h.fn(); } }
  hazards = hazards.filter((h) => !h.done);
  for (const bm of booms) bm.t += dt;
  booms = booms.filter((bm) => bm.t < 0.45);
  if (G.ring) {
    const r = G.ring;
    r.r += 1150 * dt;
    for (const e of enemies) {
      if (e.dead || !e.active || r.hit.has(e)) continue;
      if (Math.hypot(e.x - r.x, e.y - e.h / 2 - r.y) < r.r) { r.hit.add(e); hitEnemy(e, 3, sign(e.x - r.x) * 380, true); }
    }
    const b = G.boss;
    if (b && !b.dead && !r.hit.has(b) && Math.abs(b.x - r.x) < r.r) {
      r.hit.add(b); hitBoss(5, 0);
      if (!b.dead && !b.invis && ['idle', 'throw', 'shout', 'balls', 'knives', 'spit', 'summon', 'dogs', 'detonate', 'dashwind', 'dash'].includes(b.state)) { b.vx = 0; setState(b, 'dizzy'); }
    }
    if (r.r > W * 1.3) G.ring = null;
  }

  // 相機
  const lk = G.lock;
  const minC = lk ? lk.l : 0, maxC = lk ? Math.max(lk.l, lk.r - W) : lv.len;
  const target = clamp(P.x - W * 0.42, minC, maxC);
  G.camX += (target - G.camX) * Math.min(1, dt * 7);
  if (lk) G.camX = clamp(G.camX, minC, maxC);

  if (G.winT >= 0) { G.winT += dt; if (G.winT > 3.4) levelClear(); }
  if (G.deadT >= 0) { G.deadT += dt; if (G.deadT > 2) gameOver(); }
}

// ---------- 繪圖 ----------
function txt(s, x, y, size, color = '#fff', align = 'left', stroke = OL) {
  ctx.font = `900 ${size}px ${FONT}`;
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineWidth = size * 0.22; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}
function shadow(x, y, w) { ctx.save(); ctx.globalAlpha = 0.18; ellipse(ctx, x, y, w, w * 0.22, '#2a1e1c', 0); ctx.restore(); }
function groundUnder(x, y) {
  if (y >= GY - 1) return GY;
  let best = GY;
  for (const pl of platforms) if (x > pl.x && x < pl.x + pl.w && pl.y >= y - 1 && pl.y < best) best = pl.y;
  return best;
}
function guyPose(e) {
  if (e.stun > 0) return makePose('hurt', e.t);
  if (e.state === 'wind') return makePose(e.kind === 'dasher' ? 'windup' : e.kind === 'melee' ? 'windup' : 'throw', e.t, 0);
  if (e.state === 'atk') return makePose('punch', e.t, 1);
  if (e.state === 'dash') { const p = makePose('run', e.t * 1.6); p.lean = 8; return p; }
  return makePose(Math.abs(e.vx) > 5 ? 'run' : 'idle', e.t);
}
function drawEnemy(e) {
  const fl = e.flash > 0 ? 0.8 : 0;
  if (!e.fly) shadow(e.x, GY, e.w * 0.7);
  if (e.style) drawGuy(ctx, e.x, e.y, e.face, guyPose(e), STYLES[e.style], fl);
  else if (e.type === 'bombdog') drawBombDog(ctx, e.x, e.y, e.face, e.t, e.state === 'fuse' ? 1 : 0, fl);
  else {
    const shake = e.state === 'wind' ? Math.sin(e.t * 50) * 2 : 0;
    ctx.save(); ctx.translate(e.x + shake, e.y - e.h / 2); ctx.scale(FLY_SCALE, FLY_SCALE);
    drawBird(ctx, 0, 0, e.face, e.state === 'land' ? 0 : e.t, e.type, fl);
    ctx.restore();
    if (e.state === 'land') dizzyStars(e.x, e.y - e.h - 6, e.t);
  }
  if (e.state === 'wind' && e.kind !== 'thrower' && e.kind !== 'knifer') txt('!', e.x, e.y - e.h - 22, 22, '#ff5d5d');
  if (e.maxHp > 1 && e.hp < e.maxHp) {
    rrect(ctx, e.x - 16, e.y - e.h - 12, 32, 6, 3, 'rgba(0,0,0,.35)', 0);
    rrect(ctx, e.x - 16, e.y - e.h - 12, 32 * Math.max(0, e.hp) / e.maxHp, 6, 3, '#ff6b6b', 0);
  }
}
function bossPose(b) {
  const s = b.state;
  if (b.dead) return makePose('dizzy', b.t);
  if (s === 'dizzy') return makePose('dizzy', b.t);
  if (s === 'throw' || s === 'balls' || s === 'knives') return makePose('throw', b.t, (b.k * 4) % 1);
  if (s === 'shout') { const p = makePose('punch', b.t, 1); p.expr = 'shout'; return p; }
  if (s === 'dogs' || s === 'summon' || s === 'detonate') return makePose('win', b.t);
  if (s === 'dash') { const p = makePose('run', b.t * 1.5); p.lean = 9; return p; }
  if (s === 'dashwind' || s === 'jumpwind') return makePose('windup', b.t);
  if (s === 'jumpair' || s === 'intro' && !b.onGround) return makePose('jump', b.t);
  if (s === 'slash') return makePose('slash', b.t, Math.min(1, b.k / 0.3));
  return makePose(Math.abs(b.vx) > 5 ? 'run' : 'idle', b.t);
}
function dizzyStars(x, y, t) {
  for (let i = 0; i < 3; i++) {
    const a = t * 5 + i * TAU / 3;
    starPath(ctx, x + Math.cos(a) * 22, y + Math.sin(a) * 6, 6); fs(ctx, '#ffd84a', 1.6);
  }
}
function drawPenguinBoss(b) {
  const sq = b.onGround ? 1 + Math.sin(b.t * 6) * 0.035 : 0.94;
  ctx.save(); ctx.translate(b.x, b.y); ctx.scale(b.face, sq);
  drawPenguin(ctx, b.t, b.dead ? 'dizzy' : b.state, b.phase2, b.flash > 0 ? 0.7 : 0,
    { onGround: b.onGround, dead: !!b.dead });
  ctx.restore();
}
function drawBoss(b) {
  if (b.invis) return;
  shadow(b.x, GY, b.w * (b.kind === 'penguin' ? 0.6 : 0.9));
  if (b.kind === 'penguin') drawPenguinBoss(b);
  else drawGuy(ctx, b.x, b.y, b.face, bossPose(b), STYLES[b.kind], b.flash > 0 ? 0.8 : 0);
  if (b.state === 'dizzy' || b.dead) dizzyStars(b.x, b.y - b.h - 6, b.t);
  if ((b.state === 'dashwind' || b.state === 'jumpwind') && Math.sin(b.t * 30) > 0) txt('!!', b.x, b.y - b.h - 26, 28, '#ff5d5d', 'center');
  if (b.state === 'jumpair' && b.y < GY - 150) { ctx.save(); ctx.globalAlpha = 0.35 + 0.2 * Math.sin(b.t * 20); ellipse(ctx, b.x, GY, 50, 10, '#e2384d', 0); ctx.restore(); }
}
function drawPartner(pt) {
  shadow(pt.x, GY, pt.kind === 'bond' ? 32 : 18);
  const moving = Math.abs(pt.vx) > 10;
  if (pt.kind === 'bond') { drawBond(ctx, pt.x, pt.y, pt.face, pt.act === 'dash' || moving ? 'run' : 'idle', pt.t, 0.95); return; }
  let po;
  const ext = pt.act ? Math.min(1, pt.actT / 0.1) * (pt.actT > 0.2 ? Math.max(0, 1 - (pt.actT - 0.2) / 0.1) : 1) : 0;
  if (pt.state === 'leave' && pt.onGround === false) po = makePose('wave', pt.t);
  else if (pt.act === 'kick' || pt.act === 'flykick') po = makePose('kick', pt.t, Math.max(0.3, ext));
  else if (pt.act === 'punch') po = makePose('punch', pt.t, ext);
  else if (pt.act === 'slash' || pt.act === 'spin') po = makePose('slash', pt.t, Math.min(1, pt.actT / 0.25));
  else if (!pt.onGround) po = makePose(pt.vy < 0 ? 'jump' : 'fall', pt.t);
  else po = makePose(moving ? 'run' : 'idle', pt.t);
  if (pt.kind === 'loid') drawLoid(ctx, pt.x, pt.y, pt.face, po, 1);
  else { if (pt.state !== 'enter') po.weapon = true; drawYor(ctx, pt.x, pt.y, pt.act === 'spin' ? (Math.floor(pt.actT * 20) % 2 ? 1 : -1) : pt.face, po, 1); }
}
function playerPose() {
  const p = P;
  if (p.dead) return makePose('hurt', p.anim);
  if (G.winT >= 0) return makePose('win', p.anim);
  if (p.superT > 0) return makePose('super', p.anim);
  if (p.hurtT > 0) return makePose('hurt', p.anim);
  if (p.punchT > 0) {
    const el = p.punchDur - p.punchT;
    const ext = el < 0.05 ? el / 0.05 : Math.max(0, 1 - (el - 0.12) / Math.max(0.05, p.punchDur - 0.12));
    const po = makePose('punch', p.anim, ext);
    if (p.punchStep === 1) po.lf = 0.2;
    return po;
  }
  if (p.throwT > 0.12) return makePose('throw', p.anim, (0.28 - p.throwT) / 0.16);
  if (!p.onGround) return makePose(p.vy < 0 ? 'jump' : 'fall', p.anim);
  if (Math.abs(p.vx) > 20) return makePose('run', p.anim);
  return makePose('idle', p.anim);
}
function drawPlayer() {
  const p = P;
  shadow(p.x, groundUnder(p.x, p.y), 16);
  if (p.starT > 0) {
    ctx.save(); ctx.globalAlpha = 0.45;
    circle(ctx, p.x, p.y - 38, 44 + Math.sin(G.t * 12) * 4, `hsl(${(G.t * 360) % 360},90%,70%)`, 0);
    ctx.restore();
  }
  ctx.save();
  if (p.inv > 0 && !p.dead && Math.floor(G.t * 18) % 2 === 0) ctx.globalAlpha = 0.45;
  const big = p.punchT > 0 && p.punchStep === 2;
  drawAnya(ctx, p.x, p.y, p.face, playerPose(), big ? 1.08 : 1, p.flash > 0 ? 0.6 : 0);
  ctx.restore();
}
function drawShot(s, enemy) {
  if (s.kind === 'peanut') drawPeanut(ctx, s.x, s.y, 1, s.rot);
  else if (s.kind === 'bomb') {
    circle(ctx, s.x, s.y, s.r, s.fuse >= 0 && Math.sin(G.t * 40) > 0 ? '#c33' : '#2a2a2e', 2);
    circle(ctx, s.x - 3, s.y - 3, 2.5, 'rgba(255,255,255,.5)', 0);
    circle(ctx, s.x + 4, s.y - s.r - 3, 2.6 + Math.sin(G.t * 30), '#ffb02e', 0);
  } else if (s.kind === 'ball') {
    circle(ctx, s.x, s.y, s.r, '#e8463f', 2); ctx.beginPath(); ctx.arc(s.x, s.y, s.r, -0.4, 0.9); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
  } else if (s.kind === 'rock') circle(ctx, s.x, s.y, s.r, '#9a9188', 2);
  else if (s.kind === 'knife') {
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(Math.atan2(s.vy, s.vx));
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.lineWidth = 5; ctx.strokeStyle = OL; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(10, 0); ctx.lineWidth = 3; ctx.strokeStyle = '#dfe5ea'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-3, 0); ctx.strokeStyle = '#6b4a35'; ctx.stroke();
    ctx.restore();
  } else if (s.kind === 'fire') {
    ctx.save(); ctx.globalAlpha = 0.5; circle(ctx, s.x, s.y, s.r + 6, '#ffb347', 0); ctx.restore();
    circle(ctx, s.x, s.y, s.r, '#ff7a3d', 2); circle(ctx, s.x - 2, s.y - 2, s.r * 0.45, '#ffe28a', 0);
  } else if (s.kind === 'snow') {
    circle(ctx, s.x, s.y, s.r, '#f4fbff', 2.2); circle(ctx, s.x - 3, s.y - 3, s.r * 0.35, '#ffffff', 0);
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.7, 0.3, 1.6); ctx.lineWidth = 1.5; ctx.strokeStyle = '#a9cfe0'; ctx.stroke();
  } else if (s.kind === 'sound') {
    const d = sign(s.vx);
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(s.x - d * i * 9, s.y, s.r - i * 3, d > 0 ? -1 : Math.PI - 1, d > 0 ? 1 : Math.PI + 1); ctx.lineWidth = 4; ctx.strokeStyle = i === 0 ? '#ff5d7a' : 'rgba(255,93,122,.55)'; ctx.stroke(); }
  } else if (s.kind === 'shock') {
    ctx.beginPath(); ctx.moveTo(s.x - 18, GY); ctx.lineTo(s.x - 8, GY - 24); ctx.lineTo(s.x, GY - 12); ctx.lineTo(s.x + 8, GY - 30); ctx.lineTo(s.x + 18, GY);
    ctx.closePath(); fs(ctx, '#ffe08a', 2.2);
  }
}
function drawParts() {
  for (const p of parts) {
    const a = Math.max(0, p.life / p.max);
    ctx.save(); ctx.globalAlpha = Math.min(1, a * 1.5);
    if (p.kind === 'spark') { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); ctx.lineWidth = 3; ctx.strokeStyle = p.color; ctx.lineCap = 'round'; ctx.stroke(); }
    else if (p.kind === 'burst') { starPath(ctx, p.x, p.y, p.size * (1.4 - a * 0.6), 0.45, 8); fs(ctx, '#fff8c2', 2); }
    else if (p.kind === 'smoke') { circle(ctx, p.x, p.y, p.size * (1.4 - a * 0.4), p.color, 0); }
    else if (p.kind === 'text') { txt(p.text, p.x, p.y, p.size * (a > 0.8 ? 1 + (a - 0.8) * 2 : 1), p.color, 'center'); }
    else if (p.kind === 'star') { starPath(ctx, p.x, p.y, p.size); fs(ctx, '#ffd84a', 1.4); }
    else if (p.kind === 'chip') { ctx.translate(p.x, p.y); ctx.rotate(p.life * 10); rrect(ctx, -p.size / 2, -p.size / 2, p.size, p.size * 0.6, 1, '#b88a57', 1.4); }
    else if (p.kind === 'ring') { ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size * (1.6 - a), p.size * 0.4 * (1.6 - a), 0, 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke(); }
    else if (p.kind === 'slash') {
      ctx.translate(p.x, p.y); ctx.scale(p.face, 1);
      const R = p.big ? 54 : 40;
      ctx.beginPath();
      if (p.spin) ctx.arc(-p.face * 30 * p.face, 0, R + 10, 0, TAU);
      else ctx.arc(-10, 0, R, -1.3, 1.3);
      ctx.lineWidth = p.big ? 8 : 6; ctx.strokeStyle = p.big ? '#c9d4de' : '#ff6f8f'; ctx.lineCap = 'round'; ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
    }
    ctx.restore();
  }
}
function drawHazards() {
  for (const h of hazards) {
    const k = h.t / h.delay, pulse = 0.35 + 0.35 * Math.sin(h.t * 25);
    ctx.save(); ctx.globalAlpha = pulse;
    if (h.kind === 'x') { txt('✕', h.x, GY - 40, 46, '#ff3b5c', 'center'); }
    else { ellipse(ctx, h.x, GY - 2, h.w * (0.5 + k * 0.5), 10, '#ff3b5c', 0); }
    ctx.restore();
    if (h.kind === 'circle') { ctx.save(); ctx.globalAlpha = 0.9; txt('!', h.x, GY - 30 - k * 10, 24, '#ff3b5c', 'center'); ctx.restore(); }
  }
}
function drawBooms() {
  for (const b of booms) {
    const k = b.t / 0.45;
    ctx.save(); ctx.globalAlpha = 1 - k;
    circle(ctx, b.x, b.y, b.r * (0.4 + k * 0.8), '#ff9a3c', 0);
    circle(ctx, b.x, b.y, b.r * (0.25 + k * 0.5), '#ffe27a', 0);
    starPath(ctx, b.x, b.y, b.r * (0.5 + k), 0.55, 10, k * 2); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.stroke();
    ctx.restore();
  }
}
function drawBubbles() {
  for (const b of bubbles) {
    if (b.t < 0) continue;
    const e = b.ent;
    const h = e === P ? 82 : e.h ? e.h + 22 : 90;
    const x = clamp(e.x, G.camX + 90, G.camX + W - 90);
    drawBubble(ctx, x, e.y - h, b.text, Math.min(1, (b.dur - b.t) * 3, b.t * 8));
  }
}
function drawHUD() {
  const hs = HUD_S, Wh = W / hs;
  ctx.save(); ctx.scale(hs, hs);
  const x0 = 12 + SAFE.l / hs, y0 = 10 + SAFE.t / hs;
  for (let i = 0; i < P.maxHp; i++) { heartPath(ctx, x0 + 14 + i * 28, y0 + 14, 11); fs(ctx, i < P.hp ? '#ff5d7a' : 'rgba(255,255,255,.55)', 2.4); }
  rrect(ctx, x0, y0 + 34, 92, 30, 15, 'rgba(255,255,255,.88)', 2.4);
  drawPeanut(ctx, x0 + 19, y0 + 49, 0.95, 0.5);
  txt(`× ${P.peanuts}`, x0 + 34, y0 + 50, 18, OL, 'left', null);
  const mw = 156, full = P.meter >= 100;
  rrect(ctx, x0 + 100, y0 + 36, mw, 26, 13, 'rgba(255,255,255,.88)', 2.4);
  if (P.meter > 0) rrect(ctx, x0 + 103, y0 + 39, (mw - 6) * P.meter / 100, 20, 10, full ? `hsl(${(G.t * 400) % 360},85%,68%)` : '#ff8fb5', 0);
  txt(full ? '超能力 OK！' : '超能力', x0 + 100 + mw / 2, y0 + 50, 15, full ? '#fff' : OL, 'center', full ? OL : null);
  txt(`${G.score}`, Wh - SAFE.r / hs - 132, y0 + 22, 24, '#fff', 'right');
  const b = G.boss;
  const cx = Wh / 2;
  if (b && G.bossStarted) {
    const bw = Math.min(380, Wh * 0.36);
    txt(L().bossName, cx, y0 + 12, 17, '#fff', 'center');
    rrect(ctx, cx - bw / 2, y0 + 24, bw, 16, 8, 'rgba(0,0,0,.45)', 2.4);
    if (b.hp > 0) rrect(ctx, cx - bw / 2 + 2, y0 + 26, (bw - 4) * Math.max(0, b.hp) / b.maxHp, 12, 6, b.phase2 ? '#ff4d6d' : '#ff9a3c', 0);
  } else {
    const bw = Math.min(300, Wh * 0.28);
    txt(`第 ${G.lv + 1} 關 ${L().name}`, cx, y0 + 12, 16, '#fff', 'center');
    rrect(ctx, cx - bw / 2, y0 + 26, bw, 10, 5, 'rgba(255,255,255,.6)', 2);
    const k = clamp(P.x / (L().len + W * 0.3), 0, 1);
    rrect(ctx, cx - bw / 2, y0 + 26, bw * k, 10, 5, '#ff8fb5', 0);
    circle(ctx, cx - bw / 2 + bw * k, y0 + 31, 8, '#f8aabb', 2);
    txt('👑', cx + bw / 2 + 14, y0 + 31, 16, '#fff', 'center', null);
  }
  if (G.banner) {
    const bn = G.banner, k = bn.t / bn.dur;
    const s = bn.t < 0.25 ? 0.5 + bn.t * 2 : 1;
    const a = k > 0.85 ? (1 - k) / 0.15 : 1;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(cx, VIEW_H / hs * 0.36); ctx.scale(s, s);
    if (bn.sub) txt(bn.sub, 0, -40, 22, '#ffe27a', 'center');
    txt(bn.title, 0, 6, 52, '#fff', 'center');
    ctx.restore();
  }
  ctx.restore();
}

// 網址加上 #gallery 可以放大檢查所有角色造型
function renderGallery() {
  const z = Math.min(H / 340, W / 520);
  SCREENS.forEach((id) => $(id).classList.add('hidden'));
  ctx.setTransform(DPR * SCALE * z, 0, 0, DPR * SCALE * z, 0, 0);
  ctx.fillStyle = '#e9e6d6'; ctx.fillRect(0, 0, 2000, 2000);
  const t = G.t, w = W / z;
  const row1 = [
    (x) => drawAnya(ctx, x, 155, 1, makePose('idle', t)), (x) => drawAnya(ctx, x, 155, 1, makePose('punch', t, 1)),
    (x) => drawLoid(ctx, x, 155, 1, makePose('idle', t)), (x) => drawYor(ctx, x, 155, 1, Object.assign(makePose('idle', t), { weapon: true })),
    (x) => drawBond(ctx, x, 155, 1, 'idle', t),
    (x) => { ctx.save(); ctx.translate(x, 155); ctx.scale(0.62, 0.62); drawPenguin(ctx, t, 'idle', false, 0); ctx.restore(); },
  ];
  const row2 = [
    (x) => drawGuy(ctx, x, 325, 1, makePose('idle', t), STYLES.goon), (x) => drawGuy(ctx, x, 325, 1, makePose('idle', t), STYLES.redgoon),
    (x) => drawGuy(ctx, x, 325, 1, makePose('idle', t), STYLES.assassin), (x) => drawBombDog(ctx, x, 325, 1, t, 0, 0),
    (x) => drawBird(ctx, x, 295, 1, t, 'crow', 0), (x) => drawBird(ctx, x, 295, 1, t, 'plane', 0), (x) => drawBird(ctx, x, 295, 1, t, 'gull', 0),
    (x) => { ctx.save(); ctx.translate(x, 325); ctx.scale(0.62, 0.62); drawGuy(ctx, 0, 0, 1, makePose('idle', t), STYLES.keith); ctx.restore(); },
    (x) => { ctx.save(); ctx.translate(x, 325); ctx.scale(0.62, 0.62); drawGuy(ctx, 0, 0, 1, makePose('idle', t), STYLES.circus); ctx.restore(); },
    (x) => { ctx.save(); ctx.translate(x, 325); ctx.scale(0.62, 0.62); drawGuy(ctx, 0, 0, 1, makePose('idle', t), STYLES.killer); ctx.restore(); },
  ];
  row1.forEach((f, i) => f(30 + i * (w - 40) / row1.length));
  row2.forEach((f, i) => f(25 + i * (w - 30) / row2.length));
}
function render() {
  if (location.hash === '#gallery') { renderGallery(); return; }
  ctx.setTransform(DPR * SCALE, 0, 0, DPR * SCALE, 0, 0);
  const inGame = P && G.mode !== 'title' && G.mode !== 'map';
  const th = inGame ? L().theme : 'city';
  const cam = inGame ? G.camX : G.t * 70;
  const sx = G.shake ? rand(-G.shake, G.shake) : 0, sy = G.shake ? rand(-G.shake, G.shake) : 0;
  ctx.save(); ctx.translate(sx, sy - VIEW_TOP);
  drawBackground(ctx, th, cam, W, G.t);
  drawGround(ctx, th, cam, W, H);
  if (!inGame) {
    // 標題畫面：一家人一起跑
    const base = W / 2 + Math.sin(G.t * 0.7) * 20, y = GY;
    drawBond(ctx, base - 190, y, 1, 'run', G.t, 0.95);
    drawYor(ctx, base + 150, y, 1, makePose('run', G.t + 0.3), 1);
    drawLoid(ctx, base + 70, y, 1, makePose('run', G.t + 0.6), 1);
    drawAnya(ctx, base - 60, y, 1, makePose('run', G.t), 1.15);
    ctx.restore();
    return;
  }
  ctx.translate(-cam, 0);
  const vis = (x, m = 120) => x > cam - m && x < cam + W + m;
  for (const pl of platforms) if (pl.x + pl.w > cam - 20 && pl.x < cam + W + 20) drawPlatform(ctx, pl, th === 'night' ? 'city' : th);
  for (const c of crates) if (vis(c.x)) { shadow(c.x, GY, 26); drawCrate(ctx, c, th); }
  drawHazards();
  for (const it of items) if (vis(it.x, 40)) drawItem(ctx, it, G.t);
  for (const e of enemies) if (vis(e.x)) drawEnemy(e);
  if (G.boss) drawBoss(G.boss);
  for (const pt of partners) drawPartner(pt);
  drawPlayer();
  for (const s of shots) drawShot(s);
  for (const s of eshots) drawShot(s, true);
  drawBooms();
  if (G.ring) {
    const r = G.ring;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - r.r / (W * 1.3));
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.lineWidth = 14; ctx.strokeStyle = '#ff9cc8'; ctx.stroke();
    ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.restore();
  }
  drawParts();
  drawBubbles();
  ctx.restore();
  if (G.flash > 0) { ctx.save(); ctx.globalAlpha = Math.min(0.7, G.flash); ctx.fillStyle = G.flashColor; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  drawHUD();
  const sb = $('btnSuper');
  if (sb) sb.classList.toggle('ready', P.meter >= 100);
}

// ---------- 畫面切換 ----------
const SCREENS = ['title', 'map', 'pause', 'clear', 'over', 'ending'];
// 電腦沒有觸控螢幕就不顯示觸控按鈕（網址加 ?touch=1 可強制顯示）
const TOUCH = navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches || /touch=1/.test(location.search);
function showScreen(id) {
  SCREENS.forEach((s) => $(s).classList.toggle('hidden', s !== id));
  const playing = G.mode === 'play';
  pad.classList.toggle('hidden', !playing || !TOUCH);
  $('btnPause').classList.toggle('hidden', !playing);
}
function buildMap() {
  const box = $('levels');
  box.innerHTML = '';
  LEVELS.forEach((lv, i) => {
    const locked = i >= save.unlocked;
    const b = document.createElement('button');
    b.className = `lv-card th-${lv.theme}` + (locked ? ' locked' : '');
    const st = save.stars[i] || 0;
    b.innerHTML = `<span class="lv-no">第 ${i + 1} 關</span><span class="lv-name">${lv.name}</span>`
      + `<span class="lv-sub">${lv.sub}</span><span class="lv-boss">魔王：${lv.bossName}</span>`
      + `<span class="lv-stars">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</span>` + (locked ? '<span class="lv-lock">🔒</span>' : '');
    b.addEventListener('click', () => { if (!locked) startLevel(i); });
    box.appendChild(b);
  });
  document.querySelectorAll('#diff button').forEach((bt) => bt.classList.toggle('on', +bt.dataset.v === save.diff));
}
function goMap() { G.mode = 'map'; P = null; buildMap(); showScreen('map'); playSong(0); }
function startLevel(lv, fromBoss = false) {
  audioInit(); goFullscreen();
  G.lv = lv;
  const lvd = L();
  genLevel();
  const maxHp = save.diff === 0 ? 8 : 5;
  P = makePlayer(fromBoss ? lvd.len + 120 : 110, maxHp);
  P.peanuts = fromBoss ? 15 : save.diff === 0 ? 18 : 12;
  Object.assign(G, {
    camX: fromBoss ? lvd.len : 0, lock: null, boss: null, bossStarted: false, wave: null, waveDone: fromBoss,
    winT: -1, deadT: -1, ring: null, banner: null, slowT: 0, hitstop: 0, flash: 0, shake: 0,
    score: fromBoss ? G.scoreAtBoss : 0, reachedBoss: fromBoss,
  });
  if (fromBoss) { enemies = []; crates = []; G.triggers = []; P.x = lvd.len + W * 0.3 + 10; }
  G.mode = 'play'; showScreen(null);
  AU.paused = false;
  playSong(lvd.song);
  banner(lvd.name, `第 ${lv + 1} 關`, 2.2);
  bubble(P, '哇庫哇庫！出發！', 2, 0.5);
}
function pauseGame() { if (G.mode !== 'play') return; G.mode = 'pause'; AU.paused = true; showScreen('pause'); for (const k in touchHeld) touchHeld[k] = false; ptrKey.clear(); }
function resumeGame() { goFullscreen(); G.mode = 'play'; AU.paused = false; showScreen(null); }
function starsFor() { const r = P.hp / P.maxHp; return r >= 0.7 ? 3 : r >= 0.35 ? 2 : 1; }
function levelClear() {
  if (G.mode !== 'play') return;
  G.mode = 'clear';
  const st = starsFor();
  save.stars[G.lv] = Math.max(save.stars[G.lv] || 0, st);
  save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, G.lv + 2));
  save.best = Math.max(save.best, G.score);
  persist();
  $('clearStars').textContent = '★'.repeat(st) + '☆'.repeat(3 - st);
  $('clearScore').textContent = `分數 ${G.score}`;
  const last = G.lv === LEVELS.length - 1;
  $('btnNext').textContent = last ? '看結局' : '下一關';
  showScreen('clear');
}
function gameOver() {
  if (G.mode !== 'play') return;
  G.mode = 'over';
  $('btnBossRetry').classList.toggle('hidden', !G.reachedBoss);
  showScreen('over');
}

$('btnStart').addEventListener('click', () => { audioInit(); goFullscreen(); goMap(); });
$('btnBackTitle').addEventListener('click', () => { G.mode = 'title'; showScreen('title'); });
document.querySelectorAll('#diff button').forEach((bt) => bt.addEventListener('click', () => { save.diff = +bt.dataset.v; persist(); buildMap(); }));
$('btnPause').addEventListener('click', pauseGame);
$('btnResume').addEventListener('click', resumeGame);
$('btnRestart').addEventListener('click', () => startLevel(G.lv));
$('btnQuit').addEventListener('click', goMap);
$('btnNext').addEventListener('click', () => {
  if (G.lv === LEVELS.length - 1) { G.mode = 'ending'; showScreen('ending'); SFX.win(); playSong(0); }
  else startLevel(G.lv + 1);
});
$('btnMap2').addEventListener('click', goMap);
$('btnRetry').addEventListener('click', () => startLevel(G.lv));
$('btnBossRetry').addEventListener('click', () => startLevel(G.lv, true));
$('btnMap3').addEventListener('click', goMap);
$('btnEndMap').addEventListener('click', goMap);
$('btnMute').addEventListener('click', () => { audioInit(); setMuted(!save.muted); });

// ---------- 主迴圈 ----------
let last = performance.now(), acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let rdt = Math.min(0.1, (now - last) / 1000); last = now;
  if (G.hitstop > 0) G.hitstop -= rdt;
  else {
    if (G.slowT > 0) { G.slowT -= rdt; rdt *= 0.3; }
    acc += rdt;
    let n = 0;
    while (acc >= STEP && n < 6) { update(STEP); acc -= STEP; n++; for (const k in pressed) pressed[k] = false; }
    if (n === 6) acc = 0;
  }
  render();
}
if (TOUCH) {
  const iphone = /iPhone|iPod/.test(navigator.userAgent);
  document.querySelector('#title .hint').textContent = iphone && !STANDALONE
    ? '請把手機橫放 · iPhone 按「分享 → 加入主畫面」就能全螢幕玩'
    : '請把手機或 iPad 橫放 · 進入遊戲會自動全螢幕';
}
resize();
setMuted(save.muted);
showScreen('title');
requestAnimationFrame(frame);
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
// 測試用：用自訂事件快轉模擬（瀏覽器在背景時也能測），結果寫在 body 的 data-state
addEventListener('debug-sim', (e) => {
  const d = e.detail || {};
  if (d.start != null) startLevel(d.start, !!d.fromBoss);
  if (d.keys) for (const k in d.keys) { kbHeld[k] = d.keys[k]; if (d.keys[k]) pressed[k] = true; }
  if (d.god && P) P.hp = P.maxHp;
  for (let i = 0; i < (d.n || 0); i++) {
    if (d.god && P) { P.hp = P.maxHp; P.dead = false; G.deadT = -1; }
    if (d.mash && i % 14 === 0) pressed.punch = true;
    if (d.mash && i % 40 === 0) pressed.throw = true;
    if (d.mash && i % 50 === 25) pressed.jump = true;
    if (d.mash && P && P.meter >= 100) pressed.super = true;
    update(STEP); for (const k in pressed) pressed[k] = false;
  }
  document.body.dataset.state = JSON.stringify({
    mode: G.mode, x: P && Math.round(P.x), hp: P && P.hp, peanuts: P && P.peanuts, meter: P && Math.round(P.meter),
    enemies: enemies.length, boss: G.boss && { hp: Math.round(G.boss.hp), state: G.boss.state, kind: G.boss.kind },
    flyers: enemies.filter((e) => e.fly && e.active).map((e) => `${e.state}@${Math.round(e.x)},${Math.round(e.y)}`),
    partners: partners.map((p) => p.kind + ':' + p.state), score: G.score, lock: !!G.lock, wave: !!G.wave, winT: G.winT,
  });
});
