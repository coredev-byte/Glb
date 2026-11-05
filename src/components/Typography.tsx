/**
 * Títulos 3D na camada HUD com revelação por máscara espacial: cada letra sobe de baixo de um plano de
 * recorte (a "linha de base") em stagger e sai atravessando o plano superior. Ajusta-se à zona segura.
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CAP, Text3D, Weight, measure, textMaterials } from './Text3D';
import { clamp, ease } from '../motion/easings';

export interface TitleLine {
  text: string; at: number; out?: number; size?: number; weight?: Weight; tracking?: number;
  material?: 'ice' | 'silver' | 'amber' | 'graphite' | 'matteMetal'; dy?: number;
}

const up = new THREE.Vector3(), p = new THREE.Vector3();

function MaskedLine({ line, y, maxW, stagger = 0.022 }: { line: TitleLine; y: number; maxW: number; stagger?: number }) {
  const group = useRef<THREE.Group>(null!);
  const planes = useMemo(() => [new THREE.Plane(), new THREE.Plane()], []);
  const mat = useMemo(() => textMaterials[line.material ?? 'ice'](), [line.material]);
  const weight = line.weight ?? 'bold';
  const tracking = line.tracking ?? 0.0;
  const raw = measure(line.text, weight, tracking);
  const size = Math.min(line.size ?? 0.08, maxW / raw);
  useFrame(() => {
    const g = group.current;
    g.updateWorldMatrix(true, false);
    up.set(0, 1, 0).transformDirection(g.matrixWorld);
    p.set(0, -CAP / 2 - 0.36, 0).multiplyScalar(size); // abaixo da linha de base (cedilha, vírgula)
    p.applyMatrix4(g.matrixWorld);
    planes[0].setFromNormalAndCoplanarPoint(up, p);
    p.set(0, CAP / 2 + 0.36, 0).multiplyScalar(size); // acima dos acentos
    p.applyMatrix4(g.matrixWorld);
    planes[1].setFromNormalAndCoplanarPoint(up.clone().negate(), p);
  }, 0.5);
  const n = [...line.text].length;
  const charAnim = (t: number, i: number, _n: number, m: THREE.Mesh) => {
    const kin = ease.out(clamp((t - line.at - i * stagger) / 0.55));
    const kout = line.out !== undefined ? ease.in(clamp((t - line.out - i * stagger * 0.5) / 0.4)) : 0;
    m.position.y = -(1 - kin) * (CAP + 0.85) + kout * (CAP + 0.9);
    m.position.z = (1 - kin) * -0.4;
    m.rotation.x = (1 - kin) * 0.5 - kout * 0.4;
  };
  return (
    <group ref={group} position={[0, y, 0]}>
      <Text3D text={line.text} size={size} weight={weight} tracking={tracking} depth={0.14} bevel={0.01} material={mat}
        clip={planes} charAnim={charAnim}
        visibleFn={(t) => t > line.at - 0.05 && (line.out === undefined || t < line.out + 0.45 + n * stagger * 0.5)} />
    </group>
  );
}

/** Bloco de título (várias linhas) em coordenadas HUD. */
export function HudTitle({ lines, y = 0.6, gap = 1.25, maxW = 0.86, x = 0 }: { lines: TitleLine[]; y?: number; gap?: number; maxW?: number; x?: number }) {
  let cursor = y;
  let prev = 0;
  const placed = lines.map((l, i) => {
    const s = l.size ?? 0.08;
    if (i > 0) cursor -= (prev * CAP * 0.5 + s * CAP * 0.5) * gap + Math.max(prev, s) * 0.18;
    prev = s;
    const yy = cursor + (l.dy ?? 0);
    return { l, yy };
  });
  return (
    <group position-x={x}>
      {placed.map(({ l, yy }, i) => <MaskedLine key={i} line={l} y={yy} maxW={maxW} />)}
    </group>
  );
}
