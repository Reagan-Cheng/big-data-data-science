// 安妮亞打怪獸 — 動畫圖像由 anime-art.js 繪製；保留原始 Canvas 圖作載入備援。
'use strict';

const OL = '#4a2e2b';           // 動畫風的深咖啡描邊
const GY = 460;                 // 地面高度（邏輯座標）
const TAU = Math.PI * 2;

// ---------- 基本畫筆 ----------
function fs(ctx, fill, lw = 2.4) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = OL; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
}
function circle(ctx, x, y, r, fill, lw) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); fs(ctx, fill, lw); }
function ellipse(ctx, x, y, rx, ry, fill, lw, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); fs(ctx, fill, lw); }
function rrPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
function rrect(ctx, x, y, w, h, r, fill, lw) { rrPath(ctx, x, y, w, h, r); fs(ctx, fill, lw); }
function limb(ctx, x1, y1, x2, y2, w, color) {
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.strokeStyle = OL; ctx.lineWidth = w + 4.6; ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
}
function starPath(ctx, x, y, r, inner = 0.45, n = 5, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const rr = i % 2 ? r * inner : r, a = rot + i * Math.PI / n;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}
function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.3, y + s * 0.1, x - s * 0.9, y - s * 0.9, x, y - s * 0.35);
  ctx.bezierCurveTo(x + s * 0.9, y - s * 0.9, x + s * 1.3, y + s * 0.1, x, y + s * 0.9);
  ctx.closePath();
}
function hash(i, k = 0) {
  let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(k + 7, 0xc2b2ae35);
  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const FONT = '"PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif';

// ---------- 姿勢 ----------
// 手腳角度：0 = 往下，正 = 往前，PI = 往上
function makePose(state, t, ext = 0) {
  const p = { state, time: t, ext, lf: 0, lb: 0, af: 0.25, ab: -0.2, bob: 0, punch: 0, lean: 0, expr: 'normal', kick: 0, weapon: false };
  switch (state) {
    case 'idle': p.bob = Math.sin(t * 4) * 0.8; p.af = 0.25 + Math.sin(t * 4) * 0.06; break;
    case 'run': {
      const s = Math.sin(t * 15);
      p.lf = s * 0.75; p.lb = -s * 0.75; p.af = -s * 0.9; p.ab = s * 0.9;
      p.bob = -Math.abs(Math.cos(t * 15)) * 2.2; p.lean = 3; break;
    }
    case 'jump': p.lf = 0.8; p.lb = -0.4; p.af = 2.5; p.ab = -0.9; p.bob = -2; break;
    case 'fall': p.lf = 0.35; p.lb = -0.25; p.af = 1.7; p.ab = 1.3; break;
    case 'punch': p.punch = ext; p.lf = 0.5; p.lb = -0.5; p.ab = -0.6; p.lean = 4; p.expr = 'shout'; break;
    case 'throw': p.af = -2.2 + ext * 4.0; p.lf = 0.35; p.lb = -0.35; p.lean = 2; p.expr = 'shout'; break;
    case 'kick': p.kick = ext; p.lf = 1.55 * ext; p.lb = -0.25; p.af = -0.6; p.ab = 0.8; p.lean = -3; p.expr = 'shout'; break;
    case 'slash': p.af = 2.6 - ext * 3.2; p.ab = -0.7; p.lf = 0.6; p.lb = -0.6; p.lean = 5; p.weapon = true; p.expr = 'shout'; break;
    case 'windup': p.af = -1.6; p.ab = -1.2; p.lf = 0.3; p.lb = -0.4; p.lean = -3; p.expr = 'shout'; break;
    case 'hurt': p.lf = -0.3; p.lb = 0.35; p.af = 2.6; p.ab = 2.2; p.lean = -5; p.expr = 'hurt'; break;
    case 'dizzy': p.lf = 0.2; p.lb = -0.2; p.af = 0.6 + Math.sin(t * 6) * 0.3; p.ab = -0.6; p.lean = Math.sin(t * 3) * 4; p.expr = 'dizzy'; break;
    case 'win': p.af = 2.9; p.ab = 2.7; p.bob = Math.sin(t * 10) * 2 - 2; p.expr = 'happy'; break;
    case 'super': p.af = 2.9; p.ab = 2.8; p.lf = 0.3; p.lb = -0.3; p.expr = 'shout'; break;
    case 'wave': p.af = 2.6 + Math.sin(t * 12) * 0.35; p.expr = 'happy'; break;
  }
  return p;
}

function skeleton(sp, po) {
  const hipY = -sp.leg + po.bob;
  const shY = hipY - sp.torso;
  const lean = po.lean;
  const J = { hipY, shY, lean, torso: sp.torso };
  J.hipF = [3, hipY]; J.hipB = [-3, hipY];
  const L = sp.leg;
  J.footF = [J.hipF[0] + Math.sin(po.lf) * L, hipY + Math.cos(po.lf) * L];
  J.footB = [J.hipB[0] + Math.sin(po.lb) * L, hipY + Math.cos(po.lb) * L];
  J.shF = [5 + lean, shY + 4]; J.shB = [-4 + lean, shY + 4];
  const A = sp.arm;
  if (po.punch > 0) {
    const e = po.punch;
    J.handF = [J.shF[0] + A * (0.4 + 1.1 * e), J.shF[1] - 1];
  } else {
    J.handF = [J.shF[0] + Math.sin(po.af) * A, J.shF[1] + Math.cos(po.af) * A];
  }
  J.handB = [J.shB[0] + Math.sin(po.ab) * A, J.shB[1] + Math.cos(po.ab) * A];
  J.head = [sp.headX + lean * 0.7, shY - sp.headR * 0.78];
  return J;
}

// ---------- 臉部零件 ----------
function animeEye(ctx, x, y, rx, ry, iris, irisDark, expr, starEye) {
  if (expr === 'hurt') {
    ctx.beginPath(); ctx.moveTo(x - rx, y - ry * 0.6); ctx.lineTo(x + rx * 0.6, y); ctx.lineTo(x - rx, y + ry * 0.6);
    fs(ctx, null, 2.6); return;
  }
  if (expr === 'happy') {
    ctx.beginPath(); ctx.arc(x, y + ry * 0.3, rx, Math.PI * 1.1, Math.PI * 1.9); fs(ctx, null, 2.8); return;
  }
  if (expr === 'dizzy') {
    ctx.beginPath();
    for (let a = 0; a < TAU * 1.6; a += 0.3) { const r = a / (TAU * 1.6) * rx; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    fs(ctx, null, 1.8); return;
  }
  ellipse(ctx, x, y, rx + 0.6, ry + 0.6, '#fff', 0);
  ellipse(ctx, x, y + 0.6, rx * 0.88, ry * 0.92, iris, 1.6);
  ellipse(ctx, x, y + ry * 0.25, rx * 0.6, ry * 0.55, irisDark, 0);
  if (starEye) { starPath(ctx, x, y + 0.6, rx * 0.62); fs(ctx, '#fff', 0); }
  else circle(ctx, x, y + 0.6, rx * 0.32, '#1d1d24', 0);
  circle(ctx, x - rx * 0.35, y - ry * 0.45, rx * 0.26, '#fff', 0);
  // 上睫毛
  ctx.beginPath(); ctx.ellipse(x, y + 0.6, rx * 0.95, ry * 0.98, 0, Math.PI * 1.08, Math.PI * 1.92);
  ctx.lineWidth = 2.6; ctx.strokeStyle = '#2b1d1f'; ctx.stroke();
}
function mouth(ctx, x, y, expr, size = 1) {
  if (expr === 'shout' || expr === 'hurt') {
    ellipse(ctx, x, y, 2.6 * size, 3 * size, '#b8424e', 1.6);
  } else if (expr === 'dizzy') {
    ctx.beginPath(); ctx.moveTo(x - 3 * size, y); ctx.quadraticCurveTo(x, y - 2, x + 3 * size, y + 1); fs(ctx, null, 1.6);
  } else {
    ctx.beginPath(); ctx.arc(x, y - 1.2 * size, 2.6 * size, 0.2, Math.PI - 0.2); fs(ctx, null, 1.6);
  }
}
function blush(ctx, x, y, r = 3.4) { ctx.globalAlpha *= 0.55; ellipse(ctx, x, y, r, r * 0.6, '#ff8fa3', 0); ctx.globalAlpha /= 0.55; }

// ---------- 安妮亞（運動造型） ----------
const ANYA = { leg: 15, torso: 19, headR: 19, headX: 2, arm: 13 };
function horn(ctx, x, y, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath(); ctx.moveTo(-7, 4); ctx.quadraticCurveTo(-3, -6, 1, -11); ctx.quadraticCurveTo(5, -4, 7, 4); ctx.closePath();
  fs(ctx, '#2b2427', 2);
  ctx.beginPath(); ctx.moveTo(-6.5, 3); ctx.quadraticCurveTo(0, 6.5, 6.5, 3);
  ctx.lineWidth = 3; ctx.strokeStyle = '#c9a24a'; ctx.stroke();
  ctx.restore();
}
function drawAnya(ctx, x, y, face, po, s = 1, flash = 0) {
  if (AnimeArt.drawActor(ctx, 'anya', x, y, face, po, s, flash)) return;
  ctx.save(); if (flash > 0) ctx.globalAlpha *= 0.5; ctx.translate(x, y); ctx.scale(face * s, s);
  const J = skeleton(ANYA, po);
  const skin = '#ffe6d6', shirt = '#63c7bf', shorts = '#ffe16a', hair = '#f8aabb';
  // 後手、後腳
  limb(ctx, ...J.shB, ...J.handB, 5.2, skin);
  limb(ctx, ...J.hipB, ...J.footB, 6, skin);
  ellipse(ctx, J.footB[0] + 2, J.footB[1] - 1, 5, 3, skin, 2);
  limb(ctx, ...J.hipF, ...J.footF, 6, skin);
  ellipse(ctx, J.footF[0] + 2, J.footF[1] - 1, 5, 3, skin, 2);
  // 短褲、T 恤
  rrect(ctx, -10 + J.lean * 0.3, J.hipY - 7, 20, 11, 4, shorts, 2.4);
  rrect(ctx, -11 + J.lean * 0.6, J.shY, 22, 17, 7, shirt, 2.4);
  ellipse(ctx, J.shB[0] - 1, J.shB[1] + 1, 5, 5, shirt, 2);
  // 前手
  if (po.punch > 0) {
    limb(ctx, ...J.shF, ...J.handF, 5.4, skin);
    circle(ctx, J.handF[0] + 1, J.handF[1], 5 + po.punch * 1.5, skin, 2.2);
    ctx.globalAlpha *= 0.5;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(J.handF[0] - 10 - i * 4, J.handF[1] - 6 + i * 6); ctx.lineTo(J.handF[0] - 20 - i * 4, J.handF[1] - 6 + i * 6); fs(ctx, null, 1.8); }
    ctx.globalAlpha /= 0.5;
  } else {
    limb(ctx, ...J.shF, ...J.handF, 5.2, skin);
    circle(ctx, J.handF[0], J.handF[1], 3.8, skin, 1.8);
  }
  ellipse(ctx, J.shF[0], J.shF[1] + 1, 5.5, 5.5, shirt, 2);
  // 頭
  const [hx, hy] = J.head;
  circle(ctx, hx - 15, hy - 9, 8, hair, 2.2);                     // 包包頭
  horn(ctx, hx - 11, hy - 17, -0.55);
  ellipse(ctx, hx - 1, hy - 1, 20, 19, hair, 2.4);                 // 後髮
  ellipse(ctx, hx + 3, hy + 2.5, 16.5, 15, skin, 2.2);             // 臉
  horn(ctx, hx + 11, hy - 18, 0.45);
  ctx.beginPath();                                                  // 瀏海
  ctx.arc(hx + 1, hy - 1, 19.5, Math.PI * 0.98, Math.PI * 2.02);
  const bang = [[19, 3], [15, -4], [12, 1], [7, -6], [3, -1], [-2, -7], [-6, -2], [-11, -7], [-14, 2], [-18, 5]];
  for (const [bx, by] of bang) ctx.lineTo(hx + bx, hy + by);
  ctx.closePath(); fs(ctx, hair, 2.2);
  ctx.beginPath(); ctx.moveTo(hx + 17, hy); ctx.quadraticCurveTo(hx + 21, hy + 8, hx + 16, hy + 14); ctx.lineTo(hx + 14, hy + 4); ctx.closePath(); fs(ctx, hair, 2);
  ctx.beginPath(); ctx.moveTo(hx + 1, hy - 20); ctx.quadraticCurveTo(hx + 4, hy - 28, hx + 9, hy - 25); fs(ctx, null, 2.4); // 呆毛
  ctx.globalAlpha *= 0.6; ellipse(ctx, hx - 3, hy - 13, 6, 2, '#fff', 0, -0.3); ctx.globalAlpha /= 0.6;
  // 眼、嘴
  animeEye(ctx, hx + 10, hy + 4, 4.6, 6, '#3dbb93', '#1f8466', po.expr, true);
  animeEye(ctx, hx - 1.5, hy + 4, 4, 5.8, '#3dbb93', '#1f8466', po.expr, true);
  blush(ctx, hx + 13, hy + 11); blush(ctx, hx - 5, hy + 11, 3);
  mouth(ctx, hx + 6, hy + 12, po.expr);
  ctx.restore();
}

// ---------- 洛伊德（爸爸） ----------
const LOID = { leg: 27, torso: 25, headR: 16, headX: 2, arm: 22 };
function drawLoid(ctx, x, y, face, po, s = 1) {
  if (AnimeArt.drawActor(ctx, 'loid', x, y, face, po, s, 0)) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(face * s, s);
  const J = skeleton(LOID, po);
  const skin = '#ffe3d2', suit = '#80a07f', suitD = '#68876a', hair = '#f1d68c', glove = '#2c2a2e', shoe = '#4a3328';
  limb(ctx, ...J.shB, ...J.handB, 7, suitD); circle(ctx, ...J.handB, 4, glove, 1.6);
  limb(ctx, ...J.hipB, ...J.footB, 8, suitD); ellipse(ctx, J.footB[0] + 3, J.footB[1] - 1, 7, 3.5, shoe, 2);
  if (po.kick > 0) {
    const fx = J.hipF[0] + 30 * po.kick, fy = J.hipY + 6 - 8 * po.kick;
    limb(ctx, ...J.hipF, fx, fy, 8.5, suit); ellipse(ctx, fx + 4, fy, 7, 4, shoe, 2);
  } else { limb(ctx, ...J.hipF, ...J.footF, 8, suit); ellipse(ctx, J.footF[0] + 3, J.footF[1] - 1, 7, 3.5, shoe, 2); }
  // 西裝外套
  const lx = J.lean * 0.6;
  rrect(ctx, -12 + lx, J.shY, 24, J.torso + 6, 6, suit, 2.4);
  ctx.beginPath(); ctx.moveTo(lx - 1, J.shY + 1); ctx.lineTo(lx + 6, J.shY + 1); ctx.lineTo(lx + 2, J.shY + 13); ctx.closePath(); fs(ctx, '#fff', 1.6);
  ctx.beginPath(); ctx.moveTo(lx + 2, J.shY + 3); ctx.lineTo(lx + 4, J.shY + 3); ctx.lineTo(lx + 3.5, J.shY + 14); ctx.lineTo(lx + 2, J.shY + 12); ctx.closePath(); fs(ctx, '#c8343c', 1);
  ctx.beginPath(); ctx.moveTo(lx + 2, J.shY + 13); ctx.lineTo(lx + 2, J.shY + J.torso + 4); fs(ctx, null, 1.4);
  circle(ctx, lx + 5, J.shY + 18, 1.2, OL, 0); circle(ctx, lx + 5, J.shY + 23, 1.2, OL, 0);
  if (po.punch > 0) { limb(ctx, ...J.shF, ...J.handF, 7.4, suit); circle(ctx, J.handF[0] + 1, J.handF[1], 5.5, glove, 2); }
  else { limb(ctx, ...J.shF, ...J.handF, 7, suit); circle(ctx, ...J.handF, 4.2, glove, 1.6); }
  // 頭
  const [hx, hy] = J.head;
  ellipse(ctx, hx - 2, hy - 2, 15, 15.5, hair, 2.2);
  ellipse(ctx, hx + 2, hy + 2, 12.5, 14, skin, 2.2);
  ctx.beginPath(); ctx.arc(hx, hy - 1, 15.5, Math.PI * 0.95, Math.PI * 1.98);
  const bang = [[15, 1], [12, -6], [8, -3], [4, -9], [-1, -6], [-6, -9], [-10, -2], [-14, 6]];
  for (const [bx, by] of bang) ctx.lineTo(hx + bx, hy + by);
  ctx.closePath(); fs(ctx, hair, 2.2);
  ctx.beginPath(); ctx.moveTo(hx + 13, hy - 3); ctx.quadraticCurveTo(hx + 18, hy + 2, hx + 13, hy + 9); fs(ctx, hair, 1.8);
  const ex = po.expr === 'shout' ? 'normal' : po.expr;
  animeEye(ctx, hx + 8, hy + 3, 2.4, 3.2, '#6fb6c6', '#3f8090', ex, false);
  animeEye(ctx, hx - 1, hy + 3, 2.1, 3, '#6fb6c6', '#3f8090', ex, false);
  ctx.beginPath(); ctx.moveTo(hx + 5, hy - 2.5); ctx.lineTo(hx + 11, hy - 3); ctx.moveTo(hx - 3.5, hy - 2.5); ctx.lineTo(hx + 1.5, hy - 2.5); fs(ctx, null, 1.6);
  mouth(ctx, hx + 5, hy + 10, po.expr === 'shout' ? 'normal' : po.expr, 0.8);
  ctx.restore();
}

// ---------- 約兒（媽媽，荊棘公主） ----------
const YOR = { leg: 27, torso: 22, headR: 16, headX: 2, arm: 21 };
function stiletto(ctx, x, y, ang) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(22, 0); ctx.lineWidth = 2.6; ctx.strokeStyle = '#d9b44a'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-5, -3); ctx.lineTo(-5, 3); ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}
function drawYor(ctx, x, y, face, po, s = 1) {
  if (AnimeArt.drawActor(ctx, 'yor', x, y, face, po, s, 0)) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(face * s, s);
  const J = skeleton(YOR, po);
  const skin = '#fdeee6', dress = '#2a2329', boot = '#1d181d', hair = '#2b2a36', gold = '#d6b24c';
  const [hx, hy] = J.head;
  // 長髮（背後）
  rrect(ctx, hx - 17, hy - 6, 22, J.hipY - hy + 4, 9, hair, 2.2);
  limb(ctx, ...J.shB, ...J.handB, 5.4, skin); circle(ctx, ...J.handB, 3.6, boot, 1.4);
  limb(ctx, ...J.hipB, ...J.footB, 7, boot);
  if (po.kick > 0) {
    const fx = J.hipF[0] + 30 * po.kick, fy = J.hipY + 6 - 10 * po.kick;
    limb(ctx, ...J.hipF, fx, fy, 7.4, boot);
  } else limb(ctx, ...J.hipF, ...J.footF, 7, boot);
  // 洋裝：裙擺（紅色內裡）
  const lx = J.lean * 0.5;
  ctx.beginPath(); ctx.moveTo(lx - 9, J.hipY - 6); ctx.lineTo(lx - 22, J.hipY + 10); ctx.lineTo(lx - 6, J.hipY + 8); ctx.closePath(); fs(ctx, '#b3263a', 2);
  ctx.beginPath(); ctx.moveTo(lx - 10, J.hipY - 8); ctx.lineTo(lx + 10, J.hipY - 8); ctx.lineTo(lx + 15, J.hipY + 8); ctx.lineTo(lx - 14, J.hipY + 9); ctx.closePath(); fs(ctx, dress, 2.2);
  rrect(ctx, -10 + lx, J.shY + 2, 20, J.torso, 6, dress, 2.2);
  ctx.beginPath(); ctx.moveTo(lx - 9, J.shY + 4); ctx.quadraticCurveTo(lx, J.shY - 3, lx + 9, J.shY + 4); ctx.lineTo(lx + 9, J.shY + 2); ctx.quadraticCurveTo(lx, J.shY - 6, lx - 9, J.shY + 2); ctx.closePath(); fs(ctx, skin, 0);
  limb(ctx, ...J.shF, ...J.handF, 5.4, skin);
  circle(ctx, ...J.handF, 3.8, boot, 1.4);
  if (po.weapon || po.punch > 0) {
    stiletto(ctx, J.handF[0], J.handF[1], po.punch > 0 ? 0 : Math.PI / 2 - po.af * 0.8 - 0.6);
    stiletto(ctx, J.handB[0], J.handB[1], 0.4);
  }
  // 頭
  ellipse(ctx, hx - 1, hy - 1, 16, 16, hair, 2.2);
  ellipse(ctx, hx + 2, hy + 2.5, 12.5, 13.5, skin, 2.2);
  ctx.beginPath(); ctx.arc(hx, hy - 1, 16, Math.PI * 0.95, Math.PI * 2.0);
  const bang = [[16, 3], [13, -2], [9, 1], [5, -3], [1, 1], [-4, -3], [-8, 0], [-13, 5]];
  for (const [bx, by] of bang) ctx.lineTo(hx + bx, hy + by);
  ctx.closePath(); fs(ctx, hair, 2.2);
  rrect(ctx, hx + 11, hy - 2, 6, 26, 3, hair, 1.8);                 // 側邊長髮
  rrect(ctx, hx + 10.5, hy + 10, 7, 4, 1.5, gold, 1.4);
  // 金色髮飾
  ctx.save(); ctx.translate(hx - 6, hy - 15); ctx.rotate(-0.4);
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; ellipse(ctx, Math.cos(a) * 3.2, Math.sin(a) * 3.2, 3, 2.2, gold, 1.2, a); }
  circle(ctx, 0, 0, 2.2, '#f2d77c', 1);
  ctx.beginPath(); ctx.moveTo(3, -2); ctx.lineTo(13, -9); ctx.moveTo(3, 1); ctx.lineTo(14, -4); ctx.lineWidth = 2; ctx.strokeStyle = gold; ctx.stroke();
  ctx.restore();
  const ex = po.expr === 'shout' ? 'normal' : po.expr;
  animeEye(ctx, hx + 8, hy + 4, 3.2, 4.2, '#c23648', '#7d1f2c', ex, false);
  animeEye(ctx, hx - 1, hy + 4, 2.9, 4, '#c23648', '#7d1f2c', ex, false);
  blush(ctx, hx + 10, hy + 9, 2.6);
  mouth(ctx, hx + 5, hy + 11, po.expr === 'shout' ? 'normal' : po.expr, 0.8);
  ctx.restore();
}

