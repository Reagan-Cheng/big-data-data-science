// Shared procedural 3D driver for both racing and the character preview.
export function createAnyaBuilder({ THREE, toon, mesh, canvasTex, drawStar }) {
  const TAU = Math.PI * 2;
  const HAIR = '#f1a0a6', SKIN = '#ffe9dc';
  const faceMaps = new Map();
  const skinRamp = new THREE.DataTexture(new Uint8Array([230,244,255]),3,1,THREE.RedFormat);
  skinRamp.minFilter=skinRamp.magFilter=THREE.NearestFilter;skinRamp.needsUpdate=true;
  const skinMaterial=new THREE.MeshToonMaterial({color:SKIN,gradientMap:skinRamp});

  function faceTexture(type) {
    if (faceMaps.has(type)) return faceMaps.get(type);
    const texture = canvasTex(1024, 768, (g) => {
      g.scale(4 / 3, 4 / 3);
      g.lineCap = 'round'; g.lineJoin = 'round';
      const ey = 305, mx = 384;
      if (type === 'shock') {
        const shade = g.createLinearGradient(0, 95, 0, 355);
        shade.addColorStop(0, 'rgba(103,91,132,.42)'); shade.addColorStop(1, 'rgba(103,91,132,0)');
        g.fillStyle = shade; g.fillRect(85, 95, 598, 260);
      }
      for (const x of [151, 617]) {
        const blush = g.createRadialGradient(x, 405, 2, x, 405, 48);
        blush.addColorStop(0, 'rgba(242,142,145,.48)'); blush.addColorStop(1, 'rgba(242,142,145,0)');
        g.fillStyle = blush; g.beginPath(); g.ellipse(x, 405, 50, 28, 0, 0, TAU); g.fill();
      }
      for (const x of [236, 532]) {
        const side = x < mx ? -1 : 1;
        if (type === 'sleepy') {
          g.strokeStyle = '#34242b'; g.lineWidth = 11;
          g.beginPath(); g.moveTo(x - 65, ey + 15);
          g.bezierCurveTo(x - 32, ey - 28, x + 32, ey - 28, x + 65, ey + 15); g.stroke();
          for (const dy of [0, 13]) {
            g.lineWidth = 5; g.beginPath(); g.moveTo(x + side * 54, ey + dy);
            g.lineTo(x + side * 75, ey + dy - 13); g.stroke();
          }
          continue;
        }
        const shock = type === 'shock', rx = shock ? 90 : 91, ry = shock ? 116 : 112;
        g.fillStyle = '#fffcf5'; g.strokeStyle = '#35252d'; g.lineWidth = 5;
        g.beginPath(); g.ellipse(x, ey, rx, ry, side * -0.045, 0, TAU); g.fill(); g.stroke();
        if (shock) {
          g.fillStyle = '#264437'; g.beginPath(); g.ellipse(x + side * 2, ey + 9, 13, 18, 0, 0, TAU); g.fill();
          g.strokeStyle = '#726469'; g.lineWidth = 3;
          for (let i = 0; i < 3; i++) {g.beginPath(); g.moveTo(x - 32, ey + 118 + i * 7); g.quadraticCurveTo(x, ey + 126 + i * 7, x + 32, ey + 118 + i * 7); g.stroke();}
        } else {
          const iris = g.createLinearGradient(0, ey - 88, 0, ey + 92);
          iris.addColorStop(0, '#143b32'); iris.addColorStop(.38, '#237458');
          iris.addColorStop(.72, '#42af7d'); iris.addColorStop(1, '#9ae1b0');
          g.fillStyle = iris; g.beginPath(); g.ellipse(x, ey + 4, 77, 103, 0, 0, TAU); g.fill();
          g.strokeStyle = '#244b3b'; g.lineWidth = 5; g.stroke();
          g.fillStyle = '#173e32'; g.beginPath(); g.ellipse(x, ey + 9, 32, 64, 0, 0, TAU); g.fill();
          g.strokeStyle = '#81d79b'; g.lineWidth = 5; g.beginPath(); g.ellipse(x, ey + 17, 58, 74, 0, .14, Math.PI - .14); g.stroke();
          g.fillStyle = '#fffef4'; drawStar(g, x, ey + 16, 35, 16);
          g.beginPath(); g.ellipse(x - 33, ey - 53, 18, 24, -.3, 0, TAU); g.fill();
          g.beginPath(); g.ellipse(x + 41, ey + 66, 7, 11, .3, 0, TAU); g.fill();
        }
        g.strokeStyle = '#34242b'; g.lineWidth = 10;
        g.beginPath(); g.ellipse(x, ey, rx + 2, ry + 2, side * -.045, Math.PI * 1.04, Math.PI * 1.98); g.stroke();
        for (const offset of [0, 16]) {
          g.lineWidth = 5; g.beginPath(); g.moveTo(x + side * 68, ey - 44 + offset);
          g.lineTo(x + side * 91, ey - 65 + offset); g.stroke();
        }
        g.strokeStyle = '#bd7c82'; g.lineWidth = 4;
        g.beginPath(); g.moveTo(x - 50, ey - 135); g.quadraticCurveTo(x, ey - 155, x + 47, ey - 137); g.stroke();
      }
      g.strokeStyle = '#68434a'; g.lineWidth = 4;
      if (type === 'happy') {
        g.fillStyle = '#b96d74'; g.beginPath(); g.moveTo(mx - 101, 439);
        g.quadraticCurveTo(mx, 459, mx + 101, 439);
        g.bezierCurveTo(mx + 78, 563, mx - 68, 570, mx - 101, 439); g.fill(); g.stroke();
        g.fillStyle = '#fffaf0'; g.beginPath(); g.moveTo(mx - 87, 444); g.quadraticCurveTo(mx, 461, mx + 87, 444);
        g.lineTo(mx + 75, 463); g.quadraticCurveTo(mx, 477, mx - 77, 463); g.fill();
      } else if (type === 'sleepy') {
        g.beginPath(); g.moveTo(mx - 47, 461); g.quadraticCurveTo(mx, 492, mx + 47, 461); g.stroke();
      } else if (type === 'shock') {
        g.fillStyle = '#b3787e'; g.beginPath(); g.roundRect(mx - 81, 449, 162, 90, 12); g.fill(); g.stroke();
        g.fillStyle = '#ffe9dc'; g.fillRect(mx - 73, 457, 146, 15);
        g.fillStyle = '#dae7eb'; g.strokeStyle = '#84989e'; g.lineWidth = 3;
        for (const x of [96, 682]) {g.beginPath(); g.moveTo(x, 339); g.bezierCurveTo(x + 27, 375, x + 15, 399, x, 393); g.bezierCurveTo(x - 19, 390, x - 17, 375, x, 339); g.fill(); g.stroke();}
      } else {
        g.fillStyle = '#b7797b'; g.beginPath(); g.ellipse(mx, 481, 35, 34, -.08, 0, TAU); g.fill(); g.stroke();
      }
    });
    texture.name = `anya-${type}-face`;
    faceMaps.set(type, texture);
    return texture;
  }

  function headGeometry(radius, phiStart = 0, phiLength = TAU, thetaStart = 0, thetaLength = Math.PI) {
    const geometry = new THREE.SphereGeometry(radius, 48, 32, phiStart, phiLength, thetaStart, thetaLength);
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ny = y / radius;
      const jaw = 1 - .22 * Math.pow(Math.max(0, (-ny - .25) / .75), 1.25);
      p.setXYZ(i, x * 1.10 * jaw, y * .96, z * .84 * (z > 0 ? 1 + .10 * (1 - z / radius) : 1));
    }
    geometry.computeVertexNormals();
    return geometry;
  }
  function frontZ(x, y) {
    return .50 * Math.sqrt(Math.max(.025, 1 - (x / .78) ** 2)) *
      Math.sqrt(Math.max(.025, 1 - (y / .71) ** 2)) + .025;
  }
  function hairPanel(shape, parent, material, outlined = true) {
    const geometry = new THREE.ExtrudeGeometry(shape, {depth:.025, bevelEnabled:true, bevelThickness:.012, bevelSize:.012, bevelSegments:3, steps:1, curveSegments:14});
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + frontZ(p.getX(i), p.getY(i)));
    geometry.computeVertexNormals();
    // Extrusion duplicates bevel vertices; average their normals after bending.
    const normal=geometry.attributes.normal,groups=new Map();
    for(let i=0;i<p.count;i++) {
      const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*100000)).join(',');
      let group=groups.get(key);if(!group){group={sum:new THREE.Vector3(),indices:[]};groups.set(key,group);}
      group.sum.add(new THREE.Vector3(normal.getX(i),normal.getY(i),normal.getZ(i)));group.indices.push(i);
    }
    for(const group of groups.values()){group.sum.normalize();for(const i of group.indices)normal.setXYZ(i,group.sum.x,group.sum.y,group.sum.z);}
    const panel = mesh(geometry, material, 0, 0, 0, parent);
    panel.name = 'anya-sculpted-hair-lock';
    if (outlined) {
      const points = shape.getPoints(32).map(v => new THREE.Vector3(v.x, v.y, frontZ(v.x, v.y) + .027));
      const line = new THREE.CatmullRomCurve3(points, true);
      mesh(new THREE.TubeGeometry(line, 96, .0035, 4, true), new THREE.MeshBasicMaterial({color:'#bd7880'}), 0, 0, 0, parent);
    }
    return panel;
  }
  function bang(parent, material, rootX, tipX, width, tipY) {
    const s = new THREE.Shape();
    const left = rootX - width / 2, right = rootX + width / 2;
    const ly=.56-Math.abs(left)*.32,ry=.56-Math.abs(right)*.32;
    s.moveTo(left, ly);
    s.bezierCurveTo(left - .025, ly-.20, tipX - width * .46, tipY + .08, tipX, tipY);
    s.bezierCurveTo(tipX + width * .20, tipY + .07, right + .025, ry-.20, right, ry);
    s.quadraticCurveTo(rootX, .59-Math.abs(rootX)*.34, left, ly);
    return hairPanel(s, parent, material);
  }
  function starTexture() {
    return canvasTex(512,256,(g,W,H)=>{
      g.fillStyle='#79c8ca';g.fillRect(0,0,W,H);g.fillStyle='#fffdf5';
      for(const [x,y,r] of [[52,48,26],[164,44,24],[300,62,29],[438,45,25],[104,180,27],[246,175,25],[400,184,30]])drawStar(g,x,y,r,r*.45);
    });
  }
  function buildHead(cfg) {
    const head = new THREE.Group(); head.name = 'anya-head'; head.position.set(0,1.64,.02);
    const skull = new THREE.Group(); head.add(skull);
    mesh(headGeometry(.55),skinMaterial,0,0,0,skull).name='anya-cheek-and-chin';
    for(const side of [-1,1]) {
      const ear=mesh(new THREE.SphereGeometry(.09,16,12),skinMaterial,side*.55,-.12,.07,skull);
      ear.scale.set(.75,1,.65);
    }
    const width=Math.PI*.64;
    const face=new THREE.Mesh(headGeometry(.557,Math.PI/2-width/2,width,Math.PI*.29,Math.PI*.49),
      new THREE.MeshBasicMaterial({map:faceTexture(cfg.face),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));
    face.name='anya-curved-face';skull.add(face);
    const hair=toon(HAIR,{side:THREE.DoubleSide});
    const crown=mesh(new THREE.SphereGeometry(.625,40,24,0,TAU,0,Math.PI*.41),hair,0,.025,-.025,skull);
    crown.name='anya-hair-crown';crown.scale.z=.86;
    const bobPoints=[];
    const profile=[[-.56,.44],[-.50,.57],[-.34,.65],[-.10,.66],[.16,.63],[.40,.51],[.57,.28],[.63,.01]];
    for(let i=0;i<profile.length-1;i++)for(let j=0;j<4;j++) {
      const t=j/4, a=profile[i],b=profile[i+1];bobPoints.push(new THREE.Vector2(THREE.MathUtils.lerp(a[1],b[1],t),THREE.MathUtils.lerp(a[0],b[0],t)));
    }
    bobPoints.push(new THREE.Vector2(.01,.63));
    const bob=mesh(new THREE.LatheGeometry(bobPoints,48,.92,TAU-1.84),hair,0,0,-.035,skull);bob.name='anya-volumetric-bob';
    for(const side of [-1,1]) {
      const s=new THREE.Shape(),end=cfg.bun?-.36:-.55;
      s.moveTo(side*.48,.38);s.bezierCurveTo(side*.67,.19,side*.72,-.17,side*.61,end);
      s.quadraticCurveTo(side*.48,end-.04,side*.36,end+.10);
      s.bezierCurveTo(side*.57,-.14,side*.43,.06,side*.48,.38);
      hairPanel(s,skull,hair);
    }
    bang(skull,hair,-.43,-.47,.20,-.09);
    bang(skull,hair,.43,.47,.20,-.07);
    bang(skull,hair,-.27,-.23,.25,.035);
    bang(skull,hair,.23,.28,.27,.045);
    bang(skull,hair,-.035,.035,.29,.055);
    for(const [x,y] of [[-.36,.33],[-.17,.39],[.07,.39],[.30,.34]]) {
      const shine=mesh(new THREE.SphereGeometry(.022,12,8),new THREE.MeshBasicMaterial({color:'#ffd1ca'}),x,y,frontZ(x,y)+.055,skull);
      shine.scale.set(.8,1.6,.22);
    }
    if(cfg.bun) {
      const bun=mesh(new THREE.SphereGeometry(.23,24,16),hair,.36,.20,-.48,skull);bun.scale.set(1,1.05,.85);
    }
    if(!cfg.hat) {
      const tuft=new THREE.Shape();tuft.moveTo(.015,.59);tuft.bezierCurveTo(-.015,.76,.06,.85,.09,.79);
      tuft.quadraticCurveTo(.15,.68,.08,.60);tuft.closePath();
      const geo=new THREE.ExtrudeGeometry(tuft,{depth:.035,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:2,curveSegments:12});
      mesh(geo,hair,0,0,-.015,skull);
      const ornament=new THREE.Shape();ornament.moveTo(-.16,-.10);ornament.quadraticCurveTo(-.15,.10,0,.27);ornament.quadraticCurveTo(.15,.10,.16,-.10);ornament.quadraticCurveTo(0,-.15,-.16,-.10);
      const geometry=new THREE.ExtrudeGeometry(ornament,{depth:.09,bevelEnabled:true,bevelSize:.01,bevelThickness:.01,bevelSegments:2,curveSegments:12});
      for(const side of [-1,1]) {
        const horn=new THREE.Group();horn.position.set(side*.50,.40,.015);horn.rotation.z=-side*.42;skull.add(horn);
        mesh(geometry,toon('#c8a450'),0,0,0,horn);
        const inset=mesh(geometry,toon('#302b31'),0,.012,.028,horn);inset.scale.set(.83,.86,1);
      }
    } else {
      const hat=new THREE.Group();hat.position.set(0,.39,-.03);hat.rotation.set(-.12,0,-.22);skull.add(hat);
      const material=toon('#ffffff',{map:starTexture()});
      mesh(new THREE.CylinderGeometry(.615,.63,.16,32),material,0,0,0,hat);
      const cap=new THREE.ConeGeometry(.60,.66,32,12),positions=cap.attributes.position;
      for(let i=0;i<positions.count;i++){
        const t=(positions.getY(i)+.33)/.66;
        positions.setX(i,positions.getX(i)+.28*t*t);positions.setZ(i,positions.getZ(i)-.10*t*t);
      }
      cap.computeVertexNormals();mesh(cap,material,0,.41,0,hat);
      mesh(new THREE.SphereGeometry(.14,20,14),toon('#fffdf4'),.28,.76,-.10,hat);
    }
    return head;
  }

  // Seated body and steering-wheel hand positions are supplied by the original model.
  function buildAnya(cfg) {
    const root = new THREE.Group();
    const BLACK = '#3d3638';
    const top = cfg.outfit === 'dress' ? BLACK : cfg.outfit === 'pajama' ? '#7ccbcc' : '#7fd3c6';
    const bottom = cfg.outfit === 'dress' ? BLACK : cfg.outfit === 'pajama' ? '#7ccbcc' : '#ffe066';
    for (const sx of [-.17,.17]) {
      const leg=mesh(new THREE.CapsuleGeometry(.12,.42,4,8),toon(cfg.outfit==='sport'?SKIN:bottom),sx,.45,.38,root);leg.rotation.x=Math.PI/2;
    }
    mesh(new THREE.CylinderGeometry(.36,.47,.34,16),toon(bottom),0,.52,0,root);
    mesh(new THREE.CylinderGeometry(.27,.36,.56,16),toon(top),0,.9,0,root);
    if(cfg.outfit==='dress') {
      mesh(new THREE.TorusGeometry(.2,.05,6,16),toon('#f0a0a0'),0,1.15,.02,root).rotation.x=Math.PI/2;
      for(const s of [-1,1])mesh(new THREE.ConeGeometry(.06,.16,4),toon('#ffffff'),.06*s,1.08,.27,root).rotation.z=Math.PI/2*s;
    } else if(cfg.outfit==='pajama') {
      for(let i=0;i<3;i++)mesh(new THREE.SphereGeometry(.03,6,6),toon('#ffffff'),0,1.08-i*.14,.31+i*.02,root);
    }
    for(const s of [-1,1]) {
      const sh=new THREE.Vector3(.32*s,1.07,.02),hand=new THREE.Vector3(.24*s,.78,.66),dir=hand.clone().sub(sh),len=dir.length();dir.normalize();
      const geometry=new THREE.CylinderGeometry(.10,.085,len,10);geometry.translate(0,len/2,0);
      const arm=mesh(geometry,toon(cfg.outfit==='sport'?SKIN:top),sh.x,sh.y,sh.z,root);arm.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);
      if(cfg.outfit==='sport')mesh(new THREE.SphereGeometry(.14,10,8),toon(top),sh.x,sh.y,sh.z,root);
      mesh(new THREE.SphereGeometry(.10,10,8),toon(SKIN),hand.x,hand.y,hand.z,root);
    }
    const head=buildHead(cfg);root.add(head);root.userData.head=head;
    return root;
  }
  return buildAnya;
}
