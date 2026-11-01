import * as THREE from './lib/three.module.min.js';
import { TRACKS } from './tracks.js';

// ================= 小工具 =================
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const wrapAngle = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
let seed = 7;
const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

// ================= 遊戲設定 =================
const LAPS = 3;      // 圈數
const N = 1200;      // 賽道取樣點數
const HW = 11;       // 賽道半寬
const DIFF = [0.84, 0.93, 1.0];
const SPEED_MUL = [1, 0.8, 0.65];   // 車速：標準／慢一點／更慢
// 測試用網址參數：?auto=1 自動駕駛、?ts=4 四倍速
const params = new URLSearchParams(location.search);
const AUTO = params.has('auto'), TS = clamp(+params.get('ts') || 1, 1, 8);

const RACERS = [
  { name: '開心安妮亞', tag: '哇庫哇庫！抱著奇美拉出發', img: 'img/racer1.png', theme: '#ffc94d',
    outfit: 'dress', face: 'happy', plush: true, stats: { speed: 3, accel: 5, handling: 3 } },
  { name: '睡衣安妮亞', tag: '睡飽了才跑得快', img: 'img/racer2.png', theme: '#a99bea',
    outfit: 'pajama', face: 'sleepy', hat: true, stats: { speed: 3, accel: 3, handling: 5 } },
  { name: '驚嚇安妮亞', tag: '嚇一大跳，衝第一！', img: 'img/racer3.png', theme: '#66c4f2',
    outfit: 'dress', face: 'shock', stats: { speed: 5, accel: 3, handling: 3 } },
  { name: '運動安妮亞', tag: '綁好包包頭，全力衝刺', img: 'img/racer4.png', theme: '#f7a8c8',
    outfit: 'sport', face: 'surprised', bun: true, stats: { speed: 4, accel: 4, handling: 3 } },
];

// ================= 渲染器 =================
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 1600);

// 卡通材質
const gradTex = new THREE.DataTexture(new Uint8Array([110, 185, 255]), 3, 1, THREE.RedFormat);
gradTex.minFilter = gradTex.magFilter = THREE.NearestFilter;
gradTex.needsUpdate = true;
const matCache = new Map();
function toon(color, opts = {}) {
  const key = color + (opts.side ? 'd' : '');
  if (!opts.map && matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshToonMaterial({ color, gradientMap: gradTex, ...opts });
  if (!opts.map) matCache.set(key, m);
  return m;
}
function mesh(geo, mat, x = 0, y = 0, z = 0, parent = null) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  if (parent) parent.add(m);
  return m;
}
function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function drawStar(g, cx, cy, R, r) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R;
    g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  g.closePath(); g.fill();
}