// ---------- 彭德（狗狗） ----------
function drawBond(ctx, x, y, face, state, t, s = 1) {
  if (AnimeArt.drawActor(ctx, 'bond', x, y, face, { state, time: t }, s)) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(face * s, s);
  const run = state === 'run' || state === 'dash';
  const k = run ? Math.sin(t * 16) : 0;
  const bob = run ? -Math.abs(Math.cos(t * 16)) * 3 : Math.sin(t * 3) * 0.6;
  const fur = '#f8f4ea', furD = '#e6dfd0', paw = '#5d5252';
  ctx.translate(0, bob);
  // 尾巴
  ctx.beginPath(); ctx.moveTo(-26, -34); ctx.quadraticCurveTo(-46, -44 + k * 4, -36, -62 + k * 3); ctx.quadraticCurveTo(-28, -48, -20, -40); ctx.closePath(); fs(ctx, fur, 2.2);
  // 後腳
  const legs = [[-18, k], [-8, -k], [12, -k], [22, k]];
  legs.forEach(([lx, ph], i) => {
    const sw = ph * 6;
    limb(ctx, lx, -18, lx + sw, -4, 8, i % 2 ? furD : fur);
    ellipse(ctx, lx + sw + 1, -3, 6, 4, paw, 2);
  });
  // 身體（毛茸茸）
  ctx.beginPath();
  for (let i = 0; i < 14; i++) {
    const a0 = i / 14 * TAU, a1 = (i + 1) / 14 * TAU, am = (a0 + a1) / 2;
    if (i === 0) ctx.moveTo(Math.cos(a0) * 31, -27 + Math.sin(a0) * 19);
    ctx.quadraticCurveTo(Math.cos(am) * 36, -27 + Math.sin(am) * 23, Math.cos(a1) * 31, -27 + Math.sin(a1) * 19);
  }
  ctx.closePath(); fs(ctx, fur, 2.4);
  ctx.globalAlpha *= 0.5; ellipse(ctx, -4, -20, 22, 8, furD, 0); ctx.globalAlpha /= 0.5;
  // 頭
  const hx = 27, hy = -44;
  ellipse(ctx, hx - 9, hy + 2, 7, 11, furD, 2, 0.4);                 // 耳朵
  circle(ctx, hx, hy, 17, fur, 2.4);
  ellipse(ctx, hx + 11, hy + 6, 10, 7.5, fur, 2.2);
  circle(ctx, hx + 19, hy + 3, 3.6, '#2a2324', 1.4);
  circle(ctx, hx + 6, hy - 4, 2.4, '#2a2324', 0);
  circle(ctx, hx + 5.4, hy - 4.8, 0.8, '#fff', 0);
  if (run || state === 'happy') { ellipse(ctx, hx + 11, hy + 14, 3.5, 5, '#f07d8c', 1.6); }
  ctx.beginPath(); ctx.moveTo(hx + 6, hy + 11); ctx.quadraticCurveTo(hx + 11, hy + 14, hx + 17, hy + 10); fs(ctx, null, 1.6);
  // 黑領結
  ctx.beginPath(); ctx.moveTo(hx - 6, hy + 14); ctx.lineTo(hx - 13, hy + 9); ctx.lineTo(hx - 13, hy + 20); ctx.closePath();
  ctx.moveTo(hx - 6, hy + 14); ctx.lineTo(hx + 1, hy + 9); ctx.lineTo(hx + 1, hy + 20); ctx.closePath(); fs(ctx, '#222', 1.6);
  circle(ctx, hx - 6, hy + 14, 2.4, '#222', 1.2);
  ctx.restore();
}

