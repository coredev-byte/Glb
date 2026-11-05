/**
 * Tipografia 3D de verdade: cada caractere é uma malha extrudada (com bevel) gerada da fonte Inter Tight.
 * Geometrias ficam em cache por glifo, então números que mudam a cada frame (contadores, dígitos mecânicos)
 * continuam rápidos e 100% determinísticos — nada assíncrono depois do carregamento.
 */
import { forwardRef, useImperativeHandle, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { TTFLoader } from 'three/examples/jsm/loaders/TTFLoader.js';
import { Font, FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { assets } from '../config/assets';
import { clock } from '../engine/clock';

export type Weight = 'light' | 'medium' | 'bold' | 'black';
const fonts: Partial<Record<Weight, Font>> = {};
/** Altura das versais em unidades de tamanho 1 (medida da fonte ao carregar; ≈1,01 na Inter Tight). */
export let CAP = 1.01;

export async function loadFonts() {
  const ttf = new TTFLoader();
  await Promise.all(
    (Object.keys(assets.fonts) as Weight[]).map(async (w) => {
      const buf = await (await fetch(assets.fonts[w])).arrayBuffer();
      fonts[w] = new FontLoader().parse(ttf.parse(buf));
    }),
  );
  // aliases tipográficos que o conversor TTF não mapeia (mesmo glifo, outro code point)
  for (const f of Object.values(fonts)) {
    const g = (f as any).data.glyphs;
    g['\u2019'] = g['\u2019'] || g['\u02BC'] || g["'"];
    g['\u2018'] = g['\u2018'] || g['\u02BB'] || g["'"];
  }
  const pts = fonts.bold!.generateShapes('H', 1).flatMap((sh) => sh.getPoints());
  CAP = Math.max(...pts.map((p) => p.y));
}

export interface GlyphStyle { weight: Weight; depth: number; bevel: number }
const glyphCache = new Map<string, THREE.BufferGeometry>();

/** Geometria de um glifo em tamanho 1 (altura de versal = CAP). */
export function glyphGeometry(ch: string, s: GlyphStyle) {
  const key = `${s.weight}|${s.depth}|${s.bevel}|${ch}`;
  let g = glyphCache.get(key);
  if (g) return g;
  const font = fonts[s.weight]!;
  const shapes = font.generateShapes(ch, 1);
  if (!shapes.length) {
    g = new THREE.BufferGeometry();
  } else {
    g = new THREE.ExtrudeGeometry(shapes, {
      depth: s.depth,
      curveSegments: 6,
      bevelEnabled: s.bevel > 0,
      bevelThickness: s.bevel,
      bevelSize: s.bevel * 0.6,
      bevelSegments: 3,
    });
    g.translate(0, 0, -s.depth / 2);
    g.computeVertexNormals();
  }
  glyphCache.set(key, g);
  return g;
}

export function advance(ch: string, weight: Weight) {
  const font = fonts[weight]!;
  const data = (font as any).data;
  const glyph = data.glyphs[ch] || data.glyphs['?'];
  return glyph.ha / data.resolution;
}

/** Largura de um texto (em unidades de tamanho 1). */
export function measure(text: string, weight: Weight, tracking = 0) {
  let w = 0;
  const chars = [...text];
  chars.forEach((c, i) => { w += advance(c, weight) + (i < chars.length - 1 ? tracking : 0); });
  return w;
}

export interface Text3DHandle {
  group: THREE.Group;
  chars: THREE.Mesh[];
  width: number;
  material: THREE.Material;
}

export interface Text3DProps {
  text?: string;
  /** Texto dinâmico avaliado a cada frame a partir do relógio global. */
  textFn?: (t: number) => string;
  size?: number;
  weight?: Weight;
  depth?: number;
  bevel?: number;
  tracking?: number; // em fração do tamanho
  align?: 'left' | 'center' | 'right';
  /** Altura da linha de base: 'baseline' (y=0 na base) ou 'middle' (centro das versais em y=0). */
  anchorY?: 'baseline' | 'middle';
  material: THREE.Material;
  /** Animação por caractere (reveal, stagger…). Chamado a cada frame. */
  charAnim?: (t: number, i: number, n: number, mesh: THREE.Mesh) => void;
  /** Planos de recorte (máscara espacial). */
  clip?: THREE.Plane[];
  position?: [number, number, number];
  rotation?: [number, number, number];
  visibleFn?: (t: number) => boolean;
  castShadow?: boolean;
  renderOrder?: number;
}

export const Text3D = forwardRef<Text3DHandle, Text3DProps>(function Text3D(
  {
    text = '', textFn, size = 1, weight = 'bold', depth = 0.18, bevel = 0.012, tracking = 0, align = 'center',
    anchorY = 'middle', material, charAnim, clip, position, rotation, visibleFn, renderOrder,
  },
  ref,
) {
  const group = useRef<THREE.Group>(null!);
  const inner = useRef<THREE.Group>(null!);
  const state = useRef({ text: '\u0000', meshes: [] as THREE.Mesh[], width: 0 });
  const style = useMemo(() => ({ weight, depth, bevel }), [weight, depth, bevel]);
  const mat = useMemo(() => {
    const m = material.clone();
    if (clip) { m.clippingPlanes = clip; m.clipShadows = true; }
    return m;
  }, [material, clip]);

  const layout = (str: string) => {
    const s = state.current;
    if (str === s.text) return;
    s.text = str;
    const chars = [...str];
    while (s.meshes.length < chars.length) {
      const m = new THREE.Mesh(undefined, mat);
      if (renderOrder !== undefined) m.renderOrder = renderOrder;
      inner.current.add(m);
      s.meshes.push(m);
    }
    const tr = tracking;
    let x = 0;
    chars.forEach((c, i) => {
      const m = s.meshes[i];
      m.geometry = glyphGeometry(c, style);
      m.visible = c !== ' ';
      m.userData.baseX = x;
      m.userData.adv = advance(c, weight);
      m.position.set(x, 0, 0);
      x += m.userData.adv + (i < chars.length - 1 ? tr : 0);
    });
    for (let i = chars.length; i < s.meshes.length; i++) s.meshes[i].visible = false;
    s.width = x;
    const ox = align === 'center' ? -x / 2 : align === 'right' ? -x : 0;
    const oy = anchorY === 'middle' ? -CAP / 2 : 0;
    inner.current.position.set(ox, oy, 0);
  };

  useLayoutEffect(() => {
    state.current.text = '\u0000';
    layout(textFn ? textFn(clock.t) : text);
    return () => { state.current.meshes.forEach((m) => inner.current?.remove(m)); state.current.meshes = []; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, style, mat, tracking, align, anchorY]);

  useFrame(() => {
    const t = clock.t;
    if (visibleFn) group.current.visible = visibleFn(t);
    if (!group.current.visible) return;
    if (textFn) layout(textFn(t));
    if (charAnim) {
      const s = state.current;
      const n = [...s.text].length;
      for (let i = 0; i < n; i++) {
        const m = s.meshes[i];
        m.position.set(m.userData.baseX, 0, 0);
        m.rotation.set(0, 0, 0);
        m.scale.setScalar(1);
        charAnim(t, i, n, m);
      }
    }
  });

  useImperativeHandle(ref, () => ({
    get group() { return group.current; },
    get chars() { return state.current.meshes; },
    get width() { return state.current.width * size; },
    material: mat,
  }), [mat, size]);

  return (
    <group ref={group} position={position} rotation={rotation}>
      <group scale={size}>
        <group ref={inner} />
      </group>
    </group>
  );
});

/** Materiais tipográficos compartilhados. */
export const textMaterials = {
  ice: () => new THREE.MeshStandardMaterial({ color: '#F4F4F1', roughness: 0.4, metalness: 0.05, emissive: '#F4F4F1', emissiveIntensity: 0.1 }),
  silver: () => new THREE.MeshPhysicalMaterial({ color: '#D9DCE1', roughness: 0.24, metalness: 1, clearcoat: 0.4, clearcoatRoughness: 0.2, emissive: '#9298A3', emissiveIntensity: 0.06 }),
  matteMetal: () => new THREE.MeshPhysicalMaterial({ color: '#C9CDD3', roughness: 0.42, metalness: 1, clearcoat: 0.7, clearcoatRoughness: 0.08, emissive: '#2a2d33', emissiveIntensity: 0.25 }),
  amber: () => new THREE.MeshPhysicalMaterial({ color: '#D2A66B', roughness: 0.28, metalness: 1, clearcoat: 0.5, clearcoatRoughness: 0.15, emissive: '#5a3f1c', emissiveIntensity: 0.25 }),
  graphite: () => new THREE.MeshStandardMaterial({ color: '#9298A3', roughness: 0.5, metalness: 0.4, emissive: '#3a3e46', emissiveIntensity: 0.4 }),
};
