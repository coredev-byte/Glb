// Afnan Supremacy Collector's Edition (100 ml) — modelo procedural.
//
// Convenção (igual ao asad.glb fornecido): 1 unidade = altura total do frasco (com tampa),
// base em y = 0, frente voltada para +Z, centralizado em X/Z.
// Proporções medidas sobre a foto de referência (references/supremacy-collectors-edition-ref.jpg).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng, makeCanvas, toTexture, heightToNormal, trackedText, fitFont } from './canvas.js';

// ── Dimensões ──────────────────────────────────────────────────────────────
export const DIM = {
  W: 0.45,          // largura do corpo
  D: 0.20,          // profundidade do corpo
  H: 0.734,         // altura do corpo
  collar: { w: 0.10, h: 0.054, d: 0.10 },
  ring: { R: 0.106, r: 0.070, depth: 0.046 },
  stem: { w: 0.062, d: 0.05 },
  bevel: 0.014,
  uvTile: 0.5,      // 1 repetição da textura de pedra a cada 0.5 unidade
};

// ── Helpers geométricos ────────────────────────────────────────────────────
/** Polígono com cantos arredondados (raio por vértice). pts: [[x,y,r], ...] */
function roundedPolygon(pts) {
  const shape = new THREE.Shape();
  const n = pts.length;
  const V = (i) => new THREE.Vector2(pts[(i + n) % n][0], pts[(i + n) % n][1]);
  for (let i = 0; i < n; i++) {
    const p = V(i), a = V(i - 1), b = V(i + 1), r = pts[i][2] || 0;
    const da = a.clone().sub(p).normalize(), db = b.clone().sub(p).normalize();
    const p1 = p.clone().addScaledVector(da, r), p2 = p.clone().addScaledVector(db, r);
    if (i === 0) shape.moveTo(p1.x, p1.y); else shape.lineTo(p1.x, p1.y);
    shape.quadraticCurveTo(p.x, p.y, p2.x, p2.y);
  }
  shape.closePath();
  return shape;
}

/** Normais suaves por posição (remove o facetado dos chanfros do ExtrudeGeometry). */
function smoothNormals(geo, eps = 1e-5) {
  geo = geo.index ? geo.toNonIndexed() : geo;
  const pos = geo.attributes.position, n = pos.count;
  const key = (i) => `${Math.round(pos.getX(i) / eps)},${Math.round(pos.getY(i) / eps)},${Math.round(pos.getZ(i) / eps)}`;
  const acc = new Map();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), fn = new THREE.Vector3();
  for (let i = 0; i < n; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    fn.subVectors(c, b).cross(a.clone().sub(b)); // ponderado por área
    for (let k = 0; k < 3; k++) {
      const kk = key(i + k);
      const v = acc.get(kk) || new THREE.Vector3();
      v.add(fn); acc.set(kk, v);
    }
  }
  const normals = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = acc.get(key(i)).clone().normalize();
    normals.set([v.x, v.y, v.z], i * 3);
  }
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  return geo;
}

/** Anel (plano XY, eixo Z) com seção retangular de cantos arredondados. */
function ringGeometry(rIn, rOut, depth, rad, segs = 160, cornerSegs = 6) {
  const pts = [];
  const hz = depth / 2;
  // cantos: (rOut,+hz) -> (rIn,+hz) -> (rIn,-hz) -> (rOut,-hz), sentido anti-horário no plano (r, z)
  const corners = [
    [rOut - rad, hz - rad, 0], [rIn + rad, hz - rad, Math.PI / 2],
    [rIn + rad, -hz + rad, Math.PI], [rOut - rad, -hz + rad, 1.5 * Math.PI],
  ];
  for (const [cx, cz, a0] of corners) {
    for (let i = 0; i <= cornerSegs; i++) {
      const a = a0 + (i / cornerSegs) * (Math.PI / 2);
      pts.push(new THREE.Vector2(cx + Math.cos(a) * rad, cz + Math.sin(a) * rad));
    }
  }
  pts.push(pts[0].clone());
  // Lathe gira em torno de Y usando (x = raio, y = altura); depois deitamos o eixo para Z
  const geo = new THREE.LatheGeometry(pts, segs);
  geo.rotateX(Math.PI / 2);
  return geo;
}