// ---------- 壞人（共用的 Q 版人形） ----------
// st: { coat, pants, skin, hair, hat, hatColor, mask, glasses, armband, scarf, nose, tool, s }
const GUY = { leg: 20, torso: 21, headR: 15, headX: 1, arm: 16 };
function drawGuy(ctx, x, y, face, po, st, flash = 0) {
  const kind = Object.keys(STYLES).find(key => STYLES[key] === st);
  if (AnimeArt.drawEnemy(ctx, kind, x, y, face, po, st.s || 1, flash)) return;
  const s = st.s || 1;
  ctx.save(); if (flash > 0) ctx.globalAlpha *= 0.5; ctx.translate(x, y); ctx.scale(face * s, s);
  const J = skeleton(GUY, po);
  const skin = st.skin || '#f3d3bd';
  if (st.cape) { ctx.beginPath(); ctx.moveTo(-8, J.shY + 2); ctx.quadraticCurveTo(-26 - Math.sin(po.bob + J.lean) * 3, J.hipY, -20, J.hipY + 14); ctx.lineTo(4, J.hipY + 6); ctx.closePath(); fs(ctx, st.cape, 2.2); }
  limb(ctx, ...J.shB, ...J.handB, 6, st.coatD || st.coat); circle(ctx, ...J.handB, 3.8, st.glove || skin, 1.6);
  limb(ctx, ...J.hipB, ...J.footB, 7, st.pantsD || st.pants); ellipse(ctx, J.footB[0] + 3, J.footB[1] - 1, 6, 3.4, '#2e2422', 2);
  if (po.kick > 0) {
    const fx = J.hipF[0] + 22 * po.kick, fy = J.hipY + 4 - 6 * po.kick;
    limb(ctx, ...J.hipF, fx, fy, 7.4, st.pants); ellipse(ctx, fx + 4, fy, 6, 3.6, '#2e2422', 2);
  } else { limb(ctx, ...J.hipF, ...J.footF, 7, st.pants); ellipse(ctx, J.footF[0] + 3, J.footF[1] - 1, 6, 3.4, '#2e2422', 2); }
  const lx = J.lean * 0.6;
  rrect(ctx, -12 + lx, J.shY, 24, J.torso + (st.longCoat ? 12 : 5), 6, st.coat, 2.4);
  if (st.tie) { ctx.beginPath(); ctx.moveTo(lx + 1, J.shY + 1); ctx.lineTo(lx + 4, J.shY + 1); ctx.lineTo(lx + 3.5, J.shY + 13); ctx.lineTo(lx + 1.5, J.shY + 13); ctx.closePath(); fs(ctx, st.tie, 1.2); }
  if (st.scarf) { rrect(ctx, lx - 9, J.shY - 2, 18, 6, 3, st.scarf, 1.8); rrect(ctx, lx - 8, J.shY + 2, 5, 12, 2, st.scarf, 1.6); }
  if (st.armband) rrect(ctx, J.shF[0] - 4, J.shF[1] + 2, 8, 5, 1.5, st.armband, 1.4);
  if (po.punch > 0) { limb(ctx, ...J.shF, ...J.handF, 6.4, st.coat); circle(ctx, J.handF[0] + 1, J.handF[1], 5, st.glove || skin, 2); }
  else { limb(ctx, ...J.shF, ...J.handF, 6, st.coat); circle(ctx, ...J.handF, 3.8, st.glove || skin, 1.6); }
  // 手上的道具
  const [tx, ty] = J.handF;
  if (st.tool === 'knife') { ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + 13, ty - 5); ctx.lineWidth = 3; ctx.strokeStyle = '#cfd6dc'; ctx.stroke(); }
  else if (st.tool === 'remote') { rrect(ctx, tx - 3, ty - 9, 7, 11, 2, '#555', 1.6); circle(ctx, tx + 0.5, ty - 6, 1.8, '#e33', 0); }
  else if (st.tool === 'mega') {
    ctx.beginPath(); ctx.moveTo(tx - 2, ty - 3); ctx.lineTo(tx + 16, ty - 10); ctx.lineTo(tx + 16, ty + 8); ctx.lineTo(tx - 2, ty + 3); ctx.closePath(); fs(ctx, '#f1e3c6', 2);
    ellipse(ctx, tx + 16, ty - 1, 3, 9, '#c9b38c', 1.8);
  } else if (st.tool === 'stick') { ctx.beginPath(); ctx.moveTo(tx - 3, ty + 6); ctx.lineTo(tx + 8, ty - 16); ctx.lineWidth = 4; ctx.strokeStyle = '#8a5a35'; ctx.stroke(); }
  // 頭
  const [hx, hy] = J.head;
  ellipse(ctx, hx - 1, hy - 1, 14.5, 14.5, st.hair, 2.2);
  ellipse(ctx, hx + 2, hy + 2, 12, 13, skin, 2.2);
  if (!st.hat) {
    ctx.beginPath(); ctx.arc(hx, hy - 1, 14.5, Math.PI * 0.95, Math.PI * 2.0);
    for (const [bx, by] of [[14, 2], [10, -5], [6, -1], [1, -6], [-4, -2], [-9, -6], [-13, 4]]) ctx.lineTo(hx + bx, hy + by);
    ctx.closePath(); fs(ctx, st.hair, 2.2);
  }
  const ex = po.expr === 'happy' ? 'normal' : po.expr;
  if (st.mask === 'eye') {
    rrect(ctx, hx - 5, hy - 1, 20, 8, 4, '#1c1a1e', 1.6);
    circle(ctx, hx + 9, hy + 3, 1.8, '#fff', 0); circle(ctx, hx + 1, hy + 3, 1.6, '#fff', 0);
  } else if (ex === 'dizzy' || ex === 'hurt') {
    animeEye(ctx, hx + 8, hy + 3, 2.8, 3.2, '#333', '#111', ex, false);
    animeEye(ctx, hx, hy + 3, 2.6, 3.2, '#333', '#111', ex, false);
  } else {
    // 壞人的吊梢眼
    ctx.beginPath(); ctx.moveTo(hx + 4, hy + 1); ctx.lineTo(hx + 12, hy + 3); ctx.lineTo(hx + 5, hy + 5); ctx.closePath(); fs(ctx, '#2a1d1f', 0);
    ctx.beginPath(); ctx.moveTo(hx - 4, hy + 2); ctx.lineTo(hx + 2, hy + 1); ctx.lineTo(hx + 1, hy + 5); ctx.closePath(); fs(ctx, '#2a1d1f', 0);
    ctx.beginPath(); ctx.moveTo(hx + 3, hy - 3); ctx.lineTo(hx + 12, hy); ctx.moveTo(hx - 5, hy - 1); ctx.lineTo(hx + 1, hy - 3); fs(ctx, null, 2);
  }
  if (st.glasses === 'round') { circle(ctx, hx + 8, hy + 3, 4.5, null, 1.8); circle(ctx, hx - 0.5, hy + 3, 4.2, null, 1.8); }
  if (st.glasses === 'sun') { rrect(ctx, hx - 5, hy, 19, 6, 3, '#151417', 1.4); }
  if (st.nose) { ctx.beginPath(); ctx.moveTo(hx + 12, hy + 3); ctx.lineTo(hx + 21, hy + 8); ctx.lineTo(hx + 12, hy + 9); ctx.closePath(); fs(ctx, skin, 1.8); }
  if (st.mustache) { ctx.beginPath(); ctx.moveTo(hx + 3, hy + 10); ctx.quadraticCurveTo(hx + 8, hy + 7, hx + 14, hy + 11); ctx.quadraticCurveTo(hx + 8, hy + 10, hx + 3, hy + 10); fs(ctx, '#2a1d1f', 1); }
  if (st.mask === 'bandana') {
    ctx.beginPath(); ctx.moveTo(hx - 10, hy + 6); ctx.lineTo(hx + 14, hy + 5); ctx.lineTo(hx + 12, hy + 14); ctx.quadraticCurveTo(hx + 2, hy + 18, hx - 8, hy + 12); ctx.closePath(); fs(ctx, st.maskColor || '#4b5a6b', 2);
  } else if (!st.mustache) mouth(ctx, hx + 6, hy + 11, po.expr === 'shout' ? 'shout' : 'dizzy', 0.8);
  // 帽子
  if (st.hat === 'cap') { ctx.beginPath(); ctx.arc(hx, hy - 3, 14, Math.PI, TAU); ctx.closePath(); fs(ctx, st.hatColor, 2.2); rrect(ctx, hx + 4, hy - 5, 16, 4, 2, st.hatColor, 2); }
  if (st.hat === 'beret') { ellipse(ctx, hx - 1, hy - 10, 16, 7, st.hatColor, 2.2, -0.15); circle(ctx, hx - 1, hy - 17, 2, st.hatColor, 1.4); if (st.badge) { starPath(ctx, hx + 5, hy - 10, 3.6); fs(ctx, '#ffd54a', 1); } }
  if (st.hat === 'fedora') {
    ellipse(ctx, hx, hy - 8, 21, 4.5, st.hatColor, 2.2);
    rrect(ctx, hx - 11, hy - 22, 22, 15, 6, st.hatColor, 2.2);
    rrect(ctx, hx - 11, hy - 12, 22, 4, 1, st.band || '#b3263a', 1.2);
  }
  ctx.restore();
}

