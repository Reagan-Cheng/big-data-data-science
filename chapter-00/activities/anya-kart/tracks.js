// 三條賽道的設定：路線（x, y 高度, z）、配色、機關擺放、專屬佈景
// layout(T) 用 T.near(x, z) 依座標找賽道位置，改路線時機關會跟著走

export const TRACKS = [
  // ---------------- 第 1 關：花生鄉村 ----------------
  {
    id: 'country',
    name: '花生鄉村',
    icon: '🌳',
    desc: '懸崖飛躍、斷橋、黑衣壞人',
    ctrl: [[0, 0, -150], [90, 0, -160], [170, 4, -120], [199, 13, -68], [205, 20, -25], [205, 12, 10], [204, 5, 44], [152, 4, 68],
      [85, 2, 105], [120, 0, 170], [72, 0, 220], [10, 0, 222], [-52, 0, 218], [-110, 3, 160], [-180, 8, 120], [-200, 6, 30],
      [-150, 2, -20], [-170, 0, -100], [-100, 0, -160]],
    gap: { x: 10, z: 222, half: 10, depth: -24, side: 140, water: '#4fb3e8' },
    crest: [150, 400],
    theme: {
      sky: ['#5fb8ff', '#bfe4ff', '#f2fbff'], fog: ['#d6eeff', 160, 700],
      hemi: ['#ffffff', '#86b86a', 1.5], sun: ['#fff3e0', 2.4],
      ground: { a: '#8fd16a', b: '#6fbf5a', edge: '#e8d7a0', high: '#b8c99a', cliff: '#b98b5e' },
      road: { base: '#6b6f7a', edge: '#ffffff', center: '#ffe680' }, curb: ['#ff4f6d', '#ffffff'],
      trees: { count: 380, kind: 'round', pink: 0.18 }, houses: 16, clouds: true,
      arch: { color: '#ff7fa3', text: '★ 安妮亞大賽車 ★' },
      deck: { deck: '#a8743f', rail: '#f1dfb8', pillar: '#7d5636' },
    },
    layout: (T) => ({
      ramps: [{ i0: T.CREST - 8, len: 9, h: 2.6 }, { i0: T.GAP0 - 9, len: 9, h: 2.3 }],
      pads: [[160, -4, 2.3], [400, 4, 2.3], [T.GAP0 - 32, 0, 11], [880, -5, 2.3], [1060, 4, 2.3]],
      signs: [[T.CREST - 25, '⚠ 前方懸崖 ⚠', '加速飛下去！'], [T.GAP0 - 55, '⚠ 斷橋注意 ⚠', '全速跳過去！']],
      boxes: [120, 450, 720, 1000],
      obstacles: [[190, [-7, -3.5]], [530, [1, 4.5, -7]], [840, [-6, -2]], [1085, [2.5, 6.5, -4]]],
      villains: [380, 760, 1020],
      peanuts: [[90, 0], [340, -5], [480, 5], [680, 0], [800, 4], [960, -4], [1130, 0]],
    }),
  },

  // ---------------- 第 2 關：城市夜賽 ----------------
  {
    id: 'city',
    name: '城市夜賽',
    icon: '🌃',
    desc: '8 字高架橋、隧道、路上車輛、水窪',
    ctrl: [[240, 0, 50], [240, 0, -40], [218, 0, -110], [150, 1, -145], [80, 4, -95], [0, 9, 0], [-80, 4, 95],
      [-150, 1, 145], [-222, 0, 105], [-245, 0, 0], [-222, 0, -105], [-150, 0, -140], [-75, 0, -75], [0, 0, 0],
      [75, 0, 75], [150, 0, 135], [218, 0, 112]],
    deckAbove: 3.2,
    flat: true,
    theme: {
      night: true,
      sky: ['#070b24', '#18215a', '#3a3f7a'], fog: ['#1b1f4a', 120, 560],
      hemi: ['#8fa4ff', '#2b2140', 0.9], sun: ['#b9c6ff', 0.9],
      ground: { a: '#3b3f4d', b: '#454a5a', edge: '#5c6070', high: '#555a6a', cliff: '#555a6a' },
      road: { base: '#3c3f4a', edge: '#f5f5f5', center: '#ffd23f' }, curb: ['#ffd23f', '#2b2b33'],
      trees: { count: 0 }, houses: 0, clouds: false,
      arch: { color: '#ff3fa4', text: '★ 城市夜賽 NIGHT RACE ★', neon: true },
      deck: { deck: '#7a7f8f', rail: '#ffd23f', pillar: '#5d6272' },
    },
    layout: (T) => {
      const n = T.near;
      return {
        ramps: [],
        pads: [[n(240, -10), -4, 2.3], [n(-245, 20), 4, 2.3], [n(-110, -110), 0, 2.3], [n(110, 105), -4, 2.3]],
        signs: [[n(-215, 112), '⚠ 前方隧道 ⚠', '注意前方車輛'], [n(115, -125), '⬆ 高架橋 ⬆', '小心不要撞欄杆']],
        boxes: [n(230, -80), n(-190, 128), n(-185, -125), n(60, 60)],
        obstacles: [[n(-120, 120), [-7, 6], 'hydrant'], [n(-40, -40), [7], 'hydrant'], [n(185, -130), [-6, 2]], [n(190, 125), [5, -3]]],
        villains: [n(-160, -135), n(150, 140)],
        crosswalks: [n(-160, -135), n(150, 140)],
        peanuts: [[n(240, 20), 0], [n(-60, 60), 4], [n(-245, -40), -3], [n(-30, -30), 0], [n(200, 120), -5]],
        zones: [
          { type: 'puddle', i0: n(150, -145), len: 7, lat0: -8, lat1: -1 },
          { type: 'puddle', i0: n(-222, -105), len: 7, lat0: 1, lat1: 8 },
          { type: 'puddle', i0: n(75, 75), len: 7, lat0: -4, lat1: 4 },
          { type: 'puddle', i0: n(-150, 145), len: 6, lat0: -9, lat1: -2 },
        ],
        traffic: { count: 5, speed: 18, lanes: [-5.5, 5.5] },
        tunnels: [{ kind: 'tunnel', i0: n(-238, 60), len: 95 }],
      };
    },
    decor: (C) => buildCityDecor(C),
  },

  // ---------------- 第 3 關：雪山間諜基地 ----------------
  {
    id: 'snow',
    name: '雪山間諜基地',
    icon: '❄️',
    desc: '雪球、雷射門、輸送帶、冰面、岔路、冰湖',
    ctrl: [[0, 0, -205], [90, 0, -205], [165, 2, -190], [222, 6, -160], [206, 9, -102], [240, 12, -48], [228, 15, 10],
      [192, 16, 62], [140, 16, 105], [72, 16, 130], [-10, 15, 128], [-82, 12, 102], [-140, 8, 58], [-176, 4, 0],
      [-182, 2, -62], [-150, 1, -120], [-100, 0, -132], [-86, 0, -175], [-40, 0, -202]],
    gap: { x: -181, z: -55, half: 9, depth: -9, side: 85, water: '#bfeaff', ice: true },
    hill: 'snow',
    theme: {
      snow: true,
      sky: ['#9fc4e6', '#d8e8f5', '#f4f8fc'], fog: ['#e4eef7', 120, 600],
      hemi: ['#ffffff', '#b9cde0', 1.6], sun: ['#ffffff', 2.0],
      ground: { a: '#f4f8fc', b: '#e3ecf5', edge: '#d5e2ee', high: '#ffffff', cliff: '#9fb3c8' },
      road: { base: '#5d6573', edge: '#ffffff', center: '#7fd8ff' }, curb: ['#3a9be0', '#ffffff'],
      trees: { count: 300, kind: 'pine' }, houses: 0, clouds: true,
      arch: { color: '#3a9be0', text: '★ 雪山間諜基地 ★' },
      deck: { deck: '#8a9bb0', rail: '#e0f4ff', pillar: '#6d7f95' },
    },
    layout: (T) => {
      const n = T.near;
      const div0 = n(-10, 128), div1 = n(-160, 30);
      return {
        ramps: [{ i0: T.GAP0 - 9, len: 9, h: 2.3 }],
        pads: [[n(60, -205), 4, 2.3], [T.GAP0 - 32, 0, 11], [n(-95, -125), -4, 2.3]],
        signs: [[n(150, -192), '⚠ 小心雪球 ⚠', '從山上滾下來！'], [n(232, -10), '⚠ 間諜基地 ⚠', '雷射門開關中'],
          [T.GAP0 - 55, '⚠ 冰湖 ⚠', '全速跳過去！']],
        boxes: [n(130, -197), n(40, 130), n(-165, 28), n(-120, -118)],
        obstacles: [[n(-82, -160), [-6, 3]], [n(200, -118), [6]]],
        villains: [n(100, 125)],
        peanuts: [[n(30, -205), 0], [n(225, -60), -4], [n(150, 100), 0], [n(-170, -95), 0], [n(-60, -190), 4]],
        lasers: [{ i: n(205, 48), period: 3.2, phase: 0 }, { i: n(165, 86), period: 3.2, phase: 1.1 }, { i: n(110, 120), period: 2.6, phase: 0.5 }],
        zones: [
          { type: 'conveyor', i0: n(145, 102), len: 14, lat0: -11, lat1: 11, push: 7 },
          { type: 'conveyor', i0: n(95, 124), len: 14, lat0: -11, lat1: 11, push: -7 },
          { type: 'ice', i0: div0, len: T.idxGap(div0, div1), lat0: 2, lat1: 11 },
          { type: 'ice', i0: n(-176, 10), len: 25, lat0: -11, lat1: 11 },
          { type: 'ice', i0: n(-95, -122), len: 30, lat0: -11, lat1: 2 },
        ],
        snowballs: [{ iTop: n(232, -20), iBottom: n(165, -186), lanes: [-6, -1, 5], every: 2.4 }],
        dividers: [{ i0: div0, len: T.idxGap(div0, div1) }],
        tunnels: [
          { kind: 'base', i0: n(222, 32), len: T.idxGap(n(222, 32), n(60, 131)) },
          { kind: 'cave', i0: div0, len: T.idxGap(div0, div1), side: 1 },
        ],
      };
    },
    decor: (C) => buildSnowDecor(C),
  },
];