// ================= 安妮亞 3D 模型 =================
function faceTexture(type) {
  return canvasTex(768, 500, (g, W) => {
    const ex = [W / 2 - 125, W / 2 + 125], ey = 238;
    g.lineCap = 'round'; g.lineJoin = 'round';
    if (type === 'shock') {
      const gr = g.createLinearGradient(0, 40, 0, 340);
      gr.addColorStop(0, 'rgba(80,80,130,0.6)'); gr.addColorStop(1, 'rgba(80,80,130,0)');
      g.fillStyle = gr; g.fillRect(W / 2 - 280, 40, 560, 300);
    }
    // 腮紅
    g.fillStyle = 'rgba(255,130,130,0.5)';
    for (const x of [W / 2 - 200, W / 2 + 200]) { g.beginPath(); g.ellipse(x, 335, 44, 22, 0, 0, Math.PI * 2); g.fill(); }
    // 眼睛
    for (const x of ex) {
      const side = x < W / 2 ? -1 : 1;
      if (type === 'sleepy') {
        g.strokeStyle = '#2b1d1d'; g.lineWidth = 13;
        g.beginPath(); g.arc(x, ey + 40, 56, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
        g.lineWidth = 6; g.beginPath(); g.moveTo(x + 50 * side, ey + 18); g.lineTo(x + 70 * side, ey + 8); g.stroke();
      } else if (type === 'shock') {
        g.fillStyle = '#fff'; g.strokeStyle = '#2b1d1d'; g.lineWidth = 9;
        g.beginPath(); g.ellipse(x, ey, 62, 72, 0, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = '#183528'; g.beginPath(); g.arc(x, ey + 4, 12, 0, Math.PI * 2); g.fill();
        g.lineWidth = 5; g.beginPath(); g.moveTo(x - 40, ey + 95); g.lineTo(x + 40, ey + 92); g.stroke();
      } else {
        g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, ey, 58, 70, 0, 0, Math.PI * 2); g.fill();
        const ir = g.createLinearGradient(0, ey - 60, 0, ey + 64);
        ir.addColorStop(0, '#0b4f3b'); ir.addColorStop(0.55, '#1c9e76'); ir.addColorStop(1, '#8be6c0');
        g.fillStyle = ir; g.beginPath(); g.ellipse(x, ey + 5, 46, 60, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#0b3a2b'; g.lineWidth = 4; g.stroke();
        g.fillStyle = '#fff'; drawStar(g, x, ey + 8, 22, 9);
        g.beginPath(); g.arc(x - 24 * -side, ey - 30, 9, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#2b1d1d'; g.lineWidth = 13;
        g.beginPath(); g.ellipse(x, ey + 2, 63, 75, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
        g.lineWidth = 7; g.beginPath(); g.moveTo(x + 56 * side, ey - 30); g.lineTo(x + 78 * side, ey - 46); g.stroke();
      }
    }
    // 嘴巴
    const mx = W / 2;
    g.strokeStyle = '#3a1a1a'; g.lineWidth = 6;
    if (type === 'happy') {
      g.fillStyle = '#9b2f3a';
      g.beginPath(); g.moveTo(mx - 48, 360); g.lineTo(mx + 48, 360); g.ellipse(mx, 360, 48, 46, 0, 0, Math.PI); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#ff8c95'; g.beginPath(); g.ellipse(mx, 392, 26, 13, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.fillRect(mx - 40, 362, 80, 10);
    } else if (type === 'sleepy') {
      g.beginPath(); g.arc(mx, 335, 30, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
    } else if (type === 'shock') {
      g.fillStyle = '#9b2f3a';
      g.beginPath(); g.roundRect(mx - 48, 345, 96, 100, 22); g.fill(); g.stroke();
      g.fillStyle = '#fff'; g.fillRect(mx - 40, 350, 80, 12);
      g.fillStyle = '#9fdcff';
      for (const [sx, sy] of [[mx + 250, 250], [mx - 255, 300]]) {
        g.beginPath(); g.moveTo(sx, sy - 26); g.quadraticCurveTo(sx + 16, sy, sx, sy + 12); g.quadraticCurveTo(sx - 16, sy, sx, sy - 26); g.fill();
      }
    } else {
      g.fillStyle = '#9b2f3a'; g.beginPath(); g.ellipse(mx, 372, 17, 22, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    }
  });
}

function starTexture() {
  const t = canvasTex(256, 256, (g, W, H) => {
    g.fillStyle = '#76c7c9'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffffff';
    for (const [x, y, r] of [[40, 50, 26], [150, 30, 22], [220, 120, 26], [90, 150, 28], [190, 220, 22], [30, 220, 20]]) drawStar(g, x, y, r, r * 0.45);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 1);
  return t;
}

function buildAnya(cfg) {
  const root = new THREE.Group();
  const HAIR = '#f4a3a0', SKIN = '#ffe6d8', BLACK = '#3d3638';
  const top = cfg.outfit === 'dress' ? BLACK : cfg.outfit === 'pajama' ? '#7ccbcc' : '#7fd3c6';
  const bottom = cfg.outfit === 'dress' ? BLACK : cfg.outfit === 'pajama' ? '#7ccbcc' : '#ffe066';

  // 坐姿雙腿
  for (const sx of [-0.17, 0.17]) {
    const leg = mesh(new THREE.CapsuleGeometry(0.12, 0.42, 4, 8), toon(cfg.outfit === 'sport' ? SKIN : bottom), sx, 0.45, 0.38, root);
    leg.rotation.x = Math.PI / 2;
  }
  mesh(new THREE.CylinderGeometry(0.36, 0.47, 0.34, 16), toon(bottom), 0, 0.52, 0, root);
  mesh(new THREE.CylinderGeometry(0.27, 0.36, 0.56, 16), toon(top), 0, 0.9, 0, root);
  if (cfg.outfit === 'dress') {
    mesh(new THREE.TorusGeometry(0.2, 0.05, 6, 16), toon('#f0a0a0'), 0, 1.15, 0.02, root).rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) {
      const r = mesh(new THREE.ConeGeometry(0.06, 0.16, 4), toon('#ffffff'), 0.06 * s, 1.08, 0.27, root);
      r.rotation.z = Math.PI / 2 * s;
    }
  } else if (cfg.outfit === 'pajama') {
    for (let i = 0; i < 3; i++) mesh(new THREE.SphereGeometry(0.03, 6, 6), toon('#ffffff'), 0, 1.08 - i * 0.14, 0.31 + i * 0.02, root);
  }
  // 雙手握方向盤
  for (const s of [-1, 1]) {
    const sh = new THREE.Vector3(0.32 * s, 1.07, 0.02);
    const hand = new THREE.Vector3(0.24 * s, 0.78, 0.66);
    const dir = hand.clone().sub(sh);
    const len = dir.length();
    dir.normalize();
    const ag = new THREE.CylinderGeometry(0.1, 0.085, len, 10);
    ag.translate(0, len / 2, 0);
    const arm = mesh(ag, toon(cfg.outfit === 'sport' ? SKIN : top), sh.x, sh.y, sh.z, root);
    arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    if (cfg.outfit === 'sport') mesh(new THREE.SphereGeometry(0.14, 10, 8), toon(top), sh.x, sh.y, sh.z, root);
    mesh(new THREE.SphereGeometry(0.1, 10, 8), toon(SKIN), hand.x, hand.y, hand.z, root);
  }

  // 頭
  const head = new THREE.Group();
  head.position.set(0, 1.62, 0.02);
  root.add(head);
  const skull = new THREE.Group();
  skull.scale.set(1, 0.94, 0.96);
  head.add(skull);
  mesh(new THREE.SphereGeometry(0.55, 32, 24), toon(SKIN), 0, 0, 0, skull);
  const FL = Math.PI * 0.7;
  const face = new THREE.Mesh(
    new THREE.SphereGeometry(0.556, 32, 16, Math.PI / 2 - FL / 2, FL, Math.PI * 0.3, Math.PI * 0.45),
    new THREE.MeshToonMaterial({ map: faceTexture(cfg.face), gradientMap: gradTex, transparent: true, depthWrite: false }));
  skull.add(face);

  const hairM = toon(HAIR, { side: THREE.DoubleSide });
  mesh(new THREE.SphereGeometry(0.6, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.4), hairM, 0, 0, 0, skull);
  const back = mesh(new THREE.SphereGeometry(0.61, 32, 20, Math.PI * 0.9, Math.PI * 1.2, 0, Math.PI * 0.8), hairM, 0, 0, 0, skull);
  back.scale.set(1.08, 1, 1.05);
  // 瀏海
  for (const a of [-0.78, -0.47, -0.16, 0.16, 0.47, 0.78]) {
    const bg = new THREE.Group();
    bg.rotation.y = a;
    skull.add(bg);
    const b = mesh(new THREE.ConeGeometry(0.15, 0.4, 8), hairM, 0, 0.25, 0.555, bg);
    b.rotation.x = Math.PI - 0.32;
    b.scale.z = 0.45;
  }
  // 兩側長髮
  for (const s of [-1, 1]) {
    const lock = mesh(new THREE.CapsuleGeometry(0.11, 0.42, 4, 8), hairM, 0.5 * s, -0.2, 0.16, skull);
    lock.rotation.z = 0.12 * s;
  }
  if (!cfg.hat) {
    // 呆毛
    const ah = mesh(new THREE.ConeGeometry(0.05, 0.28, 6), hairM, 0.04, 0.66, 0.08, skull);
    ah.rotation.z = -0.5;
    // 招牌黑色髮飾
    for (const s of [-1, 1]) {
      const hg = new THREE.Group();
      hg.position.set(0.37 * s, 0.43, -0.02);
      hg.rotation.z = -0.55 * s;
      skull.add(hg);
      mesh(new THREE.ConeGeometry(0.16, 0.34, 4), toon('#2e2627'), 0, 0.12, 0, hg).rotation.y = Math.PI / 4;
      mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.07, 4), toon('#c9a64a'), 0, -0.06, 0, hg).rotation.y = Math.PI / 4;
    }
  }
  if (cfg.bun) mesh(new THREE.SphereGeometry(0.21, 14, 12), hairM, 0.32, 0.28, -0.4, skull);
  if (cfg.hat) {
    const hatM = toon('#ffffff', { map: starTexture() });
    const hg = new THREE.Group();
    hg.position.set(0, 0.34, -0.03);
    hg.rotation.set(-0.12, 0, -0.32);
    skull.add(hg);
    mesh(new THREE.CylinderGeometry(0.645, 0.66, 0.22, 24), hatM, 0, 0, 0, hg);
    mesh(new THREE.ConeGeometry(0.63, 0.95, 24), hatM, 0, 0.58, 0, hg);
    mesh(new THREE.SphereGeometry(0.15, 12, 10), toon('#ffffff'), 0, 1.05, 0, hg);
  }
  root.userData.head = head;
  return root;
}

function buildPlush() {
  const g = new THREE.Group();
  const pink = toon('#ef7f86'), green = toon('#3fae7d'), black = toon('#222222');
  mesh(new THREE.SphereGeometry(0.22, 14, 12), pink, 0, 0, 0, g).scale.set(1, 1.1, 0.9);
  mesh(new THREE.SphereGeometry(0.17, 14, 12), pink, 0, 0.28, 0.06, g);
  for (const s of [-1, 1]) {
    const w = mesh(new THREE.ConeGeometry(0.13, 0.32, 3), green, 0.24 * s, 0.14, -0.08, g);
    w.rotation.z = -1.2 * s;
    w.scale.z = 0.3;
    mesh(new THREE.SphereGeometry(0.025, 6, 6), black, 0.07 * s, 0.32, 0.21, g);
  }
  for (let i = 0; i < 4; i++) mesh(new THREE.ConeGeometry(0.045, 0.12, 5), green, 0, 0.44 - i * 0.09, -0.06 - i * 0.05, g).rotation.x = -0.5;
  return g;
}

// ================= 卡丁車 =================
function buildKart(cfg) {
  const kart = new THREE.Group();
  const body = new THREE.Group();
  kart.add(body);
  const theme = toon(cfg.theme), dark = toon('#2f3340'), white = toon('#ffffff'), metal = toon('#b8bcc8');
  mesh(new THREE.BoxGeometry(1.9, 0.42, 2.9), theme, 0, 0.55, -0.1, body);
  mesh(new THREE.BoxGeometry(1.3, 0.34, 1.1), theme, 0, 0.55, 1.75, body).rotation.x = 0.12;
  mesh(new THREE.BoxGeometry(2.3, 0.22, 0.36), dark, 0, 0.42, 2.28, body);
  for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.36, 0.42, 1.6), white, 1.06 * s, 0.56, -0.1, body);
  mesh(new THREE.BoxGeometry(1.1, 0.95, 0.25), dark, 0, 1.05, -0.78, body);
  mesh(new THREE.BoxGeometry(1.2, 0.5, 0.7), metal, 0, 0.88, -1.3, body);
  for (const s of [-1, 1]) {
    mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.5, 10), dark, 0.36 * s, 0.86, -1.7, body).rotation.x = Math.PI / 2;
    mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), dark, 0.62 * s, 1.22, -1.5, body);
  }
  mesh(new THREE.BoxGeometry(2.2, 0.09, 0.55), theme, 0, 1.52, -1.55, body);
  mesh(new THREE.BoxGeometry(1.2, 0.3, 0.3), dark, 0, 0.88, 0.78, body);
  const col = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), dark, 0, 1.02, 0.6, body);
  col.rotation.x = -0.9;
  const wheel = mesh(new THREE.TorusGeometry(0.24, 0.045, 8, 20), dark, 0, 1.22, 0.42, body);
  wheel.rotation.x = -0.5;

  const wheels = [], steers = [];
  const tireGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.4, 18); tireGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.42, 12); hubGeo.rotateZ(Math.PI / 2);
  const spokeGeo = new THREE.BoxGeometry(0.43, 0.38, 0.09);
  const tireM = toon('#26262c');
  for (const [x, z, front] of [[-1.12, 1.15, 1], [1.12, 1.15, 1], [-1.18, -1.05, 0], [1.18, -1.05, 0]]) {
    const st = new THREE.Group();
    st.position.set(x, 0.44, z);
    kart.add(st);
    const spin = new THREE.Group();
    st.add(spin);
    mesh(tireGeo, tireM, 0, 0, 0, spin);
    mesh(hubGeo, white, 0, 0, 0, spin);
    mesh(spokeGeo, theme, 0, 0, 0, spin);
    if (!front) spin.scale.x = 1.25;
    wheels.push(spin);
    if (front) steers.push(st);
  }

  const driver = buildAnya(cfg);
  driver.position.set(0, 0.45, -0.25);
  body.add(driver);
  if (cfg.plush) {
    const p = buildPlush();
    p.position.set(-0.98, 1.05, 0.45);
    p.rotation.y = 0.4;
    body.add(p);
  }

  const flameM = new THREE.MeshBasicMaterial({ color: '#ffb02e' });
  const flames = [];
  for (const s of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.7, 8), flameM);
    f.rotation.x = -Math.PI / 2;
    f.position.set(0.36 * s, 0.86, -2.25);
    f.visible = false;
    body.add(f);
    flames.push(f);
  }
  const shield = new THREE.Mesh(new THREE.SphereGeometry(2.7, 24, 16),
    new THREE.MeshBasicMaterial({ color: '#7fd8ff', transparent: true, opacity: 0.3, depthWrite: false }));
  shield.position.y = 1.3;
  shield.visible = false;
  kart.add(shield);
  const dog = buildDog();
  dog.position.set(0, 0, 5.3);
  dog.scale.setScalar(1.35);
  dog.visible = false;
  kart.add(dog);
  // 車頭燈與前方光圈（夜晚賽道才顯示）
  const lights = new THREE.Group();
  const headM = new THREE.MeshBasicMaterial({ color: '#fff6c8' });
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), headM); h.position.set(0.5 * s, 0.6, 2.45); lights.add(h); }
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(7, 12), new THREE.MeshBasicMaterial({ map: headlightTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  beam.rotation.x = -Math.PI / 2;
  beam.position.set(0, 0.15, 8.5);
  lights.add(beam);
  lights.visible = false;
  body.add(lights);
  kart.userData = { body, wheels, steers, flames, shield, dog, lights, head: driver.userData.head };
  return kart;
}

let _hlTex = null;
function headlightTex() {
  if (_hlTex) return _hlTex;
  _hlTex = canvasTex(64, 128, (g, W, H) => {
    const gr = g.createRadialGradient(W / 2, H, 4, W / 2, H * 0.55, H * 0.6);
    gr.addColorStop(0, 'rgba(255,245,200,0.55)'); gr.addColorStop(1, 'rgba(255,245,200,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  });
  return _hlTex;
}

// 彭德：拉車的大白狗
function buildDog() {
  const g = new THREE.Group();
  const white = toon('#fbfaf6'), grey = toon('#d9d6cf'), black = toon('#222222'), pink = toon('#ff8fa3');
  const body = mesh(new THREE.CapsuleGeometry(0.6, 1.3, 6, 12), white, 0, 1.25, 0, g);
  body.rotation.x = Math.PI / 2;
  const head = new THREE.Group();
  head.position.set(0, 1.85, 1.15);
  g.add(head);
  mesh(new THREE.SphereGeometry(0.55, 16, 12), white, 0, 0, 0, head);
  mesh(new THREE.SphereGeometry(0.3, 12, 10), white, 0, -0.12, 0.42, head).scale.set(1, 0.8, 1);
  mesh(new THREE.SphereGeometry(0.09, 8, 8), black, 0, -0.04, 0.72, head);
  mesh(new THREE.SphereGeometry(0.1, 8, 6), pink, 0, -0.32, 0.6, head).scale.set(1, 0.5, 1);
  for (const s of [-1, 1]) {
    mesh(new THREE.SphereGeometry(0.07, 8, 8), black, 0.2 * s, 0.13, 0.48, head);
    const ear = mesh(new THREE.SphereGeometry(0.22, 10, 8), grey, 0.48 * s, 0.05, -0.05, head);
    ear.scale.set(0.45, 1.1, 0.8);
  }
  const legs = [];
  for (const [x, z] of [[-0.35, 0.75], [0.35, 0.75], [-0.35, -0.75], [0.35, -0.75]]) {
    const hip = new THREE.Group();
    hip.position.set(x, 1.0, z);
    g.add(hip);
    mesh(new THREE.CapsuleGeometry(0.17, 0.55, 4, 8), white, 0, -0.45, 0, hip);
    legs.push(hip);
  }
  const tail = mesh(new THREE.CapsuleGeometry(0.15, 0.5, 4, 8), white, 0, 1.6, -1.25, g);
  tail.rotation.x = -0.8;
  // 牽繩
  const rope = mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), toon('#e2577f'), 0, 0.8, -1.9, g);
  rope.rotation.x = Math.PI / 2 - 0.15;
  g.userData.legs = legs;
  return g;
}

function nameTag(cfg) {
  const t = canvasTex(256, 64, (g, W, H) => {
    g.fillStyle = cfg.theme; g.beginPath(); g.roundRect(4, 4, W - 8, H - 8, 28); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 5; g.stroke();
    g.fillStyle = '#4a2a3a'; g.font = '900 32px "PingFang TC", "Microsoft JhengHei", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(cfg.name, W / 2, H / 2 + 2);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false }));
  s.scale.set(3.6, 0.9, 1);
  s.position.y = 3.6;
  s.renderOrder = 10;
  return s;
}

// ================= 賽道 =================
// 每條賽道的路線、配色與機關寫在 tracks.js；這裡負責把賽道建出來，並提供高度、位置等查詢
let TRACK = null, world = null, trackIndex = -1;
let pts = [], TAN = [], SIDE = [], SPACING = 1, isDeck = [];
let GAP = null, BRIDGE_I = -1, BC = null, BT = null, BS = null, GAP0 = -1, CANYON_Y = -24, GAP_HALF = 10;
let CREST = 0, RAMPS = [], LAYOUT = {};
let OFFROAD = 20;   // 可以開出路面多遠（之外是看不見的邊界）
let hillFn = countryHill;

function countryHill(x, z) {
  const r = Math.hypot(x, z);
  return 3 + 5 * Math.sin(x * 0.012 + 0.5) * Math.cos(z * 0.014) + 2.5 * Math.sin(x * 0.033) * Math.sin(z * 0.029 + 1.1)
    + Math.max(0, r - 290) * 0.5;
}
function cityHill(x, z) {
  return Math.max(0, Math.hypot(x, z) - 380) * 0.3;
}
function snowHill(x, z) {
  const r = Math.hypot(x, z);
  return 5 + 7 * Math.sin(x * 0.011 + 0.4) * Math.cos(z * 0.013) + 3 * Math.sin(x * 0.03) * Math.sin(z * 0.027 + 1.1)
    + 45 * Math.exp(-((x - 20) ** 2 + (z + 30) ** 2) / 8000) + Math.max(0, r - 270) * 0.7;
}

// 峽谷／冰湖：一條橫越賽道的深谷，中間斷了一段要飛過去
function canyonF(x, z) {
  if (!GAP) return 0;
  const dx = x - BC.x, dz = z - BC.z;
  const t = Math.abs(dx * BT.x + dz * BT.z), s = Math.abs(dx * BS.x + dz * BS.z);
  return (1 - smooth(GAP_HALF + 4, GAP_HALF + 14, t)) * (1 - smooth(GAP.side - 30, GAP.side, s));
}
const inGap = (i) => !!GAP && Math.abs((pts[i].x - BC.x) * BT.x + (pts[i].z - BC.z) * BT.z) < GAP_HALF;
function rampH(s) {
  for (const r of RAMPS) { const k = s - r.i0; if (k >= 0 && k < r.len) return r.h * k / r.len; }
  return 0;
}
function roadY(s) {
  const i = Math.floor(s) % N, f = s - Math.floor(s);
  return lerp(pts[i].y, pts[(i + 1) % N].y, f);
}
function groundY(x, z, i, dist) {
  return lerp(lerp(pts[i].y, hillFn(x, z), smooth(HW + 3, HW + 45, dist)), CANYON_Y, canyonF(x, z));
}
// 車子/物體腳下的高度（含跳台、高架橋、橋面、峽谷）
function surfaceY(o) {
  const al = Math.abs(o.lat), ry = roadY(o.s);
  if (isDeck[o.idx]) return ry + (al <= HW + 1.6 ? rampH(o.s) : 0);   // 高架橋有欄杆，不會掉下去
  let y = lerp(ry, hillFn(o.x, o.z), smooth(HW + 3, HW + 45, al));
  const c = canyonF(o.x, o.z);
  if (c > 0) y = al <= HW + 1.6 && !inGap(o.idx) ? ry : lerp(y, CANYON_Y, c);
  if (al <= HW + 1.6) y += rampH(o.s);
  return y;
}
// 找最近的賽道點；skipDeck 時略過高架橋（地形要貼著下面那條路）
function nearestIdx(x, z, step = 1, skipDeck = false) {
  let best = 0, bd = Infinity;
  for (let i = 0; i < N; i += step) {
    if (skipDeck && isDeck[i]) continue;
    const d = (pts[i].x - x) ** 2 + (pts[i].z - z) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return [best, Math.sqrt(bd)];
}
const headingAt = (i) => Math.atan2(TAN[i].x, TAN[i].z);
// 佈景剛好壓在看不見的邊界上時，車子會被夾進去，所以這種位置不放東西
const onBoundary = (d, r) => d + r > HW + OFFROAD - 0.5 && d - r < HW + OFFROAD + 1.8;
const latPos = (i, lat) => [pts[i].x + SIDE[i].x * lat, pts[i].z + SIDE[i].z * lat];

function loadTrack(k) {
  const cfg = TRACKS[k];
  trackIndex = k;
  TRACK = cfg;
  if (world) {
    scene.remove(world);
    world.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }
  world = new THREE.Group();
  scene.add(world);
  seed = 7;
  const curve = new THREE.CatmullRomCurve3(cfg.ctrl.map(([x, y, z]) => new THREE.Vector3(x, y, z)), true, 'centripetal');
  pts = curve.getSpacedPoints(N);
  pts.pop();
  TAN = []; SIDE = [];
  for (let i = 0; i < N; i++) {
    const a = pts[(i - 1 + N) % N], b = pts[(i + 1) % N];
    const t = new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize();
    TAN.push(t);
    SIDE.push(new THREE.Vector3(t.z, 0, -t.x));
  }
  SPACING = curve.getLength() / N;
  hillFn = cfg.hill === 'snow' ? snowHill : cfg.flat ? cityHill : countryHill;
  OFFROAD = cfg.offroad ?? 20;
  isDeck = pts.map((p) => cfg.deckAbove != null && p.y > cfg.deckAbove);
  GAP = cfg.gap || null;
  GAP0 = -1; BRIDGE_I = -1;
  if (GAP) {
    BRIDGE_I = nearestIdx(GAP.x, GAP.z)[0];
    BC = pts[BRIDGE_I]; BT = TAN[BRIDGE_I]; BS = SIDE[BRIDGE_I];
    CANYON_Y = GAP.depth; GAP_HALF = GAP.half;
    GAP0 = BRIDGE_I;
    while (inGap((GAP0 - 1 + N) % N)) GAP0 = (GAP0 - 1 + N) % N;
  }
  CREST = 0;
  if (cfg.crest) { CREST = cfg.crest[0]; for (let i = cfg.crest[0]; i < cfg.crest[1]; i++) if (pts[i].y > pts[CREST].y) CREST = i; }
  const T = { N, near: (x, z) => nearestIdx(x, z)[0], GAP0, CREST, idxGap: (a, b) => (b - a + N) % N };
  LAYOUT = Object.assign({ ramps: [], pads: [], signs: [], boxes: [], obstacles: [], villains: [], peanuts: [], zones: [],
    lasers: [], snowballs: [], dividers: [], tunnels: [], crosswalks: [], ghosts: [], penguins: [], traffic: null }, cfg.layout(T));
  RAMPS = LAYOUT.ramps;
  for (const a of [pads, peanuts, itemBoxes, obstacles, villains, bombs, smokes, effects, lasers, traffic, snowballs, scrollTex, solids, ghosts, penguins]) a.length = 0;
  solidGrid.clear();
  snowfall = null;
  buildWorld();
  if (cfg.decor) cfg.decor({ THREE, world, toon, mesh, canvasTex, rand, pts, TAN, SIDE, N, HW, nearestIdx, groundY, canyonF, gradTex, addSolid, onBoundary });
  initMinimap();
  for (const m of [...raceModels, ...previewModels]) m.userData.lights.visible = !!cfg.theme.night;
}

function buildWorld() {
  const th = TRACK.theme;
  // 天空、霧、燈光
  scene.background = canvasTex(4, 256, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, th.sky[0]); gr.addColorStop(0.6, th.sky[1]); gr.addColorStop(1, th.sky[2]);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  });
  scene.fog = new THREE.Fog(th.fog[0], th.fog[1], th.fog[2]);
  hemi.color.set(th.hemi[0]); hemi.groundColor.set(th.hemi[1]); hemi.intensity = th.hemi[2];
  sun.color.set(th.sun[0]); sun.intensity = th.sun[1];

  // 地形
  const SIZE = 960, SEG = 160;
  const tg = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  tg.rotateX(-Math.PI / 2);
  const pos = tg.attributes.position, cols = [];
  const gc = th.ground;
  const cA = new THREE.Color(gc.a), cB = new THREE.Color(gc.b), cEdge = new THREE.Color(gc.edge), cHigh = new THREE.Color(gc.high), cCliff = new THREE.Color(gc.cliff);
  const tmp = new THREE.Color();
  for (let v = 0; v < pos.count; v++) {
    const x = pos.getX(v), z = pos.getZ(v);
    let [i, d] = nearestIdx(x, z, 3, true);
    for (let k = -3; k <= 3; k++) {
      const j = (i + k + N) % N;
      if (isDeck[j]) continue;
      const dd = Math.hypot(pts[j].x - x, pts[j].z - z);
      if (dd < d) { d = dd; i = j; }
    }
    const k = smooth(HW + 3, HW + 45, d);
    const y = groundY(x, z, i, d) - 0.25 * (1 - k);
    pos.setY(v, y);
    tmp.copy(cA).lerp(cB, (Math.sin(x * 0.07) * Math.cos(z * 0.05) + 1) / 2);
    if (d < HW + 3.5) tmp.copy(cEdge);
    if (y > 18) tmp.lerp(cHigh, clamp((y - 18) / 30, 0, 1));
    const cf = canyonF(x, z);
    if (cf > 0.02) tmp.lerp(cCliff, clamp(cf * 1.6, 0, 1));
    cols.push(tmp.r, tmp.g, tmp.b);
  }
  tg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, new THREE.MeshLambertMaterial({ vertexColors: true }));
  terrain.receiveShadow = true;
  world.add(terrain);

  // 路面與路緣
  const rc = th.road;
  const roadTex = canvasTex(256, 256, (g, W, H) => {
    g.fillStyle = rc.base; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${rand() > 0.5 ? 255 : 0},${rand() > 0.5 ? 255 : 0},255,0.05)`; g.fillRect(rand() * W, rand() * H, 2, 2); }
    g.fillStyle = rc.edge; g.fillRect(6, 0, 7, H); g.fillRect(W - 13, 0, 7, H);
    g.fillStyle = rc.center; g.fillRect(W / 2 - 4, 20, 8, H / 2 - 20);
  });
  roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
  const road = new THREE.Mesh(ribbon(-HW, HW, 0.03, 18), new THREE.MeshLambertMaterial({ map: roadTex }));
  road.receiveShadow = true;
  world.add(road);
  const curbTex = canvasTex(4, 64, (g, W, H) => { g.fillStyle = th.curb[0]; g.fillRect(0, 0, W, H / 2); g.fillStyle = th.curb[1]; g.fillRect(0, H / 2, W, H / 2); });
  curbTex.wrapS = curbTex.wrapT = THREE.RepeatWrapping;
  curbTex.magFilter = THREE.NearestFilter;
  const curbM = new THREE.MeshLambertMaterial({ map: curbTex });
  for (const s of [-1, 1]) {
    const c = new THREE.Mesh(ribbon(s < 0 ? -HW - 1.6 : HW, s < 0 ? -HW : HW + 1.6, 0.08, 4), curbM);
    c.receiveShadow = true;
    world.add(c);
  }

  // 起跑線與拱門
  const chk = canvasTex(128, 32, (g) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) { g.fillStyle = (x + y) % 2 ? '#222' : '#fff'; g.fillRect(x * 8, y * 8, 8, 8); } });
  const p0 = pts[0], h0 = headingAt(0);
  const line = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, 3), new THREE.MeshLambertMaterial({ map: chk }));
  line.rotation.set(-Math.PI / 2, h0, 0, 'YXZ');
  line.position.set(p0.x, p0.y + 0.06, p0.z);
  line.receiveShadow = true;
  world.add(line);
  const arch = new THREE.Group();
  arch.position.copy(p0);
  arch.rotation.y = h0;
  world.add(arch);
  for (const s of [-1, 1]) {
    mesh(new THREE.BoxGeometry(1.2, 9, 1.2), toon(th.arch.color), (HW + 2.4) * s, 4.5, 0, arch);
    const [ax, az] = latPos(0, (HW + 2.4) * s);
    addSolid({ x: ax, z: az, r: 0.9 });
  }
  const bannerTex = canvasTex(1024, 128, (g, W, H) => {
    g.fillStyle = '#3d3638'; g.fillRect(0, 0, W, H);
    if (th.arch.neon) { g.shadowColor = th.arch.color; g.shadowBlur = 20; }
    g.fillStyle = th.arch.neon ? '#ffe6fb' : '#ffd36b'; g.font = '900 70px "PingFang TC", "Microsoft JhengHei", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(th.arch.text, W / 2, H / 2 + 4);
  });
  const faceM = th.arch.neon ? new THREE.MeshBasicMaterial({ map: bannerTex }) : toon('#ffffff', { map: bannerTex });
  mesh(new THREE.BoxGeometry(HW * 2 + 6, 2.2, 0.6), [toon('#3d3638'), toon('#3d3638'), toon('#3d3638'), toon('#3d3638'), faceM, faceM], 0, 9, 0, arch);

  buildTrees(th.trees);
  buildHouses(th.houses || 0);
  if (th.clouds) buildClouds(th.snow ? '#f4f7fb' : '#ffffff');

  // 加速板
  const padTex = canvasTex(64, 128, (g, W, H) => {
    g.fillStyle = '#ff9a1f'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#fff36b';
    for (let k = 0; k < 3; k++) { const y = 18 + k * 40; g.beginPath(); g.moveTo(8, y + 24); g.lineTo(W / 2, y); g.lineTo(W - 8, y + 24); g.lineTo(W - 8, y + 36); g.lineTo(W / 2, y + 12); g.lineTo(8, y + 36); g.fill(); }
  });
  padTex.wrapS = THREE.RepeatWrapping;
  for (const [i, lat, w] of LAYOUT.pads) {
    const p = pts[i], [x, z] = latPos(i, lat);
    const t = new THREE.MeshBasicMaterial({ map: padTex.clone() });
    t.map.repeat.set(w / 2.3, 1);
    t.map.needsUpdate = true;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w * 2, 7), t);
    m.rotation.set(-Math.PI / 2, 0, 0);
    const g = new THREE.Group();
    g.position.set(x, p.y + 0.07, z);
    g.rotation.y = headingAt(i) + Math.PI;
    g.add(m);
    world.add(g);
    pads.push({ idx: i, lat, w });
  }

  if (GAP) buildBridge();
  buildDecks();
  for (const r of RAMPS) world.add(rampMesh(r));
  for (const [i, a, b] of LAYOUT.signs) roadSign((i + N) % N, a, b);
  for (const t of LAYOUT.tunnels) buildTunnel(t);
  for (const d of LAYOUT.dividers) buildDivider(d);
  for (const z of LAYOUT.zones) buildZone(z);
  for (const i of LAYOUT.crosswalks) {
    const zebra = canvasTex(128, 16, (g, W, H) => { g.fillStyle = '#ffffff'; for (let x = 0; x < W; x += 16) g.fillRect(x, 0, 9, H); });
    zebra.wrapS = zebra.wrapT = THREE.RepeatWrapping;
    world.add(new THREE.Mesh(ribbonRange(i - 3, 6, -HW, HW, 0.05, 999), new THREE.MeshBasicMaterial({ map: zebra, transparent: true, opacity: 0.9 })));
  }
  for (const l of LAYOUT.lasers) buildLaser(l);
  if (LAYOUT.traffic) buildTraffic(LAYOUT.traffic);
  for (const sb of LAYOUT.snowballs) buildSnowballs(sb);
  for (const gd of LAYOUT.ghosts) buildGhosts(gd);
  for (const pd of LAYOUT.penguins) for (let k = 0; k < (pd.n || 2); k++) addPenguin(pd, k);
  if (th.snow) buildSnowfall();

  // 道具禮物盒
  const boxTex = canvasTex(128, 128, (g, W, H) => {
    g.fillStyle = '#ff8fb1'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffffff'; g.fillRect(W / 2 - 12, 0, 24, H); g.fillRect(0, H / 2 - 12, W, 24);
    g.fillStyle = '#ffd36b'; drawStar(g, W / 2, H / 2, 30, 13);
    g.strokeStyle = '#ffffff'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8);
  });
  const boxGeo = new THREE.BoxGeometry(1.7, 1.7, 1.7);
  const boxM = th.night ? new THREE.MeshBasicMaterial({ map: boxTex }) : toon('#ffffff', { map: boxTex });
  for (const i of LAYOUT.boxes) {
    for (const lat of [-7.5, -2.5, 2.5, 7.5]) {
      const p = pts[i], [x, z] = latPos(i, lat);
      const m = mesh(boxGeo, boxM, x, p.y + 1.4, z, world);
      itemBoxes.push({ x, z, y: p.y + 1.4, mesh: m, active: true, timer: 0 });
    }
  }

  // 路障：三角錐、柵欄、消防栓
  const coneGeo = new THREE.ConeGeometry(0.6, 1.5, 12), bandGeo = new THREE.CylinderGeometry(0.36, 0.45, 0.25, 12);
  const barTex = canvasTex(128, 32, (g, W, H) => {
    for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#ffffff' : '#ff4f4f'; g.beginPath(); g.moveTo(k * 20 - 10, H); g.lineTo(k * 20 + 6, 0); g.lineTo(k * 20 + 26, 0); g.lineTo(k * 20 + 10, H); g.fill(); }
  });
  const barM = toon('#ffffff', { map: barTex });
  for (const [i0, list, kind] of LAYOUT.obstacles) {
    list.forEach((lat, k) => {
      const i = (i0 + k * 3) % N, p = pts[i], [x, z] = latPos(i, lat);
      const g = new THREE.Group();
      g.position.set(x, p.y, z);
      g.rotation.y = headingAt(i);
      let r = 1.9;
      if (kind === 'hydrant') {
        mesh(new THREE.CylinderGeometry(0.45, 0.55, 1.3, 12), toon('#e8343a'), 0, 0.65, 0, g);
        mesh(new THREE.SphereGeometry(0.45, 12, 8), toon('#e8343a'), 0, 1.3, 0, g);
        mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.3, 8), toon('#c9c9c9'), 0, 0.85, 0, g).rotation.z = Math.PI / 2;
        r = 1.8;
      } else if (k % 2 === 1) {
        mesh(new THREE.BoxGeometry(2.6, 0.7, 0.25), barM, 0, 1.0, 0, g);
        for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.15, 1.2, 0.6), toon('#555555'), 1.1 * s, 0.6, 0, g);
        r = 2.4;
      } else {
        mesh(coneGeo, toon('#ff8a1f'), 0, 0.75, 0, g);
        mesh(bandGeo, toon('#ffffff'), 0, 0.75, 0, g);
        mesh(new THREE.BoxGeometry(1.2, 0.12, 1.2), toon('#333333'), 0, 0.06, 0, g);
      }
      world.add(g);
      obstacles.push({ idx: i, lat, x, z, y: p.y, r, kind, mesh: g, home: g.position.clone(), knocked: 0, v: new THREE.Vector3() });
    });
  }

  // 突然衝出來的黑衣壞人
  for (const i of LAYOUT.villains) {
    const m = buildVillain();
    world.add(m);
    villains.push({ idx: i, side: rand() < 0.5 ? -1 : 1, lat: 0, state: 'wait', t: 0, mesh: m, x: 0, y: 0, z: 0, vy: 0, v: new THREE.Vector3() });
  }

  // 花生
  const peanutGeo = new THREE.CapsuleGeometry(0.42, 0.7, 6, 10);
  const peanutM = toon('#d9a35b');
  for (const [i0, lat] of LAYOUT.peanuts) {
    for (let k = 0; k < 4; k++) {
      const i = (i0 + k * 6) % N, p = pts[i], [x, z] = latPos(i, lat);
      const m = new THREE.Group();
      const body = mesh(peanutGeo, peanutM, 0, 0, 0, m);
      body.rotation.z = Math.PI / 2;
      body.scale.set(1, 1, 0.9);
      mesh(new THREE.TorusGeometry(0.4, 0.06, 6, 16), toon('#b9853f'), 0, 0, 0, m).rotation.y = Math.PI / 2;
      m.position.set(x, p.y + 1.3, z);
      world.add(m);
      peanuts.push({ x, z, y: p.y + 1.3, mesh: m, active: true, timer: 0 });
    }
  }
}

function buildTrees(cfg) {
  if (!cfg || !cfg.count) return;
  const trees = [];
  for (let tries = 0; trees.length < cfg.count && tries < cfg.count * 20; tries++) {
    const x = (rand() - 0.5) * 860, z = (rand() - 0.5) * 860;
    const [i, d] = nearestIdx(x, z, 4);
    if (d < HW + 9 || Math.hypot(x, z) > 430 || canyonF(x, z) > 0.01 || onBoundary(d, 1.8)) continue;
    trees.push([x, groundY(x, z, i, d), z, 0.7 + rand() * 0.8, rand() < (cfg.pink || 0)]);
    const t = trees[trees.length - 1];
    if (d < HW + 30) addSolid({ x, z, y: t[1], r: (cfg.kind === 'pine' ? 1.7 : 1.2) * t[3] });
  }
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  const place = (im, list) => list.forEach(([x, y, z, s], k) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), x * 13 % 6);
    im.setMatrixAt(k, mtx.compose(ps.set(x, y - 0.2, z), q, sc.set(s, s, s)));
  });
  const trunkGeo = new THREE.CylinderGeometry(0.5, 0.7, 3, 6); trunkGeo.translate(0, 1.5, 0);
  const meshes = [new THREE.InstancedMesh(trunkGeo, toon('#9a6b4a'), trees.length)];
  place(meshes[0], trees);
  if (cfg.kind === 'pine') {
    // 雪松：三層圓錐，頂端積雪
    const tiers = [[3.2, 3.6, 3.8], [2.5, 3.0, 5.8], [1.6, 2.4, 7.6]];
    for (const [r, h, y] of tiers) {
      const g = new THREE.ConeGeometry(r, h, 8); g.translate(0, y, 0);
      const im = new THREE.InstancedMesh(g, toon('#2f6b4f'), trees.length);
      place(im, trees); meshes.push(im);
      const cap = new THREE.ConeGeometry(r * 0.75, h * 0.45, 8); cap.translate(0, y + h * 0.3, 0);
      const imc = new THREE.InstancedMesh(cap, toon('#ffffff'), trees.length);
      place(imc, trees); meshes.push(imc);
    }
  } else {
    const leafGeo = new THREE.IcosahedronGeometry(3, 0); leafGeo.translate(0, 5, 0);
    const greens = trees.filter((t) => !t[4]), pinks = trees.filter((t) => t[4]);
    const leafG = new THREE.InstancedMesh(leafGeo, toon('#4fae5a'), greens.length);
    const leafP = new THREE.InstancedMesh(leafGeo, toon('#ffb3c8'), pinks.length);
    place(leafG, greens); place(leafP, pinks);
    meshes.push(leafG, leafP);
  }
  for (const im of meshes) { im.castShadow = true; world.add(im); }
}

function buildHouses(count) {
  const houseCols = ['#ffd6a5', '#caffbf', '#bde0fe', '#ffc6ff', '#fdffb6'];
  for (let k = 0; k < count; k++) {
    const i = Math.floor(rand() * N), s = rand() < 0.5 ? -1 : 1, off = (HW + 18 + rand() * 14) * s;
    const [x, z] = latPos(i, off);
    const [ni, nd] = nearestIdx(x, z, 4);
    if (nd < HW + 12 || canyonF(x, z) > 0.01 || onBoundary(nd, 6)) continue;
    const hs = new THREE.Group();
    hs.position.set(x, groundY(x, z, ni, nd) - 0.3, z);
    hs.rotation.y = headingAt(i);
    world.add(hs);
    const w = 5 + rand() * 3;
    addSolid({ x, z, hw: w / 2, hd: w / 2, rot: hs.rotation.y });
    mesh(new THREE.BoxGeometry(w, 4, w), toon(houseCols[k % 5]), 0, 2, 0, hs);
    mesh(new THREE.ConeGeometry(w * 0.8, 3, 4), toon('#e76f6f'), 0, 5.5, 0, hs).rotation.y = Math.PI / 4;
    mesh(new THREE.BoxGeometry(1.2, 2, 0.1), toon('#8a5a3c'), 0, 1, w / 2 + 0.02, hs);
  }
}

function buildClouds(color) {
  const cloudM = new THREE.MeshLambertMaterial({ color, fog: false });
  const cloudGeo = new THREE.SphereGeometry(1, 10, 8);
  for (let k = 0; k < 22; k++) {
    const cg = new THREE.Group();
    const a = rand() * Math.PI * 2, r = 120 + rand() * 330;
    cg.position.set(Math.cos(a) * r, 70 + rand() * 50, Math.sin(a) * r);
    for (let j = 0; j < 5; j++) {
      const c = new THREE.Mesh(cloudGeo, cloudM);
      c.position.set((j - 2) * 6 + rand() * 3, rand() * 3, rand() * 4);
      c.scale.setScalar(5 + rand() * 4);
      cg.add(c);
    }
    world.add(cg);
  }
}

// 沿著賽道的長條（整圈用 ribbon，一段用 ribbonRange）
function ribbon(off0, off1, yOff, vScale) {
  return ribbonRange(0, N, off0, off1, yOff, vScale, true);
}
function ribbonRange(i0, len, off0, off1, yOff, vScale, skipGap = false) {
  const pos = [], uv = [], idx = [];
  let dist = 0;
  for (let k = 0; k <= len; k++) {
    const i = (i0 + k + N) % N, p = pts[i], s = SIDE[i];
    if (k > 0) dist += SPACING;
    pos.push(p.x + s.x * off0, p.y + yOff, p.z + s.z * off0, p.x + s.x * off1, p.y + yOff, p.z + s.z * off1);
    uv.push(0, dist / vScale, 1, dist / vScale);
    if (k < len && !(skipGap && (inGap(i) || inGap((i + 1) % N)))) { const a = k * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // 讓法向量朝上（三角形繞向可能相反）
  const n = g.attributes.normal;
  for (let i = 0; i < n.count; i++) if (n.getY(i) < 0) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  return g;
}

function buildBridge() {
  const dc = TRACK.theme.deck;
  const deckM = toon(dc.deck), railM = toon(dc.rail), pillarM = toon(dc.pillar);
  const deckGeo = new THREE.BoxGeometry(HW * 2 + 3.4, 1.4, SPACING * 2 + 0.05);
  const railGeo = new THREE.BoxGeometry(0.35, 1.1, SPACING * 2 + 0.05);
  for (let i = BRIDGE_I - 60; i < BRIDGE_I + 60; i += 2) {
    const j = (i + N) % N, p = pts[j];
    if (canyonF(p.x, p.z) < 0.02 || inGap(j) || inGap((j + 1) % N) || inGap((j + 2) % N)) continue;
    const g = new THREE.Group();
    g.position.copy(p);
    g.rotation.y = headingAt(j);
    world.add(g);
    mesh(deckGeo, deckM, 0, -0.68, SPACING, g).receiveShadow = true;
    for (const s of [-1, 1]) mesh(railGeo, railM, (HW + 1.5) * s, 0.5, SPACING, g);
    if (j % 8 === 0) {
      const h = p.y - CANYON_Y + 4;
      for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.8, 1.1, h, 10), pillarM, (HW - 2) * s, -h / 2 - 1, SPACING, g);
    }
  }
  // 斷掉的木板
  let gapEnd = GAP0;
  while (inGap((gapEnd + 1) % N)) gapEnd = (gapEnd + 1) % N;
  for (const [i, dir] of [[GAP0, 1], [(gapEnd + 1) % N, -1]]) {
    const p = pts[i];
    const g = new THREE.Group();
    g.position.copy(p);
    g.rotation.y = headingAt(i);
    world.add(g);
    for (const x of [-7, -1, 5]) {
      const b = mesh(new THREE.BoxGeometry(3.5, 0.35, 2.4), deckM, x + rand() * 2, -1.2, dir * 0.9, g);
      b.rotation.x = 0.7 * dir;
      b.rotation.z = (rand() - 0.5) * 0.4;
    }
  }
  // 谷底的河／冰湖
  const water = new THREE.Mesh(new THREE.PlaneGeometry(GAP.side * 2, 40),
    new THREE.MeshLambertMaterial({ color: GAP.water, transparent: true, opacity: GAP.ice ? 0.95 : 0.88 }));
  water.rotation.set(-Math.PI / 2, 0, 0);
  const wg = new THREE.Group();
  wg.position.set(BC.x, CANYON_Y + 3, BC.z);
  wg.rotation.y = headingAt(BRIDGE_I);
  wg.add(water);
  if (GAP.ice) {
    // 冰湖上的碎冰塊
    for (let k = 0; k < 18; k++) {
      const b = mesh(new THREE.BoxGeometry(2 + rand() * 4, 0.6, 2 + rand() * 4), toon('#eaf8ff'), (rand() - 0.5) * GAP.side * 1.6, 0.2, (rand() - 0.5) * 30, wg);
      b.rotation.y = rand() * 3;
    }
  }
  world.add(wg);
}

// 高架橋：橋面、欄杆、橋墩
function buildDecks() {
  const dc = TRACK.theme.deck;
  const deckM = toon(dc.deck), railM = toon(dc.rail), pillarM = toon(dc.pillar);
  const deckGeo = new THREE.BoxGeometry(HW * 2 + 3.4, 1.2, SPACING * 2 + 0.1);
  const railGeo = new THREE.BoxGeometry(0.4, 1.2, SPACING * 2 + 0.1);
  for (let i = 0; i < N; i += 2) {
    if (!isDeck[i]) continue;
    const p = pts[i];
    const g = new THREE.Group();
    g.position.copy(p);
    g.rotation.y = headingAt(i);
    world.add(g);
    mesh(deckGeo, deckM, 0, -0.6, SPACING, g).receiveShadow = true;
    for (const s of [-1, 1]) mesh(railGeo, railM, (HW + 1.6) * s, 0.55, SPACING, g);
    if (i % 12 === 0) {
      const [, d] = nearestIdx(p.x, p.z, 2, true);
      if (d > HW + 2) for (const s of [-1, 1]) {
        mesh(new THREE.CylinderGeometry(0.7, 0.9, p.y, 10), pillarM, (HW - 2) * s, -p.y / 2, SPACING, g);
        const [px, pz] = latPos(i, (HW - 2) * s);
        addSolid({ x: px + TAN[i].x * SPACING, z: pz + TAN[i].z * SPACING, y: -5, top: p.y + 4, r: 1.0 });
      }
    }
  }
}

function rampMesh(r) {
  const verts = [], tri = [];
  const V = (x, y, z) => { verts.push(x, y, z); return verts.length / 3 - 1; };
  const rows = [];
  for (let k = 0; k <= r.len; k++) {
    const i = (r.i0 + k + N) % N, p = pts[i], s = SIDE[i], y = p.y + 0.06, h = r.h * k / r.len, w = HW + 0.3;
    rows.push({
      tl: V(p.x - s.x * w, y + h, p.z - s.z * w), tr: V(p.x + s.x * w, y + h, p.z + s.z * w),
      bl: V(p.x - s.x * w, y, p.z - s.z * w), br: V(p.x + s.x * w, y, p.z + s.z * w),
    });
  }
  for (let k = 0; k < r.len; k++) {
    const a = rows[k], b = rows[k + 1];
    tri.push(a.tl, b.tl, a.tr, a.tr, b.tl, b.tr, a.bl, b.bl, a.tl, a.tl, b.bl, b.tl, a.br, a.tr, b.br, b.br, a.tr, b.tr);
  }
  const e = rows[r.len];
  tri.push(e.bl, e.tl, e.br, e.br, e.tl, e.tr);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setIndex(tri);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, toon('#ffc93c', { side: THREE.DoubleSide }));
  m.receiveShadow = m.castShadow = true;
  return m;
}

function roadSign(i, line1, line2) {
  const tex = canvasTex(512, 256, (g, W, H) => {
    g.fillStyle = '#ffd23f'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#3d3638'; g.lineWidth = 16; g.strokeRect(8, 8, W - 16, H - 16);
    g.fillStyle = '#3d3638'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 64px "PingFang TC", "Microsoft JhengHei", sans-serif'; g.fillText(line1, W / 2, 92);
    g.font = '900 48px "PingFang TC", "Microsoft JhengHei", sans-serif'; g.fillText(line2, W / 2, 180);
  });
  const faceM = TRACK.theme.night ? new THREE.MeshBasicMaterial({ map: tex }) : toon('#ffffff', { map: tex });
  for (const s of [-1, 1]) {
    const p = pts[i], [x, z] = latPos(i, (HW + 4) * s);
    const g = new THREE.Group();
    g.position.set(x, p.y, z);
    g.rotation.y = headingAt(i) + Math.PI;
    world.add(g);
    addSolid({ x, z, y: p.y, r: 0.45 });
    mesh(new THREE.CylinderGeometry(0.2, 0.2, 4, 8), toon('#777777'), 0, 2, 0, g);
    mesh(new THREE.BoxGeometry(6, 3, 0.2), [toon('#3d3638'), toon('#3d3638'), toon('#3d3638'), toon('#3d3638'), faceM, toon('#3d3638')], 0, 5, 0, g);
  }
}

// 隧道（城市）、間諜基地（雪山，方形鋼構）、冰洞（雪山岔路，只蓋住一邊）
function buildTunnel(t) {
  const verts = [], tri = [];
  const kind = t.kind;
  const prof = [];   // 斷面：[側向位置, 高度]
  if (kind === 'base') {
    for (const [a, b] of [[-HW - 2, 0], [-HW - 2, 7.5], [HW + 2, 7.5], [HW + 2, 0]]) prof.push([a, b]);
  } else {
    const cx = kind === 'cave' ? t.side * 6.5 : 0, R = kind === 'cave' ? 7.2 : HW + 3;
    for (let a = 0; a <= 16; a++) { const th = Math.PI * a / 16; prof.push([cx + Math.cos(th) * R, Math.sin(th) * R * (kind === 'cave' ? 0.85 : 0.75)]); }
  }
  const cols = prof.length;
  for (let k = 0; k <= t.len; k++) {
    const i = (t.i0 + k + N) % N, p = pts[i], s = SIDE[i];
    for (const [lat, h] of prof) verts.push(p.x + s.x * lat, p.y + h, p.z + s.z * lat);
    if (k < t.len) for (let c = 0; c < cols - 1; c++) {
      const a = k * cols + c, b = a + cols;
      tri.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setIndex(tri);
  g.computeVertexNormals();
  const color = kind === 'base' ? '#4d5666' : kind === 'cave' ? '#bfe3f5' : '#4a4e5c';
  const shell = new THREE.Mesh(g, toon(color, { side: THREE.DoubleSide }));
  shell.castShadow = true;
  world.add(shell);
  // 燈條與裝飾
  const lightM = new THREE.MeshBasicMaterial({ color: kind === 'base' ? '#4ff0ff' : kind === 'cave' ? '#e9fbff' : '#ffe08a' });
  for (let k = 2; k < t.len; k += kind === 'cave' ? 5 : 8) {
    const i = (t.i0 + k + N) % N, p = pts[i];
    const gg = new THREE.Group();
    gg.position.copy(p);
    gg.rotation.y = headingAt(i);
    world.add(gg);
    if (kind === 'base') {
      for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, SPACING * 4), lightM); b.position.set((HW + 1.8) * s, 3.5, 0); gg.add(b); }
      const top = new THREE.Mesh(new THREE.BoxGeometry(HW * 1.4, 0.15, 0.5), lightM); top.position.set(0, 7.3, 0); gg.add(top);
    } else if (kind === 'cave') {
      for (let c = 0; c < 3; c++) {
        const ic = mesh(new THREE.ConeGeometry(0.25, 1.4 + Math.random(), 6), toon('#e9fbff'), t.side * (2 + c * 3 + Math.random()), 5.2 - c * 0.8, 0, gg);
        ic.rotation.x = Math.PI;
      }
    } else {
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 0.8), lightM); b.position.set(0, (HW + 3) * 0.75 - 0.2, 0); gg.add(b);
    }
  }
  // 入口牌樓
  for (const k of [0, t.len]) {
    const i = (t.i0 + k + N) % N, p = pts[i];
    const gg = new THREE.Group();
    gg.position.copy(p);
    gg.rotation.y = headingAt(i);
    world.add(gg);
    if (kind === 'base') {
      const tex = canvasTex(512, 96, (c, W, H) => {
        c.fillStyle = '#20252f'; c.fillRect(0, 0, W, H); c.shadowColor = '#4ff0ff'; c.shadowBlur = 16;
        c.fillStyle = '#4ff0ff'; c.font = '900 56px "PingFang TC", "Microsoft JhengHei", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(k ? 'EXIT 出口' : 'SPY BASE 間諜基地', W / 2, H / 2 + 3);
      });
      const sm = new THREE.MeshBasicMaterial({ map: tex });
      const sign = mesh(new THREE.BoxGeometry(HW * 2 + 4, 2, 0.5), [toon('#20252f'), toon('#20252f'), toon('#20252f'), toon('#20252f'), sm, sm], 0, 8.6, 0, gg);
      sign.castShadow = false;
    } else if (kind === 'tunnel') {
      mesh(new THREE.BoxGeometry(HW * 2 + 8, 2.4, 1.2), toon('#6a6f80'), 0, (HW + 3) * 0.75 + 0.8, 0, gg);
    }
  }
}

// 岔路中間的分隔牆
function buildDivider(d) {
  const m = toon(TRACK.theme.snow ? '#a9c4dc' : '#8a8f9c');
  const geo = new THREE.BoxGeometry(3.2, 2.6, SPACING * 3 + 0.1);
  for (let k = 0; k < d.len; k += 3) {
    const i = (d.i0 + k + N) % N, p = pts[i];
    const b = mesh(geo, m, p.x, p.y + 1.3, p.z, world);
    b.rotation.y = headingAt(i);
  }
}

// 地面區域：水窪、冰面、輸送帶
function buildZone(z) {
  const mid = (z.lat0 + z.lat1) / 2, w = z.lat1 - z.lat0;
  if (z.type === 'puddle') {
    const i = (z.i0 + Math.floor(z.len / 2)) % N, p = pts[i], [x, y] = latPos(i, mid);
    const pm = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: '#3d6fd0', transparent: true, opacity: 0.6, depthWrite: false }));
    pm.rotation.set(-Math.PI / 2, 0, 0);
    pm.scale.set(w / 2, z.len * SPACING / 2, 1);
    const g = new THREE.Group();
    g.position.set(x, p.y + 0.09, y);
    g.rotation.y = headingAt(i);
    g.add(pm);
    world.add(g);
  } else if (z.type === 'ice') {
    const tex = canvasTex(64, 64, (g, W, H) => {
      g.fillStyle = 'rgba(205,240,255,0.85)'; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2;
      for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(Math.random() * W, Math.random() * H); g.lineTo(Math.random() * W, Math.random() * H); g.stroke(); }
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    world.add(new THREE.Mesh(ribbonRange(z.i0, z.len, z.lat0, z.lat1, 0.07, 6), new THREE.MeshLambertMaterial({ map: tex, transparent: true })));
  } else if (z.type === 'conveyor') {
    const tex = canvasTex(64, 64, (g, W, H) => {
      g.fillStyle = '#4a515c'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#ffd23f';
      for (const y of [16, 48]) { g.beginPath(); g.moveTo(8, y - 10); g.lineTo(40, y); g.lineTo(8, y + 10); g.fill(); }
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(w / 4, 1);
    world.add(new THREE.Mesh(ribbonRange(z.i0, z.len, z.lat0, z.lat1, 0.07, 4), new THREE.MeshLambertMaterial({ map: tex })));
    scrollTex.push({ tex, speed: -z.push / 4 });
  }
}

// 雷射門：定時開關，開著的時候穿過去會轉圈
function buildLaser(l) {
  const i = (l.i + N) % N, p = pts[i];
  const g = new THREE.Group();
  g.position.copy(p);
  g.rotation.y = headingAt(i);
  world.add(g);
  for (const s of [-1, 1]) {
    mesh(new THREE.BoxGeometry(0.8, 4, 0.8), toon('#39404d'), (HW + 1.2) * s, 2, 0, g);
    const [lx, lz] = latPos(i, (HW + 1.2) * s);
    addSolid({ x: lx, z: lz, y: p.y, r: 0.6 });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff3040' }));
    lamp.position.set((HW + 1.2) * s, 4.3, 0);
    g.add(lamp);
  }
  const beamM = new THREE.MeshBasicMaterial({ color: '#ff2a3a', transparent: true, opacity: 0.9 });
  const beams = [];
  for (const h of [0.6, 1.5, 2.4]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, HW * 2 + 2.4, 6), beamM);
    b.rotation.z = Math.PI / 2;
    b.position.y = h;
    g.add(b);
    beams.push(b);
  }
  lasers.push({ idx: i, period: l.period, phase: l.phase, beams, beamM, on: false });
}
const laserOn = (l, t) => ((t + l.phase) % l.period) < l.period * 0.32;

// 城市裡一般車輛（同方向慢慢開）
function buildTraffic(cfg) {
  const cols = ['#e8eef7', '#ff6b6b', '#4fa3ff', '#ffd23f', '#7be08b', '#c38bff'];
  for (let k = 0; k < cfg.count; k++) {
    const bus = k === 0;
    const g = new THREE.Group();
    const L = bus ? 8 : 4.2, Wd = bus ? 2.8 : 2.2, H = bus ? 3 : 1.1;
    mesh(new THREE.BoxGeometry(Wd, H, L), toon(bus ? '#ffb02e' : cols[k % cols.length]), 0, 0.6 + H / 2, 0, g);
    if (!bus) mesh(new THREE.BoxGeometry(Wd * 0.85, 0.9, L * 0.5), toon('#2a3040'), 0, 1.15 + H, -0.2, g);
    else mesh(new THREE.BoxGeometry(Wd + 0.05, 0.9, L * 0.85), toon('#2a3040'), 0, 2.5, 0, g);
    for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const w = mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.35, 12), toon('#222222'), x * Wd / 2, 0.45, z * L * 0.32, g);
      w.rotation.z = Math.PI / 2;
    }
    const headM = new THREE.MeshBasicMaterial({ color: '#fff6c8' }), tailM = new THREE.MeshBasicMaterial({ color: '#ff3040' });
    for (const s of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.1), headM); h.position.set(s * Wd * 0.32, 0.9, L / 2 + 0.02); g.add(h);
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.1), tailM); t.position.set(s * Wd * 0.32, 0.9, -L / 2 - 0.02); g.add(t);
    }
    world.add(g);
    traffic.push({ s: (k + 0.5) * N / cfg.count, lat: cfg.lanes[k % cfg.lanes.length], speed: cfg.speed * (0.85 + rand() * 0.3), r: bus ? 3.2 : 2.3, mesh: g, x: 0, z: 0, y: 0, idx: 0 });
  }
}

// 從坡上滾下來的大雪球
function buildSnowballs(cfg) {
  const geo = new THREE.SphereGeometry(2, 18, 14);
  for (let k = 0; k < 2; k++) {
    const m = mesh(geo, toon('#ffffff'), 0, -50, 0, world);
    snowballs.push({ cfg, s: cfg.iTop, lat: 0, active: false, t: k * cfg.every, r: 2, mesh: m, x: 0, z: 0, y: 0, idx: cfg.iTop });
  }
}

// 可愛幽靈：在路上左右飄，偶爾變透明（這時碰到沒事）
function buildGhosts(gd) {
  const cols = ['#ffffff', '#e6dcff', '#d8fff0'];
  for (let k = 0; k < 2; k++) {
    const g = new THREE.Group();
    const col = cols[(ghosts.length) % cols.length];
    const bodyM = new THREE.MeshToonMaterial({ color: col, gradientMap: gradTex, emissive: '#9fa8ff', emissiveIntensity: 0.45, transparent: true });
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.15, 20, 16), bodyM);
    body.position.y = 0.4;
    g.add(body);
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.3, 1.1, 20, 1, true), bodyM);
    skirt.position.y = -0.15;
    g.add(skirt);
    // 波浪下襬
    for (let a = 0; a < 8; a++) {
      const th = a / 8 * Math.PI * 2;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), bodyM);
      b.position.set(Math.cos(th) * 1.05, -0.72, Math.sin(th) * 1.05);
      g.add(b);
    }
    const arms = [];
    for (const s of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), bodyM);
      arm.scale.set(0.8, 1.2, 0.8);
      arm.position.set(1.15 * s, 0.25, 0.2);
      g.add(arm);
      arms.push(arm);
    }
    const faceM = new THREE.MeshBasicMaterial({ color: '#2b2140', transparent: true });
    const hiM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true });
    const blushM = new THREE.MeshBasicMaterial({ color: '#ff9fbf', transparent: true });
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), faceM);
      eye.scale.set(0.85, 1.25, 0.5);
      eye.position.set(0.38 * s, 0.62, 1.03);
      g.add(eye);
      const hi = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), hiM);
      hi.position.set(0.38 * s - 0.05, 0.72, 1.12);
      g.add(hi);
      const bl = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), blushM);
      bl.scale.set(1.3, 0.7, 0.3);
      bl.position.set(0.62 * s, 0.32, 0.95);
      g.add(bl);
    }
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), faceM);
    mouth.scale.set(1, 0.8, 0.4);
    mouth.position.set(0, 0.28, 1.1);
    g.add(mouth);
    world.add(g);
    ghosts.push({ i0: (gd.i + k * 14) % N, amp: gd.amp || 8, spd: gd.speed || 0.9, phase: k * Math.PI + ghosts.length,
      mesh: g, arms, mats: [bodyM, faceM, hiM, blushM], x: 0, y: 0, z: 0, idx: gd.i, lat: 0, solid: true, scare: 0 });
  }
}

// 藍色企鵝：戴藍綠色軟帽，在路上搖搖擺擺走來走去，撞到會暈倒
function buildPenguin() {
  const g = new THREE.Group();
  const blue = toon('#a9d0e2'), hatM = toon('#4f949e'), beige = toon('#f0d6a4'), black = toon('#1d2430');
  const body = new THREE.Group();   // 搖擺用
  g.add(body);
  mesh(new THREE.SphereGeometry(1.0, 20, 16), blue, 0, 0.95, 0, body).scale.set(1, 0.95, 0.92);
  const head = new THREE.Group();
  head.position.y = 2.05;
  body.add(head);
  mesh(new THREE.SphereGeometry(0.78, 20, 16), blue, 0, 0, 0, head).scale.set(1, 0.92, 0.95);
  // 軟帽：扁扁的帽身＋一圈波浪帽緣
  mesh(new THREE.SphereGeometry(0.72, 16, 10), hatM, 0, 0.55, -0.05, head).scale.set(1.05, 0.5, 1.05);
  for (let a = 0; a < 7; a++) {
    const th = a / 7 * Math.PI * 2 + 0.3;
    mesh(new THREE.SphereGeometry(0.26, 10, 8), hatM, Math.cos(th) * 0.66, 0.42 + (a % 2) * 0.06, Math.sin(th) * 0.66 - 0.05, head).scale.set(1, 0.6, 1);
  }
  const beak = mesh(new THREE.SphereGeometry(0.24, 12, 10), beige, 0, -0.08, 0.74, head);
  beak.scale.set(1.15, 0.7, 0.9);
  // 眼睛：平常是小黑點，暈倒時變成 ×
  const eyes = new THREE.Group(), dizzy = new THREE.Group();
  head.add(eyes, dizzy);
  for (const s of [-1, 1]) {
    mesh(new THREE.SphereGeometry(0.075, 8, 8), black, 0.3 * s, 0.14, 0.7, eyes);
    for (const r of [0.75, -0.75]) {
      const x = mesh(new THREE.BoxGeometry(0.22, 0.045, 0.04), black, 0.3 * s, 0.14, 0.72, dizzy);
      x.rotation.z = r;
    }
  }
  dizzy.visible = false;
  // 翅膀
  const flips = [];
  for (const s of [-1, 1]) {
    const f = new THREE.Group();
    f.position.set(0.92 * s, 1.35, 0);
    body.add(f);
    mesh(new THREE.SphereGeometry(0.3, 12, 10), blue, 0.12 * s, -0.4, 0, f).scale.set(0.55, 1.35, 0.8);
    flips.push(f);
  }
  // 腳
  const feet = [];
  for (const s of [-1, 1]) {
    const ft = mesh(new THREE.SphereGeometry(0.3, 12, 8), beige, 0.42 * s, 0.1, 0.25, g);
    ft.scale.set(1, 0.4, 1.35);
    feet.push(ft);
  }
  // 暈倒時頭上轉圈的星星
  const stars = new THREE.Group();
  stars.position.y = 3.1;
  const starM = new THREE.MeshBasicMaterial({ color: '#ffd23f' });
  for (let k = 0; k < 3; k++) {
    const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), starM);
    st.position.set(Math.cos(k * 2.1) * 0.6, 0, Math.sin(k * 2.1) * 0.6);
    stars.add(st);
  }
  stars.visible = false;
  g.add(stars);
  g.userData = { body, head, eyes, dizzy, flips, feet, stars };
  return g;
}
function addPenguin(pd, k) {
  const m = buildPenguin();
  m.scale.setScalar(1.1);
  world.add(m);
  penguins.push({ idx: (pd.i + k * 6) % N, lat: (k ? 1 : -1) * 4, dir: k ? -1 : 1, spd: 2.2 + rand() * 0.8, wave: 0, dizzy: 0,
    t: rand() * 6, mesh: m, x: 0, y: 0, z: 0, vy: 0, hop: 0, solid: true });
}

// 飄雪
function buildSnowfall() {
  const n = 1400, posArr = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) { posArr[k * 3] = (Math.random() - 0.5) * 90; posArr[k * 3 + 1] = Math.random() * 45; posArr[k * 3 + 2] = (Math.random() - 0.5) * 90; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  const pts3 = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 0.35, transparent: true, opacity: 0.9 }));
  pts3.frustumCulled = false;
  world.add(pts3);
  snowfall = pts3;
}

function buildVillain() {
  const g = new THREE.Group();
  const suit = toon('#23262e'), skin = toon('#f2c9a5'), white = toon('#ffffff'), red = toon('#d93a3a'), black = toon('#111111');
  const legs = [], arms = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(0.22 * s, 1.05, 0);
    g.add(hip);
    mesh(new THREE.CapsuleGeometry(0.15, 0.7, 4, 8), suit, 0, -0.5, 0, hip);
    mesh(new THREE.BoxGeometry(0.28, 0.15, 0.45), black, 0, -0.98, 0.08, hip);
    legs.push(hip);
    const sh = new THREE.Group();
    sh.position.set(0.52 * s, 1.95, 0);
    g.add(sh);
    mesh(new THREE.CapsuleGeometry(0.13, 0.6, 4, 8), suit, 0, -0.38, 0, sh);
    mesh(new THREE.SphereGeometry(0.14, 8, 8), skin, 0, -0.8, 0, sh);
    arms.push(sh);
  }
  mesh(new THREE.CapsuleGeometry(0.42, 0.6, 4, 12), suit, 0, 1.6, 0, g);
  mesh(new THREE.BoxGeometry(0.32, 0.5, 0.1), white, 0, 1.85, 0.37, g);
  mesh(new THREE.BoxGeometry(0.1, 0.42, 0.06), red, 0, 1.8, 0.43, g);
  mesh(new THREE.SphereGeometry(0.4, 16, 12), skin, 0, 2.5, 0, g);
  mesh(new THREE.SphereGeometry(0.42, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), black, 0, 2.55, -0.02, g);
  mesh(new THREE.BoxGeometry(0.62, 0.14, 0.08), black, 0, 2.55, 0.36, g);
  const mouth = mesh(new THREE.BoxGeometry(0.18, 0.04, 0.04), toon('#7a2a2a'), 0, 2.3, 0.38, g);
  mouth.rotation.z = 0.2;
  g.userData = { legs, arms };
  return g;
}

function makeBombMesh() {
  const g = new THREE.Group();
  const b = mesh(new THREE.CapsuleGeometry(0.42, 0.6, 6, 10), toon('#8a5a2b'), 0, 0, 0, g);
  b.rotation.x = Math.PI / 2;
  mesh(new THREE.TorusGeometry(0.42, 0.08, 6, 16), toon('#e23b3b'), 0, 0, 0, g);
  mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6), toon('#333333'), 0, 0.5, -0.2, g);
  const spark = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffe14d' }));
  spark.position.set(0, 0.72, -0.2);
  g.add(spark);
  g.scale.setScalar(1.3);
  return g;
}
function makeSmokeMesh() {
  const g = new THREE.Group();
  const m = new THREE.MeshLambertMaterial({ color: '#8f97a8', transparent: true, opacity: 0.85 });
  for (let k = 0; k < 6; k++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), m);
    s.position.set((Math.random() - 0.5) * 2.4, 0.8 + Math.random() * 1.2, (Math.random() - 0.5) * 2.4);
    s.scale.setScalar(0.9 + Math.random() * 0.7);
    g.add(s);
  }
  return g;
}
function spawnEffect(x, y, z, color, size) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
  m.position.set(x, y, z);
  world.add(m);
  effects.push({ mesh: m, t: 0, dur: 0.5, size });
}

// ================= 音效 =================
const Sound = {
  ctx: null, muted: false,
  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    const o = this.ctx.createOscillator(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 700; g.gain.value = 0;
    o.connect(f).connect(g).connect(this.master);
    o.start();
    this.eng = { o, g };
  },
  engine(speed, on) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.eng.o.frequency.setTargetAtTime(50 + Math.abs(speed) * 2.4, t, 0.05);
    this.eng.g.gain.setTargetAtTime(on ? 0.05 : 0, t, 0.15);
  },
  tone(freq, dur, type = 'square', vol = 0.12, when = 0, toFreq = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (toFreq) o.frequency.exponentialRampToValueAtTime(toFreq, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  },
  beep(hi) { this.tone(hi ? 880 : 440, hi ? 0.7 : 0.3); },
  ding() { this.tone(1320, 0.15, 'triangle', 0.2); this.tone(1760, 0.22, 'triangle', 0.15, 0.06); },
  boost() { this.tone(220, 0.5, 'sawtooth', 0.1, 0, 900); },
  bump() { this.tone(120, 0.15, 'square', 0.12, 0, 60); },
  noise(dur, vol) {
    if (!this.ctx) return;
    if (!this.nbuf) {
      this.nbuf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const d = this.nbuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = this.ctx.currentTime, src = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    src.buffer = this.nbuf; f.type = 'lowpass'; f.frequency.value = 900;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t); src.stop(t + dur);
  },
  spin() { this.tone(900, 0.9, 'triangle', 0.16, 0, 140); },
  land() { this.noise(0.18, 0.3); },
  explode() { this.noise(0.6, 0.5); this.tone(160, 0.5, 'square', 0.14, 0, 40); },
  tick() { this.tone(1500, 0.04, 'square', 0.05); },
  fall() { this.tone(700, 1.1, 'sine', 0.18, 0, 90); },
  grow() { [262, 330, 392, 523].forEach((f, i) => this.tone(f, 0.25, 'square', 0.1, i * 0.08, f * 1.5)); },
  shrink() { this.tone(1400, 0.6, 'sine', 0.18, 0, 200); },
  squeak() { this.tone(1500, 0.08, 'square', 0.1, 0, 2200); this.tone(1300, 0.12, 'square', 0.1, 0.1, 700); },
  boo() { this.tone(660, 0.18, 'sine', 0.16, 0, 990); this.tone(880, 0.22, 'sine', 0.14, 0.15, 520); },
  bark() { this.tone(520, 0.12, 'square', 0.16, 0, 300); this.tone(560, 0.14, 'square', 0.16, 0.18, 320); },
  fanfare() { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.tone(f, 0.32, 'triangle', 0.2, i * 0.14)); },
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.5; },
};

// ================= 遊戲狀態 =================
const sun = new THREE.DirectionalLight('#fff3e0', 2.4);
const pads = [], peanuts = [], itemBoxes = [], obstacles = [], villains = [], bombs = [], smokes = [], effects = []
const lasers = [], traffic = [], snowballs = [], scrollTex = [], solids = [], ghosts = [], penguins = [];
const solidGrid = new Map();
let snowfall = null;
const hemi = new THREE.HemisphereLight('#ffffff', '#86b86a', 1.5);
const state = { mode: 'loading', selected: 0, difficulty: 1, speedLevel: 0, track: 0, autoGas: true, cars: [], player: null, raceTime: 0, countdown: 0, lastCount: 0, resultTimer: -1, shake: 0 };
const input = { left: false, right: false, gas: false, brake: false };
const G = 36;          // 重力
const SPIN_T = 1.3;    // 轉圈圈秒數
const MAX_UP_V = 22;   // 在地面時最大往上速度（跳台起飛約 12～18）
const ITEMS = {
  rocket: { icon: '🚀', name: '火箭衝刺', w: [1, 3, 5, 6] },
  bomb: { icon: '💣', name: '花生炸彈', w: [2, 4, 4, 4] },
  smoke: { icon: '💨', name: '間諜煙霧彈', w: [5, 3, 2, 1] },
  shield: { icon: '🛡️', name: '間諜護盾', w: [4, 3, 2, 1] },
  peanut: { icon: '🥜', name: '花生大放送', w: [3, 2, 1, 1] },
  grow: { icon: '🧪', name: '變大藥水', w: [1, 2, 3, 3] },
  shrink: { icon: '🔦', name: '縮小手電筒', w: [0, 2, 3, 4] },
  dog: { icon: '🐶', name: '彭德拉車', w: [0, 1, 3, 5] },
};
const BIG_T = 8, SMALL_T = 6, DOG_T = 3.5;
const ITEM_KEYS = Object.keys(ITEMS);
let raceModels = [], previewModels = [], time = 0;
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();

function makeCar(ri, isPlayer) {
  const cfg = RACERS[ri], s = cfg.stats;
  return {
    cfg, ri, isPlayer, model: raceModels[ri],
    x: 0, y: 0, z: 0, heading: 0, pitch: 0, speed: 0, steer: 0, idx: 0, prevIdx: 0, lat: 0,
    lap: 0, checkpoint: true, peanuts: 0, boost: 0, finished: false, finishTime: 0, offroad: false, wheelSpin: 0,
    maxSpeed: (42 + s.speed * 2) * speedMul(), accel: (12 + s.accel * 3) * speedMul(), handling: 1.85 + s.handling * 0.13,
    s: 0, vy: 0, air: false, prevSy: 0, fallT: 0, spin: 0, invuln: 0, shield: 0, item: null, roll: 0,
    big: 0, small: 0, dog: 0, scaleNow: 1,
    ai: { baseSkill: 1, skill: 1, phase: rand() * 6, bias: (rand() - 0.5) * 4, hold: 0 },
  };
}
function placeCar(car, idx, lat) {
  const p = pts[idx], s = SIDE[idx];
  car.idx = car.prevIdx = idx;
  car.s = idx;
  car.lat = lat;
  car.x = p.x + s.x * lat; car.z = p.z + s.z * lat;
  car.heading = Math.atan2(TAN[idx].x, TAN[idx].z);
  car.y = car.prevSy = surfaceY(car);
  car.vy = 0; car.air = false; car.airT = 0;
  car.vdir = car.heading; car.slip = 0;
  car.safeP = car.stuckP = car.lap * N + idx;
  car.stuckT = 0;
}
const progress = (c) => c.lap * N + c.idx;
const speedMul = () => SPEED_MUL[state.speedLevel];

function setupGrid(selected) {
  const order = [0, 1, 2, 3].filter((i) => i !== selected);
  order.push(selected);
  state.cars = order.map((ri, slot) => {
    const car = makeCar(ri, ri === selected);
    placeCar(car, (N - 10 - (slot >> 1) * 9) % N, slot & 1 ? 4.5 : -4.5);
    car.ai.baseSkill = DIFF[state.difficulty] * [1.0, 0.97, 0.945, 1][slot];
    car.model.userData.tag.visible = !car.isPlayer;
    syncModel(car, 0);
    return car;
  });
  state.player = state.cars.find((c) => c.isPlayer);
}

function updateIdx(car) {
  let best = car.idx, bd = Infinity;
  for (let k = -30; k <= 30; k++) {
    const i = (car.idx + k + N) % N, p = pts[i];
    const d = (p.x - car.x) ** 2 + (p.z - car.z) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  car.idx = best;
  const p = pts[best], s = SIDE[best], t = TAN[best];
  car.lat = (car.x - p.x) * s.x + (car.z - p.z) * s.z;
  const along = clamp(((car.x - p.x) * t.x + (car.z - p.z) * t.z) / SPACING, -0.999, 0.999);
  car.s = (best + along + N) % N;
}

function updateCar(car, dt, ctl) {
  car.invuln = Math.max(0, car.invuln - dt);
  car.shield = Math.max(0, car.shield - dt);
  if (car.fallT > 0) {
    // 掉進峽谷，倒數後回到橋前
    car.fallT -= dt;
    car.vy -= G * dt;
    car.y = Math.max(car.y + car.vy * dt, CANYON_Y + 2);
    if (car.fallT <= 0) respawn(car);
    return;
  }
  car.big = Math.max(0, car.big - dt);
  car.small = Math.max(0, car.small - dt);
  car.dog = Math.max(0, car.dog - dt);
  if (car.dog > 0) {
    // 彭德拉車：自動駕駛往前衝
    car.ai.blunderT = 0;
    const steer = car.isPlayer && !AUTO && !car.finished ? aiControl(car, dt).steer : ctl.steer;
    ctl = { steer, gas: true, brake: false };
    car.spin = 0;
  }
  if (car.spin > 0) {
    car.spin -= dt;
    ctl = { steer: 0, gas: false, brake: false };
    car.speed *= Math.pow(0.3, dt);
  }
  car.steer += clamp(ctl.steer - car.steer, -dt * 6, dt * 6);
  car.offroad = !car.air && Math.abs(car.lat) > HW + 1.2;
  let maxSp = car.maxSpeed * (1 + car.peanuts * 0.012) * (car.isPlayer && !car.finished && !AUTO ? 1 : car.ai.skill);
  if (car.offroad && car.dog <= 0) maxSp *= 0.5;
  if (car.big > 0) maxSp *= 1.08;
  if (car.small > 0) maxSp *= 0.72;
  if (car.boost > 0) { maxSp += 18 * speedMul(); car.boost -= dt; }
  if (car.dog > 0) { maxSp = car.maxSpeed * 1.45; car.speed = Math.max(car.speed, lerp(car.speed, maxSp, 1 - Math.exp(-dt * 4))); }
  if (!car.air) {
    if (ctl.gas && car.speed < maxSp) car.speed += car.accel * dt * (1.15 - Math.max(0, car.speed) / maxSp);
    if (!ctl.gas && !ctl.brake) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 9 * dt);
    if (ctl.brake) car.speed = car.speed > 0 ? car.speed - 45 * dt : Math.max(-12, car.speed - 14 * dt);
    if (car.speed > maxSp) car.speed = Math.max(maxSp, car.speed - 30 * dt);
  }

  const sp = Math.abs(car.speed);
  const turn = car.handling * Math.min(1, sp / 6) * (1 - 0.3 * Math.min(1, sp / 55)) * (car.air ? 0.35 : 1);
  car.heading -= car.steer * turn * dt * (car.speed < 0 ? -1 : 1);
  if (car.air && car.speed > 0) {
    // 空中自動對準賽道方向，並慢慢拉回路面上方
    const th = Math.atan2(TAN[car.idx].x, TAN[car.idx].z);
    car.heading += wrapAngle(th - car.heading) * Math.min(1, dt * 3);
    if (Math.abs(car.lat) > HW - 3) car.heading -= Math.sign(car.lat) * dt * 0.25;
  }
  // 地面區域：冰面會滑、輸送帶往旁邊推、水窪打滑
  const zone = car.air ? null : zoneAt(car);
  if (zone && zone.type === 'puddle') {
    if (!car.inPuddle) {
      car.slip = 0.7;
      spawnEffect(car.x, car.y + 0.6, car.z, '#9fd0ff', 1.6);
      if (car.isPlayer) { Sound.noise(0.25, 0.15); showBanner('水窪！打滑～', 700); }
    }
    car.inPuddle = true;
  } else car.inPuddle = false;
  if (car.slip > 0) {
    car.slip -= dt;
    car.heading += Math.sin(time * 18 + car.ri) * dt * 2.2;
    car.speed *= Math.pow(0.85, dt);
  }
  // 移動方向：一般跟車頭一樣；在冰上會慢慢跟上，車子會甩尾滑行
  const onIce = zone && zone.type === 'ice' && car.dog <= 0;
  if (car.vdir === undefined) car.vdir = car.heading;
  car.vdir += wrapAngle(car.heading - car.vdir) * Math.min(1, dt * (onIce ? 1.3 : 14));
  const ox = car.x, oz = car.z;
  car.x += Math.sin(car.vdir) * car.speed * dt;
  car.z += Math.cos(car.vdir) * car.speed * dt;
  if (zone && zone.type === 'conveyor') { car.x += SIDE[car.idx].x * zone.push * dt; car.z += SIDE[car.idx].z * zone.push * dt; }

  car.prevIdx = car.idx;
  const prevLat = car.lat;
  updateIdx(car);
  const inCanyon = canyonF(car.x, car.z) > 0.05;
  const railed = inCanyon || isDeck[car.idx];
  const lim = railed ? HW + 1 : HW + OFFROAD;   // 橋上、高架橋上有欄杆
  if (Math.abs(car.lat) > lim) {
    const s = SIDE[car.idx], L = Math.sign(car.lat) * lim;
    car.x -= s.x * (car.lat - L); car.z -= s.z * (car.lat - L); car.lat = L;
    // 貼著邊界滑行：車頭轉回賽道方向，不會卡死
    const th = headingAt(car.idx);
    car.heading += wrapAngle(th - car.heading) * Math.min(1, dt * 5);
    car.vdir = car.heading;
    car.speed = Math.max(Math.min(car.speed, 10), car.speed * Math.pow(railed ? 0.7 : 0.3, dt));
  }
  // 岔路中間的分隔牆
  for (const d of LAYOUT.dividers) {
    if (car.air || idxAhead(d.i0, car.idx) > d.len || Math.abs(car.lat) >= 2.9) continue;
    const s = SIDE[car.idx], L = (car.lat >= 0 ? 1 : -1) * 2.9;
    car.x -= s.x * (car.lat - L); car.z -= s.z * (car.lat - L); car.lat = L;
    car.heading += wrapAngle(headingAt(car.idx) - car.heading) * Math.min(1, dt * 6);
    car.vdir = car.heading;
    car.speed *= Math.pow(0.6, dt);
    if (car.isPlayer && Math.random() < dt * 4) Sound.bump();
  }
  // 隧道牆：從裡面出不去、從外面也進不來
  const kr = 1.3 * car.scaleNow;
  for (const t of LAYOUT.tunnels) {
    if (idxAhead(t.i0, car.idx) > t.len) continue;
    const wall = tunnelWallLat(t);
    for (const s of t.kind === 'cave' ? [t.side] : [-1, 1]) {
      const l = car.lat * s;
      if (l <= wall - kr || l >= wall + kr) continue;
      const target = (prevLat * s <= wall ? wall - kr : wall + kr) * s;
      const sv = SIDE[car.idx];
      car.x -= sv.x * (car.lat - target); car.z -= sv.z * (car.lat - target); car.lat = target;
      car.heading += wrapAngle(headingAt(car.idx) - car.heading) * Math.min(1, dt * 6);
      car.vdir = car.heading;
      car.speed *= Math.pow(0.5, dt);
      if (car.isPlayer && Math.random() < dt * 4) Sound.bump();
    }
  }
  // 路邊的樹、房子、大樓、雪人、柱子：撞到會被彈開
  collideSolids(car, kr, dt);

  // 垂直：跳躍、飛行、落地
  let sy = surfaceY(car);
  if (car.air && car.y < sy - 1.5) {
    // 撞到斷橋邊緣（太低了），被彈回去繼續往下掉
    car.x = ox; car.z = oz;
    car.speed *= -0.2;
    updateIdx(car);
    sy = surfaceY(car);
  }
  // 地面高度如果一瞬間跳很多（跳台側邊、被欄杆推回橋面），只當成爬上去，不能變成火箭往上噴
  const gv = clamp((sy - car.prevSy) / dt, -80, MAX_UP_V);
  car.prevSy = sy;
  if (car.air) {
    car.vy = Math.max(car.vy - G * dt, -60);
    car.y += car.vy * dt;
    car.airT += dt;
    if (car.y <= sy) {
      if (car.isPlayer && car.vy < -12) { Sound.land(); state.shake = Math.min(0.5, -car.vy * 0.02); }
      car.y = sy; car.vy = gv; car.air = false; car.airT = 0;
    }
  } else if (gv < car.vy - G * dt - 0.6) {
    car.air = true;
    car.airT = 0;
    car.vy -= G * dt;
    car.y += car.vy * dt;
  } else {
    car.vy = gv;
    car.y = sy;
  }
  // 掉進峽谷（不論是飛進去還是開下去）→ 回到橋前
  if (car.y < roadY(car.s) - 7 && canyonF(car.x, car.z) > 0.3) {
    car.fallT = 1.4;
    car.speed = 0;
    car.air = true;
    if (car.isPlayer) { Sound.fall(); showBanner('掉下去了～！', 1400); }
    return;
  }
  // 記住最近一次安全的位置（在路面上、沒在飛、不在峽谷）
  if (!car.air && Math.abs(car.lat) < HW && canyonF(car.x, car.z) < 0.02) car.safeP = car.lap * N + car.idx;
  // 保險：飛太久、飛太高、或卡住不動太久，就回到安全位置
  const p = car.lap * N + car.s;
  if (Math.abs(p - car.stuckP) > 3) { car.stuckP = p; car.stuckT = 0; } else if (car.spin <= 0) car.stuckT += dt;
  const wantsToGo = !car.isPlayer || AUTO || car.finished || ((state.autoGas || input.gas) && !input.brake);
  if (car.airT > 4 || car.y > roadY(car.s) + 45 || (wantsToGo && car.stuckT > 5)) {
    (state.rescueLog ||= []).push({ who: car.cfg.name, why: car.airT > 4 ? 'air' : car.stuckT > 5 ? 'stuck' : 'high', idx: car.idx, lat: +car.lat.toFixed(1), y: +car.y.toFixed(1) });
    rescue(car);
    return;
  }
  // 圈數判定
  if (car.idx > N * 0.4 && car.idx < N * 0.6) car.checkpoint = true;
  if (car.prevIdx > N * 0.8 && car.idx < N * 0.2 && car.checkpoint) { car.lap++; car.checkpoint = false; onLap(car); }
  else if (car.prevIdx < N * 0.2 && car.idx > N * 0.8) { car.lap--; car.checkpoint = true; }

  const pitchT = Math.atan2(car.vy, Math.max(8, Math.abs(car.speed))) * (car.air ? 0.6 : 1);
  car.pitch = lerp(car.pitch, clamp(pitchT, -0.6, 0.6), 1 - Math.exp(-dt * 10));
}

function rescue(car) {
  // 用「圈數＋位置」記安全點，跨過起跑線也不會算錯圈
  const sp = car.safeP - 8;
  car.lap = Math.floor(sp / N);
  const idx = ((sp % N) + N) % N;
  placeCar(car, idx, 0);
  car.checkpoint = idx >= N * 0.4;
  car.speed = 12; car.spin = 0; car.fallT = 0; car.invuln = 2;
  if (car.isPlayer) showBanner('回到賽道上！', 1000);
}

// 隧道牆在路中心哪一側多遠（和 buildTunnel 的斷面一致）
function tunnelWallLat(t) {
  return t.kind === 'base' ? HW + 2 : t.kind === 'cave' ? 6.5 + 7.2 : HW + 3;
}

// ---------- 實體障礙物：圓形（樹、柱子）或方形（房子、大樓） ----------
const SOLID_CELL = 16;
function addSolid(s) {
  const r = (s.r || Math.hypot(s.hw, s.hd)) + 2.5;
  s.top = s.top ?? 99;
  s.y = s.y ?? -99;
  solids.push(s);
  for (let cx = Math.floor((s.x - r) / SOLID_CELL); cx <= Math.floor((s.x + r) / SOLID_CELL); cx++) {
    for (let cz = Math.floor((s.z - r) / SOLID_CELL); cz <= Math.floor((s.z + r) / SOLID_CELL); cz++) {
      const key = cx * 10007 + cz;
      if (!solidGrid.has(key)) solidGrid.set(key, []);
      solidGrid.get(key).push(s);
    }
  }
}
function collideSolids(car, kr, dt) {
  const list = solidGrid.get(Math.floor(car.x / SOLID_CELL) * 10007 + Math.floor(car.z / SOLID_CELL));
  if (!list) return;
  for (const s of list) {
    if (car.y > s.y + s.top) continue;   // 從上面飛過去
    let nx, nz, pen;
    if (s.r) {
      const dx = car.x - s.x, dz = car.z - s.z, d = Math.hypot(dx, dz);
      if (d >= s.r + kr || d < 1e-4) continue;
      nx = dx / d; nz = dz / d; pen = s.r + kr - d;
    } else {
      // 方形：轉到方塊自己的座標找最近點
      const c = Math.cos(s.rot), sn = Math.sin(s.rot);
      const dx = car.x - s.x, dz = car.z - s.z;
      const lx = dx * c - dz * sn, lz = dx * sn + dz * c;
      const qx = clamp(lx, -s.hw, s.hw), qz = clamp(lz, -s.hd, s.hd);
      let ex = lx - qx, ez = lz - qz, d = Math.hypot(ex, ez);
      if (d >= kr) continue;
      if (d < 1e-4) {
        // 車子中心跑進方塊裡：往最近的邊推出去
        const px = s.hw - Math.abs(lx), pz = s.hd - Math.abs(lz);
        if (px < pz) { ex = Math.sign(lx) || 1; ez = 0; pen = px + kr; } else { ex = 0; ez = Math.sign(lz) || 1; pen = pz + kr; }
        d = 1;
      } else pen = kr - d;
      ex /= d; ez /= d;
      nx = ex * c + ez * sn; nz = -ex * sn + ez * c;
    }
    car.x += nx * pen; car.z += nz * pen;
    // 朝障礙物的速度分量被擋掉
    const vx = Math.sin(car.vdir), vz = Math.cos(car.vdir), into = -(vx * nx + vz * nz);
    if (into > 0.2) {
      car.speed *= Math.pow(0.15, dt * 4 * into);
      if (car.isPlayer && car.speed > 6 && Math.random() < dt * 6) { Sound.bump(); state.shake = Math.max(state.shake, 0.15); }
    }
    updateIdx(car);
  }
}

function zoneAt(car) {
  for (const z of LAYOUT.zones) {
    if (idxAhead(z.i0, car.idx) <= z.len && car.lat >= z.lat0 && car.lat <= z.lat1) return z;
  }
  return null;
}

function respawn(car) {
  if (GAP0 < 0) { rescue(car); return; }
  const idx = (GAP0 - 48 + N) % N;
  placeCar(car, idx, 0);
  car.speed = 24; car.fallT = 0; car.spin = 0; car.invuln = 2;
  car.checkpoint = true;
}

// 被打中：轉圈圈（有護盾就擋掉）
function hit(car, msg) {
  if (car.invuln > 0 || car.fallT > 0 || car.big > 0 || car.dog > 0) return false;
  if (car.shield > 0) {
    car.shield = 0;
    car.invuln = 1;
    if (car.isPlayer) { Sound.tone(1200, 0.25, 'triangle', 0.2); showBanner('護盾擋住了！', 900); }
    return false;
  }
  if (state.hitStats) state.hitStats[msg] = (state.hitStats[msg] || 0) + 1;
  car.spin = SPIN_T;
  car.invuln = SPIN_T + 1.2;
  car.speed *= 0.35;
  car.peanuts = Math.max(0, car.peanuts - 2);
  if (car.isPlayer) { Sound.spin(); showBanner(msg, 1400); state.shake = 0.35; }
  return true;
}

// ---------- 道具 ----------
function rollItem(car) {
  const rank = clamp(ranking().indexOf(car), 0, 3);
  const total = ITEM_KEYS.reduce((a, k) => a + ITEMS[k].w[rank], 0);
  let r = Math.random() * total;
  for (const k of ITEM_KEYS) { r -= ITEMS[k].w[rank]; if (r <= 0) return k; }
  return 'rocket';
}
function useItem(car) {
  if (!car.item || car.fallT > 0 || car.spin > 0) return;
  const it = car.item, fx = Math.sin(car.heading), fz = Math.cos(car.heading);
  car.item = null;
  if (it === 'rocket') {
    car.boost = Math.max(car.boost, 2.2);
    car.speed += 10 * speedMul();
    if (car.isPlayer) { Sound.boost(); showBanner('火箭衝刺！', 800); }
  } else if (it === 'bomb') {
    const m = makeBombMesh();
    world.add(m);
    const b = { x: car.x + fx * 3.2, z: car.z + fz * 3.2, y: car.y + 1, idx: car.idx, s: car.s, lat: car.lat,
      speed: Math.max(car.speed, 10) + 30, owner: car, life: 5, mesh: m };
    updateIdx(b);
    bombs.push(b);
    if (car.isPlayer) Sound.tone(500, 0.2, 'square', 0.12, 0, 900);
  } else if (it === 'smoke') {
    const m = makeSmokeMesh();
    world.add(m);
    const sm = { x: car.x - fx * 4, z: car.z - fz * 4, idx: car.idx, s: car.s, lat: car.lat, life: 15, mesh: m };
    updateIdx(sm);
    m.position.set(sm.x, surfaceY(sm), sm.z);
    smokes.push(sm);
    if (car.isPlayer) Sound.noise(0.4, 0.2);
  } else if (it === 'shield') {
    car.shield = 10;
    if (car.isPlayer) Sound.tone(600, 0.4, 'sine', 0.2, 0, 1200);
  } else if (it === 'grow') {
    car.big = BIG_T;
    car.small = 0;
    if (car.isPlayer) { Sound.grow(); showBanner('變大了！撞誰誰轉圈！', 1200); }
  } else if (it === 'shrink') {
    // 縮小所有跑在前面的車
    const mine = car.lap * N + car.s;
    let n = 0;
    for (const c of state.cars) {
      if (c === car || c.finished || c.lap * N + c.s <= mine) continue;
      spawnEffect(c.x, c.y + 1.5, c.z, '#b48cff', 3);
      n++;
      if (c.shield > 0) { c.shield = 0; continue; }
      if (c.big > 0) { c.big = 0; continue; }
      if (c.dog > 0) continue;
      c.small = SMALL_T;
      c.item = null; c.roll = 0;
      if (c.isPlayer) { Sound.shrink(); showBanner('被縮小了！', 1200); }
    }
    if (car.isPlayer) { Sound.shrink(); showBanner(n ? `縮小前面 ${n} 台車！` : '前面沒有車…', 1000); }
  } else if (it === 'dog') {
    car.dog = DOG_T;
    car.spin = 0;
    if (car.isPlayer) { Sound.bark(); showBanner('彭德衝衝衝！', 1200); }
  } else {
    car.peanuts = Math.min(10, car.peanuts + 3);
    if (car.isPlayer) Sound.ding();
  }
}

const idxAhead = (from, to) => (to - from + N) % N;

function updateItems(car, dt) {
  if (car.roll > 0) {
    car.roll -= dt;
    if (car.isPlayer && Math.floor(car.roll * 14) !== Math.floor((car.roll + dt) * 14)) Sound.tick();
    if (car.roll <= 0) {
      car.item = rollItem(car);
      if (car.isPlayer) Sound.tone(1000, 0.15, 'triangle', 0.18);
    }
  }
  if (car.isPlayer && !AUTO && !car.finished) return;
  // AI 決定何時用道具
  if (!car.item) { car.ai.hold = 0; return; }
  car.ai.hold += dt;
  if (car.ai.hold < 0.8) return;
  const others = state.cars.filter((c) => c !== car);
  let use = false;
  if (car.item === 'rocket') {
    const t0 = TAN[car.idx], t1 = TAN[(car.idx + 30) % N];
    use = t0.x * t1.x + t0.z * t1.z > 0.95;
  } else if (car.item === 'bomb') use = others.some((c) => { const d = idxAhead(car.idx, c.idx); return d > 8 && d < 90; });
  else if (car.item === 'smoke') use = others.some((c) => { const d = idxAhead(c.idx, car.idx); return d > 3 && d < 35; }) || car.ai.hold > 9;
  else use = true;
  if (use) useItem(car);
}

// ---------- 場上的機關 ----------
function updateHazards(dt) {
  const cars = state.cars;
  updateMovingHazards(dt, cars);
  // 道具禮物盒
  for (const b of itemBoxes) {
    b.mesh.rotation.y += dt * 1.6;
    b.mesh.rotation.x += dt * 0.7;
    b.mesh.position.y = b.y + Math.sin(time * 2.5 + b.x) * 0.25;
    if (!b.active) { if ((b.timer -= dt) <= 0) { b.active = true; b.mesh.visible = true; } continue; }
    for (const c of cars) {
      if (c.fallT > 0 || (b.x - c.x) ** 2 + (b.z - c.z) ** 2 > 7 || Math.abs(b.y - 1.4 - c.y) > 4) continue;
      b.active = false; b.timer = 2.5; b.mesh.visible = false;
      spawnEffect(b.x, b.y, b.z, '#ffb3cf', 1.6);
      if (!c.item && c.roll <= 0) { c.roll = c.isPlayer ? 1.1 : 0.4; }
      if (c.isPlayer) Sound.tone(880, 0.12, 'triangle', 0.15);
      break;
    }
  }
  // 路障
  for (const o of obstacles) {
    if (o.knocked > 0) {
      o.knocked -= dt;
      o.v.y -= G * dt;
      o.mesh.position.addScaledVector(o.v, dt);
      o.mesh.rotation.x += dt * 9;
      if (o.knocked <= 0) { o.mesh.position.copy(o.home); o.mesh.rotation.set(0, o.mesh.rotation.y, 0); }
      continue;
    }
    for (const c of cars) {
      if (c.air || c.fallT > 0 || (o.x - c.x) ** 2 + (o.z - c.z) ** 2 > o.r * o.r) continue;
      hit(c, '撞到路障了！轉圈圈～');
      o.knocked = 7;
      const sp = Math.max(10, c.speed);
      o.v.set(Math.sin(c.heading) * sp * 0.6, 12, Math.cos(c.heading) * sp * 0.6);
      if (c.isPlayer) Sound.bump();
      break;
    }
  }
  // 黑衣壞人
  for (const v of villains) {
    const u = v.mesh.userData;
    if (v.state === 'knocked') {
      v.t -= dt;
      v.vy -= G * dt;
      v.y += v.vy * dt;
      v.x += v.v.x * dt; v.z += v.v.z * dt;
      v.mesh.position.set(v.x, v.y, v.z);
      v.mesh.rotation.x += dt * 10;
      if (v.t <= 0) { v.state = 'wait'; v.t = 3; v.lat = v.side * (HW + 3.5); v.mesh.rotation.x = 0; }
      continue;
    }
    if (v.state === 'wait') {
      v.lat = v.side * (HW + 3.5);
      v.t -= dt;
      u.legs.forEach((l) => { l.rotation.x = 0; });
      u.arms.forEach((a, k) => { a.rotation.x = 0; a.rotation.z = (k ? -1 : 1) * 0.15; });
      if (v.t <= 0 && cars.some((c) => { const d = idxAhead(c.idx, v.idx); return d > 22 && d < 50; })) {
        v.state = 'run';
        Sound.tone(300, 0.15, 'square', 0.06);
      }
    } else {
      const dir = -v.side;
      v.lat += dir * 8.5 * dt;
      const ph = time * 14;
      u.legs[0].rotation.x = Math.sin(ph) * 0.9; u.legs[1].rotation.x = -Math.sin(ph) * 0.9;
      u.arms.forEach((a, k) => { a.rotation.x = -1.4; a.rotation.z = (k ? -1 : 1) * 0.5; });
      if (Math.abs(v.lat) >= HW + 3.5 && Math.sign(v.lat) === dir) { v.side = dir; v.state = 'wait'; v.t = 2.5; }
    }
    const p = pts[v.idx], s = SIDE[v.idx], face = -v.side;
    v.x = p.x + s.x * v.lat; v.z = p.z + s.z * v.lat;
    v.y = surfaceY({ x: v.x, z: v.z, idx: v.idx, s: v.idx, lat: v.lat });
    v.mesh.position.set(v.x, v.y, v.z);
    v.mesh.rotation.y = Math.atan2(s.x * face, s.z * face);
    for (const c of cars) {
      if (c.air || c.fallT > 0 || (v.x - c.x) ** 2 + (v.z - c.z) ** 2 > 5.3) continue;
      hit(c, '被壞人擋住了！轉圈圈～');
      v.state = 'knocked'; v.t = 2.2; v.vy = 15;
      v.v.set(Math.sin(c.heading) * 12, 0, Math.cos(c.heading) * 12);
      Sound.bump();
      break;
    }
  }
  // 花生炸彈：沿著賽道追前面的車
  for (let k = bombs.length - 1; k >= 0; k--) {
    const b = bombs[k];
    b.life -= dt;
    let target = null, best = 110;
    for (const c of cars) {
      if (c === b.owner || c.fallT > 0) continue;
      const d = idxAhead(b.idx, c.idx);
      if (d < best) { best = d; target = c; }
    }
    if (target) b.lat += clamp(target.lat - b.lat, -14 * dt, 14 * dt);
    b.lat = clamp(b.lat, -HW, HW);
    const ti = (b.idx + 4) % N, tp = pts[ti];
    const tx = tp.x + SIDE[ti].x * b.lat - b.x, tz = tp.z + SIDE[ti].z * b.lat - b.z, tl = Math.hypot(tx, tz) || 1;
    b.x += tx / tl * b.speed * dt; b.z += tz / tl * b.speed * dt;
    updateIdx(b);
    b.y = Math.max(surfaceY(b), roadY(b.s)) + 0.9;
    b.mesh.position.set(b.x, b.y + Math.sin(time * 20) * 0.1, b.z);
    b.mesh.rotation.y = Math.atan2(tx, tz);
    let boom = b.life <= 0;
    for (const c of cars) {
      if ((c === b.owner && b.life > 4.4) || c.fallT > 0) continue;
      if ((b.x - c.x) ** 2 + (b.z - c.z) ** 2 < 6.2 && Math.abs(b.y - c.y - 1) < 3) {
        hit(c, '被花生炸彈打中了！');
        boom = true;
        break;
      }
    }
    if (boom) {
      spawnEffect(b.x, b.y, b.z, '#ff9a2e', 3.5);
      Sound.explode();
      b.mesh.removeFromParent();
      bombs.splice(k, 1);
    }
  }
  // 煙霧彈
  for (let k = smokes.length - 1; k >= 0; k--) {
    const sm = smokes[k];
    sm.life -= dt;
    sm.mesh.rotation.y += dt * 0.6;
    sm.mesh.scale.setScalar(1 + Math.sin(time * 4) * 0.06);
    let gone = sm.life <= 0;
    for (const c of cars) {
      if (c.air || c.fallT > 0 || (sm.x - c.x) ** 2 + (sm.z - c.z) ** 2 > 7.3) continue;
      if (hit(c, '衝進煙霧彈了！轉圈圈～') || c.shield <= 0) { gone = true; break; }
    }
    if (gone) {
      spawnEffect(sm.x, sm.mesh.position.y + 1, sm.z, '#c3c9d6', 3);
      sm.mesh.removeFromParent();
      smokes.splice(k, 1);
    }
  }
}

// 雷射門、城市車輛、滾雪球
function updateMovingHazards(dt, cars) {
  for (const l of lasers) {
    const on = laserOn(l, state.raceTime);
    const warn = !on && laserOn(l, state.raceTime + 0.8);
    l.on = on;
    for (const b of l.beams) b.visible = on || (warn && Math.floor(state.raceTime * 12) % 2 === 0);
    l.beamM.opacity = on ? 0.9 : 0.35;
    if (!on) continue;
    for (const c of cars) {
      if (c.fallT > 0 || c.y > pts[l.idx].y + 3.2) continue;
      if (Math.min(idxAhead(l.idx, c.idx), idxAhead(c.idx, l.idx)) <= 1) hit(c, '被雷射打中了！轉圈圈～');
    }
  }
  for (const v of traffic) {
    v.s = (v.s + v.speed * dt / SPACING) % N;
    v.idx = Math.floor(v.s);
    const [x, z] = latPos(v.idx, v.lat);
    v.x = x; v.z = z; v.y = roadY(v.s);
    v.mesh.position.set(x, v.y, z);
    v.mesh.rotation.y = headingAt(v.idx);
    for (const c of cars) {
      if (c.fallT > 0 || Math.abs(c.y - v.y) > 3) continue;
      const dx = c.x - v.x, dz = c.z - v.z, d = Math.hypot(dx, dz), r = v.r + 1.35 * c.scaleNow;
      if (d >= r || d < 0.01) continue;
      c.x += dx / d * (r - d); c.z += dz / d * (r - d);
      if (!hit(c, '撞到車子了！轉圈圈～')) c.speed *= 0.9;
    }
  }
  for (const gh of ghosts) {
    const t = state.raceTime + gh.phase;
    gh.scare = Math.max(0, gh.scare - dt);
    const cyc = (t % 8) / 8;   // 一輪 8 秒：前 60% 實體，後 40% 透明
    gh.solid = cyc < 0.6 && gh.scare <= 0;
    const fade = gh.scare > 0 ? 0.3 : cyc < 0.56 ? 1 : cyc < 0.6 ? 1 - (cyc - 0.56) / 0.04 * 0.7 : cyc > 0.96 ? 0.3 + (cyc - 0.96) / 0.04 * 0.7 : 0.3;
    gh.mats[0].opacity = 0.92 * fade;
    for (let m = 1; m < gh.mats.length; m++) gh.mats[m].opacity = fade;
    gh.lat = Math.sin(t * gh.spd) * gh.amp;
    gh.idx = (gh.i0 + Math.round(Math.sin(t * 0.37) * 4) + N) % N;
    const [x, z] = latPos(gh.idx, gh.lat);
    gh.x = x; gh.z = z; gh.y = pts[gh.idx].y + 1.7 + Math.sin(t * 2.6) * 0.35;
    gh.mesh.position.set(x, gh.y, z);
    gh.mesh.rotation.y = headingAt(gh.idx) + Math.PI + (gh.scare > 0 ? gh.scare * 12 : Math.sin(t * 1.7) * 0.25);
    gh.arms.forEach((a, k) => { a.position.y = 0.25 + Math.sin(t * 6 + k * Math.PI) * 0.18; });
    if (!gh.solid) continue;
    for (const c of cars) {
      if (c.fallT > 0 || Math.abs(c.y + 1.2 - gh.y) > 3) continue;
      if ((c.x - x) ** 2 + (c.z - z) ** 2 < (1.0 + 1.15 * c.scaleNow) ** 2) {
        hit(c, '被幽靈嚇到了！轉圈圈～');
        gh.scare = 2;
        Sound.boo();
        break;
      }
    }
  }
  for (const pg of penguins) {
    const u = pg.mesh.userData;
    pg.t += dt;
    if (pg.dizzy > 0) {
      // 被撞：往後翻、坐在地上暈頭轉向
      pg.dizzy -= dt;
      pg.vy -= G * dt; pg.hop = Math.max(0, pg.hop + pg.vy * dt);
      u.body.rotation.x = pg.hop > 0 ? u.body.rotation.x - dt * 8 : lerp(u.body.rotation.x, -0.5, 1 - Math.exp(-dt * 10));
      u.stars.visible = true;
      u.stars.rotation.y += dt * 6;
      u.eyes.visible = false; u.dizzy.visible = true;
      if (pg.dizzy <= 0) { u.body.rotation.x = 0; u.stars.visible = false; u.eyes.visible = true; u.dizzy.visible = false; }
    } else if (pg.wave > 0) {
      // 停下來揮手
      pg.wave -= dt;
      u.flips.forEach((f, k) => { f.rotation.z = (k ? -1 : 1) * (2.2 + Math.sin(pg.t * 10) * 0.4); });
      u.body.rotation.z = 0;
    } else {
      // 搖搖擺擺走路，走到路邊就轉身
      pg.lat += pg.dir * pg.spd * dt;
      if (Math.abs(pg.lat) > HW - 1.5) { pg.lat = Math.sign(pg.lat) * (HW - 1.5); pg.dir = -pg.dir; if (Math.random() < 0.5) pg.wave = 1.2; }
      const ph = pg.t * 9;
      u.body.rotation.z = Math.sin(ph) * 0.22;
      u.feet[0].position.z = 0.25 + Math.sin(ph) * 0.22; u.feet[1].position.z = 0.25 - Math.sin(ph) * 0.22;
      u.flips.forEach((f, k) => { f.rotation.z = (k ? -1 : 1) * (0.3 + Math.abs(Math.sin(ph)) * 0.35); });
    }
    pg.solid = pg.dizzy <= 0;
    const [x, z] = latPos(pg.idx, pg.lat);
    pg.x = x; pg.z = z; pg.y = pts[pg.idx].y + pg.hop;
    pg.mesh.position.set(x, pg.y, z);
    const face = pg.wave > 0 || pg.dizzy > 0 ? Math.PI : (pg.dir > 0 ? -Math.PI / 2 : Math.PI / 2);
    pg.mesh.rotation.y = headingAt(pg.idx) + face;
    if (!pg.solid) continue;
    for (const c of cars) {
      if (c.fallT > 0 || c.air || Math.abs(c.y - pg.y) > 2.5) continue;
      if ((c.x - x) ** 2 + (c.z - z) ** 2 < (0.95 + 1.15 * c.scaleNow) ** 2) {
        hit(c, '撞到企鵝了！暈頭轉向～');
        pg.dizzy = 2.5; pg.vy = 9; pg.hop = 0.01; pg.wave = 0;
        Sound.squeak();
        break;
      }
    }
  }
  for (const b of snowballs) {
    const cfg = b.cfg;
    if (!b.active) {
      b.mesh.visible = false;
      if ((b.t -= dt) <= 0) {
        b.active = true; b.s = cfg.iTop;
        b.lat = cfg.lanes[Math.floor(Math.random() * cfg.lanes.length)];
      }
      continue;
    }
    b.s = (b.s - 22 * dt / SPACING + N) % N;
    b.idx = Math.floor(b.s);
    const [x, z] = latPos(b.idx, b.lat);
    b.x = x; b.z = z; b.y = roadY(b.s) + b.r;
    b.mesh.visible = true;
    b.mesh.position.set(x, b.y, z);
    b.mesh.rotation.x -= 22 * dt / b.r;
    b.mesh.rotation.y = headingAt(b.idx);
    let done = idxAhead(cfg.iBottom, b.idx) > idxAhead(cfg.iBottom, cfg.iTop);
    for (const c of cars) {
      if (c.fallT > 0 || Math.abs(c.y + 1 - b.y) > 3.5) continue;
      if ((c.x - x) ** 2 + (c.z - z) ** 2 < (b.r + 1.1 * c.scaleNow) ** 2) {
        hit(c, '被大雪球撞到了！');
        done = true;
        break;
      }
    }
    if (done) {
      spawnEffect(x, b.y, z, '#ffffff', 3.5);
      b.active = false;
      b.t = cfg.every * (0.7 + Math.random() * 0.6);
    }
  }
}

function updateEffects(dt) {
  for (let k = effects.length - 1; k >= 0; k--) {
    const e = effects[k];
    e.t += dt;
    const f = e.t / e.dur;
    e.mesh.scale.setScalar(e.size * (0.3 + f));
    e.mesh.material.opacity = 0.9 * (1 - f);
    if (f >= 1) { e.mesh.removeFromParent(); effects.splice(k, 1); }
  }
}

function resetHazards() {
  for (const b of bombs) b.mesh.removeFromParent();
  for (const sm of smokes) sm.mesh.removeFromParent();
  bombs.length = 0; smokes.length = 0;
  for (const b of itemBoxes) { b.active = true; b.mesh.visible = true; }
  for (const o of obstacles) { o.knocked = 0; o.mesh.position.copy(o.home); o.mesh.rotation.set(0, o.mesh.rotation.y, 0); }
  for (const v of villains) { v.state = 'wait'; v.t = 0; v.lat = v.side * (HW + 3.5); v.mesh.rotation.x = 0; }
  traffic.forEach((v, k) => { v.s = (k + 0.5) * N / traffic.length; });
  snowballs.forEach((b, k) => { b.active = false; b.t = 1 + k * b.cfg.every; });
  penguins.forEach((pg) => { pg.dizzy = 0; pg.wave = 0; pg.hop = 0; const u = pg.mesh.userData; u.body.rotation.set(0, 0, 0); u.stars.visible = false; u.eyes.visible = true; u.dizzy.visible = false; });
  updateHazards(0);
}

function playerControl() {
  const steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  return { steer, gas: (state.autoGas || input.gas) && !input.brake, brake: input.brake };
}

function aiControl(car, dt) {
  const ai = car.ai;
  ai.phase += dt * 0.35;
  let lane = clamp(Math.sin(ai.phase) * HW * 0.45 + ai.bias, -HW + 2.5, HW - 2.5);
  // 閃避前方的路障、煙霧與壞人（不是每次都閃得掉）
  const dodge = state.difficulty === 0 ? 2.6 : 3.8;
  const hazards = [...obstacles.filter((o) => o.knocked <= 0), ...smokes, ...villains.filter((v) => v.state !== 'knocked'),
    ...traffic, ...snowballs.filter((b) => b.active), ...ghosts.filter((g) => g.solid), ...penguins.filter((g) => g.solid)];
  for (const o of hazards) {
    const d = idxAhead(car.idx, o.idx);
    if (d > 0 && d < 38 && Math.abs(o.lat - lane) < dodge) lane = clamp(o.lat + (lane >= o.lat ? 4.8 : -4.8), -HW + 1.5, HW - 1.5);
  }
  // 岔路：每圈隨機選一邊走
  for (const d of LAYOUT.dividers) {
    const ahead = idxAhead(car.idx, d.i0);
    if (ahead < 45 || idxAhead(d.i0, car.idx) <= d.len) {
      if (ai.routeLap !== car.lap) { ai.routeLap = car.lap; ai.route = Math.random() < 0.5 ? -1 : 1; }
      lane = ai.route * clamp(Math.abs(lane), 6, HW - 2);
    }
  }
  // 追趕機制：玩家落到第 3、4 名時，跑在玩家前面的電腦會放慢、偶爾出包
  const pl = state.player;
  const trailing = pl && !car.isPlayer && !pl.finished && ranking().indexOf(pl) >= 2;
  const ahead = pl ? progress(car) - progress(pl) : 0;
  updateBlunder(car, dt, trailing && ahead > 15);
  if (ai.blunderT > 0 && ai.blunder === 'grass') lane = ai.blunderSide * (HW + 8);

  const look = 10 + Math.floor(Math.max(0, car.speed) * 0.35);
  const ti = (car.idx + look) % N, p = pts[ti], s = SIDE[ti];
  const want = Math.atan2(p.x + s.x * lane - car.x, p.z + s.z * lane - car.z);
  const diff = wrapAngle(want - car.heading);
  const t0 = TAN[car.idx], t1 = TAN[(car.idx + 32) % N];
  const bend = Math.acos(clamp(t0.x * t1.x + t0.z * t1.z, -1, 1));
  let gas = true, brake = false;
  let steer = clamp(-diff * 2.8, -1, 1);
  if (bend > 0.75 && car.speed > car.maxSpeed * 0.78) gas = false;
  if (Math.abs(diff) > 1.0 && car.speed > 18) brake = true;
  // 雷射門：算一下到達時會不會剛好開著，會的話先放慢
  for (const l of lasers) {
    const d = idxAhead(car.idx, l.idx);
    const eta = state.raceTime + d * SPACING / Math.max(car.speed, 5);
    if (d > 2 && d < 50 && (laserOn(l, eta - 0.3) || laserOn(l, eta) || laserOn(l, eta + 0.3))) { gas = false; if (d < 22) brake = true; }
  }
  if (ai.blunderT > 0) {
    if (ai.blunder === 'wobble') steer = clamp(steer + Math.sin(time * 7) * 1.1, -1, 1);   // 方向盤亂打
    if (ai.blunder === 'daze') { gas = false; brake = ai.blunderT > 1.2; }                 // 發呆鬆油門
  }
  if (pl && !car.isPlayer) {
    const gap = ahead / N;
    ai.skill = ai.baseSkill * clamp(1 - gap * 0.4, 0.86, 1.08);
    if (trailing && ahead > 0) ai.skill *= 1 - clamp(gap, 0, 0.5) * [0.4, 0.3, 0.18][state.difficulty];
  } else ai.skill = 0.95;
  return { steer, gas, brake };
}

// 電腦出包：衝上草地、方向亂打、發呆、自己打滑轉圈
function updateBlunder(car, dt, allowed) {
  const ai = car.ai;
  if (ai.blunderT > 0) { ai.blunderT -= dt; return; }
  ai.cool = (ai.cool || 0) - dt;
  if (!allowed || ai.cool > 0 || car.air || car.spin > 0 || car.fallT > 0) return;
  if (GAP0 >= 0 && Math.abs(idxAhead(GAP0, car.idx) - N / 2) > N / 2 - 70) return;   // 斷橋附近不出包，免得一直掉下去
  if (state.cars.filter((c) => c.ai.blunderT > 0).length >= 2) return;
  const rate = [0.45, 0.3, 0.16][state.difficulty];                    // 每秒出包機率
  if (Math.random() > rate * dt) return;
  ai.blunder = ['grass', 'grass', 'wobble', 'daze', 'spin'][Math.floor(Math.random() * 5)];
  ai.blunderSide = Math.random() < 0.5 ? -1 : 1;
  ai.blunderT = 1.8 + Math.random() * 1.4;
  ai.cool = 5 + Math.random() * 4;
  if (ai.blunder === 'spin') {
    car.spin = SPIN_T;
    car.speed *= 0.4;
    ai.blunderT = SPIN_T;
  }
}

function checkPickups(car) {
  for (const pn of peanuts) {
    if (!pn.active || Math.abs(pn.y - 1.3 - car.y) > 4) continue;
    if ((pn.x - car.x) ** 2 + (pn.z - car.z) ** 2 < 5.5) {
      pn.active = false; pn.timer = 6; pn.mesh.visible = false;
      car.peanuts = Math.min(10, car.peanuts + 1);
      if (car.isPlayer) Sound.ding();
    }
  }
  for (const pad of pads) {
    const d = Math.min(idxAhead(pad.idx, car.idx), idxAhead(car.idx, pad.idx));
    if (!car.air && d <= 3 && Math.abs(car.lat - pad.lat) < pad.w && car.boost < 1.0) {
      car.boost = 1.4;
      car.speed += 8 * speedMul();
      // 斷橋前的加速帶：保證速度夠飛過去（慢速模式也一樣）
      if (pad.w >= HW) car.speed = Math.max(car.speed, 40);
      if (car.isPlayer) { Sound.boost(); showBanner('加速！', 600); }
    }
  }
}

function collide() {
  const cs = state.cars;
  for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
    const a = cs[i], b = cs[j];
    if (a.fallT > 0 || b.fallT > 0 || Math.abs(a.y - b.y) > 3) continue;
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
    const r = 1.35 * (a.scaleNow + b.scaleNow);
    if (d < r && d > 0.001) {
      const nx = dx / d, nz = dz / d;
      // 大車把小車推開比較多
      const wa = b.scaleNow / (a.scaleNow + b.scaleNow), wb = 1 - wa, push = r - d;
      a.x -= nx * push * wa; a.z -= nz * push * wa; b.x += nx * push * wb; b.z += nz * push * wb;
      a.speed *= 0.97; b.speed *= 0.97;
      if ((a.isPlayer || b.isPlayer) && push > 0.3) Sound.bump();
      bully(a, b); bully(b, a);
    }
  }
}
// 變大或彭德拉車撞到別人 → 對方轉圈；一般車壓到縮小的車 → 縮小的車轉圈
function bully(a, b) {
  const strong = a.big > 0 || a.dog > 0;
  if (strong && !(b.big > 0 || b.dog > 0)) hit(b, '被撞飛了！轉圈圈～');
  else if (b.small > 0 && a.small <= 0) hit(b, '被壓扁了！轉圈圈～');
}

function onLap(car) {
  if (car.lap > LAPS && !car.finished) {
    car.finished = true;
    car.finishTime = state.raceTime;
    if (car.isPlayer) {
      state.mode = 'finished';
      state.resultTimer = 2.5;
      const rank = ranking().indexOf(car) + 1;
      showBanner(rank === 1 ? '第一名！哇庫哇庫！' : '抵達終點！', 2400);
      Sound.fanfare();
      $('controls').classList.add('hidden');
    }
  } else if (car.isPlayer && car.lap >= 2 && car.lap <= LAPS) {
    showBanner(car.lap === LAPS ? '最後一圈！' : `第 ${car.lap} 圈`, 1500);
    Sound.tone(660, 0.2, 'triangle', 0.15); Sound.tone(990, 0.3, 'triangle', 0.15, 0.12);
  }
}

function ranking() {
  return [...state.cars].sort((a, b) => {
    if (a.finished && b.finished) return a.finishTime - b.finishTime;
    if (a.finished !== b.finished) return a.finished ? -1 : 1;
    return progress(b) - progress(a);
  });
}

function syncModel(car, dt) {
  const m = car.model, u = m.userData;
  m.position.set(car.x, car.y, car.z);
  const spinA = car.spin > 0 ? (1 - car.spin / SPIN_T) * Math.PI * 4 : 0;
  m.rotation.set(-car.pitch, car.heading + spinA, 0, 'YXZ');
  m.visible = !(car.invuln > 0 && car.spin <= 0 && Math.floor(time * 16) % 2 === 0);
  u.shield.visible = car.shield > 0;
  if (car.shield > 0) u.shield.material.opacity = 0.25 + Math.sin(time * 8) * 0.08;
  const sf = Math.min(1, Math.abs(car.speed) / 30);
  u.body.rotation.z = -car.steer * 0.07 * sf;
  u.body.position.y = car.offroad && Math.abs(car.speed) > 3 ? Math.sin(time * 45) * 0.05 : 0;
  car.wheelSpin += car.speed * dt / 0.44;
  for (const w of u.wheels) w.rotation.x = car.wheelSpin;
  for (const s of u.steers) s.rotation.y = -car.steer * 0.4;
  u.head.rotation.z = car.steer * 0.18;
  for (const f of u.flames) {
    f.visible = car.boost > 0 || car.dog > 0;
    f.scale.set(1, 0.7 + Math.random() * 0.6, 1);
  }
  // 變大／縮小（快結束時閃爍提醒）
  let target = car.big > 0 ? 1.7 : car.small > 0 ? 0.55 : 1;
  const left = car.big > 0 ? car.big : car.small;
  if (left > 0 && left < 1.2 && Math.floor(time * 8) % 2 === 0) target = 1;
  car.scaleNow = lerp(car.scaleNow, target, 1 - Math.exp(-(dt || 0.016) * 8));
  m.scale.setScalar(car.scaleNow);
  // 彭德拉車
  u.dog.visible = car.dog > 0;
  if (car.dog > 0) {
    const ph = time * 18;
    u.dog.userData.legs.forEach((l, k) => { l.rotation.x = Math.sin(ph + (k % 2) * Math.PI) * 0.9; });
    u.dog.position.y = Math.abs(Math.sin(ph)) * 0.15;
  }
}

// ================= 畫面與 HUD =================
let bannerTimer = 0;
function showBanner(text, ms) {
  const b = $('banner');
  b.textContent = text;
  b.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => b.classList.remove('show'), ms);
}
function fmtTime(t) {
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`;
}

const mm = $('minimap'), mctx = mm.getContext('2d');
let mmPath, mmT;
function initMinimap() {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of pts) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
  const sc = (mm.width - 50) / Math.max(maxX - minX, maxZ - minZ);
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  // 由上往下看：x 往左為正（與行進方向一致）
  mmT = (x, z) => [mm.width / 2 - (x - cx) * sc, mm.height / 2 - (z - cz) * sc];
  mmPath = new Path2D();
  pts.forEach((p, i) => { const [x, y] = mmT(p.x, p.z); i ? mmPath.lineTo(x, y) : mmPath.moveTo(x, y); });
  mmPath.closePath();
}
function drawMinimap() {
  mctx.clearRect(0, 0, mm.width, mm.height);
  mctx.lineJoin = 'round';
  mctx.strokeStyle = '#ffffff'; mctx.lineWidth = 20; mctx.stroke(mmPath);
  mctx.strokeStyle = '#6b6f7a'; mctx.lineWidth = 12; mctx.stroke(mmPath);
  const [sx, sy] = mmT(pts[0].x, pts[0].z);
  mctx.fillStyle = '#fff'; mctx.fillRect(sx - 3, sy - 10, 6, 20);
  for (const c of [...state.cars].sort((a) => (a.isPlayer ? 1 : -1))) {
    const [x, y] = mmT(c.x, c.z);
    mctx.beginPath(); mctx.arc(x, y, c.isPlayer ? 13 : 10, 0, Math.PI * 2);
    mctx.fillStyle = c.cfg.theme; mctx.fill();
    mctx.lineWidth = c.isPlayer ? 5 : 3; mctx.strokeStyle = c.isPlayer ? '#e2577f' : '#fff'; mctx.stroke();
  }
}

function updateHud() {
  const p = state.player, rank = ranking().indexOf(p) + 1;
  $('hudPos').innerHTML = `${rank}<small>/4</small>`;
  $('hudLap').textContent = `圈數 ${clamp(p.lap, 1, LAPS)}/${LAPS}`;
  $('hudTime').textContent = fmtTime(p.finished ? p.finishTime : state.raceTime);
  $('hudSpeed').innerHTML = `${Math.round(Math.abs(p.speed) * 3.6)}<small> km/h</small>`;
  $('hudPeanut').textContent = `🥜 × ${p.peanuts}`;
  const icon = p.roll > 0 ? ITEMS[ITEM_KEYS[Math.floor(time * 14) % ITEM_KEYS.length]].icon : p.item ? ITEMS[p.item].icon : '';
  const btn = $('btnItem');
  if (btn.dataset.icon !== icon) {
    btn.dataset.icon = icon;
    btn.innerHTML = icon ? `<span>${icon}</span>` : '<small>道具</small>';
    btn.classList.toggle('ready', !!p.item);
  }
}

function showScreen(name) {
  for (const id of ['loading', 'title', 'select', 'hud', 'controls', 'countdown', 'pause', 'result']) $(id).classList.add('hidden');
  document.body.classList.remove('racing');
  if (name === 'title') $('title').classList.remove('hidden');
  if (name === 'select') $('select').classList.remove('hidden');
  if (name === 'race') {
    $('hud').classList.remove('hidden');
    $('controls').classList.remove('hidden');
    document.body.classList.add('racing');
    $('btnGas').style.display = state.autoGas ? 'none' : '';
  }
}

function buildCards() {
  const wrap = $('cards');
  RACERS.forEach((r, i) => {
    const el = document.createElement('div');
    el.className = 'card';
    el.style.setProperty('--theme', r.theme);
    const pips = (n) => `<span class="pips">${[1, 2, 3, 4, 5].map((k) => `<i class="${k <= n ? 'f' : ''}"></i>`).join('')}</span>`;
    el.innerHTML = `<img src="${r.img}" alt=""><div class="nm">${r.name}</div><div class="tg">${r.tag}</div>
      <div class="stat">極速 ${pips(r.stats.speed)}</div><div class="stat">加速 ${pips(r.stats.accel)}</div><div class="stat">操控 ${pips(r.stats.handling)}</div>`;
    el.addEventListener('click', () => selectRacer(i));
    wrap.appendChild(el);
  });
}
function selectRacer(i) {
  state.selected = i;
  [...$('cards').children].forEach((c, k) => c.classList.toggle('on', k === i));
  previewModels.forEach((m, k) => { m.visible = k === i; });
  Sound.tone(700 + i * 120, 0.12, 'triangle', 0.15);
}

// 選手預覽場景
const previewScene = new THREE.Scene();
const previewCam = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 100);
function buildPreview() {
  previewScene.background = canvasTex(4, 256, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#ffd6e4'); gr.addColorStop(1, '#bfe6ff');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  });
  previewScene.add(new THREE.HemisphereLight('#ffffff', '#ffc2d4', 1.6));
  const dl = new THREE.DirectionalLight('#ffffff', 2.2);
  dl.position.set(4, 8, 6);
  dl.castShadow = true;
  dl.shadow.mapSize.set(1024, 1024);
  previewScene.add(dl);
  const disk = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.3, 0.4, 48), toon('#ffffff'));
  disk.position.y = -0.2;
  disk.receiveShadow = true;
  previewScene.add(disk);
  previewModels = RACERS.map((r) => { const m = buildKart(r); m.visible = false; previewScene.add(m); return m; });
}
function layoutPreviewCam() {
  previewCam.aspect = innerWidth / innerHeight;
  const portrait = innerWidth < innerHeight;
  previewCam.position.set(0, portrait ? 4.2 : 3.6, portrait ? 18 : 16.5);
  previewCam.lookAt(0, portrait ? -3.2 : -1.9, 0);
  previewCam.updateProjectionMatrix();
}