const STYLES = {
  goon:    { coat: '#7b6a58', coatD: '#665747', pants: '#4e4a52', hair: '#4a3a30', hat: 'cap', hatColor: '#4f5b66', mask: 'bandana', maskColor: '#5b6b7c' },
  thrower1:{ coat: '#8a7a5c', coatD: '#73654b', pants: '#4e4a52', hair: '#3a2e28', hat: 'cap', hatColor: '#6b5a48', mask: 'bandana', maskColor: '#7a6046' },
  redgoon: { coat: '#5d5a63', coatD: '#4a474f', pants: '#3a3840', hair: '#2e2626', hat: 'beret', hatColor: '#c3343f', armband: '#c3343f', mask: 'bandana', maskColor: '#c3343f', tool: 'stick' },
  thrower2:{ coat: '#6a6070', coatD: '#57505c', pants: '#3a3840', hair: '#4a3020', hat: 'beret', hatColor: '#c3343f', armband: '#c3343f', mask: 'bandana', maskColor: '#a42c35' },
  assassin:{ coat: '#2d2b33', coatD: '#22212a', pants: '#26252c', hair: '#1b1b1f', hat: 'fedora', hatColor: '#25242a', band: '#555', glasses: 'sun', tie: '#7a1f2b', tool: 'knife', glove: '#1c1b20' },
  knifer:  { coat: '#3b3542', coatD: '#2e2934', pants: '#26252c', hair: '#3a2a22', hat: 'fedora', hatColor: '#3a3440', band: '#7a1f2b', glasses: 'sun', tie: '#2a2a2a', tool: 'knife', glove: '#1c1b20' },
  keith:   { coat: '#7a5a3e', coatD: '#634832', pants: '#3f3b40', hair: '#2b2220', glasses: 'round', scarf: '#9e2f35', longCoat: true, tool: 'remote', s: 1.55 },
  circus:  { coat: '#b52d38', coatD: '#92232c', pants: '#2f2c33', hair: '#1f1a1a', hat: 'beret', hatColor: '#1f1d22', badge: true, mask: 'eye', armband: '#1f1d22', longCoat: true, tool: 'mega', cape: '#3a1e24', s: 1.6 },
  killer:  { coat: '#24222a', coatD: '#1a1920', pants: '#1f1e24', hair: '#1a1a1e', hat: 'fedora', hatColor: '#1c1b21', band: '#b3263a', nose: true, mustache: true, scarf: '#b3263a', longCoat: true, tool: 'knife', glove: '#141317', cape: '#141317', s: 1.6 },
};

