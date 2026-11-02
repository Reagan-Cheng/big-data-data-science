// 三條賽道的設定：路線（x, y 高度, z）、配色、機關擺放、專屬佈景
// layout(T) 用 T.near(x, z) 依座標找賽道位置，改路線時機關會跟著走

export const TRACKS = [
  // ---------------- 第 1 關：花生鄉村 ----------------
  {
    id: 'country',
    name: '花生鄉村',
    icon: '🌳',
    desc: '懸崖飛躍、斷橋、黑衣壞人、童童',
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
      penguins: [{ i: 60 }, { i: 420 }, { i: 925 }],
    }),
  },

  // ---------------- 第 2 關：城市夜賽 ----------------
  {
    id: 'city',
    name: '城市夜賽',
    icon: '🌃',
    desc: '8 字高架橋、超高斷橋、隧道、車輛、水窪、可愛幽靈、童童',
    ctrl: [[240, 0, 50], [240, 0, -40], [218, 0, -110], [150, 1, -145], [80, 4, -95], [0, 9, 0], [-80, 15, 95],
      [-150, 23, 140], [-215, 29, 112], [-238, 30, 64], [-244, 9, 30], [-246, 2, -12], [-238, 1, -72], [-205, 0, -118],
      [-150, 0, -140], [-75, 0, -75], [0, 0, 0], [75, 0, 75], [150, 0, 135], [218, 0, 112]],
    deckAbove: 3.2,
    broken: { x: -238, z: 64 },   // 高架橋在這裡突然斷掉，撐傘飄下去
    flat: true,
    offroad: 9,
    theme: {
      night: true,
      sky: ['#070b24', '#18215a', '#3a3f7a'], fog: ['#1b1f4a', 140, 620],
      hemi: ['#8fa4ff', '#2b2140', 0.9], sun: ['#b9c6ff', 0.9],
      ground: { a: '#3b3f4d', b: '#454a5a', edge: '#5c6070', high: '#555a6a', cliff: '#555a6a' },
      road: { base: '#3c3f4a', edge: '#f5f5f5', center: '#ffd23f' }, curb: ['#ffd23f', '#2b2b33'],
      trees: { count: 0 }, houses: 0, clouds: false,
      arch: { color: '#ff3fa4', text: '★ 城市夜賽 NIGHT RACE ★', neon: true },
      deck: { deck: '#7a7f8f', rail: '#ffd23f', pillar: '#5d6272' },
    },
    layout: (T) => {
      const n = T.near, tun = n(95, 92);
      return {
        ramps: [{ i0: T.EDGE - 9, len: 9, h: 2.2 }],
        pads: [[n(240, -10), -4, 2.3], [T.EDGE - 34, 0, 11], [n(-110, -110), 0, 2.3], [n(110, 105), -4, 2.3]],
        signs: [[T.EDGE - 48, '⚠ 前方斷橋 ⚠', '撐傘飛下去！'], [tun - 24, '⚠ 前方隧道 ⚠', '注意前方車輛'], [n(115, -125), '⬆ 高架橋 ⬆', '越開越高！']],
        boxes: [n(230, -80), n(-190, 128), n(-185, -125), n(60, 60)],
        obstacles: [[n(-226, -96), [-8], 'hydrant'], [n(-40, -40), [8], 'hydrant'], [n(190, 125), [6]]],
        villains: [n(-160, -135), n(205, 118)],
        crosswalks: [n(-160, -135), n(205, 118)],
        peanuts: [[n(240, 20), 0], [n(-60, 60), 4], [n(-240, -45), -3], [n(-30, -30), 0], [n(200, 120), -5]],
        zones: [
          { type: 'puddle', i0: n(150, -145), len: 7, lat0: -8, lat1: -1 },
          { type: 'puddle', i0: n(-222, -105), len: 7, lat0: 1, lat1: 8 },
          { type: 'puddle', i0: n(75, 75), len: 7, lat0: -4, lat1: 4 },
          { type: 'puddle', i0: n(-150, 140), len: 6, lat0: -9, lat1: -2 },
        ],
        traffic: { count: 5, speed: 18, lanes: [-5.5, 5.5] },
        tunnels: [{ kind: 'tunnel', i0: tun, len: 62 }],
        ghosts: [{ i: n(-195, -132), amp: 7 }, { i: n(-55, -55), amp: 8 }, { i: n(230, 80), amp: 8, speed: 1.1 }],
        penguins: [{ i: n(120, -130) }, { i: n(-238, -70) }],
      };
    },
    decor: (C) => buildCityDecor(C),
  },

  // ---------------- 第 3 關：雪山間諜基地 ----------------
  {
    id: 'snow',
    name: '雪山間諜基地',
    icon: '❄️',
    desc: '雪球、雷射門、輸送帶、冰面、岔路、冰湖、童童',
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
        lasers: [{ i: n(205, 48), period: 3.4, phase: 0 }, { i: n(110, 120), period: 3.0, phase: 1.2 }],
        zones: [
          { type: 'conveyor', i0: n(145, 102), len: 14, lat0: -11, lat1: 11, push: 7 },
          { type: 'conveyor', i0: n(95, 124), len: 14, lat0: -11, lat1: 11, push: -7 },
          { type: 'ice', i0: div0, len: T.idxGap(div0, div1), lat0: 2, lat1: 11 },
          { type: 'ice', i0: n(-176, 10), len: 25, lat0: -11, lat1: 11 },
          { type: 'ice', i0: n(-95, -122), len: 30, lat0: -11, lat1: 2 },
        ],
        snowballs: [{ iTop: n(232, -20), iBottom: n(165, -186), lanes: [-6, -1, 5], every: 3.4 }],
        penguins: [{ i: n(120, -198) }, { i: n(-178, -20) }, { i: n(-130, -125) }],
        dividers: [{ i0: div0, len: T.idxGap(div0, div1) }],
        tunnels: [
          { kind: 'base', i0: n(222, 32), len: T.idxGap(n(222, 32), n(60, 131)) },
          { kind: 'cave', i0: div0, len: T.idxGap(div0, div1), side: 1 },
        ],
      };
    },
    decor: (C) => buildSnowDecor(C),
  },
  // ---------------- 第 4 關：陽光海灘 ----------------
  {
    id: 'beach',
    name: '陽光海灘',
    icon: '🏖️',
    desc: '漲潮的海水、螃蟹、海灘球、沙堡、飛越海灣',
    ctrl: [[0, 1, -160], [110, 1, -162], [200, 2, -130], [235, 4, -50], [220, 7, 30], [170, 9, 90], [100, 8, 130],
      [20, 6, 150], [-60, 4, 140], [-130, 3, 170], [-200, 2, 140], [-235, 2, 60], [-228, 1, -20], [-185, 1, -95],
      [-110, 1, -152]],
    gap: { x: -230, z: 18, half: 9, depth: -8, side: 120, water: '#36b5e5' },
    hill: 'beach',
    offroad: 10,
    theme: {
      sea: { y: 0, color: '#3fb7e6' },
      sky: ['#43aef5', '#a9dcff', '#f3fbff'], fog: ['#cfeeff', 180, 720],
      hemi: ['#ffffff', '#f3dfa8', 1.6], sun: ['#fff6e0', 2.5],
      ground: { a: '#f3dfa8', b: '#ead19a', edge: '#f7e7bd', high: '#bfe08f', cliff: '#d9c08a' },
      road: { base: '#8a8f99', edge: '#ffffff', center: '#ffd23f' }, curb: ['#3fb7e6', '#ffffff'],
      trees: { count: 150, kind: 'palm' }, houses: 0, clouds: true,
      arch: { color: '#3fb7e6', text: '★ 陽光海灘 SUNNY BEACH ★' },
      deck: { deck: '#b98a5a', rail: '#ffffff', pillar: '#8a6440' },
    },
    layout: (T) => {
      const n = T.near;
      return {
        ramps: [{ i0: T.GAP0 - 9, len: 9, h: 2.3 }],
        pads: [[n(60, -161), -4, 2.3], [T.GAP0 - 32, 0, 11], [n(100, 130), 3, 2.3], [n(-150, -128), 0, 2.3]],
        signs: [[n(-15, -160), '⚠ 漲潮注意 ⚠', '海水會淹上來！'], [T.GAP0 - 55, '⚠ 海灣 ⚠', '全速飛過去！'],
          [n(30, 150), '⚠ 海灘球 ⚠', '彈來彈去！']],
        boxes: [n(150, -150), n(220, 30), n(-60, 140), n(-200, -75)],
        obstacles: [[n(185, -138), [6, -5], 'sandcastle'], [n(-20, 148), [-6], 'sandcastle'], [n(-210, 125), [5, -4], 'sandcastle']],
        peanuts: [[n(20, -160), -5], [n(232, -20), 0], [n(150, 100), 4], [n(-100, 155), 0], [n(-150, -130), -4]],
        zones: [
          { type: 'tide', i0: n(20, -160), len: 45, lat0: 0, lat1: 11, period: 6, phase: 0 },
          { type: 'tide', i0: n(140, -155), len: 30, lat0: -11, lat1: 11, period: 7, phase: 3 },
          { type: 'tide', i0: n(-160, -120), len: 30, lat0: 0, lat1: 11, period: 6.5, phase: 1.5 },
        ],
        snowballs: [{ kind: 'beachball', iTop: n(20, 150), iBottom: n(160, 98), lanes: [-6, 0, 6], every: 3.0 }],
        penguins: [{ i: n(80, -161), kind: 'crab' }, { i: n(228, -60), kind: 'crab' }, { i: n(-120, 160), kind: 'crab' }],
      };
    },
    decor: (C) => buildBeachDecor(C),
  },

  // ---------------- 第 5 關：花生糖果工廠 ----------------
  {
    id: 'candy',
    name: '花生糖果工廠',
    icon: '🍬',
    desc: '上下兩層、壓扁機、巧克力河、彈簧軟糖、花生寶寶',
    ctrl: [[-40, 0, -220], [60, 0, -220], [140, 0, -185], [165, 0, -115], [120, 2, -55], [60, 6, -15], [0, 9, 0],
      [-60, 6, 15], [-120, 2, 55], [-165, 0, 115], [-140, 0, 185], [-60, 0, 220], [40, 0, 220], [120, 0, 185],
      [160, 0, 115], [120, 0, 55], [60, 0, 15], [0, 0, 0], [-60, 0, -15], [-120, 0, -55], [-162, 0, -118], [-135, 0, -190]],
    deckAbove: 3.2,
    flat: true,
    offroad: 10,
    gap: { x: 0, z: 221, half: 9, depth: -8, side: 110, water: '#6b3a1f' },
    theme: {
      sky: ['#ff9fcf', '#ffd1ea', '#fff2f9'], fog: ['#ffe0f0', 160, 650],
      hemi: ['#ffffff', '#ffc2e0', 1.7], sun: ['#fff1f6', 2.2],
      ground: { a: '#ffd6ea', b: '#c9f0ff', edge: '#fff0c4', high: '#ffe6a8', cliff: '#7a4a2e' },
      road: { base: '#7a4a2e', edge: '#ffffff', center: '#ff8fc4' }, curb: ['#ff5fa2', '#ffffff'],
      trees: { count: 160, kind: 'lollipop' }, houses: 0, clouds: true, cloudColor: '#ffd6ec',
      arch: { color: '#ff5fa2', text: '★ 花生糖果工廠 ★' },
      deck: { deck: '#d9a066', rail: '#ff7fb0', pillar: '#ffffff' },
    },
    layout: (T) => {
      const n = T.near, f0 = n(150, -170), f1 = n(135, -75);
      return {
        ramps: [{ i0: T.GAP0 - 9, len: 9, h: 2.3 }],
        pads: [[n(20, -220), 4, 2.3], [T.GAP0 - 32, 0, 11], [n(-150, 150), -3, 2.3], [n(-150, -150), 3, 2.3]],
        signs: [[f0 - 28, '⚠ 壓扁機 ⚠', '看準時機通過！'], [T.GAP0 - 55, '⚠ 巧克力河 ⚠', '全速跳過去！'],
          [n(-165, 95), '⚠ 彈簧軟糖 ⚠', '踩上去會彈起來'], [n(155, 80), '⬆ 糖果高架橋 ⬆', '上下兩層！']],
        boxes: [n(100, -205), n(-120, 55), n(-100, 205), n(-120, -55)],
        obstacles: [[n(-150, 150), [7, -7], 'candycane'], [n(140, 160), [-6, 5], 'candycane'], [n(-40, -10), [7], 'candycane']],
        peanuts: [[n(0, -220), 0], [n(-60, 15), -4], [n(-100, 210), 4], [n(80, 210), -4], [n(140, 140), 0], [n(-90, -35), 0],
          [n(-160, -150), 4]],
        zones: [
          { type: 'conveyor', i0: n(163, -135), len: 12, lat0: -11, lat1: 11, push: 7 },
          { type: 'conveyor', i0: n(150, -90), len: 12, lat0: -11, lat1: 11, push: -7 },
          { type: 'spring', i0: n(-165, 105), len: 4, lat0: -10, lat1: -1, power: 19 },
          { type: 'spring', i0: n(100, 200), len: 4, lat0: 1, lat1: 10, power: 19 },
          { type: 'spring', i0: n(-145, -165), len: 4, lat0: -4, lat1: 4, power: 17 },
        ],
        crushers: [{ i: n(160, -150), lat: -5, period: 3.0, phase: 0 }, { i: n(165, -115), lat: 5, period: 3.0, phase: 1.5 },
          { i: n(145, -80), lat: -3, period: 2.6, phase: 0.7 }],
        tunnels: [{ kind: 'factory', i0: f0, len: T.idxGap(f0, f1) }],
        penguins: [{ i: n(60, -220), kind: 'peanutkid' }, { i: n(-155, 150), kind: 'peanutkid' }, { i: n(-160, -110), kind: 'peanutkid', n: 3 }],
      };
    },
    decor: (C) => buildCandyDecor(C),
  },

  // ---------------- 第 6 關：雲端彩虹城堡 ----------------
  {
    id: 'sky',
    name: '雲端彩虹城堡',
    icon: '☁️',
    desc: '螺旋爬上城堡、大俯衝、沒有欄杆、陣風、大風車、雲朵彈跳（2 圈）',
    ctrl: cloudCtrl(),
    sky: true,
    laps: 2,   // 賽道很長，跑兩圈
    theme: {
      sky: ['#ff8a6b', '#ffc79a', '#fff0dc'], fog: ['#ffe2c8', 200, 900],
      hemi: ['#fff4e6', '#ffb8c8', 1.7], sun: ['#ffd9a8', 2.3],
      ground: { a: '#ffffff', b: '#ffffff', edge: '#ffffff', high: '#ffffff', cliff: '#ffffff' },
      road: { base: '#7d6fb0', edge: '#ffffff', center: '#ffd23f' }, curb: ['#ff7fbf', '#7fd8ff'],
      trees: { count: 0 }, houses: 0, clouds: true, cloudColor: '#fff4ec',
      arch: { color: '#ffd23f', text: '★ 雲端彩虹城堡 ★' },
      deck: { deck: '#fdf7ff', rail: '#ffd23f', pillar: '#ffffff' },
      padStyle: 'rainbow',
    },
    layout: (T) => {
      const n3 = T.near3;
      const r1 = n3(0, 48, -70), r2 = n3(-188, 55, 30);
      return {
        ramps: [],
        railless: [{ i0: r1 - 20, len: 40 }, { i0: r2 - 22, len: 45 }],
        pads: [[n3(100, 25, -180), 0, 6], [n3(0, 36, 150), 0, 6], [n3(-110, 42, 40), 0, 6], [n3(0, 60, 150) - 15, 0, 6]],
        signs: [[r1 - 40, '⚠ 沒有欄杆 ⚠', '小心掉下去！'], [r2 - 42, '⚠ 沒有欄杆 ⚠', '小心掉下去！'],
          [n3(-185, 40, -40) - 10, '⬇ 大俯衝 ⬇', '衝啊～']],
        boxes: [n3(150, 26, -150), n3(78, 34, 118), n3(-78, 45, -38), n3(-160, 58, 135)],
        peanuts: [[n3(20, 25, -190), 0], [n3(110, 30, 40), 0], [n3(-110, 42, 40), 4], [n3(78, 51, -38), -4], [n3(-95, 60, 175), 0]],
        zones: [
          { type: 'spring', i0: n3(-20, 25, -190), len: 4, lat0: -10, lat1: 10, power: 18 },
          { type: 'spring', i0: n3(78, 34, 118), len: 4, lat0: -9, lat1: -1, power: 18 },
          { type: 'wind', i0: n3(-78, 39, 118), len: 45, lat0: -11, lat1: 11, push: 7, period: 4 },
          { type: 'wind', i0: n3(110, 54, 40), len: 40, lat0: -11, lat1: 11, push: 8, period: 3.5 },
        ],
        spinners: [{ i: n3(-78, 45, -38), speed: -1.0 }, { i: n3(78, 51, -38), speed: 1.1 }],
        penguins: [{ i: n3(150, 26, -150) + 25 }],
      };
    },
    decor: (C) => buildSkyDecor(C),
  },
];