// ================= 流程 =================
function startRace() {
  Sound.init();
  setupGrid(state.selected);
  resetHazards();
  for (const pn of peanuts) { pn.active = true; pn.mesh.visible = true; }
  state.raceTime = 0;
  state.countdown = 3.6;
  state.lastCount = 4;
  state.resultTimer = -1;
  state.mode = 'countdown';
  const p = state.player;
  camPos.set(p.x - Math.sin(p.heading) * 9, p.y + 4, p.z - Math.cos(p.heading) * 9);
  for (const k in input) input[k] = false;
  document.querySelectorAll('.ctl').forEach((b) => b.classList.remove('down'));
  showScreen('race');
  $('countdown').classList.remove('hidden');
  updateHud();
}

function showResults() {
  state.resultTimer = -1;
  const list = $('resultList');
  list.innerHTML = '';
  const rk = ranking();
  rk.forEach((c, i) => {
    const li = document.createElement('li');
    li.style.setProperty('--theme', c.cfg.theme);
    if (c.isPlayer) li.classList.add('me');
    li.innerHTML = `<span class="rk">${i + 1}</span><img src="${c.cfg.img}" alt=""><span class="nm">${c.cfg.name}${c.isPlayer ? '（你）' : ''}</span>
      <span class="tm">${c.finished ? fmtTime(c.finishTime) : '比賽中'}</span>`;
    list.appendChild(li);
  });
  const r = rk.indexOf(state.player) + 1;
  $('resultTitle').textContent = `${TRACK.icon} ${r === 1 ? '冠軍！太厲害了！' : `第 ${r} 名！再接再厲`}`;
  $('result').classList.remove('hidden');
}