// ---------- 小怪：機器炸彈狗、烏鴉、紙飛機、海鷗 ----------
function drawBombDog(ctx, x, y, face, t, fuse, flash) {
  if (AnimeArt.drawEnemy(ctx, 'bombdog', x, y, face, { state: 'run', time: t }, 1, flash)) {
    const bx = x - face * 4;
    circle(ctx, bx, y - 33, 7, fuse > 0 && Math.sin(t * 40) > 0 ? '#c33' : '#2a2a2e', 1.5);
    ctx.beginPath(); ctx.moveTo(bx, y - 40); ctx.quadraticCurveTo(bx + 6, y - 46, bx + 2, y - 49); fs(ctx, null, 1.4);
    circle(ctx, bx + 2, y - 49, 2 + Math.sin(t * 30) * 0.6, '#ffb02e', 0);
    return;
  }
  ctx.save(); if (flash > 0) ctx.globalAlpha *= 0.5; ctx.translate(x, y); ctx.scale(face, 1);
  const k = Math.sin(t * 22);
  [[-12, k], [-5, -k], [6, -k], [13, k]].forEach(([lx, ph]) => limb(ctx, lx, -10, lx + ph * 4, -2, 4, '#7d8790'));
  rrect(ctx, -18, -26, 34, 18, 7, '#a7b1b9', 2.2);
  for (let i = -12; i < 14; i += 7) { ctx.beginPath(); ctx.moveTo(i, -24); ctx.lineTo(i, -10); fs(ctx, null, 1); }
  rrect(ctx, 10, -36, 18, 15, 5, '#a7b1b9', 2.2);
  ctx.beginPath(); ctx.moveTo(12, -35); ctx.lineTo(13, -44); ctx.lineTo(18, -36); fs(ctx, '#7d8790', 1.8);
  circle(ctx, 22, -30, 2.6, fuse > 0 && Math.sin(t * 40) > 0 ? '#ff4040' : '#ffd84a', 1.2);
  circle(ctx, 28, -26, 2, '#333', 0);
  circle(ctx, -4, -32, 9, fuse > 0 && Math.sin(t * 40) > 0 ? '#c33' : '#2a2a2e', 2);   // 背上的炸彈
  ctx.beginPath(); ctx.moveTo(-1, -40); ctx.quadraticCurveTo(3, -46, 0, -50); fs(ctx, null, 1.6);
  circle(ctx, 0, -50, 2.4 + Math.sin(t * 30) * 0.8, '#ffb02e', 0);
  ctx.beginPath(); ctx.moveTo(-18, -20); ctx.lineTo(-26, -26 + k * 3); fs(ctx, null, 2.4);
  ctx.restore();
}
function drawBird(ctx, x, y, face, t, kind, flash) {
  if (kind !== 'plane') {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.85 + Math.sin(t * 14) * 0.15);
    const drawn = AnimeArt.drawEnemy(ctx, kind, 0, 14, face, { state: 'idle', time: t }, 1, flash);
    ctx.restore();
    if (drawn) return;
  }
  ctx.save(); if (flash > 0) ctx.globalAlpha *= 0.5; ctx.translate(x, y); ctx.scale(face, 1);
  if (kind === 'plane') {
    const w = Math.sin(t * 6) * 2;
    ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(-18, -12 - w); ctx.lineTo(-10, 0); ctx.lineTo(-18, 10 + w); ctx.closePath(); fs(ctx, '#f6f2e6', 2);
    ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(-10, 0); fs(ctx, null, 1.4);
    circle(ctx, 6, -3, 1.8, '#222', 0); circle(ctx, 12, -3, 1.6, '#222', 0);
    ctx.beginPath(); ctx.moveTo(4, -7); ctx.lineTo(9, -5); ctx.moveTo(14, -7); ctx.lineTo(10, -5); fs(ctx, null, 1.4);
  } else {
    const gull = kind === 'gull';
    const body = gull ? '#f4f4f0' : '#3a3540', wing = gull ? '#b9c3cc' : '#2a2630';
    const w = Math.sin(t * 14) * 12;
    ctx.beginPath(); ctx.moveTo(-4, -2); ctx.quadraticCurveTo(-12, -14 - w, -24, -8 - w); ctx.quadraticCurveTo(-12, -4, -4, 4); fs(ctx, wing, 2);
    ellipse(ctx, 0, 0, 14, 9, body, 2.2);
    circle(ctx, 11, -5, 7, body, 2.2);
    ctx.beginPath(); ctx.moveTo(16, -6); ctx.lineTo(25, -3); ctx.lineTo(16, -1); ctx.closePath(); fs(ctx, '#f3b23a', 1.6);
    circle(ctx, 12, -7, 1.8, gull ? '#222' : '#ffd84a', 0);
    ctx.beginPath(); ctx.moveTo(9, -11); ctx.lineTo(15, -9); fs(ctx, null, 1.6);
    ctx.beginPath(); ctx.moveTo(4, -2); ctx.quadraticCurveTo(-4, -16 + w, -16, -14 + w); ctx.quadraticCurveTo(-6, -6, 2, 4); fs(ctx, wing, 2);
  }
  ctx.restore();
}

// ---------- 道具 ----------
function drawPeanut(ctx, x, y, s = 1, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.beginPath(); ctx.ellipse(0, -5, 5.5, 6, 0, Math.PI * 0.9, Math.PI * 2.1); ctx.ellipse(0, 5, 6, 6.5, 0, -Math.PI * 0.1, Math.PI * 1.1); ctx.closePath();
  fs(ctx, '#e7bf7f', 1.8);
  ctx.fillStyle = '#c99a58';
  for (const [a, b] of [[-2, -6], [2, -3], [-2, 3], [2, 6], [0, 0]]) { ctx.beginPath(); ctx.arc(a, b, 0.9, 0, TAU); ctx.fill(); }
  ctx.restore();
}
function drawItem(ctx, it, t) {
  const y = it.y - 12 + Math.sin(t * 4 + it.x) * 3;
  if (it.kind === 'peanut') drawPeanut(ctx, it.x, y, 1, Math.sin(t * 3 + it.x) * 0.4);
  else if (it.kind === 'bag') {
    rrect(ctx, it.x - 11, y - 12, 22, 24, 6, '#e8d3a8', 2.2);
    ctx.beginPath(); ctx.moveTo(it.x - 9, y - 10); ctx.lineTo(it.x + 9, y - 10); fs(ctx, null, 2);
    drawPeanut(ctx, it.x, y + 2, 0.8, 0.5);
  } else if (it.kind === 'heart') {
    heartPath(ctx, it.x, y, 11); fs(ctx, '#ff5d7a', 2.4);
    ctx.globalAlpha = 0.7; ellipse(ctx, it.x - 4, y - 4, 3, 2, '#fff', 0); ctx.globalAlpha = 1;
  } else if (it.kind === 'star') {
    starPath(ctx, it.x, y, 13, 0.5, 5, -Math.PI / 2 + t * 2); fs(ctx, '#ffd84a', 2.4);
    circle(ctx, it.x - 3, y - 2, 1.4, OL, 0); circle(ctx, it.x + 3, y - 2, 1.4, OL, 0);
  }
}
function drawCrate(ctx, c, theme) {
  const x = c.x - c.w / 2, y = c.y - c.h;
  const col = theme === 'ship' ? '#b98b5a' : theme === 'school' ? '#c7a26e' : '#b88a57';
  rrect(ctx, x, y, c.w, c.h, 4, col, 2.4);
  ctx.beginPath(); ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + c.w - 4, y + c.h - 4); ctx.moveTo(x + c.w - 4, y + 4); ctx.lineTo(x + 4, y + c.h - 4); fs(ctx, null, 2);
  rrect(ctx, x + c.w / 2 - 11, y + c.h / 2 - 11, 22, 22, 11, '#fff6e2', 2);
  drawPeanut(ctx, c.x, y + c.h / 2, 0.75, 0.6);
  if (c.flash > 0) { ctx.globalAlpha = c.flash; rrect(ctx, x, y, c.w, c.h, 4, '#fff', 0); ctx.globalAlpha = 1; }
}
function drawPlatform(ctx, p, theme) {
  if (theme === 'city') {
    // 遮陽棚
    const n = Math.max(3, Math.round(p.w / 26)), sw = p.w / n;
    for (let i = 0; i < n; i++) {
      ctx.beginPath(); ctx.moveTo(p.x + i * sw, p.y); ctx.lineTo(p.x + (i + 1) * sw, p.y);
      ctx.lineTo(p.x + (i + 1) * sw, p.y + 14); ctx.quadraticCurveTo(p.x + (i + 0.5) * sw, p.y + 22, p.x + i * sw, p.y + 14); ctx.closePath();
      fs(ctx, i % 2 ? '#f4efe2' : '#5f8f74', 0);
    }
    rrPath(ctx, p.x, p.y - 4, p.w, 8, 3); fs(ctx, '#4d5b52', 2);
    ctx.beginPath(); ctx.rect(p.x, p.y, p.w, 16); fs(ctx, null, 2);
  } else if (theme === 'school') {
    rrect(ctx, p.x, p.y - 6, p.w, 18, 4, '#e3d3ae', 2.4);
    for (let i = p.x + 12; i < p.x + p.w - 6; i += 22) { ctx.beginPath(); ctx.arc(i, p.y + 12, 6, 0, Math.PI); fs(ctx, '#cdbb92', 1.8); }
    ctx.beginPath(); ctx.moveTo(p.x, p.y + 1); ctx.lineTo(p.x + p.w, p.y + 1); fs(ctx, null, 1.4);
  } else {
    // 救生艇
    ctx.beginPath(); ctx.moveTo(p.x, p.y - 4); ctx.lineTo(p.x + p.w, p.y - 4); ctx.quadraticCurveTo(p.x + p.w - 10, p.y + 22, p.x + p.w / 2, p.y + 22); ctx.quadraticCurveTo(p.x + 10, p.y + 22, p.x, p.y - 4); ctx.closePath(); fs(ctx, '#ef7d3c', 2.4);
    rrPath(ctx, p.x - 3, p.y - 7, p.w + 6, 7, 3); fs(ctx, '#f6f1e6', 2);
    ctx.beginPath(); ctx.moveTo(p.x + 8, p.y + 8); ctx.lineTo(p.x + p.w - 8, p.y + 8); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p.x + 14, p.y - 7); ctx.lineTo(p.x + 14, p.y - 60); ctx.moveTo(p.x + p.w - 14, p.y - 7); ctx.lineTo(p.x + p.w - 14, p.y - 60); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(74,46,43,.6)'; ctx.stroke();
  }
}