// ---------------- 城市佈景：大樓、霓虹、路燈、月亮星星 ----------------
function buildCityDecor(C) {
  const { THREE, world, toon, mesh, canvasTex, rand, pts, TAN, SIDE, N, HW, nearestIdx, addSolid, onBoundary } = C;
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
    const w = 10 + rand() * 16, dpt = 10 + rand() * 16, h = 14 + rand() * (d > 60 ? 70 : 34);
    if (d - Math.hypot(w, dpt) / 2 < HW + 3 || Math.hypot(x, z) > 420 || onBoundary(d, Math.hypot(w, dpt) / 2)) continue;
    const t = winTex.clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, Math.round(w / 8)), Math.max(1, Math.round(h / 16)));
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dpt),
      new THREE.MeshToonMaterial({ color: bodyCols[made % 5], gradientMap: C.gradTex, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.9 }));
    m.position.set(x, h / 2 - 0.3, z);
    m.rotation.y = Math.round(rand() * 4) * Math.PI / 2 + (rand() - 0.5) * 0.2;
    world.add(m);
    addSolid({ x, z, hw: w / 2, hd: dpt / 2, rot: m.rotation.y });
    made++;
    if (rand() < 0.25) mesh(new THREE.BoxGeometry(w * 0.5, 4, dpt * 0.5), toon('#2a2d40'), x, h + 1.6, z, world);
  }
  // 霓虹招牌
  const words = [['WAKU WAKU', '#ff4fd8'], ['花生 PEANUT', '#ffd23f'], ['SPY 間諜', '#4ff0ff'], ['安妮亞 ♥', '#ff6b8b'], ['EDEN', '#8bff6b']];
  for (let k = 0; k < 14; k++) {
    const i = Math.floor(rand() * N), s = rand() < 0.5 ? -1 : 1, off = (HW + 13) * s;   // 放在邊界外面：看得到、開不到
    if (pts[i].y > 2) continue;
    const [, nd] = nearestIdx(pts[i].x + SIDE[i].x * off, pts[i].z + SIDE[i].z * off, 2);
    if (onBoundary(nd, 0.5) || nd < HW + 6) continue;
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
    addSolid({ x: g.position.x, z: g.position.z, y: p.y, r: 0.45 });
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
    if (p.y > 2.5 || C.inTunnel(i)) continue;   // 高架橋上有欄杆、隧道裡有燈條，都不放路燈
    for (const s of [-1, 1]) {
      if ((i / 22) % 2 === (s > 0 ? 0 : 1)) continue;
      const off = (HW + 2.2) * s;
      const g = new THREE.Group();
      g.position.set(p.x + SIDE[i].x * off, p.y, p.z + SIDE[i].z * off);
      g.rotation.y = Math.atan2(TAN[i].x, TAN[i].z);
      world.add(g);
      addSolid({ x: g.position.x, z: g.position.z, y: p.y, r: 0.4 });
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
  const { THREE, world, toon, mesh, rand, HW, nearestIdx, groundY, addSolid, onBoundary } = C;
  // 雪人
  for (let k = 0, made = 0; k < 300 && made < 14; k++) {
    const x = (rand() - 0.5) * 760, z = (rand() - 0.5) * 760;
    const [i, d] = nearestIdx(x, z, 4);
    if (d < HW + 6 || d > HW + 30 || C.canyonF(x, z) > 0.01 || onBoundary(d, 1.6)) continue;
    const g = new THREE.Group();
    g.position.set(x, groundY(x, z, i, d) - 0.2, z);
    g.rotation.y = rand() * 6;
    world.add(g);
    addSolid({ x, z, y: g.position.y, r: 1.5 });
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
    if (d < HW + 8 || C.canyonF(x, z) > 0.01 || onBoundary(d, 4.5)) continue;
    const size = 1.5 + rand() * 3;
    const r = mesh(new THREE.DodecahedronGeometry(size, 0), rockM, x, groundY(x, z, i, d), z, world);
    addSolid({ x, z, y: r.position.y, r: size * 0.85 });
    r.rotation.set(rand() * 3, rand() * 3, 0);
    made++;
  }
}

// ---------------- 雲端賽道路線：起點平台 → 繞城堡螺旋往上 1.25 圈 → 大俯衝回起點 ----------------
function cloudCtrl() {
  const p = [[-60, 25, -190], [60, 25, -190], [150, 26, -150], [178, 28, -60]];
  for (let a = 0; a <= 450; a += 45) {
    const t = a * Math.PI / 180;
    p.push([Math.cos(t) * 110, 30 + a / 360 * 24, 40 + Math.sin(t) * 110]);
  }
  p.push([-95, 60, 175], [-170, 58, 120], [-190, 56, 15], [-178, 30, -95], [-118, 25, -172]);
  return p;
}

// ---------------- 海灘佈景：遮陽傘、浴巾、救生員台、燈塔、帆船 ----------------
function buildBeachDecor(C) {
  const { THREE, world, toon, mesh, rand, pts, SIDE, N, HW, nearestIdx, groundY, onBoundary } = C;
  const umbCols = ['#ff6b8b', '#ffd23f', '#3fb7e6', '#7be08b', '#ff9a3c'];
  let made = 0;
  for (let k = 0; k < 600 && made < 45; k++) {
    const i = Math.floor(rand() * N), off = -(HW + 14 + rand() * 30) * (rand() < 0.75 ? 1 : -1);
    const p = pts[i], x = p.x + SIDE[i].x * off, z = p.z + SIDE[i].z * off;
    const [ni, d] = nearestIdx(x, z, 4);
    if (d < HW + 12 || onBoundary(d, 2.5) || C.canyonF(x, z) > 0.01) continue;
    const y = groundY(x, z, ni, d);
    if (y < 0.4) continue;   // 不放進海裡
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rand() * 6;
    world.add(g);
    mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.4, 6), toon('#ffffff'), 0, 1.7, 0, g);
    const top = mesh(new THREE.ConeGeometry(2.2, 0.9, 8), toon(umbCols[made % 5]), 0, 3.4, 0, g);
    top.castShadow = true;
    mesh(new THREE.BoxGeometry(1.4, 0.05, 2.6), toon(umbCols[(made + 2) % 5]), 1.6, 0.05, 0.4, g);
    made++;
  }
  // 救生員台與海灘小屋
  for (const [x, z, col] of [[60, -125, '#ff6b4a'], [-90, -118, '#3fb7e6'], [150, -110, '#ffd23f']]) {
    const [ni, d] = nearestIdx(x, z, 4);
    if (d < HW + 12) continue;
    const g = new THREE.Group();
    g.position.set(x, groundY(x, z, ni, d), z);
    world.add(g);
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mesh(new THREE.BoxGeometry(0.25, 4, 0.25), toon('#ffffff'), a * 1.2, 2, b * 1.2, g);
    mesh(new THREE.BoxGeometry(3.2, 2.2, 3.2), toon(col), 0, 5, 0, g);
    mesh(new THREE.ConeGeometry(2.8, 1.6, 4), toon('#ffffff'), 0, 6.9, 0, g).rotation.y = Math.PI / 4;
  }
  // 燈塔（海中的岩石上）
  const lh = new THREE.Group();
  lh.position.set(270, -1, -235);
  world.add(lh);
  mesh(new THREE.DodecahedronGeometry(9, 0), toon('#8d8a82'), 0, 0, 0, lh);
  for (let k = 0; k < 6; k++) mesh(new THREE.CylinderGeometry(3.2 - k * 0.25, 3.4 - k * 0.25, 4, 16), toon(k % 2 ? '#ffffff' : '#e8343a'), 0, 7 + k * 4, 0, lh);
  mesh(new THREE.CylinderGeometry(2.4, 2.4, 3, 12), new THREE.MeshBasicMaterial({ color: '#fff4b0' }), 0, 32.5, 0, lh);
  mesh(new THREE.ConeGeometry(3, 3, 12), toon('#e8343a'), 0, 35.5, 0, lh);
  // 帆船
  for (let k = 0; k < 7; k++) {
    const g = new THREE.Group();
    g.position.set(-280 + k * 90 + rand() * 30, 0.2, -230 - rand() * 120);
    g.rotation.y = rand() * 6;
    world.add(g);
    mesh(new THREE.BoxGeometry(3, 1.2, 8), toon('#ffffff'), 0, 0.4, 0, g);
    mesh(new THREE.CylinderGeometry(0.12, 0.12, 9, 6), toon('#8a6440'), 0, 5, 0, g);
    const sail = new THREE.Mesh(new THREE.ConeGeometry(3, 8, 3), toon(umbCols[k % 5]));
    sail.position.set(0, 5.5, 0.6);
    sail.scale.z = 0.1;
    g.add(sail);
  }
}

