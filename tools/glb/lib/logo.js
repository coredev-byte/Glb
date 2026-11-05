// Logo LR Importados em 3D — extrudada a partir do vetor traçado da logo oficial enviada.
// Convenção: largura da arte = 1 unidade, centralizada na origem, de pé no plano XY, frente em +Z.
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { makeCanvas, toTexture, heightToNormal, rng } from './canvas.js';

/** Ouro escovado sutil (variação de rugosidade + micro-relevo horizontal). */
function brushedGold(N = 512) {
  const rand = rng(7);
  const rm = makeCanvas(N), h = makeCanvas(N);
  const r = rm.getContext('2d'), hc = h.getContext('2d');
  r.fillStyle = 'rgb(0,80,255)'; r.fillRect(0, 0, N, N);
  hc.fillStyle = '#808080'; hc.fillRect(0, 0, N, N);
  for (let i = 0; i < 1400; i++) {
    const y = rand() * N, x = rand() * N, len = 40 + rand() * 260, g = 60 + rand() * 50 | 0, a = 0.15 + rand() * 0.25;
    r.strokeStyle = `rgba(0,${g},255,${a})`; r.lineWidth = 1 + rand();
    r.beginPath(); r.moveTo(x, y); r.lineTo(x + len, y); r.stroke();
    const v = 110 + rand() * 40 | 0;
    hc.strokeStyle = `rgba(${v},${v},${v},${a})`; hc.lineWidth = 1;
    hc.beginPath(); hc.moveTo(x, y); hc.lineTo(x + len, y); hc.stroke();
  }
  return {
    roughnessMap: toTexture(rm, { srgb: false, repeat: true }),
    normalMap: toTexture(heightToNormal(h, 1.2, true), { srgb: false, repeat: true }),
  };
}

export async function buildLogo(svgUrl) {
  const text = await (await fetch(svgUrl)).text();
  const data = new SVGLoader().parse(text);
  const vb = text.match(/viewBox="([\d.\s-]+)"/)[1].split(/\s+/).map(Number);
  const [, , vw, vh] = vb;
  const scale = 1 / vw;

  const shapes = [];
  for (const p of data.paths) shapes.push(...SVGLoader.createShapes(p));

  const depth = 22, bevel = 5; // em px do SVG (largura total ~2356 px)
  let geo = new THREE.ExtrudeGeometry(shapes, {
    depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 2, curveSegments: 3,
  });
  // centraliza e gira 180° em X (SVG tem y para baixo)
  geo.translate(-vw / 2, -vh / 2, -depth / 2);
  geo.rotateX(Math.PI);
  geo.scale(scale, scale, scale);
  // UV planar para o ouro escovado
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) * 3, pos.getY(i) * 3);
  geo.computeVertexNormals();

  const brushed = brushedGold();
  const gold = new THREE.MeshPhysicalMaterial({
    name: 'LR_Gold', color: '#e7bf73', metalness: 1.0, roughness: 1.0, roughnessMap: brushed.roughnessMap,
    normalMap: brushed.normalMap, normalScale: new THREE.Vector2(0.25, 0.25), clearcoat: 0.25, clearcoatRoughness: 0.2,
  });
  const logo = new THREE.Mesh(geo, gold);
  logo.name = 'LogoGold';

  // disco preto opcional (o selo circular do perfil) — pode ser ocultado no motion
  const R = 0.6, discDepth = 0.02;
  const discShape = new THREE.Shape().absarc(0, 0, R, 0, Math.PI * 2, false);
  const discGeo = new THREE.ExtrudeGeometry(discShape, {
    depth: discDepth, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 4, curveSegments: 96,
  });
  discGeo.translate(0, 0, -discDepth - 0.008 - (depth / 2) * scale - 0.002);
  const black = new THREE.MeshPhysicalMaterial({
    name: 'BadgeBlack', color: '#07080a', roughness: 0.3, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1,
  });
  const disc = new THREE.Mesh(discGeo, black);
  disc.name = 'BadgeDisc';
  disc.position.set(-0.014, -0.013, 0); // centro do selo original vs. recorte da arte

  const root = new THREE.Group();
  root.name = 'LRImportsLogo';
  root.userData = {
    brand: 'LR Importados (@lr.imports.mt)',
    units: 'largura da arte = 1 unidade; centrada na origem; frente em +Z',
    nodes: 'LogoGold = letreiro dourado extrudado; BadgeDisc = selo preto opcional',
    source: 'Vetorizado (potrace) de public/brand/lr-imports-logo-original.jpg',
  };
  root.add(disc, logo);
  return root;
}