// ---------- 背景（原作風：柏林特的歐式街景、伊甸學園、豪華郵輪） ----------
const THEMES = {
  city: { sky: ['#bcd6df', '#e9e6d6'], far: '#b6c8cb', ground: '#9a9284', top: '#d2c8b6' },
  school: { sky: ['#b7d9ec', '#eef3e1'], far: '#b5cfa5', ground: '#d6c9ad', top: '#8dbd72' },
  ship: { sky: ['#8aa6cf', '#f6c79f'], far: '#7f95b5', ground: '#c99e6d', top: '#e7d3b1' },
  night: { sky: ['#1f2550', '#5a5d8c'], far: '#3a4470', ground: '#6e6a72', top: '#9a94a0' },
};
const CITY_WALLS = ['#e9dab9', '#cdb994', '#a9bc9e', '#d9ab8c', '#bfcac0', '#e5c9a3', '#c8d1c7', '#d8c3a9'];
const ROOFS = ['#5e6873', '#9c5a3d', '#596a62', '#7b4f42'];

function drawSky(ctx, th, W, t) {
  const T = THEMES[th];
  const g = ctx.createLinearGradient(0, 0, 0, GY);
  g.addColorStop(0, T.sky[0]); g.addColorStop(1, T.sky[1]);
  if (th === 'ship') { g.addColorStop(0.55, '#e7b9a0'); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, GY + 2);
  if (th === 'ship') {
    ctx.globalAlpha = 0.9; circle(ctx, W * 0.72, 250, 46, '#ffd9a0', 0); ctx.globalAlpha = 1;
  }
  if (th === 'night') {
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 60; i++) { ctx.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(t * 1.5 + i)); ctx.fillRect(hash(i, 21) * W, hash(i, 22) * 260, 2, 2); }
    ctx.globalAlpha = 0.25; circle(ctx, W * 0.78, 95, 58, '#fff6cf', 0);
    ctx.globalAlpha = 1; circle(ctx, W * 0.78, 95, 38, '#fff3c4', 0);
    circle(ctx, W * 0.78 - 10, 88, 6, '#efe2ad', 0); circle(ctx, W * 0.78 + 12, 104, 4, '#efe2ad', 0);
  }
}
function drawClouds(ctx, camX, W, th) {
  ctx.fillStyle = th === 'ship' ? 'rgba(255,226,200,.75)' : th === 'night' ? 'rgba(150,160,210,.25)' : 'rgba(255,255,255,.8)';
  const off = camX * 0.06, span = 520;
  for (let i = Math.floor(off / span) - 1; i < (off + W) / span + 1; i++) {
    const x = i * span - off + hash(i, 3) * 200, y = 50 + hash(i, 4) * 90, s = 0.7 + hash(i, 5) * 0.6;
    ctx.beginPath();
    ctx.ellipse(x, y, 50 * s, 16 * s, 0, 0, TAU); ctx.ellipse(x + 30 * s, y - 10 * s, 34 * s, 18 * s, 0, 0, TAU); ctx.ellipse(x - 28 * s, y - 4 * s, 26 * s, 13 * s, 0, 0, TAU);
    ctx.fill();
  }
}

// 夜晚關卡：把顏色混進深藍色
let NIGHT = false;
function nightMix(hex, k = 0.55) {
  if (!NIGHT) return hex;
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const m = (a, c) => Math.round(a * (1 - k) + c * k);
  return `rgb(${m(r, 34)},${m(g, 38)},${m(b, 82)})`;
}
function drawCityBuilding(ctx, x, w, h, i) {
  const base = GY - 6, top = base - h;
  const wall = nightMix(CITY_WALLS[Math.floor(hash(i, 1) * CITY_WALLS.length)]);
  const roof = nightMix(ROOFS[Math.floor(hash(i, 2) * ROOFS.length)]);
  const style = Math.floor(hash(i, 6) * 3);
  // 屋頂
  if (style === 0) { ctx.beginPath(); ctx.moveTo(x - 4, top); ctx.lineTo(x + w * 0.5, top - 46); ctx.lineTo(x + w + 4, top); ctx.closePath(); fs(ctx, roof, 2); }
  else if (style === 1) { ctx.beginPath(); ctx.moveTo(x - 4, top); ctx.lineTo(x + 14, top - 34); ctx.lineTo(x + w - 14, top - 34); ctx.lineTo(x + w + 4, top); ctx.closePath(); fs(ctx, roof, 2);
    for (let dx = x + 26; dx < x + w - 30; dx += 38) { rrect(ctx, dx, top - 26, 16, 20, 7, wall, 1.6); rrect(ctx, dx + 4, top - 20, 8, 12, 4, '#6d8496', 1.2); } }
  else { rrect(ctx, x - 5, top - 10, w + 10, 12, 2, nightMix('#efe6d2'), 2); }
  if (hash(i, 7) > 0.5) rrect(ctx, x + w * 0.7, top - (style === 2 ? 30 : 56), 12, 28, 2, '#8a6a58', 1.8);
  rrect(ctx, x, top, w, h + 8, 2, wall, 2.2);
  rrect(ctx, x - 3, top + 36, w + 6, 5, 1, 'rgba(255,255,255,.55)', 1.2);
  // 窗戶
  const cols = Math.max(2, Math.floor((w - 16) / 34)), rows = Math.max(2, Math.floor((h - 70) / 52));
  const cw = (w - 16) / cols;
  const shutter = hash(i, 8) > 0.55;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const wx = x + 8 + c * cw + cw / 2 - 8, wy = top + 52 + r * 52;
    if (shutter) { rrect(ctx, wx - 6, wy, 5, 28, 1, nightMix('#5f8a6e'), 1.2); rrect(ctx, wx + 17, wy, 5, 28, 1, nightMix('#5f8a6e'), 1.2); }
    ctx.beginPath(); ctx.moveTo(wx, wy + 28); ctx.lineTo(wx, wy + 7); ctx.arc(wx + 8, wy + 7, 8, Math.PI, TAU); ctx.lineTo(wx + 16, wy + 28); ctx.closePath();
    fs(ctx, NIGHT ? (hash(i * 13 + r * 5 + c, 3) > 0.55 ? '#f4cf72' : '#2f3a63') : '#7891a5', 1.8);
    ctx.beginPath(); ctx.moveTo(wx + 8, wy); ctx.lineTo(wx + 8, wy + 28); ctx.moveTo(wx, wy + 14); ctx.lineTo(wx + 16, wy + 14); ctx.lineWidth = 1.4; ctx.strokeStyle = '#f2ece0'; ctx.stroke();
    rrect(ctx, wx - 3, wy + 28, 22, 4, 1, nightMix('#efe6d2'), 1.2);
  }
  // 一樓店面
  if (hash(i, 9) > 0.4) {
    rrect(ctx, x + 10, base - 46, w - 20, 40, 3, nightMix('#5b4740'), 1.8);
    rrect(ctx, x + 16, base - 40, w * 0.35, 34, 2, NIGHT ? '#f0c56a' : '#9fb7c4', 1.4);
    const aw = hash(i, 10) > 0.5 ? '#b5473f' : '#4f7a61';
    ctx.beginPath(); ctx.moveTo(x + 6, base - 56); ctx.lineTo(x + w - 6, base - 56); ctx.lineTo(x + w - 1, base - 44); ctx.lineTo(x + 1, base - 44); ctx.closePath(); fs(ctx, aw, 1.8);
  }
}
function drawSchoolBuilding(ctx, x, w, h, i) {
  const base = GY - 6, top = base - h;
  const wall = hash(i, 1) > 0.5 ? '#ecdcb6' : '#e2cfa6', roof = '#5d6878';
  const tower = i % 3 === 0;
  if (tower) {
    const tw = 60, tx = x + w / 2 - tw / 2, tt = top - 120;
    rrect(ctx, tx, tt, tw, h + 120, 2, wall, 2.2);
    ctx.beginPath(); ctx.moveTo(tx - 6, tt); ctx.lineTo(tx + tw / 2, tt - 70); ctx.lineTo(tx + tw + 6, tt); ctx.closePath(); fs(ctx, roof, 2.2);
    ctx.beginPath(); ctx.moveTo(tx + tw / 2, tt - 70); ctx.lineTo(tx + tw / 2, tt - 86); fs(ctx, null, 2);
    circle(ctx, tx + tw / 2, tt + 30, 17, '#f8f3e6', 2.2);
    ctx.beginPath(); ctx.moveTo(tx + tw / 2, tt + 30); ctx.lineTo(tx + tw / 2, tt + 19); ctx.moveTo(tx + tw / 2, tt + 30); ctx.lineTo(tx + tw / 2 + 8, tt + 33); fs(ctx, null, 2);
  }
  ctx.beginPath(); ctx.moveTo(x - 6, top); ctx.lineTo(x + w * 0.25, top - 50); ctx.lineTo(x + w * 0.75, top - 50); ctx.lineTo(x + w + 6, top); ctx.closePath(); fs(ctx, roof, 2.2);
  for (const sx of [x + 6, x + w - 6]) { ctx.beginPath(); ctx.moveTo(sx - 7, top); ctx.lineTo(sx, top - 60); ctx.lineTo(sx + 7, top); ctx.closePath(); fs(ctx, roof, 2); }
  rrect(ctx, x, top, w, h + 8, 2, wall, 2.2);
  if (tower) { rrect(ctx, x + w / 2 - 30, top, 60, h + 8, 2, wall, 2.2); }
  const cols = Math.max(2, Math.floor((w - 20) / 36)), rows = Math.max(2, Math.floor((h - 40) / 60));
  const cw = (w - 20) / cols;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const wx = x + 10 + c * cw + cw / 2 - 9, wy = top + 26 + r * 60;
    ctx.beginPath(); ctx.moveTo(wx, wy + 36); ctx.lineTo(wx, wy + 12); ctx.quadraticCurveTo(wx + 9, wy - 6, wx + 18, wy + 12); ctx.lineTo(wx + 18, wy + 36); ctx.closePath();
    fs(ctx, '#7c93ab', 1.8);
    ctx.beginPath(); ctx.moveTo(wx + 9, wy + 4); ctx.lineTo(wx + 9, wy + 36); ctx.lineWidth = 1.4; ctx.strokeStyle = '#f2ece0'; ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(x, top + 16); ctx.lineTo(x + w, top + 16); fs(ctx, null, 1.4);
}
function drawShipStructure(ctx, x, w, h, i) {
  const base = GY - 38, top = base - h;
  rrect(ctx, x, top, w, h, 6, '#f4f1e8', 2.2);
  rrect(ctx, x - 4, top - 8, w + 8, 10, 3, '#3d5874', 2);
  for (let px = x + 22; px < x + w - 14; px += 34) { circle(ctx, px, top + h * 0.45, 8, '#7fa3c3', 2); circle(ctx, px - 2, top + h * 0.45 - 2, 2.4, 'rgba(255,255,255,.7)', 0); }
  if (hash(i, 4) > 0.4) {
    const fx = x + w * 0.4;
    ctx.beginPath(); ctx.moveTo(fx, top - 8); ctx.lineTo(fx + 8, top - 90); ctx.lineTo(fx + 52, top - 90); ctx.lineTo(fx + 56, top - 8); ctx.closePath(); fs(ctx, '#c8343c', 2.2);
    rrect(ctx, fx + 6, top - 104, 48, 18, 3, '#2a2a30', 2);
  }
}