// ---------------- 糖果工廠佈景：糖果大樓、煙囪、花生雕像、軟糖、甜甜圈 ----------------
function buildCandyDecor(C) {
  const { THREE, world, toon, mesh, rand, HW, nearestIdx, groundY, onBoundary, addSolid } = C;
  const cols = ['#ff9fcf', '#9fe0ff', '#ffe28a', '#c6a8ff', '#a8f0c4'];
  let made = 0;
  for (let t = 0; t < 900 && made < 40; t++) {
    const x = (rand() - 0.5) * 820, z = (rand() - 0.5) * 820;
    const [, d] = nearestIdx(x, z, 4);
    const w = 16 + rand() * 18, dp = 14 + rand() * 16, h = 14 + rand() * 30;
    if (d - Math.hypot(w, dp) / 2 < HW + 3 || onBoundary(d, Math.hypot(w, dp) / 2) || Math.hypot(x, z) > 420 || C.canyonF(x, z) > 0.01) continue;
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = Math.round(rand() * 4) * Math.PI / 2;
    world.add(g);
    mesh(new THREE.BoxGeometry(w, h, dp), toon(cols[made % 5]), 0, h / 2, 0, g);
    mesh(new THREE.BoxGeometry(w + 1, 1.2, dp + 1), toon('#ffffff'), 0, h, 0, g);
    for (let k = 0; k < 2; k++) {
      mesh(new THREE.CylinderGeometry(1.6, 1.8, 10, 12), toon(k ? '#ffffff' : '#ff5fa2'), (k ? 1 : -1) * w * 0.25, h + 5, 0, g);
      mesh(new THREE.SphereGeometry(3 + rand() * 2, 10, 8), toon('#ffe0f0'), (k ? 1 : -1) * w * 0.25, h + 12, 0, g);
    }
    addSolid({ x, z, hw: w / 2, hd: dp / 2, rot: g.rotation.y });
    made++;
  }
  // 巨大花生雕像、軟糖、甜甜圈
  for (let t = 0, m = 0; t < 600 && m < 30; t++) {
    const x = (rand() - 0.5) * 760, z = (rand() - 0.5) * 760;
    const [i, d] = nearestIdx(x, z, 4);
    const kind = m % 3, r = kind === 0 ? 3 : kind === 1 ? 2.2 : 3.2;
    if (d < HW + 6 || onBoundary(d, r) || C.canyonF(x, z) > 0.01) continue;
    const y = groundY(x, z, i, d);
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rand() * 6;
    world.add(g);
    if (kind === 0) {
      mesh(new THREE.SphereGeometry(2.2, 14, 10), toon('#d9a35b'), 0, 2.2, 0, g).scale.set(1, 1.1, 1);
      mesh(new THREE.SphereGeometry(1.9, 14, 10), toon('#d9a35b'), 0, 5.4, 0, g);
      mesh(new THREE.TorusGeometry(1.95, 0.25, 6, 16), toon('#b9853f'), 0, 3.8, 0, g).rotation.x = Math.PI / 2;
    } else if (kind === 1) {
      mesh(new THREE.SphereGeometry(2.2, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(cols[m % 5]), 0, 0, 0, g).scale.y = 1.2;
    } else {
      const dn = mesh(new THREE.TorusGeometry(2.2, 1.0, 10, 20), toon('#ffcf8a'), 0, 3.2, 0, g);
      mesh(new THREE.TorusGeometry(2.2, 0.75, 10, 20, Math.PI * 2), toon(cols[m % 5]), 0, 3.45, 0.25, g);
      dn.rotation.y = 0;
    }
    addSolid({ x, z, y, r: r * 0.9 });
    m++;
  }
}

// ---------------- 雲端佈景：城堡、浮島、熱氣球、彩虹 ----------------
function buildSkyDecor(C) {
  const { THREE, world, toon, mesh, rand } = C;
  const stone = toon('#fff6fb'), roof = toon('#ff8fc4'), gold = new THREE.MeshBasicMaterial({ color: '#ffe37a' });
  const castle = new THREE.Group();
  castle.position.set(0, 0, 40);
  world.add(castle);
  mesh(new THREE.CylinderGeometry(52, 58, 30, 32), stone, 0, 5, 0, castle);
  for (let k = 0; k < 24; k++) {
    const a = k / 24 * Math.PI * 2;
    mesh(new THREE.BoxGeometry(5, 4, 4), stone, Math.cos(a) * 52, 22, Math.sin(a) * 52, castle).rotation.y = -a;
  }
  mesh(new THREE.CylinderGeometry(20, 22, 80, 24), stone, 0, 60, 0, castle);
  mesh(new THREE.ConeGeometry(26, 34, 24), roof, 0, 117, 0, castle);
  for (let k = 0; k < 4; k++) {
    const a = k / 4 * Math.PI * 2 + Math.PI / 4, x = Math.cos(a) * 36, z = Math.sin(a) * 36;
    mesh(new THREE.CylinderGeometry(8, 9, 56, 16), stone, x, 48, z, castle);
    mesh(new THREE.ConeGeometry(11, 20, 16), roof, x, 86, z, castle);
    for (let w = 0; w < 3; w++) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(2, 3.5, 0.5), gold);
      win.position.set(x + Math.cos(a) * 8.6, 35 + w * 12, z + Math.sin(a) * 8.6);
      win.rotation.y = -a + Math.PI / 2;
      castle.add(win);
    }
  }
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), new THREE.MeshBasicMaterial({ color: '#ffd23f', side: THREE.DoubleSide }));
  flag.position.set(5, 140, 0);
  castle.add(flag);
  mesh(new THREE.CylinderGeometry(0.4, 0.4, 16, 6), toon('#ffffff'), 0, 138, 0, castle);
  // 浮在天上的小島與雲
  const cloudM = new THREE.MeshLambertMaterial({ color: '#ffffff' });
  for (let k = 0; k < 26; k++) {
    const a = rand() * Math.PI * 2, r = 230 + rand() * 260;
    const g = new THREE.Group();
    g.position.set(Math.cos(a) * r, -10 + rand() * 80, Math.sin(a) * r);
    world.add(g);
    for (let j = 0; j < 5; j++) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), cloudM);
      c.position.set((j - 2) * 7, rand() * 3, rand() * 6);
      c.scale.setScalar(6 + rand() * 5);
      g.add(c);
    }
  }
  // 熱氣球
  const cols = ['#ff6b8b', '#ffd23f', '#7fd8ff', '#a8f0c4', '#c6a8ff'];
  for (let k = 0; k < 8; k++) {
    const a = rand() * Math.PI * 2, r = 220 + rand() * 200;
    const g = new THREE.Group();
    g.position.set(Math.cos(a) * r, 50 + rand() * 70, Math.sin(a) * r);
    world.add(g);
    mesh(new THREE.SphereGeometry(9, 16, 12), toon(cols[k % 5]), 0, 10, 0, g).scale.y = 1.2;
    mesh(new THREE.BoxGeometry(4, 3, 4), toon('#a8743f'), 0, -3, 0, g);
  }
  // 彩虹
  const rb = ['#ff5f5f', '#ff9a3c', '#ffd23f', '#7be08b', '#4fa3ff', '#a07bff'];
  rb.forEach((col, k) => {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(150 - k * 5, 2.4, 6, 48, Math.PI), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.75, fog: false }));
    arc.position.set(-60, -10, -330);
    world.add(arc);
  });
}