function togglePause(on) {
  if (on && (state.mode === 'race' || state.mode === 'countdown')) {
    state.pausedFrom = state.mode;
    state.mode = 'paused';
    $('pause').classList.remove('hidden');
    Sound.engine(0, false);
  } else if (!on && state.mode === 'paused') {
    state.mode = state.pausedFrom;
    $('pause').classList.add('hidden');
  }
}

function goSelect() {
  state.mode = 'select';
  Sound.engine(0, false);
  showScreen('select');
  selectRacer(state.selected);
}

// ================= 輸入 =================
const KEYS = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'gas', KeyW: 'gas', ArrowDown: 'brake', KeyS: 'brake', Space: 'brake' };
addEventListener('keydown', (e) => {
  if (KEYS[e.code]) { input[KEYS[e.code]] = true; e.preventDefault(); }
  if (e.code === 'Escape' || e.code === 'KeyP') togglePause(state.mode !== 'paused');
  if (['KeyE', 'KeyX', 'ShiftLeft', 'ShiftRight', 'Enter'].includes(e.code) && state.mode === 'race') useItem(state.player);
});
$('btnItem').addEventListener('pointerdown', (e) => { e.preventDefault(); if (state.mode === 'race') useItem(state.player); });
addEventListener('keyup', (e) => { if (KEYS[e.code]) input[KEYS[e.code]] = false; });
document.querySelectorAll('.ctl').forEach((btn) => {
  const k = btn.dataset.k;
  const on = (e) => { e.preventDefault(); input[k] = true; btn.classList.add('down'); btn.setPointerCapture?.(e.pointerId); };
  const off = () => { input[k] = false; btn.classList.remove('down'); };
  btn.addEventListener('pointerdown', on);
  btn.addEventListener('pointerup', off);
  btn.addEventListener('pointercancel', off);
  btn.addEventListener('lostpointercapture', off);
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
});
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

