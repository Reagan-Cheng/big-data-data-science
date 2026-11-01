import * as THREE from './lib/three.module.min.js';

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
  kart.userData = { body, wheels, steers, flames, shield, head: driver.userData.head };
  return kart;
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
const CTRL = [[0, 0, -150], [90, 0, -160], [170, 4, -120], [199, 13, -68], [205, 20, -25], [205, 12, 10], [204, 5, 44], [152, 4, 68],
  [85, 2, 105], [120, 0, 170], [72, 0, 220], [10, 0, 222], [-52, 0, 218], [-110, 3, 160], [-180, 8, 120], [-200, 6, 30],
  [-150, 2, -20], [-170, 0, -100], [-100, 0, -160]];
const curve = new THREE.CatmullRomCurve3(CTRL.map(([x, y, z]) => new THREE.Vector3(x, y, z)), true, 'centripetal');
const pts = curve.getSpacedPoints(N);
pts.pop();
const TAN = [], SIDE = [];
for (let i = 0; i < N; i++) {
  const a = pts[(i - 1 + N) % N], b = pts[(i + 1) % N];
  const t = new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize();
  TAN.push(t);
  SIDE.push(new THREE.Vector3(t.z, 0, -t.x));
}
const SPACING = curve.getLength() / N;

function hillH(x, z) {
  const r = Math.hypot(x, z);
  return 3 + 5 * Math.sin(x * 0.012 + 0.5) * Math.cos(z * 0.014) + 2.5 * Math.sin(x * 0.033) * Math.sin(z * 0.029 + 1.1)
    + Math.max(0, r - 290) * 0.5;
}