function drawLayer(ctx, camX, W, p, span, fn) {
  const off = camX * p;
  for (let i = Math.floor(off / span) - 1; i < (off + W) / span + 1; i++) fn(i * span - off, i);
}

function drawBackground(ctx, th, camX, W, t) {
  if (AnimeArt.drawBackground(ctx, th, camX, W)) return;
  drawSky(ctx, th, W, t);
  drawClouds(ctx, camX, W, th);
  const T = THEMES[th];
  NIGHT = th === 'night';
  if (th === 'city' || th === 'night') {
    // 遠方：教堂圓頂與鐘塔剪影
    ctx.fillStyle = T.far;
    drawLayer(ctx, camX, W, 0.15, 420, (x, i) => {
      const h = 90 + hash(i, 11) * 80;
      ctx.fillRect(x, GY - 60 - h, 120, h + 60);
      ctx.fillRect(x + 140, GY - 60 - h * 0.7, 90, h * 0.7 + 60);
      if (hash(i, 12) > 0.4) { ctx.beginPath(); ctx.arc(x + 60, GY - 60 - h, 34, Math.PI, TAU); ctx.fill(); ctx.fillRect(x + 57, GY - 60 - h - 58, 6, 24); }
      else { ctx.fillRect(x + 40, GY - 60 - h - 70, 40, 70); ctx.beginPath(); ctx.moveTo(x + 36, GY - 130 - h); ctx.lineTo(x + 60, GY - 175 - h); ctx.lineTo(x + 84, GY - 130 - h); ctx.fill(); }
    });
    drawLayer(ctx, camX, W, 0.45, 200, (x, i) => drawCityBuilding(ctx, x + 4, 186 - hash(i, 13) * 20, 190 + hash(i, 14) * 110, i));
  } else if (th === 'school') {
    ctx.fillStyle = T.far;
    drawLayer(ctx, camX, W, 0.12, 600, (x, i) => { ctx.beginPath(); ctx.ellipse(x + 300, GY - 40, 380, 120 + hash(i, 2) * 40, 0, Math.PI, TAU); ctx.fill(); });
    ctx.fillStyle = '#9fbf8f';
    drawLayer(ctx, camX, W, 0.3, 140, (x, i) => { const h = 60 + hash(i, 3) * 40; ctx.beginPath(); ctx.ellipse(x + 70, GY - 50, 26, h, 0, 0, TAU); ctx.fill(); });
    drawLayer(ctx, camX, W, 0.45, 260, (x, i) => drawSchoolBuilding(ctx, x + 10, 230, 170 + hash(i, 15) * 60, i));
  } else {
    // 海面
    const sg = ctx.createLinearGradient(0, 300, 0, GY);
    sg.addColorStop(0, '#5a7fa6'); sg.addColorStop(1, '#2f5578');
    ctx.fillStyle = sg; ctx.fillRect(0, 300, W, GY - 300);
    ctx.fillStyle = 'rgba(255,230,190,.55)';
    drawLayer(ctx, camX, W, 0.1, 90, (x, i) => { const y = 310 + hash(i, 5) * 110; ctx.fillRect(x + Math.sin(t + i) * 6, y, 26 + hash(i, 6) * 30, 2); });
    ctx.fillStyle = T.far;
    drawLayer(ctx, camX, W, 0.05, 1400, (x) => { ctx.beginPath(); ctx.ellipse(x + 300, 302, 160, 26, 0, Math.PI, TAU); ctx.fill(); ctx.fillRect(x + 380, 250, 10, 50); });
    drawLayer(ctx, camX, W, 0.8, 900, (x, i) => { if (hash(i, 9) > 0.35) drawShipStructure(ctx, x + 60, 300 + hash(i, 10) * 200, 150 + hash(i, 11) * 60, i); });
  }
}