// ── Texturas ───────────────────────────────────────────────────────────────
/** Pedra cinza salpicada (estilo terrazzo/granito) — seamless. */
function stoneTextures(size = 2048) {
  const rand = rng(20261105);
  const col = makeCanvas(size), hgt = makeCanvas(size);
  const c = col.getContext('2d'), h = hgt.getContext('2d');
  c.fillStyle = '#8d9197'; c.fillRect(0, 0, size, size);
  h.fillStyle = '#808080'; h.fillRect(0, 0, size, size);

  // desenha com wrap nas bordas para a textura ficar contínua
  const wrapDraw = (ctx, x, y, r, fn) => {
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
      const xx = x + ox, yy = y + oy;
      if (xx + r < 0 || yy + r < 0 || xx - r > size || yy - r > size) continue;
      fn(ctx, xx, yy);
    }
  };
  // variação tonal de baixa frequência
  for (let i = 0; i < 90; i++) {
    const x = rand() * size, y = rand() * size, r = 120 + rand() * 380;
    const light = rand() > 0.5;
    wrapDraw(c, x, y, r, (ctx, xx, yy) => {
      const g = ctx.createRadialGradient(xx, yy, 0, xx, yy, r);
      g.addColorStop(0, light ? 'rgba(235,238,242,0.05)' : 'rgba(90,94,100,0.05)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(xx - r, yy - r, r * 2, r * 2);
    });
  }
  // grão fino
  const img = c.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const d = (rand() - 0.5) * 14;
    img.data[i] += d; img.data[i + 1] += d; img.data[i + 2] += d;
  }
  c.putImageData(img, 0, 0);

  const blob = (ctx, x, y, r, fill) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    const k = 5 + Math.floor(rand() * 4);
    const rot = rand() * Math.PI * 2;
    const v = [];
    for (let j = 0; j < k; j++) {
      const ang = rot + (j / k) * Math.PI * 2, rr = r * (0.6 + rand() * 0.55);
      v.push([x + Math.cos(ang) * rr, y + Math.sin(ang) * rr]);
    }
    // contorno orgânico: curvas quadráticas pelos pontos médios
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    ctx.moveTo(...mid(v[0], v[1]));
    for (let j = 1; j <= k; j++) ctx.quadraticCurveTo(...v[j % k], ...mid(v[j % k], v[(j + 1) % k]));
    ctx.closePath(); ctx.fill();
  };
  const specks = (count, rmin, rmax, colorFn, depth) => {
    for (let i = 0; i < count; i++) {
      const x = rand() * size, y = rand() * size;
      const r = rmin + Math.pow(rand(), 2.6) * (rmax - rmin);
      const fill = colorFn();
      wrapDraw(c, x, y, r * 1.2, (ctx, xx, yy) => blob(ctx, xx, yy, r, fill));
      wrapDraw(h, x, y, r * 1.2, (ctx, xx, yy) => blob(ctx, xx, yy, r, depth));
    }
  };
  specks(1800, 1.2, 4, () => `rgb(${150 + rand() * 30 | 0},${153 + rand() * 30 | 0},${158 + rand() * 30 | 0})`, '#7a7a7a');
  specks(900, 1.0, 3.2, () => `rgb(${222 + rand() * 25 | 0},${224 + rand() * 25 | 0},${228 + rand() * 25 | 0})`, '#888888');
  specks(9000, 1.4, 9, () => { const v = 12 + rand() * 38 | 0; return `rgb(${v},${v + 1},${v + 3})`; }, '#5c5c5c');
  specks(260, 6, 15, () => { const v = 14 + rand() * 20 | 0; return `rgb(${v},${v},${v + 2})`; }, '#555555');

  const map = toTexture(col, { mime: 'image/jpeg', repeat: true });
  const normalCanvas = heightToNormal(hgt, 3.0, true);
  const normalMap = toTexture(normalCanvas, { srgb: false, mime: 'image/jpeg', repeat: true });
  return { map, normalMap };
}

/** Tipografia frontal: SUPREMACY / COLLECTOR'S EDITION / AFNAN (máscara alpha, tinta prata). */
function labelTexture(lw, lh, layout) {
  const W = 2048, Hc = Math.round(W * lh / lw);
  const cv = makeCanvas(W, Hc), ctx = cv.getContext('2d');
  ctx.textBaseline = 'alphabetic';
  const px = (u) => u * W; // fração da largura do label -> px
  const py = (yUnits) => Hc * (1 - (yUnits - layout.y0) / lh);

  // SUPREMACY — serifada fina, tracking largo
  ctx.fillStyle = '#f2f3f5';
  let f = fitFont(ctx, 'SUPREMACY', 'Cinzel', 600, px(0.86), 0.30);
  trackedText(ctx, 'SUPREMACY', W / 2, py(layout.supremacy) + f.size * 0.35, f.tracking);
  // COLLECTOR'S EDITION — sans pesada
  ctx.fillStyle = '#ffffff';
  f = fitFont(ctx, 'COLLECTOR’S EDITION', '"Inter Tight"', 800, px(0.74), 0.035);
  trackedText(ctx, 'COLLECTOR’S EDITION', W / 2, py(layout.edition) + f.size * 0.36, f.tracking);
  // AFNAN — serifada pequena
  ctx.fillStyle = '#1c1d20';
  f = fitFont(ctx, 'AFNAN', 'Cinzel', 600, px(0.26), 0.12);
  trackedText(ctx, 'AFNAN', W / 2, py(layout.afnan) + f.size * 0.35, f.tracking);

  const t = toTexture(cv, { mime: 'image/png' });
  return t;
}

