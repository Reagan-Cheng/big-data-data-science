// Anime bitmap assets; the existing Canvas drawings remain a loading fallback.
'use strict';
const AnimeArt = (() => {
  const VERSION = '20261101-penguin';
  const actors = {}, backgrounds = {}, spriteCanvases = {};
  const errors = [];
  const sizes = { anya: 74, loid: 124, yor: 122, bond: 62, enemies: 92, penguin: 202 };
  let frames = {};
  const pending = [];
  function load(src) {
    const im = new Image();
    pending.push(new Promise(resolve => {
      im.onload = () => resolve(true);
      im.onerror = () => { errors.push(src); resolve(false); };
    }));
    im.src = `${src}?v=${VERSION}`;
    return im;
  }
  for (const key of Object.keys(sizes)) actors[key] = load(`img/anime/${key}-atlas.png`);
  for (const key of ['city', 'school', 'ship', 'night']) backgrounds[key] = load(`img/anime/${key}.png`);
  const metadata = fetch(`img/anime/frames.json?v=${VERSION}`).then(r => {
    if (!r.ok) throw new Error('Frame metadata missing');
    return r.json();
  }).then(data => { frames = data; }).catch(() => { errors.push('frames.json'); });
  Promise.all([...pending, metadata]).then(() => {
    document.body.dataset.art = errors.length ? `fallback: ${errors.join(', ')}` : 'ready';
    for (const canvas of document.querySelectorAll('canvas[data-portrait]')) {
      drawActor(canvas.getContext('2d'), 'anya', 120, 242, 1, { state: 'win' }, 2.8);
    }
  });

  function poseFrame(po) {
    switch (po.state) {
      case 'run': return 1 + (Math.floor((po.time || 0) * 10) % 2);
      case 'jump': case 'fall': return 3;
      case 'punch': case 'slash': return 4;
      case 'throw': case 'kick': return 5;
      case 'hurt': case 'dizzy': return 6;
      case 'win': case 'wave': case 'super': return 7;
      default: return 0;
    }
  }
  function drawActor(ctx, key, x, y, face, po, scale = 1, flash = 0) {
    const im = actors[key], data = frames[key];
    if (!data || !im.complete || !im.naturalWidth) return false;
    const index = po.artFrame == null ? poseFrame(po) : po.artFrame, f = data.frames[index];
    if (!spriteCanvases[key]) {
      spriteCanvases[key] = data.frames.map(frame => {
        const canvas = document.createElement('canvas');
        canvas.width = frame.w; canvas.height = frame.h;
        const painter = canvas.getContext('2d');
        const clip = new Path2D();
        for (let i = 0; i < frame.clipRuns.length; i += 3) {
          clip.rect(frame.clipRuns[i], frame.clipRuns[i + 1], frame.clipRuns[i + 2], 1);
        }
        painter.clip(clip);
        painter.drawImage(im, frame.x, frame.y, frame.w, frame.h, 0, 0, frame.w, frame.h);
        return canvas;
      });
    }
    const unit = po.artHeight ? po.artHeight / f.h : sizes[key] / data.referenceHeight;
    const running = po.state === 'run';
    const bob = running ? -Math.abs(Math.sin((po.time || 0) * 15)) * 1.5 :
      po.state === 'idle' ? Math.sin((po.time || 0) * 3) * 0.5 : 0;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.scale(face * scale, scale);
    if (key === 'enemies') {
      if (po.state === 'windup') ctx.rotate(-0.08);
      else if (po.state === 'punch' || po.state === 'slash') { ctx.translate((po.ext || 0) * 7, 0); ctx.rotate(0.065); }
      else if (po.state === 'hurt' || po.state === 'dizzy') ctx.rotate(-0.1);
    }
    if (flash > 0) ctx.globalAlpha *= 0.5;
    // Feet and body centers come from each source cell, preserving limb reach.
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(spriteCanvases[key][index],
      -f.anchorX * unit, -f.h * unit, f.w * unit, f.h * unit);
    ctx.restore();
    return true;
  }
  function drawBackground(ctx, theme, camX, width) {
    const im = backgrounds[theme];
    if (!im || !im.complete || !im.naturalWidth) return false;
    // The image's walkway is aligned to the game's actual collision ground.
    const height = 460 / 0.85;
    const tileWidth = im.naturalWidth * height / im.naturalHeight;
    paintPanorama(ctx, im, camX * 0.28, width, tileWidth, height);
    return true;
  }
  function drawGround(ctx, theme, camX, width, height) {
    const im = backgrounds[theme];
    if (!im || !im.complete || !im.naturalWidth) return false;
    // Paint only below the collision line; all scenery stays behind actors.
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 460, width, height - 460); ctx.clip();
    const tileWidth = im.naturalWidth * (460 / 0.85) / im.naturalHeight;
    paintPanorama(ctx, im, camX * 0.7, width, tileWidth, 460 / 0.85);
    ctx.fillStyle = theme === 'night' ? 'rgba(37,52,73,.14)' : 'rgba(248,235,210,.08)';
    ctx.fillRect(0, 460, width, height - 460);
    ctx.strokeStyle = theme === 'night' ? '#8093a0' : '#d4c8ae';
    ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, 460.5); ctx.lineTo(width, 460.5); ctx.stroke();
    ctx.restore();
    return true;
  }
  function paintPanorama(ctx, im, camera, width, tileWidth, height) {
    // Reflect adjacent tiles so both sky and architecture meet at identical edges.
    const first = Math.floor(camera / tileWidth);
    for (let i = first; i * tileWidth - camera < width; i++) {
      const x = i * tileWidth - camera;
      ctx.save(); ctx.translate(x + (i % 2 ? tileWidth : 0), 0);
      ctx.scale(i % 2 ? -1 : 1, 1);
      ctx.drawImage(im, 0, 0, tileWidth + 0.5, height);
      ctx.restore();
    }
  }
  const enemyFrames = { goon: 0, redgoon: 1, assassin: 2, thrower1: 3, thrower2: 4, knifer: 5, keith: 6, circus: 7, killer: 8, bombdog: 9, crow: 10, gull: 11 };
  function drawEnemy(ctx, kind, x, y, face, po, scale = 1, flash = 0) {
    if (enemyFrames[kind] == null) return false;
    const artHeight = kind === 'bombdog' ? 39 : kind === 'crow' || kind === 'gull' ? 28 : 0;
    return drawActor(ctx, 'enemies', x, y, face, { ...po, artFrame: enemyFrames[kind], artHeight }, scale, flash);
  }
  function drawPenguin(ctx, time, state, angry, flash, detail = {}) {
    let artFrame = 0;
    if (detail.dead) artFrame = 7;
    else if (state === 'stomp') artFrame = detail.onGround === false ? 2 : 1;
    else if (state === 'spit') artFrame = 3;
    else if (state === 'summon') artFrame = 4;
    else if (state === 'dash') artFrame = 5;
    else if (state === 'dashwind') artFrame = 1;
    else if (state === 'dizzy') artFrame = 6;
    ctx.save();
    if (state === 'dashwind') ctx.rotate(Math.sin(time * 26) * 0.025);
    else if (state === 'dizzy' && !detail.dead) ctx.rotate(Math.sin(time * 4) * 0.035);
    const drawn = drawActor(ctx, 'penguin', 0, 0, 1,
      { state: state === 'idle' ? 'idle' : state, time, artFrame }, 1, flash);
    ctx.restore();
    return drawn;
  }
  return { drawActor, drawEnemy, drawBackground, drawGround, drawPenguin };
})();