// 和角色同一層的地面與近景
function drawGround(ctx, th, camX, W, H) {
  if (AnimeArt.drawGround(ctx, th, camX, W, H)) return;
  const T = THEMES[th];
  if (th === 'ship') {
    // 欄杆
    drawLayer(ctx, camX, W, 1, 60, (x) => { ctx.fillStyle = '#f7f4ec'; ctx.fillRect(x, GY - 40, 5, 40); });
    ctx.fillStyle = '#f7f4ec'; ctx.fillRect(0, GY - 44, W, 6); ctx.fillRect(0, GY - 22, W, 3);
    ctx.strokeStyle = OL; ctx.lineWidth = 1.5; ctx.strokeRect(-2, GY - 44, W + 4, 6);
    drawLayer(ctx, camX, W, 1, 720, (x, i) => {
      circle(ctx, x + 300, GY - 24, 14, '#f17b3f', 2); circle(ctx, x + 300, GY - 24, 7, T.ground, 2);
      ctx.fillStyle = '#fff'; ctx.fillRect(x + 298, GY - 38, 4, 7); ctx.fillRect(x + 298, GY - 17, 4, 7);
    });
  }
  ctx.fillStyle = T.top; ctx.fillRect(0, GY, W, 14);
  ctx.fillStyle = T.ground; ctx.fillRect(0, GY + 14, W, H - GY);
  ctx.strokeStyle = OL; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(0, GY); ctx.lineTo(W, GY); ctx.moveTo(0, GY + 14); ctx.lineTo(W, GY + 14); ctx.stroke();
  ctx.strokeStyle = 'rgba(74,46,43,.25)'; ctx.lineWidth = 1.5;
  if (th === 'city' || th === 'night') {
    // 石板路
    drawLayer(ctx, camX, W, 1, 40, (x, i) => {
      for (let r = 0; r < 4; r++) { const ox = (r % 2) * 20; ctx.beginPath(); ctx.ellipse(x + ox + 20, GY + 26 + r * 18, 17, 7, 0, 0, TAU); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(x, GY); ctx.lineTo(x, GY + 14); ctx.stroke();
    });
    // 路燈
    drawLayer(ctx, camX, W, 1, 460, (x) => {
      const lx = x + 120;
      rrect(ctx, lx - 3, GY - 120, 6, 120, 2, '#2f3533', 1.6);
      rrect(ctx, lx - 8, GY - 8, 16, 8, 2, '#2f3533', 1.4);
      ctx.beginPath(); ctx.moveTo(lx - 10, GY - 124); ctx.lineTo(lx + 10, GY - 124); ctx.lineTo(lx + 7, GY - 144); ctx.lineTo(lx - 7, GY - 144); ctx.closePath(); fs(ctx, '#f9eebb', 1.8);
      ctx.beginPath(); ctx.moveTo(lx - 10, GY - 144); ctx.lineTo(lx, GY - 152); ctx.lineTo(lx + 10, GY - 144); ctx.closePath(); fs(ctx, '#2f3533', 1.6);
      if (th === 'night') { ctx.save(); ctx.globalAlpha = 0.18; ctx.beginPath(); ctx.moveTo(lx - 8, GY - 126); ctx.lineTo(lx - 60, GY); ctx.lineTo(lx + 60, GY); ctx.lineTo(lx + 8, GY - 126); ctx.fillStyle = '#ffe9a0'; ctx.fill(); ctx.restore(); }
    });
  } else if (th === 'school') {
    drawLayer(ctx, camX, W, 1, 48, (x) => { ctx.beginPath(); ctx.moveTo(x, GY + 20); ctx.lineTo(x + 30, GY + 20); ctx.moveTo(x + 10, GY + 44); ctx.lineTo(x + 44, GY + 44); ctx.stroke(); });
    // 鐵柵欄與樹籬
    drawLayer(ctx, camX, W, 1, 30, (x) => { ctx.fillStyle = '#2e3230'; ctx.fillRect(x, GY - 46, 3, 46); ctx.beginPath(); ctx.moveTo(x - 2, GY - 46); ctx.lineTo(x + 1.5, GY - 53); ctx.lineTo(x + 5, GY - 46); ctx.fill(); });
    ctx.fillStyle = '#2e3230'; ctx.fillRect(0, GY - 40, W, 3); ctx.fillRect(0, GY - 12, W, 3);
    drawLayer(ctx, camX, W, 1, 380, (x, i) => { if (hash(i, 3) > 0.5) { ellipse(ctx, x + 100, GY - 18, 52, 22, '#78a862', 2.2); ellipse(ctx, x + 84, GY - 26, 20, 10, '#8fbd75', 0); } });
  } else {
    drawLayer(ctx, camX, W, 1, 36, (x) => { ctx.beginPath(); ctx.moveTo(x, GY + 14); ctx.lineTo(x, H); ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(0, GY + 40); ctx.lineTo(W, GY + 40); ctx.stroke();
  }
}

function drawBubble(ctx, x, y, text, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.font = `900 17px ${FONT}`;
  const w = ctx.measureText(text).width + 22, h = 30;
  rrPath(ctx, x - w / 2, y - h, w, h, 13); fs(ctx, '#fff', 2.4);
  ctx.beginPath(); ctx.moveTo(x - 6, y - 1); ctx.lineTo(x, y + 9); ctx.lineTo(x + 6, y - 1); ctx.closePath(); fs(ctx, '#fff', 0);
  ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x, y + 9); ctx.lineTo(x + 6, y); ctx.lineWidth = 2.4; ctx.strokeStyle = OL; ctx.stroke();
  ctx.fillStyle = OL; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y - h / 2 + 1);
  ctx.restore();
}

// ---------- 第 4 關大魔王：巨大企鵝（照使用者提供的企鵝玩偶圖畫的） ----------
const PEN_LINE = '#3e7d86';
function pf(ctx, fill, lw = 3) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  ctx.lineWidth = lw; ctx.strokeStyle = PEN_LINE; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
}
function drawPenguin(ctx, t, state, angry, flash, detail = {}) {
  if (AnimeArt.drawPenguin(ctx, t, state, angry, flash, detail)) return;
  const blue = angry ? '#a9d2e2' : '#bcdde7', blueD = '#9cc7d4', hat = '#4f9da2', hatD = '#3f8589', cream = '#f3e0b0';
  ctx.save(); if (flash > 0) ctx.globalAlpha *= 0.5;
  if (state === 'dash') { ctx.translate(0, -58); ctx.rotate(1.35); ctx.translate(0, 82); }
  else if (state === 'dashwind') ctx.rotate(Math.sin(t * 30) * 0.06);
  else if (state === 'dizzy') ctx.rotate(Math.sin(t * 3) * 0.08);
  const flap = state === 'summon' || state === 'spit' || state === 'stomp' ? Math.sin(t * 18) * 0.5 : Math.sin(t * 3) * 0.08;
  // 腳
  for (const fx of [-36, 36]) {
    ctx.beginPath();
    ctx.moveTo(fx - 22, -2); ctx.quadraticCurveTo(fx - 24, -20, fx - 8, -22); ctx.lineTo(fx + 8, -22);
    ctx.quadraticCurveTo(fx + 24, -20, fx + 22, -2);
    ctx.quadraticCurveTo(fx + 15, 3, fx + 8, -1); ctx.quadraticCurveTo(fx, 4, fx - 8, -1); ctx.quadraticCurveTo(fx - 15, 3, fx - 22, -2);
    ctx.closePath(); pf(ctx, cream, 2.6);
    ctx.beginPath(); ctx.moveTo(fx - 8, -1); ctx.lineTo(fx - 7, -14); ctx.moveTo(fx + 8, -1); ctx.lineTo(fx + 7, -14); pf(ctx, null, 1.8);
  }
  // 翅膀（後）
  ctx.save(); ctx.translate(-50, -96); ctx.rotate(0.35 + flap);
  ctx.beginPath(); ctx.ellipse(-4, 30, 15, 38, 0.15, 0, TAU); pf(ctx, blueD, 2.8); ctx.restore();
  ctx.save(); ctx.translate(50, -96); ctx.rotate(-0.35 - flap);
  ctx.beginPath(); ctx.ellipse(4, 30, 15, 38, -0.15, 0, TAU); pf(ctx, blueD, 2.8); ctx.restore();
  // 身體
  ctx.beginPath(); ctx.ellipse(0, -64, 58, 62, 0, 0, TAU); pf(ctx, blue, 3);
  ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.ellipse(-18, -80, 16, 24, 0.3, 0, TAU); ctx.fillStyle = '#e4f3f7'; ctx.fill(); ctx.globalAlpha = 1;
  // 頭
  ctx.beginPath(); ctx.ellipse(2, -138, 47, 42, 0, 0, TAU); pf(ctx, blue, 3);
  // 帽子
  ctx.save(); ctx.translate(14, -178); ctx.rotate(0.14);
  ctx.save(); ctx.scale(1, 0.5); starPath(ctx, 0, 0, 46, 0.8, 6, -Math.PI / 2 + 0.3); ctx.restore();
  pf(ctx, hat, 2.8);
  ctx.beginPath(); ctx.ellipse(-2, 8, 34, 9, 0, 0, Math.PI); pf(ctx, hatD, 2.4);
  ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.ellipse(-12, -6, 14, 5, -0.2, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.globalAlpha = 1;
  ctx.restore();
  // 眼睛
  if (state === 'dizzy') {
    for (const ex of [-16, 22]) { ctx.beginPath(); for (let a = 0; a < TAU * 1.6; a += 0.3) { const r = a / (TAU * 1.6) * 7; ctx.lineTo(ex + Math.cos(a + t * 8) * r, -142 + Math.sin(a + t * 8) * r); } pf(ctx, null, 2); }
  } else {
    circle(ctx, -16, -142, 5, '#1d1d24', 0); circle(ctx, 22, -142, 5, '#1d1d24', 0);
    if (angry) { ctx.beginPath(); ctx.moveTo(-26, -156); ctx.lineTo(-8, -150); ctx.moveTo(32, -156); ctx.lineTo(14, -150); pf(ctx, null, 3); }
  }
  if (angry || state === 'dizzy') { ctx.globalAlpha = 0.5; ellipse(ctx, -26, -124, 7, 4, '#ff8fa3', 0); ellipse(ctx, 32, -124, 7, 4, '#ff8fa3', 0); ctx.globalAlpha = 1; }
  // 嘴巴
  const open = state === 'spit' || state === 'summon' ? 4 + Math.abs(Math.sin(t * 14)) * 5 : 0;
  ctx.beginPath(); ctx.ellipse(3, -126 + open * 0.3, 15, 11, 0, 0, TAU); pf(ctx, cream, 2.4);
  if (open) { ctx.beginPath(); ctx.ellipse(3, -122, 10, open * 0.6, 0, 0, TAU); pf(ctx, '#b8424e', 1.6); }
  else { ctx.beginPath(); ctx.moveTo(-9, -125); ctx.quadraticCurveTo(3, -121, 15, -125); pf(ctx, null, 1.6); }
  ctx.restore();
}