/** Contorno do brasão (coordenadas normalizadas -0.5..0.5). */
function crestOutline() {
  // metade direita (de cima para baixo); a esquerda é espelhada
  const half = [
    ['m', 0, 0.5],
    ['c', 0.05, 0.5, 0.07, 0.47, 0.09, 0.44],        // topo da coroa
    ['c', 0.12, 0.47, 0.16, 0.46, 0.17, 0.41],
    ['c', 0.22, 0.43, 0.27, 0.40, 0.26, 0.33],        // ponta lateral da coroa
    ['c', 0.36, 0.36, 0.47, 0.28, 0.46, 0.13],        // asa / lambrequim
    ['c', 0.50, 0.05, 0.47, -0.08, 0.40, -0.12],
    ['c', 0.43, -0.20, 0.38, -0.28, 0.30, -0.27],
    ['c', 0.26, -0.33, 0.17, -0.38, 0.09, -0.42],     // escudo
    ['c', 0.05, -0.44, 0.02, -0.47, 0, -0.5],
  ];
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.5);
  for (const s of half.slice(1)) shape.bezierCurveTo(s[1], s[2], s[3], s[4], s[5], s[6]);
  const mirrored = half.slice(1).reverse();
  for (let i = 0; i < mirrored.length; i++) {
    const s = mirrored[i];
    const end = i + 1 < mirrored.length ? mirrored[i + 1] : half[0];
    const ex = end[0] === 'm' ? end[1] : end[5], ey = end[0] === 'm' ? end[2] : end[6];
    shape.bezierCurveTo(-s[3], s[4], -s[1], s[2], -ex, ey);
  }
  return { shape, half };
}

