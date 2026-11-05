/**
 * Arquitetura da fragrância: esculturas 3D estilizadas para cada nota oficial do Supremacy
 * (abertura / coração / base), com rótulos minimalistas, órbitas controladas e arcos de conexão.
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { clock } from '../engine/clock';
import { Text3D, textMaterials } from './Text3D';
import { rng } from '../motion/sequencing';
import { clamp, ease } from '../motion/easings';

// ── texturas procedurais ──────────────────────────────────────────────────
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const pineappleTex = () => canvasTex(512, 512, (g) => {
  g.fillStyle = '#a8742c'; g.fillRect(0, 0, 512, 512);
  for (let y = -1; y < 9; y++) for (let x = -1; x < 9; x++) {
    const cx = x * 64 + (y % 2) * 32, cy = y * 64;
    const gr = g.createRadialGradient(cx, cy, 4, cx, cy, 36);
    gr.addColorStop(0, '#e2b45a'); gr.addColorStop(0.7, '#a8742c'); gr.addColorStop(1, '#5b3b14');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(cx, cy - 34); g.lineTo(cx + 32, cy); g.lineTo(cx, cy + 34); g.lineTo(cx - 32, cy); g.closePath(); g.fill();
    g.fillStyle = '#3d2a10'; g.beginPath(); g.arc(cx, cy, 3, 0, 7); g.fill();
  }
});

const birchTex = () => canvasTex(512, 256, (g) => {
  g.fillStyle = '#e9e6de'; g.fillRect(0, 0, 512, 256);
  const r = rng(9);
  for (let i = 0; i < 70; i++) {
    g.fillStyle = `rgba(30,28,25,${0.4 + r() * 0.5})`;
    const x = r() * 512, y = r() * 256, w = 10 + r() * 50;
    g.fillRect(x, y, w, 2 + r() * 5);
  }
});

// ── esculturas ────────────────────────────────────────────────────────────
type MatFactory = () => THREE.Material;
const M = {
  gold: () => new THREE.MeshPhysicalMaterial({ color: '#d9aa62', metalness: 1, roughness: 0.25, clearcoat: 0.6 }),
  leaf: () => new THREE.MeshPhysicalMaterial({ color: '#3f6b3a', roughness: 0.45, metalness: 0.1, clearcoat: 0.5 }),
  petal: () => new THREE.MeshPhysicalMaterial({ color: '#f6f3ec', roughness: 0.35, sheen: 1, sheenColor: new THREE.Color('#ffffff'), clearcoat: 0.3 }),
  stamen: () => new THREE.MeshPhysicalMaterial({ color: '#e9b949', roughness: 0.4, metalness: 0.3 }),
  apple: () => new THREE.MeshPhysicalMaterial({ color: '#7e1717', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 }),
  berg: () => new THREE.MeshPhysicalMaterial({ color: '#b9bb3c', roughness: 0.55, clearcoat: 0.4, clearcoatRoughness: 0.3 }),
  amber: () => new THREE.MeshPhysicalMaterial({ color: '#c9822d', roughness: 0.12, metalness: 0, clearcoat: 1, emissive: '#6d3a0a', emissiveIntensity: 0.6, transparent: true, opacity: 0.92 }),
  moss: () => new THREE.MeshPhysicalMaterial({ color: '#69735a', roughness: 0.85 }),
  pearl: () => new THREE.MeshPhysicalMaterial({ color: '#efe9e0', roughness: 0.22, metalness: 0.1, iridescence: 0.6, clearcoat: 1, sheen: 0.6 }),
  stone: () => new THREE.MeshPhysicalMaterial({ color: '#b8afa0', roughness: 0.55, clearcoat: 0.6, clearcoatRoughness: 0.4 }),
};

function Flower({ petals = 5, len = 0.07, center = '#e9b949', stamens = false }) {
  const petal = useMemo(M.petal, []);
  const mid = useMemo(() => new THREE.MeshPhysicalMaterial({ color: center, roughness: 0.5 }), [center]);
  const st = useMemo(M.stamen, []);
  return (
    <group rotation-x={-0.5}>
      {Array.from({ length: petals }, (_, i) => (
        <group key={i} rotation-z={(i / petals) * Math.PI * 2}>
          <mesh material={petal} position={[0, len * 0.9, 0]} scale={[len * 0.45, len, len * 0.12]} rotation-x={0.25}>
            <sphereGeometry args={[1, 20, 12]} />
          </mesh>
        </group>
      ))}
      <mesh material={mid} scale={len * 0.28}><sphereGeometry args={[1, 16, 12]} /></mesh>
      {stamens && Array.from({ length: 7 }, (_, i) => (
        <group key={i} rotation-z={(i / 7) * Math.PI * 2}>
          <mesh material={st} position={[0, len * 0.35, len * 0.25]} rotation-x={0.9} scale={[0.004, len * 0.5, 0.004]}>
            <cylinderGeometry args={[1, 1, 1, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Pineapple() {
  const body = useMemo(() => new THREE.MeshPhysicalMaterial({ map: pineappleTex(), roughness: 0.4, metalness: 0.35, clearcoat: 0.6 }), []);
  const leaf = useMemo(M.leaf, []);
  return (
    <group>
      <mesh material={body} scale={[0.065, 0.09, 0.065]}><sphereGeometry args={[1, 32, 24]} /></mesh>
      {Array.from({ length: 9 }, (_, i) => (
        <group key={i} position-y={0.08} rotation-y={(i / 9) * Math.PI * 2}>
          <mesh material={leaf} rotation-z={0.25 + (i % 3) * 0.15} position={[0.012, 0.045, 0]} scale={[0.012, 0.06 + (i % 3) * 0.015, 0.004]}>
            <coneGeometry args={[1, 1.6, 4]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Apple() {
  const geo = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI;
      const r = Math.sin(a) * (1 + 0.15 * Math.sin(a * 2)) * 0.075;
      const y = -Math.cos(a) * 0.07 + (i === 0 || i === 24 ? (i ? -0.012 : 0.012) : 0);
      pts.push(new THREE.Vector2(Math.max(0.001, r), y));
    }
    return new THREE.LatheGeometry(pts, 40);
  }, []);
  const mat = useMemo(M.apple, []);
  const stem = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3a2a18', roughness: 0.8 }), []);
  return (
    <group>
      <mesh geometry={geo} material={mat} />
      <mesh material={stem} position={[0.004, 0.075, 0]} rotation-z={-0.25} scale={[0.004, 0.03, 0.004]}><cylinderGeometry args={[1, 1, 1, 6]} /></mesh>
    </group>
  );
}

function Bergamot() {
  const mat = useMemo(M.berg, []);
  return <mesh material={mat} scale={[0.07, 0.065, 0.07]}><icosahedronGeometry args={[1, 5]} /></mesh>;
}

function Birch() {
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ map: birchTex(), roughness: 0.7 }), []);
  const cut = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c99d63', roughness: 0.6 }), []);
  return (
    <group rotation-z={0.9}>
      <mesh material={[mat, cut, cut] as any} scale={[0.035, 0.16, 0.035]}><cylinderGeometry args={[1, 1, 1, 24]} /></mesh>
    </group>
  );
}

function Amber() {
  const mat = useMemo(M.amber, []);
  return <mesh material={mat} scale={[0.07, 0.05, 0.06]} rotation={[0.3, 0.5, 0.2]}><dodecahedronGeometry args={[1, 0]} /></mesh>;
}

function Moss() {
  const mat = useMemo(M.moss, []);
  const pts = useMemo(() => { const r = rng(5); return Array.from({ length: 26 }, () => [(r() - 0.5) * 0.11, r() * 0.04, (r() - 0.5) * 0.11, 0.012 + r() * 0.016]); }, []);
  return <group>{pts.map((p, i) => <mesh key={i} material={mat} position={[p[0], p[1], p[2]]} scale={p[3]}><icosahedronGeometry args={[1, 1]} /></mesh>)}</group>;
}

function Musk() {
  const mat = useMemo(M.pearl, []);
  return <mesh material={mat} scale={0.06}><sphereGeometry args={[1, 40, 28]} /></mesh>;
}

function Ambergris() {
  const geo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 4);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const k = 1 + 0.12 * Math.sin(x * 3 + y * 2) + 0.08 * Math.cos(z * 4 - x);
      p.setXYZ(i, x * k * 1.25, y * k * 0.7, z * k);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const mat = useMemo(M.stone, []);
  return <mesh geometry={geo} material={mat} scale={0.06} />;
}

// ── composição ────────────────────────────────────────────────────────────
export interface NoteDef { label: string; el: () => JSX.Element }
export const NOTE_GROUPS: { title: string; notes: NoteDef[] }[] = [
  { title: 'ABERTURA', notes: [
    { label: 'ABACAXI', el: () => <Pineapple /> },
    { label: 'BERGAMOTA', el: () => <Bergamot /> },
    { label: 'MAÇÃ', el: () => <Apple /> },
    { label: 'FLORES BRANCAS', el: () => <Flower /> },
  ] },
  { title: 'CORAÇÃO', notes: [
    { label: 'FLOR DE LARANJEIRA', el: () => <Flower petals={5} len={0.06} center="#f2c14e" stamens /> },
    { label: 'BÉTULA', el: () => <Birch /> },
    { label: 'ÂMBAR', el: () => <Amber /> },
  ] },
  { title: 'BASE', notes: [
    { label: 'MUSGO DE CARVALHO', el: () => <Moss /> },
    { label: 'ALMÍSCAR', el: () => <Musk /> },
    { label: 'ÂMBAR-GRIS', el: () => <Ambergris /> },
  ] },
];

export interface NotesProps {
  /** janelas [entrada, saída] de cada grupo (tempo absoluto) */
  windows: [number, number][];
  center?: [number, number, number];
  radius?: number;
}