// 斷橋峽谷：一條橫越賽道的深谷，橋中間斷了一段要飛過去
const BRIDGE_I = nearestIdx(10, 222)[0];
const BC = pts[BRIDGE_I], BT = TAN[BRIDGE_I], BS = SIDE[BRIDGE_I];
const CANYON_Y = -24, GAP_HALF = 10;
function canyonF(x, z) {
  const dx = x - BC.x, dz = z - BC.z;
  const t = Math.abs(dx * BT.x + dz * BT.z), s = Math.abs(dx * BS.x + dz * BS.z);
  return (1 - smooth(14, 24, t)) * (1 - smooth(110, 140, s));
}
const inGap = (i) => Math.abs((pts[i].x - BC.x) * BT.x + (pts[i].z - BC.z) * BT.z) < GAP_HALF;
let GAP0 = BRIDGE_I;
while (inGap(GAP0 - 1)) GAP0--;
// 跳台：懸崖頂端一個、斷橋前一個
let CREST = 150;
for (let i = 150; i < 400; i++) if (pts[i].y > pts[CREST].y) CREST = i;
const RAMPS = [{ i0: CREST - 8, len: 9, h: 2.6 }, { i0: GAP0 - 9, len: 9, h: 2.3 }];
function rampH(s) {
  for (const r of RAMPS) { const k = s - r.i0; if (k >= 0 && k < r.len) return r.h * k / r.len; }
  return 0;
}
function roadY(s) {
  const i = Math.floor(s) % N, f = s - Math.floor(s);
  return lerp(pts[i].y, pts[(i + 1) % N].y, f);
}
function groundY(x, z, i, dist) {
  return lerp(lerp(pts[i].y, hillH(x, z), smooth(HW + 3, HW + 45, dist)), CANYON_Y, canyonF(x, z));
}
// 車子/物體腳下的高度（含跳台、橋面、峽谷）
function surfaceY(o) {
  const al = Math.abs(o.lat), ry = roadY(o.s);
  let y = lerp(ry, hillH(o.x, o.z), smooth(HW + 3, HW + 45, al));
  const c = canyonF(o.x, o.z);
  if (c > 0) y = al <= HW + 1.6 && !inGap(o.idx) ? ry : lerp(y, CANYON_Y, c);
  if (al <= HW + 1.6) y += rampH(o.s);
  return y;
}
function nearestIdx(x, z, step = 1) {
  let best = 0, bd = Infinity;
  for (let i = 0; i < N; i += step) {
    const d = (pts[i].x - x) ** 2 + (pts[i].z - z) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return [best, Math.sqrt(bd)];
}

function buildWorld() {
  // 天空
  scene.background = canvasTex(4, 256, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#5fb8ff'); gr.addColorStop(0.6, '#bfe4ff'); gr.addColorStop(1, '#f2fbff');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  });
  scene.fog = new THREE.Fog('#d6eeff', 160, 700);
  scene.add(new THREE.HemisphereLight('#ffffff', '#86b86a', 1.5));
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 220 });
  sun.shadow.bias = -0.0006;
  scene.add(sun, sun.target);

  // 地形
  const SIZE = 960, SEG = 160;
  const tg = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  tg.rotateX(-Math.PI / 2);
  const pos = tg.attributes.position, cols = [];
  const cGrass = new THREE.Color('#8fd16a'), cGrass2 = new THREE.Color('#6fbf5a'), cSand = new THREE.Color('#e8d7a0'), cRock = new THREE.Color('#b8c99a'), cCliff = new THREE.Color('#b98b5e');
  const tmp = new THREE.Color();
  for (let v = 0; v < pos.count; v++) {
    const x = pos.getX(v), z = pos.getZ(v);
    let [i, d] = nearestIdx(x, z, 3);
    for (let k = -3; k <= 3; k++) {
      const j = (i + k + N) % N, dd = Math.hypot(pts[j].x - x, pts[j].z - z);
      if (dd < d) { d = dd; i = j; }
    }
    const k = smooth(HW + 3, HW + 45, d);
    const y = groundY(x, z, i, d) - 0.25 * (1 - k);
    pos.setY(v, y);
    tmp.copy(cGrass).lerp(cGrass2, (Math.sin(x * 0.07) * Math.cos(z * 0.05) + 1) / 2);
    if (d < HW + 3.5) tmp.copy(cSand);
    if (y > 18) tmp.lerp(cRock, clamp((y - 18) / 30, 0, 1));
    const cf = canyonF(x, z);
    if (cf > 0.02) tmp.lerp(cCliff, clamp(cf * 1.6, 0, 1));
    cols.push(tmp.r, tmp.g, tmp.b);
  }
  tg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, new THREE.MeshLambertMaterial({ vertexColors: true }));
  terrain.receiveShadow = true;
  scene.add(terrain);

  // 路面
  const roadTex = canvasTex(256, 256, (g, W, H) => {
    g.fillStyle = '#6b6f7a'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${rand() > 0.5 ? 255 : 0},${rand() > 0.5 ? 255 : 0},255,0.05)`; g.fillRect(rand() * W, rand() * H, 2, 2); }
    g.fillStyle = '#ffffff'; g.fillRect(6, 0, 7, H); g.fillRect(W - 13, 0, 7, H);
    g.fillStyle = '#ffe680'; g.fillRect(W / 2 - 4, 20, 8, H / 2 - 20);
  });
  roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
  const road = new THREE.Mesh(ribbon(-HW, HW, 0.03, 18), new THREE.MeshLambertMaterial({ map: roadTex }));
  road.receiveShadow = true;
  scene.add(road);
  const curbTex = canvasTex(4, 64, (g, W, H) => { g.fillStyle = '#ff4f6d'; g.fillRect(0, 0, W, H / 2); g.fillStyle = '#ffffff'; g.fillRect(0, H / 2, W, H / 2); });
  curbTex.wrapS = curbTex.wrapT = THREE.RepeatWrapping;
  curbTex.magFilter = THREE.NearestFilter;
  const curbM = new THREE.MeshLambertMaterial({ map: curbTex });
  for (const s of [-1, 1]) {
    const c = new THREE.Mesh(ribbon(s < 0 ? -HW - 1.6 : HW, s < 0 ? -HW : HW + 1.6, 0.08, 4), curbM);
    c.receiveShadow = true;
    scene.add(c);
  }

  // 起跑線與拱門
  const chk = canvasTex(128, 32, (g) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) { g.fillStyle = (x + y) % 2 ? '#222' : '#fff'; g.fillRect(x * 8, y * 8, 8, 8); } });
  const p0 = pts[0], h0 = Math.atan2(TAN[0].x, TAN[0].z);
  const line = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, 3), new THREE.MeshLambertMaterial({ map: chk }));
  line.rotation.set(-Math.PI / 2, h0, 0, 'YXZ');
  line.position.set(p0.x, p0.y + 0.06, p0.z);
  line.receiveShadow = true;
  scene.add(line);
  const arch = new THREE.Group();
  arch.position.copy(p0);
  arch.rotation.y = h0;
  scene.add(arch);
  for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(1.2, 9, 1.2), toon('#ff7fa3'), (HW + 2.4) * s, 4.5, 0, arch);
  const bannerTex = canvasTex(1024, 128, (g, W, H) => {
    g.fillStyle = '#3d3638'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffd36b'; g.font = '900 78px "PingFang TC", "Microsoft JhengHei", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('★ 安妮亞大賽車 ★', W / 2, H / 2 + 4);
  });
  const bannerM = [toon('#3d3638'), toon('#3d3638'), toon('#3d3638'), toon('#3d3638'),
    toon('#ffffff', { map: bannerTex }), toon('#ffffff', { map: bannerTex })];
  mesh(new THREE.BoxGeometry(HW * 2 + 6, 2.2, 0.6), bannerM, 0, 9, 0, arch);

  // 樹木
  const trunkGeo = new THREE.CylinderGeometry(0.5, 0.7, 3, 6); trunkGeo.translate(0, 1.5, 0);
  const leafGeo = new THREE.IcosahedronGeometry(3, 0); leafGeo.translate(0, 5, 0);
  const trees = [];
  while (trees.length < 380) {
    const x = (rand() - 0.5) * 860, z = (rand() - 0.5) * 860;
    const [i, d] = nearestIdx(x, z, 4);
    if (d < HW + 9 || Math.hypot(x, z) > 430 || canyonF(x, z) > 0.01) continue;
    trees.push([x, groundY(x, z, i, d), z, 0.7 + rand() * 0.8, rand() < 0.18]);
  }
  const trunks = new THREE.InstancedMesh(trunkGeo, toon('#9a6b4a'), trees.length);
  const greens = trees.filter((t) => !t[4]), pinks = trees.filter((t) => t[4]);
  const leafG = new THREE.InstancedMesh(leafGeo, toon('#4fae5a'), greens.length);
  const leafP = new THREE.InstancedMesh(leafGeo, toon('#ffb3c8'), pinks.length);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  const place = (im, list) => list.forEach(([x, y, z, s], k) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), x * 13 % 6);
    im.setMatrixAt(k, mtx.compose(ps.set(x, y - 0.2, z), q, sc.set(s, s, s)));
  });
  place(trunks, trees); place(leafG, greens); place(leafP, pinks);
  for (const im of [trunks, leafG, leafP]) { im.castShadow = true; scene.add(im); }

  // 小房子
  const houseCols = ['#ffd6a5', '#caffbf', '#bde0fe', '#ffc6ff', '#fdffb6'];
  for (let k = 0; k < 16; k++) {
    const i = Math.floor(rand() * N), s = rand() < 0.5 ? -1 : 1, off = (HW + 18 + rand() * 14) * s;
    const p = pts[i], x = p.x + SIDE[i].x * off, z = p.z + SIDE[i].z * off;
    const [ni, nd] = nearestIdx(x, z, 4);
    if (nd < HW + 12 || canyonF(x, z) > 0.01) continue;
    const hs = new THREE.Group();
    hs.position.set(x, groundY(x, z, ni, nd) - 0.3, z);
    hs.rotation.y = Math.atan2(TAN[i].x, TAN[i].z);
    scene.add(hs);
    const w = 5 + rand() * 3;
    mesh(new THREE.BoxGeometry(w, 4, w), toon(houseCols[k % 5]), 0, 2, 0, hs);
    mesh(new THREE.ConeGeometry(w * 0.8, 3, 4), toon('#e76f6f'), 0, 5.5, 0, hs).rotation.y = Math.PI / 4;
    mesh(new THREE.BoxGeometry(1.2, 2, 0.1), toon('#8a5a3c'), 0, 1, w / 2 + 0.02, hs);
  }

  // 雲
  const cloudM = new THREE.MeshLambertMaterial({ color: '#ffffff', fog: false });
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
    scene.add(cg);
  }

  // 加速板
  const padTex = canvasTex(64, 128, (g, W, H) => {
    g.fillStyle = '#ff9a1f'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#fff36b';
    for (let k = 0; k < 3; k++) { const y = 18 + k * 40; g.beginPath(); g.moveTo(8, y + 24); g.lineTo(W / 2, y); g.lineTo(W - 8, y + 24); g.lineTo(W - 8, y + 36); g.lineTo(W / 2, y + 12); g.lineTo(8, y + 36); g.fill(); }
  });
  padTex.wrapS = THREE.RepeatWrapping;
  const padM = new THREE.MeshBasicMaterial({ map: padTex });
  for (const [i, lat, w] of [[160, -4, 2.3], [400, 4, 2.3], [GAP0 - 32, 0, HW], [880, -5, 2.3], [1060, 4, 2.3]]) {
    const p = pts[i], x = p.x + SIDE[i].x * lat, z = p.z + SIDE[i].z * lat;
    const t = padM.clone();
    t.map = padTex.clone();
    t.map.repeat.set(w / 2.3, 1);
    t.map.needsUpdate = true;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w * 2, 7), t);
    m.rotation.set(-Math.PI / 2, 0, 0);
    const g = new THREE.Group();
    g.position.set(x, p.y + 0.07, z);
    g.rotation.y = Math.atan2(TAN[i].x, TAN[i].z) + Math.PI;
    g.add(m);
    scene.add(g);
    pads.push({ idx: i, lat, w });
  }

  buildBridge();
  for (const r of RAMPS) scene.add(rampMesh(r));
  roadSign(CREST - 25, '⚠ 前方懸崖 ⚠', '加速飛下去！');
  roadSign(GAP0 - 55, '⚠ 斷橋注意 ⚠', '全速跳過去！');

  // 道具禮物盒
  const boxTex = canvasTex(128, 128, (g, W, H) => {
    g.fillStyle = '#ff8fb1'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffffff'; g.fillRect(W / 2 - 12, 0, 24, H); g.fillRect(0, H / 2 - 12, W, 24);
    g.fillStyle = '#ffd36b'; drawStar(g, W / 2, H / 2, 30, 13);
    g.strokeStyle = '#ffffff'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8);
  });
  const boxGeo = new THREE.BoxGeometry(1.7, 1.7, 1.7), boxM = toon('#ffffff', { map: boxTex });
  for (const i of [120, 450, 720, 1000]) {
    for (const lat of [-7.5, -2.5, 2.5, 7.5]) {
      const p = pts[i], x = p.x + SIDE[i].x * lat, z = p.z + SIDE[i].z * lat;
      const m = mesh(boxGeo, boxM, x, p.y + 1.4, z, scene);
      itemBoxes.push({ x, z, y: p.y + 1.4, mesh: m, active: true, timer: 0 });
    }
  }

  // 路障：三角錐與柵欄
  const coneGeo = new THREE.ConeGeometry(0.6, 1.5, 12), bandGeo = new THREE.CylinderGeometry(0.36, 0.45, 0.25, 12);
  const barTex = canvasTex(128, 32, (g, W, H) => {
    for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#ffffff' : '#ff4f4f'; g.beginPath(); g.moveTo(k * 20 - 10, H); g.lineTo(k * 20 + 6, 0); g.lineTo(k * 20 + 26, 0); g.lineTo(k * 20 + 10, H); g.fill(); }
  });
  const barM = toon('#ffffff', { map: barTex });
  for (const [i, list] of [[190, [-7, -3.5]], [530, [1, 4.5, -7]], [840, [-6, -2]], [1085, [2.5, 6.5, -4]]]) {
    list.forEach((lat, k) => {
      const p = pts[i + k * 3], x = p.x + SIDE[i + k * 3].x * lat, z = p.z + SIDE[i + k * 3].z * lat;
      const g = new THREE.Group();
      g.position.set(x, p.y, z);
      g.rotation.y = Math.atan2(TAN[i].x, TAN[i].z);
      const barrier = k % 2 === 1;
      if (barrier) {
        mesh(new THREE.BoxGeometry(2.6, 0.7, 0.25), barM, 0, 1.0, 0, g);
        for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.15, 1.2, 0.6), toon('#555555'), 1.1 * s, 0.6, 0, g);
      } else {
        mesh(coneGeo, toon('#ff8a1f'), 0, 0.75, 0, g);
        mesh(bandGeo, toon('#ffffff'), 0, 0.75, 0, g);
        mesh(new THREE.BoxGeometry(1.2, 0.12, 1.2), toon('#333333'), 0, 0.06, 0, g);
      }
      scene.add(g);
      obstacles.push({ idx: (i + k * 3) % N, lat, x, z, y: p.y, r: barrier ? 2.4 : 1.9, mesh: g, home: g.position.clone(), knocked: 0, v: new THREE.Vector3() });
    });
  }

  // 突然衝出來的黑衣壞人
  for (const i of [380, 760, 1020]) {
    const m = buildVillain();
    scene.add(m);
    villains.push({ idx: i, side: rand() < 0.5 ? -1 : 1, lat: 0, state: 'wait', t: 0, mesh: m, x: 0, y: 0, z: 0, vy: 0, v: new THREE.Vector3() });
  }

  // 花生
  const peanutGeo = new THREE.CapsuleGeometry(0.42, 0.7, 6, 10);
  const peanutM = toon('#d9a35b');
  for (const [i0, lat] of [[90, 0], [340, -5], [480, 5], [680, 0], [800, 4], [960, -4], [1130, 0]]) {
    for (let k = 0; k < 4; k++) {
      const i = (i0 + k * 6) % N, p = pts[i];
      const x = p.x + SIDE[i].x * lat, z = p.z + SIDE[i].z * lat;
      const m = new THREE.Group();
      const body = mesh(peanutGeo, peanutM, 0, 0, 0, m);
      body.rotation.z = Math.PI / 2;
      body.scale.set(1, 1, 0.9);
      mesh(new THREE.TorusGeometry(0.4, 0.06, 6, 16), toon('#b9853f'), 0, 0, 0, m).rotation.y = Math.PI / 2;
      m.position.set(x, p.y + 1.3, z);
      scene.add(m);
      peanuts.push({ x, z, y: p.y + 1.3, mesh: m, active: true, timer: 0 });
    }
  }
}

function ribbon(off0, off1, yOff, vScale) {
  const pos = [], uv = [], idx = [];
  let dist = 0;
  for (let k = 0; k <= N; k++) {
    const i = k % N, p = pts[i], s = SIDE[i];
    if (k > 0) dist += SPACING;
    pos.push(p.x + s.x * off0, p.y + yOff, p.z + s.z * off0, p.x + s.x * off1, p.y + yOff, p.z + s.z * off1);
    uv.push(0, dist / vScale, 1, dist / vScale);
    if (k < N && !inGap(i) && !inGap((i + 1) % N)) { const a = k * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
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
  const deckM = toon('#a8743f'), railM = toon('#f1dfb8'), pillarM = toon('#7d5636');
  const deckGeo = new THREE.BoxGeometry(HW * 2 + 3.4, 1.4, SPACING * 2 + 0.05);
  const railGeo = new THREE.BoxGeometry(0.35, 1.1, SPACING * 2 + 0.05);
  for (let i = BRIDGE_I - 60; i < BRIDGE_I + 60; i += 2) {
    const j = (i + N) % N, p = pts[j];
    if (canyonF(p.x, p.z) < 0.02 || inGap(j) || inGap((j + 1) % N) || inGap((j + 2) % N)) continue;
    const g = new THREE.Group();
    g.position.copy(p);
    g.rotation.y = Math.atan2(TAN[j].x, TAN[j].z);
    scene.add(g);
    mesh(deckGeo, deckM, 0, -0.68, SPACING, g).receiveShadow = true;
    for (const s of [-1, 1]) mesh(railGeo, railM, (HW + 1.5) * s, 0.5, SPACING, g);
    if (j % 8 === 0) {
      const h = p.y - CANYON_Y + 4;
      for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.8, 1.1, h, 10), pillarM, (HW - 2) * s, -h / 2 - 1, SPACING, g);
    }
  }
  // 斷掉的木板
  let gapEnd = GAP0;
  while (inGap((gapEnd + 1) % N)) gapEnd++;
  for (const [i, dir] of [[GAP0, 1], [gapEnd + 1, -1]]) {
    const p = pts[i % N];
    const g = new THREE.Group();
    g.position.copy(p);
    g.rotation.y = Math.atan2(TAN[i % N].x, TAN[i % N].z);
    scene.add(g);
    for (const x of [-7, -1, 5]) {
      const b = mesh(new THREE.BoxGeometry(3.5, 0.35, 2.4), deckM, x + rand() * 2, -1.2, dir * 0.9, g);
      b.rotation.x = 0.7 * dir;
      b.rotation.z = (rand() - 0.5) * 0.4;
    }
  }
  // 谷底河流
  const water = new THREE.Mesh(new THREE.PlaneGeometry(280, 40), new THREE.MeshLambertMaterial({ color: '#4fb3e8', transparent: true, opacity: 0.88 }));
  water.rotation.set(-Math.PI / 2, 0, 0);
  const wg = new THREE.Group();
  wg.position.set(BC.x, CANYON_Y + 3, BC.z);
  wg.rotation.y = Math.atan2(BT.x, BT.z);
  wg.add(water);
  scene.add(wg);
}

function rampMesh(r) {
  const verts = [], tri = [];
  const V = (x, y, z) => { verts.push(x, y, z); return verts.length / 3 - 1; };
  const rows = [];
  for (let k = 0; k <= r.len; k++) {
    const i = (r.i0 + k) % N, p = pts[i], s = SIDE[i], y = p.y + 0.06, h = r.h * k / r.len, w = HW + 0.3;
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
  for (const s of [-1, 1]) {
    const p = pts[i], off = (HW + 4) * s;
    const g = new THREE.Group();
    g.position.set(p.x + SIDE[i].x * off, p.y, p.z + SIDE[i].z * off);
    g.rotation.y = Math.atan2(TAN[i].x, TAN[i].z) + Math.PI;
    scene.add(g);
    mesh(new THREE.CylinderGeometry(0.2, 0.2, 4, 8), toon('#777777'), 0, 2, 0, g);
    mesh(new THREE.BoxGeometry(6, 3, 0.2), [toon('#3d3638'), toon('#3d3638'), toon('#3d3638'), toon('#3d3638'), toon('#ffffff', { map: tex }), toon('#3d3638')], 0, 5, 0, g);
  }
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
  scene.add(m);
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
  fanfare() { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.tone(f, 0.32, 'triangle', 0.2, i * 0.14)); },
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.5; },
};

// ================= 遊戲狀態 =================
const sun = new THREE.DirectionalLight('#fff3e0', 2.4);
const pads = [], peanuts = [], itemBoxes = [], obstacles = [], villains = [], bombs = [], smokes = [], effects = [];
const state = { mode: 'loading', selected: 0, difficulty: 1, speedLevel: 0, autoGas: true, cars: [], player: null, raceTime: 0, countdown: 0, lastCount: 0, resultTimer: -1, shake: 0 };
const input = { left: false, right: false, gas: false, brake: false };
const G = 36;          // 重力
const SPIN_T = 1.3;    // 轉圈圈秒數
const ITEMS = {
  rocket: { icon: '🚀', name: '火箭衝刺', w: [1, 3, 5, 6] },
  bomb: { icon: '💣', name: '花生炸彈', w: [2, 4, 4, 4] },
  smoke: { icon: '💨', name: '間諜煙霧彈', w: [5, 3, 2, 1] },
  shield: { icon: '🛡️', name: '間諜護盾', w: [4, 3, 2, 1] },
  peanut: { icon: '🥜', name: '花生大放送', w: [3, 2, 1, 1] },
};
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
  car.vy = 0; car.air = false;
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
  if (car.spin > 0) {
    car.spin -= dt;
    ctl = { steer: 0, gas: false, brake: false };
    car.speed *= Math.pow(0.3, dt);
  }
  car.steer += clamp(ctl.steer - car.steer, -dt * 6, dt * 6);
  car.offroad = !car.air && Math.abs(car.lat) > HW + 1.2;
  let maxSp = car.maxSpeed * (1 + car.peanuts * 0.012) * (car.isPlayer && !car.finished && !AUTO ? 1 : car.ai.skill);
  if (car.offroad) maxSp *= 0.5;
  if (car.boost > 0) { maxSp += 18 * speedMul(); car.boost -= dt; }
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
  const ox = car.x, oz = car.z;
  car.x += Math.sin(car.heading) * car.speed * dt;
  car.z += Math.cos(car.heading) * car.speed * dt;

  car.prevIdx = car.idx;
  updateIdx(car);
  const inCanyon = canyonF(car.x, car.z) > 0.05;
  const lim = inCanyon ? HW + 1 : HW + 20;   // 橋上有欄杆
  if (Math.abs(car.lat) > lim) {
    const s = SIDE[car.idx], L = Math.sign(car.lat) * lim;
    car.x -= s.x * (car.lat - L); car.z -= s.z * (car.lat - L); car.lat = L;
    // 貼著邊界滑行：車頭轉回賽道方向，不會卡死
    const th = Math.atan2(TAN[car.idx].x, TAN[car.idx].z);
    car.heading += wrapAngle(th - car.heading) * Math.min(1, dt * 5);
    car.speed = Math.max(Math.min(car.speed, 10), car.speed * Math.pow(inCanyon ? 0.7 : 0.3, dt));
  }

  // 垂直：跳躍、飛行、落地
  let sy = surfaceY(car);
  if (car.air && car.y < sy - 1.5) {
    // 撞到斷橋邊緣（太低了），被彈回去繼續往下掉
    car.x = ox; car.z = oz;
    car.speed *= -0.2;
    updateIdx(car);
    sy = surfaceY(car);
  }
  const gv = (sy - car.prevSy) / dt;
  car.prevSy = sy;
  if (car.air) {
    car.vy -= G * dt;
    car.y += car.vy * dt;
    if (car.y <= sy) {
      if (car.isPlayer && car.vy < -12) { Sound.land(); state.shake = Math.min(0.5, -car.vy * 0.02); }
      car.y = sy; car.vy = gv; car.air = false;
    }
  } else if (gv < car.vy - G * dt - 0.6) {
    car.air = true;
    car.vy -= G * dt;
    car.y += car.vy * dt;
  } else {
    car.vy = gv;
    car.y = sy;
  }
  if (car.air && car.y < roadY(car.s) - 7 && canyonF(car.x, car.z) > 0.3) {
    car.fallT = 1.4;
    car.speed = 0;
    if (car.isPlayer) { Sound.fall(); showBanner('掉下去了～！', 1400); }
  }
  // 圈數判定
  if (car.idx > N * 0.4 && car.idx < N * 0.6) car.checkpoint = true;
  if (car.prevIdx > N * 0.8 && car.idx < N * 0.2 && car.checkpoint) { car.lap++; car.checkpoint = false; onLap(car); }
  else if (car.prevIdx < N * 0.2 && car.idx > N * 0.8) { car.lap--; car.checkpoint = true; }

  const pitchT = Math.atan2(car.vy, Math.max(8, Math.abs(car.speed))) * (car.air ? 0.6 : 1);
  car.pitch = lerp(car.pitch, clamp(pitchT, -0.6, 0.6), 1 - Math.exp(-dt * 10));
}

function respawn(car) {
  const idx = (GAP0 - 48 + N) % N;
  placeCar(car, idx, 0);
  car.speed = 24; car.fallT = 0; car.spin = 0; car.invuln = 2;
  car.checkpoint = true;
}

// 被打中：轉圈圈（有護盾就擋掉）
function hit(car, msg) {
  if (car.invuln > 0 || car.fallT > 0) return false;
  if (car.shield > 0) {
    car.shield = 0;
    car.invuln = 1;
    if (car.isPlayer) { Sound.tone(1200, 0.25, 'triangle', 0.2); showBanner('護盾擋住了！', 900); }
    return false;
  }
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
    scene.add(m);
    const b = { x: car.x + fx * 3.2, z: car.z + fz * 3.2, y: car.y + 1, idx: car.idx, s: car.s, lat: car.lat,
      speed: Math.max(car.speed, 10) + 30, owner: car, life: 5, mesh: m };
    updateIdx(b);
    bombs.push(b);
    if (car.isPlayer) Sound.tone(500, 0.2, 'square', 0.12, 0, 900);
  } else if (it === 'smoke') {
    const m = makeSmokeMesh();
    scene.add(m);
    const sm = { x: car.x - fx * 4, z: car.z - fz * 4, idx: car.idx, s: car.s, lat: car.lat, life: 15, mesh: m };
    updateIdx(sm);
    m.position.set(sm.x, surfaceY(sm), sm.z);
    smokes.push(sm);
    if (car.isPlayer) Sound.noise(0.4, 0.2);
  } else if (it === 'shield') {
    car.shield = 10;
    if (car.isPlayer) Sound.tone(600, 0.4, 'sine', 0.2, 0, 1200);
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
      scene.remove(b.mesh);
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
      scene.remove(sm.mesh);
      smokes.splice(k, 1);
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
    if (f >= 1) { scene.remove(e.mesh); effects.splice(k, 1); }
  }
}

function resetHazards() {
  for (const b of bombs) scene.remove(b.mesh);
  for (const sm of smokes) scene.remove(sm.mesh);
  bombs.length = 0; smokes.length = 0;
  for (const b of itemBoxes) { b.active = true; b.mesh.visible = true; }
  for (const o of obstacles) { o.knocked = 0; o.mesh.position.copy(o.home); o.mesh.rotation.set(0, o.mesh.rotation.y, 0); }
  for (const v of villains) { v.state = 'wait'; v.t = 0; v.lat = v.side * (HW + 3.5); v.mesh.rotation.x = 0; }
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
  const hazards = [...obstacles.filter((o) => o.knocked <= 0), ...smokes, ...villains.filter((v) => v.state !== 'knocked')];
  for (const o of hazards) {
    const d = idxAhead(car.idx, o.idx);
    if (d > 0 && d < 38 && Math.abs(o.lat - lane) < dodge) lane = clamp(o.lat + (lane >= o.lat ? 4.8 : -4.8), -HW + 1.5, HW - 1.5);
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
  if (Math.abs(idxAhead(GAP0, car.idx) - N / 2) > N / 2 - 70) return;   // 斷橋附近不出包，免得一直掉下去
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
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
    if (d < 2.7 && d > 0.001) {
      const push = (2.7 - d) / 2, nx = dx / d, nz = dz / d;
      a.x -= nx * push; a.z -= nz * push; b.x += nx * push; b.z += nz * push;
      a.speed *= 0.97; b.speed *= 0.97;
      if ((a.isPlayer || b.isPlayer) && push > 0.15) Sound.bump();
    }
  }
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
    f.visible = car.boost > 0;
    f.scale.set(1, 0.7 + Math.random() * 0.6, 1);
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
  previewCam.position.set(0, portrait ? 4.2 : 3.5, portrait ? 17 : 12);
  previewCam.lookAt(0, portrait ? -2.2 : -0.6, 0);
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
  $('resultTitle').textContent = r === 1 ? '🏆 冠軍！太厲害了！' : `第 ${r} 名！再接再厲`;
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

$('btnStart').addEventListener('click', () => { Sound.init(); goSelect(); });
$('btnBack').addEventListener('click', () => { state.mode = 'title'; setupGrid(state.selected); showScreen('title'); });
$('btnGo').addEventListener('click', startRace);
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
let last = performance.now(), titleAngle = 0;
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
  renderer.render(scene, camera);
  drawMinimap();
}

function updateCamera(dt) {
  const c = state.player, fx = Math.sin(c.heading), fz = Math.cos(c.heading);
  const dist = 8.5 + Math.max(0, c.speed) * 0.035;
  const want = new THREE.Vector3(c.x - fx * dist, c.y + 3.8, c.z - fz * dist);
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
  buildWorld();
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
  initMinimap();
  setupGrid(0);
  resetHazards();
  state.mode = 'title';
  showScreen('title');
  requestAnimationFrame(frame);
}
setTimeout(boot, 30);
if (AUTO || params.has('debug')) {
  window.__dbg = {
    state, GAP0, villains, obstacles, bombs, smokes,
    place(i, lat, sp) {
      const p = state.player;
      placeCar(p, i, lat);
      p.speed = sp;
      camPos.set(p.x - Math.sin(p.heading) * 9, p.y + 4, p.z - Math.cos(p.heading) * 9);
    },
    give(item) { state.player.item = item; },
    step(sec) { for (let k = 0; k < Math.round(sec * 60); k++) tick(1 / 60); },
  };
}

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