// ---------------- 城市佈景：大樓、霓虹、路燈、月亮星星 ----------------
function buildCityDecor(C) {
  const { THREE, world, toon, mesh, canvasTex, rand, pts, TAN, SIDE, N, HW, nearestIdx } = C;
  // 大樓（窗戶會亮）
  const winTex = canvasTex(64, 128, (g, W, H) => {
    g.fillStyle = '#1d2033'; g.fillRect(0, 0, W, H);
    for (let y = 6; y < H; y += 14) for (let x = 6; x < W; x += 14) {
      g.fillStyle = Math.random() < 0.55 ? ['#ffe59a', '#fff3c9', '#9fd8ff'][Math.floor(Math.random() * 3)] : '#2a2e45';
      g.fillRect(x, y, 8, 9);
    }
  });
  winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping;
  const bodyCols = ['#3b4060', '#4a3f5e', '#2f4a5e', '#55405a', '#3f5060'];
  let made = 0;
  for (let tries = 0; tries < 900 && made < 120; tries++) {
    const x = (rand() - 0.5) * 820, z = (rand() - 0.5) * 820;
    const [, d] = nearestIdx(x, z, 4);
    if (d < HW + 14 || Math.hypot(x, z) > 420) continue;
    const w = 10 + rand() * 16, dpt = 10 + rand() * 16, h = 14 + rand() * (d > 60 ? 70 : 34);
    const t = winTex.clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, Math.round(w / 8)), Math.max(1, Math.round(h / 16)));
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dpt),
      new THREE.MeshToonMaterial({ color: bodyCols[made % 5], gradientMap: C.gradTex, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.9 }));
    m.position.set(x, h / 2 - 0.3, z);
    m.rotation.y = Math.round(rand() * 4) * Math.PI / 2 + (rand() - 0.5) * 0.2;
    world.add(m);
    made++;
    if (rand() < 0.25) mesh(new THREE.BoxGeometry(w * 0.5, 4, dpt * 0.5), toon('#2a2d40'), x, h + 1.6, z, world);
  }
  // 霓虹招牌
  const words = [['WAKU WAKU', '#ff4fd8'], ['花生 PEANUT', '#ffd23f'], ['SPY 間諜', '#4ff0ff'], ['安妮亞 ♥', '#ff6b8b'], ['EDEN', '#8bff6b']];
  for (let k = 0; k < 14; k++) {
    const i = Math.floor(rand() * N), s = rand() < 0.5 ? -1 : 1, off = (HW + 9) * s;
    if (pts[i].y > 2) continue;
    const [word, col] = words[k % words.length];
    const tex = canvasTex(512, 128, (g, W, H) => {
      g.fillStyle = 'rgba(10,8,30,0.85)'; g.fillRect(0, 0, W, H);
      g.shadowColor = col; g.shadowBlur = 24; g.strokeStyle = col; g.lineWidth = 6; g.strokeRect(10, 10, W - 20, H - 20);
      g.fillStyle = '#ffffff'; g.font = '900 64px "PingFang TC", "Microsoft JhengHei", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(word, W / 2, H / 2 + 4);
    });
    const p = pts[i];
    const g = new THREE.Group();
    g.position.set(p.x + SIDE[i].x * off, p.y, p.z + SIDE[i].z * off);
    g.rotation.y = Math.atan2(TAN[i].x, TAN[i].z) - s * Math.PI / 2;
    world.add(g);
    mesh(new THREE.CylinderGeometry(0.25, 0.25, 7, 6), toon('#30334a'), 0, 3.5, 0, g);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.25), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    sign.position.y = 8;
    g.add(sign);
  }
  // 路燈＋地上的光圈
  const poolTex = canvasTex(128, 128, (g, W) => {
    const gr = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
    gr.addColorStop(0, 'rgba(255,230,160,0.55)'); gr.addColorStop(1, 'rgba(255,230,160,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, W);
  });
  const poolM = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const bulbM = new THREE.MeshBasicMaterial({ color: '#fff1b8' });
  const poleM = toon('#5b5f73');
  for (let i = 0; i < N; i += 22) {
    const p = pts[i];
    for (const s of [-1, 1]) {
      if ((i / 22) % 2 === (s > 0 ? 0 : 1)) continue;
      const off = (HW + 2.2) * s;
      const g = new THREE.Group();
      g.position.set(p.x + SIDE[i].x * off, p.y, p.z + SIDE[i].z * off);
      g.rotation.y = Math.atan2(TAN[i].x, TAN[i].z);
      world.add(g);
      mesh(new THREE.CylinderGeometry(0.18, 0.25, 8, 6), poleM, 0, 4, 0, g);
      mesh(new THREE.BoxGeometry(0.2, 0.2, 2.4), poleM, -1.1 * s, 8, 0, g).rotation.y = Math.PI / 2;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), bulbM);
      b.position.set(-2.2 * s, 7.7, 0);
      g.add(b);
      const pool = new THREE.Mesh(new THREE.CircleGeometry(6, 20), poolM);
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(-3.5 * s, 0.12, 0);
      g.add(pool);
    }
  }
  // 月亮與星星
  const moon = new THREE.Mesh(new THREE.SphereGeometry(28, 24, 16), new THREE.MeshBasicMaterial({ color: '#fff6d6', fog: false }));
  moon.position.set(-380, 260, -520);
  world.add(moon);
  const starPos = [];
  for (let k = 0; k < 700; k++) {
    const a = rand() * Math.PI * 2, e = 0.15 + rand() * 1.2, r = 900;
    starPos.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  world.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, fog: false })));
}