/** Um grupo de notas orbitando o frasco em elipse inclinada, com rótulos e arcos até o frasco. */
function NoteRing({ group, win, gi, center, radius }: { group: (typeof NOTE_GROUPS)[number]; win: [number, number]; gi: number; center: [number, number, number]; radius: number }) {
  const root = useRef<THREE.Group>(null!);
  const items = useRef<THREE.Group[]>([]);
  const arcs = useRef<THREE.Mesh[]>([]);
  const labelMat = useMemo(() => textMaterials.ice(), []);
  const n = group.notes.length;
  const arcMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#CDD0D5', transparent: true, opacity: 0.5, toneMapped: false, depthWrite: false }), []);
  const yBase = [0.78, 0.5, 0.22][gi];
  useFrame(() => {
    const t = clock.t;
    const [a, b] = win;
    const vis = t > a - 0.05 && t < b + 0.6;
    root.current.visible = vis;
    if (!vis) return;
    const kin = ease.out(clamp((t - a) / 0.7));
    const kout = ease.in(clamp((t - b) / 0.55));
    const spin = (t - a) * 0.35;
    group.notes.forEach((_, i) => {
      const it = items.current[i];
      if (!it) return;
      const stag = ease.out(clamp((t - a - i * 0.09) / 0.6));
      const ang = spin + (i / n) * Math.PI * 2 + gi * 0.6 - Math.PI / 2 + (1 - stag) * 0.8;
      const r = radius * (0.55 + 0.45 * stag) * (1 + kout * 0.9);
      it.position.set(Math.cos(ang) * r, yBase + (i - (n - 1) / 2) * 0.13, Math.sin(ang) * r * 0.45);
      const s = stag * (1 - kout);
      it.scale.setScalar(Math.max(0.0001, s));
      it.children[0].rotation.y = t * 0.6 + i;
      const arc = arcs.current[i];
      if (arc) {
        // arco: escala do objeto até o eixo do frasco
        const L = Math.hypot(it.position.x, it.position.z);
        arc.position.set(it.position.x / 2, it.position.y, it.position.z / 2);
        arc.rotation.set(0, -Math.atan2(it.position.z, it.position.x), 0);
        arc.scale.set(Math.max(0.001, (L - 0.2) * kin), 1, 1);
        (arc.material as THREE.MeshBasicMaterial).opacity = 0.45 * kin * (1 - kout);
      }
    });
  });
  return (
    <group ref={root} position={center}>
      {group.notes.map((nd, i) => (
        <group key={i} ref={(el) => { if (el) items.current[i] = el; }}>
          <group>{nd.el()}</group>
          <Text3D text={nd.label} size={0.032} weight="medium" tracking={0.12} depth={0.008} bevel={0} material={labelMat} position={[0, -0.12, 0]} />
        </group>
      ))}
      {group.notes.map((_, i) => (
        <mesh key={`a${i}`} ref={(el) => { if (el) arcs.current[i] = el; }} material={arcMat}>
          <boxGeometry args={[1, 0.0025, 0.0025]} />
        </mesh>
      ))}
    </group>
  );
}

export function FragranceNotes3D({ windows, center = [0, 0, 0], radius = 0.72 }: NotesProps) {
  return (
    <group>
      {NOTE_GROUPS.map((g, gi) => <NoteRing key={g.title} group={g} win={windows[gi]} gi={gi} center={center} radius={radius} />)}
    </group>
  );
}

export type { MatFactory };