// 手機（短邊小於 600px 的觸控裝置）在 <html> 加上 .phone，按鈕與畫面改成手機尺寸。網址加 ?phone=1 可強制測試
const PHONE = /phone=1/.test(location.search)
  || ((navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches) && Math.min(screen.width, screen.height) < 600);
document.documentElement.classList.toggle('phone', PHONE);
// 進入遊戲時自動全螢幕，把瀏覽器上下的網址列與工具列收起來（iPad、Android 支援；iPhone 請用「加入主畫面」）
const STANDALONE = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
function goFullscreen() {
  if (STANDALONE || document.fullscreenElement || document.webkitFullscreenElement) return;
  const el = document.documentElement;
  const fn = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!fn) return;
  try { const r = fn.call(el, { navigationUI: 'hide' }); if (r && r.catch) r.catch(() => {}); } catch (e) { /* 不支援就算了 */ }
}
if (navigator.maxTouchPoints > 0) {
  document.querySelector('#title .hint').textContent = /iPhone|iPod/.test(navigator.userAgent) && !STANDALONE
    ? '請把手機橫放 · iPhone 按「分享 → 加入主畫面」就能全螢幕玩'
    : '請把手機或 iPad 橫放 · 進入遊戲會自動全螢幕';
}
['btnStart', 'btnGo', 'btnResume', 'btnRestart', 'btnAgain'].forEach((id) => $(id).addEventListener('click', goFullscreen));
$('btnStart').addEventListener('click', () => { Sound.init(); goSelect(); });
$('btnBack').addEventListener('click', () => { state.mode = 'title'; setupGrid(state.selected); showScreen('title'); });
$('btnGo').addEventListener('click', goRace);
$('btnPause').addEventListener('click', () => togglePause(true));
$('btnResume').addEventListener('click', () => togglePause(false));
$('btnRestart').addEventListener('click', startRace);
$('btnMenu').addEventListener('click', goSelect);
$('btnAgain').addEventListener('click', startRace);
$('btnSelect').addEventListener('click', goSelect);
$('autoGas').addEventListener('change', (e) => { state.autoGas = e.target.checked; });
$('diff').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
  state.difficulty = +b.dataset.v;
  $('diff').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
}));
// 選賽道：換賽道時要先把新賽道建出來（約 0.3 秒）
function buildTrackButtons() {
  const wrap = $('trackSel');
  TRACKS.forEach((t, k) => {
    const b = document.createElement('button');
    b.dataset.v = k;
    b.innerHTML = `${t.icon} ${t.name}`;
    b.title = t.desc;
    b.addEventListener('click', () => setTrack(k));
    wrap.appendChild(b);
  });
  let saved = 0;
  try { saved = +localStorage.getItem('anyaKartTrack') || 0; } catch (e) { /* 忽略 */ }
  setTrack(saved >= 0 && saved < TRACKS.length ? saved : 0, true);
}
function setTrack(k, silent) {
  state.track = k;
  $('trackSel').querySelectorAll('button').forEach((x) => x.classList.toggle('on', +x.dataset.v === k));
  $('trackDesc').textContent = `${TRACKS[k].icon} ${TRACKS[k].name}：${TRACKS[k].desc}`;
  try { localStorage.setItem('anyaKartTrack', String(k)); } catch (e) { /* 私密瀏覽時無法記住 */ }
  if (!silent) Sound.tone(600 + k * 150, 0.12, 'triangle', 0.15);
}
function goRace() {
  if (state.track === trackIndex) { startRace(); return; }
  $('loading').classList.remove('hidden');
  setTimeout(() => { loadTrack(state.track); startRace(); }, 40);
}