/** Relevo e cor do brasão — ornamento original e estilizado (não é a arte oficial). */
function crestTextures(half, N = 1024) {
  const toPx = (x, y) => [(x + 0.5) * N, (0.5 - y) * N];
  const tracePath = (ctx, scale = 1, oy = 0) => {
    ctx.beginPath();
    let [x, y] = toPx(0, 0.5 * scale + oy); ctx.moveTo(x, y);
    const seg = (s, sx) => {
      const p = (a, b) => toPx(a * sx * scale, b * scale + oy);
      ctx.bezierCurveTo(...p(s[1], s[2]), ...p(s[3], s[4]), ...p(s[5], s[6]));
    };
    half.slice(1).forEach((s) => seg(s, 1));
    const m = half.slice(1).reverse();
    m.forEach((s, i) => {
      const end = i + 1 < m.length ? m[i + 1] : half[0];
      const ex = end[0] === 'm' ? end[1] : end[5], ey = end[0] === 'm' ? end[2] : end[6];
      const p = (a, b) => toPx(-a * scale, b * scale + oy);
      ctx.bezierCurveTo(...p(s[3], s[4]), ...p(s[1], s[2]), ...p(ex, ey));
    });
    ctx.closePath();
  };
  const draw = (ctx, base, hi, mid, lineW = 1) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, N, N);
    // filete interno
    ctx.strokeStyle = hi; ctx.lineWidth = 10 * lineW; tracePath(ctx, 0.9, -0.01); ctx.stroke();
    // escudo central
    const sh = new Path2D();
    const P = (x, y) => toPx(x, y);
    sh.moveTo(...P(-0.15, 0.20)); sh.lineTo(...P(0.15, 0.20));
    sh.bezierCurveTo(...P(0.16, 0.0), ...P(0.15, -0.16), ...P(0, -0.30));
    sh.bezierCurveTo(...P(-0.15, -0.16), ...P(-0.16, 0.0), ...P(-0.15, 0.20));
    ctx.fillStyle = mid; ctx.fill(sh);
    ctx.lineWidth = 9 * lineW; ctx.strokeStyle = hi; ctx.stroke(sh);
    // chevron + estrelas
    ctx.beginPath(); ctx.moveTo(...P(-0.13, -0.10)); ctx.lineTo(...P(0, 0.04)); ctx.lineTo(...P(0.13, -0.10));
    ctx.lineWidth = 16 * lineW; ctx.stroke();
    const star = (x, y, r) => {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
        const [px, py] = P(x + Math.cos(a) * rr, y - Math.sin(a) * rr);
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath(); ctx.fillStyle = hi; ctx.fill();
    };
    star(-0.07, 0.12, 0.035); star(0.07, 0.12, 0.035); star(0, -0.17, 0.04);
    // coroa
    ctx.fillStyle = hi;
    for (const [x, y, r] of [[0, 0.40, 0.03], [-0.13, 0.36, 0.024], [0.13, 0.36, 0.024]]) {
      ctx.beginPath(); ctx.arc(...P(x, y), r * N, 0, Math.PI * 2); ctx.fill();
    }
    ctx.lineWidth = 8 * lineW; ctx.beginPath(); ctx.moveTo(...P(-0.17, 0.29)); ctx.quadraticCurveTo(...P(0, 0.33), ...P(0.17, 0.29)); ctx.stroke();
    // volutas das asas
    for (const sx of [1, -1]) {
      ctx.lineWidth = 7 * lineW;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.moveTo(...P(sx * (0.19 + k * 0.035), 0.26 - k * 0.03));
        ctx.bezierCurveTo(...P(sx * (0.36 + k * 0.01), 0.20 - k * 0.05), ...P(sx * (0.38), -0.02 - k * 0.04), ...P(sx * (0.27 + k * 0.02), -0.16 - k * 0.025));
        ctx.stroke();
      }
    }
  };
  const col = makeCanvas(N), hgt = makeCanvas(N);
  draw(col.getContext('2d'), '#2b2d31', '#d7dade', '#4a4d53');
  const hctx = hgt.getContext('2d');
  draw(hctx, '#404040', '#ffffff', '#909090', 1.15);
  hctx.filter = 'blur(3px)'; hctx.drawImage(hgt, 0, 0); hctx.filter = 'none';
  // rugosidade: relevo polido (mais liso), fundo acetinado. glTF: G = roughness, B = metalness
  const rm = makeCanvas(N), rctx = rm.getContext('2d');
  draw(rctx, 'rgb(0,150,255)', 'rgb(0,60,255)', 'rgb(0,110,255)');
  return {
    map: toTexture(col, { mime: 'image/png' }),
    normalMap: toTexture(heightToNormal(hgt, 6.0), { srgb: false }),
    roughnessMap: toTexture(rm, { srgb: false }),
  };
}