// ---------------- 雪山佈景：雪人、岩石、飄雪 ----------------
function buildSnowDecor(C) {
  const { THREE, world, toon, mesh, rand, HW, nearestIdx, groundY } = C;
  // 雪人
  for (let k = 0, made = 0; k < 300 && made < 14; k++) {
    const x = (rand() - 0.5) * 760, z = (rand() - 0.5) * 760;
    const [i, d] = nearestIdx(x, z, 4);
    if (d < HW + 6 || d > HW + 30 || C.canyonF(x, z) > 0.01) continue;
    const g = new THREE.Group();
    g.position.set(x, groundY(x, z, i, d) - 0.2, z);
    g.rotation.y = rand() * 6;
    world.add(g);
    mesh(new THREE.SphereGeometry(1.4, 14, 10), toon('#ffffff'), 0, 1.3, 0, g);
    mesh(new THREE.SphereGeometry(1.0, 14, 10), toon('#ffffff'), 0, 3.2, 0, g);
    mesh(new THREE.SphereGeometry(0.7, 14, 10), toon('#ffffff'), 0, 4.6, 0, g);
    mesh(new THREE.ConeGeometry(0.15, 0.7, 8), toon('#ff8a1f'), 0, 4.6, 0.95, g).rotation.x = Math.PI / 2;
    mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.7, 12), toon('#3a3f55'), 0, 5.4, 0, g);
    const sc = mesh(new THREE.TorusGeometry(0.75, 0.15, 6, 16), toon(['#e2577f', '#3a9be0', '#ffd23f'][made % 3]), 0, 3.95, 0, g);
    sc.rotation.x = Math.PI / 2;
    made++;
  }
  // 岩石
  const rockM = toon('#8d9aab');
  for (let k = 0, made = 0; k < 400 && made < 40; k++) {
    const x = (rand() - 0.5) * 800, z = (rand() - 0.5) * 800;
    const [i, d] = nearestIdx(x, z, 4);
    if (d < HW + 8 || C.canyonF(x, z) > 0.01) continue;
    const r = mesh(new THREE.DodecahedronGeometry(1.5 + rand() * 3, 0), rockM, x, groundY(x, z, i, d), z, world);
    r.rotation.set(rand() * 3, rand() * 3, 0);
    made++;
  }
}