function setSpeedLevel(v) {
  state.speedLevel = v;
  $('speedSel').querySelectorAll('button').forEach((x) => x.classList.toggle('on', +x.dataset.v === v));
  try { localStorage.setItem('anyaKartSpeed', String(v)); } catch (e) { /* 私密瀏覽時無法記住 */ }
}
$('speedSel').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => setSpeedLevel(+b.dataset.v)));
try { const v = +localStorage.getItem('anyaKartSpeed'); if (v >= 0 && v <= 2) setSpeedLevel(v); } catch (e) { /* 忽略 */ }
$('btnMute').addEventListener('click', () => {
  Sound.init();
  Sound.setMuted(!Sound.muted);
  $('btnMute').textContent = Sound.muted ? '🔇' : '🔊';
});
document.addEventListener('visibilitychange', () => { if (document.hidden) togglePause(true); });
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  layoutPreviewCam();
});

// ================= 主迴圈 =================
let last = performance.now(), titleAngle = 0, skipRender = false;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  tick(dt);
}
function tick(dt) {
  time += dt;

  if (state.mode === 'select') {
    previewModels[state.selected].rotation.y += dt * 0.8;
    renderer.render(previewScene, previewCam);
    return;
  }
  if (state.mode === 'loading') return;

  for (const st of scrollTex) st.tex.offset.x += st.speed * dt;
  if (snowfall) updateSnowfall(dt);
  // 花生旋轉與重生
  for (const pn of peanuts) {
    pn.mesh.rotation.y += dt * 2.5;
    pn.mesh.position.y = pn.y + Math.sin(time * 3 + pn.x) * 0.25;
    if (!pn.active && (pn.timer -= dt) <= 0) { pn.active = true; pn.mesh.visible = true; }
  }

  if (state.mode === 'title') {
    titleAngle += dt * 0.18;
    const g = pts[N - 14];
    camera.position.set(g.x + Math.cos(titleAngle) * 18, g.y + 6.5, g.z + Math.sin(titleAngle) * 18);
    camera.lookAt(g.x, g.y + 1.2, g.z);
    sun.position.set(g.x + 40, g.y + 80, g.z + 25);
    sun.target.position.copy(g);
    renderer.render(scene, camera);
    return;
  }

  if (state.mode === 'countdown') {
    state.countdown -= dt;
    const n = Math.ceil(state.countdown - 0.6);
    if (n !== state.lastCount) {
      state.lastCount = n;
      const el = $('countdown');
      el.textContent = n > 0 ? n : 'GO!';
      el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
      Sound.beep(n <= 0);
    }
    if (state.countdown <= 0.6) state.mode = 'race';
  }

  if (state.mode === 'race' || state.mode === 'finished') {
    if (state.countdown > -1) { state.countdown -= dt; if (state.countdown <= -0.4) $('countdown').classList.add('hidden'); }
    for (let step = 0; step < TS; step++) {
      state.raceTime += dt;
      for (const car of state.cars) {
        const ctl = car.isPlayer && !car.finished && !AUTO ? playerControl() : aiControl(car, dt);
        updateCar(car, dt, ctl);
        checkPickups(car);
        updateItems(car, dt);
      }
      collide();
      updateHazards(dt);
    }
    updateHud();
    Sound.engine(state.player.speed, true);
    if (state.resultTimer > 0 && (state.resultTimer -= dt) <= 0) showResults();
  }

  for (const car of state.cars) syncModel(car, state.mode === 'paused' ? 0 : dt);
  if (state.mode !== 'paused') updateEffects(dt);
  updateCamera(dt);
  if (skipRender) return;
  renderer.render(scene, camera);
  drawMinimap();
}