// ── Montagem ───────────────────────────────────────────────────────────────
export function buildSupremacy() {
  const { W, D, H, bevel: b } = DIM;
  const root = new THREE.Group();
  root.name = 'SupremacyCollectorsEdition';
  root.userData = {
    product: "Afnan Supremacy Collector's Edition EDP 100 ml",
    units: '1 unidade = altura total do frasco; base em y=0; frente em +Z',
    source: 'Modelo procedural gerado por tools/glb (LR Imports)',
    note: 'Brasão estilizado/aproximado; substituir pela arte oficial se disponível.',
  };

  // Materiais
  const stone = stoneTextures();
  const stoneMat = new THREE.MeshPhysicalMaterial({
    name: 'SpeckledStoneLacquer', map: stone.map, normalMap: stone.normalMap,
    normalScale: new THREE.Vector2(0.35, 0.35), roughness: 0.58, metalness: 0.0,
    clearcoat: 0.35, clearcoatRoughness: 0.32,
  });
  const pianoBlack = new THREE.MeshPhysicalMaterial({
    name: 'PianoBlack', color: '#0b0c0e', roughness: 0.22, metalness: 0.35, clearcoat: 1.0, clearcoatRoughness: 0.06,
  });
  const ringMat = new THREE.MeshPhysicalMaterial({
    name: 'BlackChromeRing', color: '#141518', roughness: 0.16, metalness: 0.85, clearcoat: 0.6, clearcoatRoughness: 0.08,
  });

  // Corpo
  const Wi = W - 2 * b, Hi = H - 2 * b;
  const L = -Wi / 2, R = Wi / 2, B = b, T = b + Hi;
  const prof = roundedPolygon([
    [L, B, 0.02],
    [R, B, 0.02],
    [R, B + 0.80 * Hi, 0.035],                // início do chanfro (ombro direito)
    [R - 0.235 * Wi, T, 0.035],               // fim do chanfro
    [L + 0.03, T, 0.03],
    [L, T - 0.035, 0.02],                     // pequeno degrau no ombro esquerdo
  ]);
  const depthCore = D - 2 * b;
  let bodyGeo = new THREE.ExtrudeGeometry(prof, {
    depth: depthCore, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 8, curveSegments: 20,
  });
  bodyGeo.translate(0, 0, -depthCore / 2);
  const uv = bodyGeo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / DIM.uvTile + 0.37, uv.getY(i) / DIM.uvTile + 0.11);
  bodyGeo = smoothNormals(bodyGeo);
  const body = new THREE.Mesh(bodyGeo, stoneMat);
  body.name = 'Body';

  const bottle = new THREE.Group();
  bottle.name = 'Bottle';
  bottle.add(body);

  const frontZ = D / 2;

  // Tipografia frontal (decal com alpha mask)
  const layout = { y0: 0.055 * H, supremacy: 0.27 * H, edition: 0.185 * H, afnan: 0.115 * H };
  const lw = 0.78 * W, lh = 0.27 * H;
  const labelTex = labelTexture(lw, lh, layout);
  const labelMat = new THREE.MeshStandardMaterial({
    name: 'SilverInk', map: labelTex, color: '#ffffff', metalness: 0.45, roughness: 0.32,
    emissive: '#ffffff', emissiveIntensity: 0.08, emissiveMap: labelTex,
    alphaTest: 0.5, transparent: false,
  });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(lw, lh), labelMat);
  label.name = 'Label';
  label.position.set(0, layout.y0 + lh / 2, frontZ + 0.0006);
  bottle.add(label);

  // Brasão em relevo
  const { shape: crestShape, half } = crestOutline();
  const crestSize = 0.118;
  let crestGeo = new THREE.ExtrudeGeometry(crestShape, {
    depth: 0.03, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.012, bevelSegments: 4, curveSegments: 24,
  });
  const cuv = crestGeo.attributes.uv;
  for (let i = 0; i < cuv.count; i++) cuv.setXY(i, cuv.getX(i) + 0.5, cuv.getY(i) + 0.5);
  crestGeo.scale(crestSize, crestSize, crestSize * 0.6);
  crestGeo = smoothNormals(crestGeo);
  const ct = crestTextures(half);
  const crestMat = new THREE.MeshStandardMaterial({
    name: 'CrestGunmetal', map: ct.map, normalMap: ct.normalMap, roughnessMap: ct.roughnessMap,
    metalnessMap: ct.roughnessMap, metalness: 1.0, roughness: 1.0, normalScale: new THREE.Vector2(1.2, 1.2),
  });
  const crest = new THREE.Mesh(crestGeo, crestMat);
  crest.name = 'Crest';
  crest.position.set(0, 0.885 * H - 0.012, frontZ - 0.0005);
  bottle.add(crest);
  root.add(bottle);

  // Gargalo
  const { collar, ring, stem } = DIM;
  const collarMesh = new THREE.Mesh(new RoundedBoxGeometry(collar.w, collar.h, collar.d, 4, 0.008), pianoBlack);
  collarMesh.name = 'Collar';
  collarMesh.position.set(0, H + collar.h / 2 - 0.002, 0);
  root.add(collarMesh);

  // Tampa (grupo animável: haste + anel)
  const cap = new THREE.Group();
  cap.name = 'Cap';
  // anel por revolução de um perfil retangular arredondado (sem costura)
  const ringGeo = ringGeometry(ring.r, ring.R, ring.depth, 0.008);
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.name = 'CapRing';
  const ringCy = H + collar.h + ring.R - 0.004;
  ringMesh.position.set(0, ringCy, 0);
  cap.add(ringMesh);

  const stemH = ringCy + 0.012 - (H + collar.h - 0.002);
  const stemMesh = new THREE.Mesh(new RoundedBoxGeometry(stem.w, stemH, stem.d, 4, 0.006), pianoBlack);
  stemMesh.name = 'CapStem';
  stemMesh.position.set(0, H + collar.h - 0.002 + stemH / 2, 0);
  cap.add(stemMesh);
  root.add(cap);

  // normaliza: altura total = 1, base em y = 0
  const box = new THREE.Box3().setFromObject(root);
  const s = 1 / (box.max.y - box.min.y);
  root.scale.setScalar(s);
  root.position.y = -box.min.y * s;
  root.updateMatrixWorld(true);
  return root;
}
