/**
 * Números 3D: contador (R$ e %) e dígitos mecânicos tipo letreiro de aeroporto (rolagem com máscara).
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CAP, Text3D, Weight, advance, glyphGeometry } from './Text3D';
import { clock } from '../engine/clock';
import { brl } from '../config/pricing-data';
import { clamp } from '../motion/easings';

export interface CounterProps {
  from?: number; to: number; t0: number; t1: number; ease?: (u: number) => number;
  format?: 'brl' | 'brl-nosym' | 'pct' | 'int'; prefix?: string; suffix?: string;
  size?: number; weight?: Weight; depth?: number; bevel?: number; tracking?: number; material: THREE.Material;
  align?: 'left' | 'center' | 'right'; position?: [number, number, number]; charAnim?: any; visibleFn?: (t: number) => boolean;
}

export const fmt = (v: number, f: CounterProps['format']) =>
  f === 'brl' ? brl(v) : f === 'brl-nosym' ? brl(v, false) : f === 'pct' ? `+${v.toFixed(1).replace('.', ',')}%` : String(Math.round(v));

export function AnimatedNumber3D({ from = 0, to, t0, t1, ease = (u) => 1 - Math.pow(1 - u, 3), format = 'brl', prefix = '', suffix = '', ...rest }: CounterProps) {
  const textFn = (t: number) => {
    const u = ease(clamp((t - t0) / (t1 - t0)));
    let v = from + (to - from) * u;
    if (u >= 1) v = to;
    // arredonda ao centavo para não "tremer" dígitos de forma não determinística
    v = Math.round(v * 100) / 100;
    return prefix + fmt(v, format) + suffix;
  };
  return <Text3D textFn={textFn} {...rest} />;
}

/**
 * Dígitos mecânicos: cada posição é um tambor 0–9 que rola verticalmente; uma janela (planos de recorte)
 * mostra só o dígito atual. `valueFn` devolve o número (float, com casas decimais) em cada instante.
 */
export function RollingDigits3D({
  valueFn, digits = 3, decimals = 2, size = 0.5, weight = 'bold' as Weight, depth = 0.16, bevel = 0.01, material, position,
}: { valueFn: (t: number) => number; digits?: number; decimals?: number; size?: number; weight?: Weight; depth?: number; bevel?: number; material: THREE.Material; position?: [number, number, number] }) {
  const group = useRef<THREE.Group>(null!);
  const planes = useMemo(() => [new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)], []);
  const mat = useMemo(() => { const m = material.clone(); m.clippingPlanes = planes; return m; }, [material, planes]);
  const style = { weight, depth, bevel };
  const lineH = CAP + 0.55;
  const cols = useMemo(() => {
    const out: { x: number; isComma: boolean }[] = [];
    let x = 0;
    const wDigit = advance('0', weight);
    for (let i = 0; i < digits; i++) { out.push({ x, isComma: false }); x += wDigit; }
    out.push({ x, isComma: true }); x += advance(',', weight);
    for (let i = 0; i < decimals; i++) { out.push({ x, isComma: false }); x += wDigit; }
    return { list: out, width: x };
  }, [digits, decimals, weight]);
  const drums = useMemo(() => cols.list.map((c) => {
    const g = new THREE.Group();
    g.position.x = c.x - cols.width / 2;
    if (c.isComma) {
      g.add(new THREE.Mesh(glyphGeometry(',', style), mat));
    } else {
      for (let d = 0; d <= 10; d++) {
        const m = new THREE.Mesh(glyphGeometry(String(d % 10), style), mat);
        m.position.y = -d * lineH;
        g.add(m);
      }
    }
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [cols, mat]);
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  useFrame(() => {
    const t = clock.t;
    const val = Math.max(0, valueFn(t));
    const cents = Math.round(val * 100);
    const str = String(cents).padStart(digits + decimals, '0');
    const frac = val * 100 - Math.floor(val * 100);
    let di = 0;
    drums.forEach((g, i) => {
      if (cols.list[i].isComma) return;
      const place = digits + decimals - 1 - di; // potência de 10
      const raw = (val * 100) / Math.pow(10, place);
      const digit = Number(str[di]);
      // rolagem contínua do tambor (dígito + fração do próximo), estilo odômetro
      const next = place === 0 ? frac : Math.max(0, (raw % 1) * 10 - 9);
      g.position.y = (digit + clamp(next)) * lineH * 1;
      di++;
    });
    // janela de recorte em coordenadas de mundo
    group.current.updateMatrixWorld();
    const s = group.current.matrixWorld;
    const up = n.set(0, 1, 0).transformDirection(s);
    const top = v.set(0, CAP + 0.14, 0).applyMatrix4(s);
    planes[0].setFromNormalAndCoplanarPoint(up.clone().negate(), top);
    const bot = v.set(0, -0.3, 0).applyMatrix4(s);
    planes[1].setFromNormalAndCoplanarPoint(up, bot);
  }, 0.5);
  return (
    <group ref={group} position={position} scale={size}>
      {drums.map((g, i) => <primitive key={i} object={g} />)}
    </group>
  );
}