function updateSnowfall(dt) {
  const a = snowfall.geometry.attributes.position, arr = a.array;
  for (let k = 0; k < arr.length; k += 3) {
    arr[k + 1] -= dt * (5 + (k % 7));
    arr[k] += Math.sin(time * 1.3 + k) * dt * 0.8;
    if (arr[k + 1] < -5) arr[k + 1] += 45;
  }
  a.needsUpdate = true;
  snowfall.position.set(camera.position.x, camera.position.y - 15, camera.position.z);
}

function updateCamera(dt) {
  const c = state.player, fx = Math.sin(c.heading), fz = Math.cos(c.heading);
  const sizeK = 0.55 + 0.45 * c.scaleNow;   // 車變大鏡頭拉遠、變小拉近
  const dist = (8.5 + Math.max(0, c.speed) * 0.035) * sizeK;
  const want = new THREE.Vector3(c.x - fx * dist, c.y + 3.8 * sizeK, c.z - fz * dist);
  const p = pts[c.idx], s = SIDE[c.idx];
  const lat = (want.x - p.x) * s.x + (want.z - p.z) * s.z;
  if (c.fallT <= 0) want.y = Math.max(want.y, surfaceY({ x: want.x, z: want.z, idx: c.idx, s: c.s, lat }) + 1.5);
  camPos.lerp(want, 1 - Math.exp(-dt * 5));
  camera.position.copy(camPos);
  if (state.shake > 0) {
    state.shake = Math.max(0, state.shake - dt);
    camera.position.x += (Math.random() - 0.5) * state.shake * 2;
    camera.position.y += (Math.random() - 0.5) * state.shake * 2;
  }
  camLook.set(c.x + fx * 4, c.y + 1.5, c.z + fz * 4);
  camera.lookAt(camLook);
  const fov = 62 + Math.max(0, c.speed) * 0.22 + (c.boost > 0 ? 8 : 0);
  camera.fov = lerp(camera.fov, fov, 1 - Math.exp(-dt * 4));
  camera.updateProjectionMatrix();
  sun.position.set(c.x + 40, c.y + 80, c.z + 25);
  sun.target.position.set(c.x, c.y, c.z);
}

// ================= 啟動 =================
function boot() {
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 220 });
  sun.shadow.bias = -0.0006;
  scene.add(hemi, sun, sun.target);
  raceModels = RACERS.map((r) => {
    const m = buildKart(r);
    m.userData.tag = nameTag(r);
    m.add(m.userData.tag);
    scene.add(m);
    return m;
  });
  buildPreview();
  layoutPreviewCam();
  buildCards();
  buildTrackButtons();
  loadTrack(state.track);
  setupGrid(0);
  resetHazards();
  state.mode = 'title';
  showScreen('title');
  requestAnimationFrame(frame);
}
setTimeout(boot, 30);
if (AUTO || params.has('debug')) {
  window.__dbg = {
    state, villains, obstacles, bombs, smokes, lasers, traffic, snowballs,
    get GAP0() { return GAP0; },
    get pts() { return pts; },
    solids, ghosts, penguins,
    near: (x, z) => nearestIdx(x, z)[0],
    loadTrack(k) { loadTrack(k); state.track = k; setupGrid(state.selected); resetHazards(); },
    place(i, lat, sp) {
      const p = state.player;
      placeCar(p, i, lat);
      p.speed = sp;
      camPos.set(p.x - Math.sin(p.heading) * 9, p.y + 4, p.z - Math.cos(p.heading) * 9);
    },
    give(item) { state.player.item = item; },
    input, surfaceY, canyonF, roadY,
    step(sec) { for (let k = 0; k < Math.round(sec * 60); k++) tick(1 / 60); },
    fast(on) { skipRender = on; },
  };
}

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
