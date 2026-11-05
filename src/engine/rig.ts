/** Estado do rig de luzes do estúdio — as cenas escrevem, o componente <Studio/> aplica. */
type V3 = [number, number, number];
export interface SpotState { pos: V3; target: V3; intensity: number; color: string; angle: number; penumbra: number }

const spot = (pos: V3, target: V3, intensity: number, color = '#ffffff', angle = 0.5, penumbra = 0.8): SpotState =>
  ({ pos, target, intensity, color, angle, penumbra });

export const rig = {
  key: spot([2.5, 4, 3], [0, 0.5, 0], 40),
  rimL: spot([-3, 2.5, -2.5], [0, 0.6, 0], 60, '#dfe6ff', 0.4),
  rimR: spot([3, 2.5, -2.5], [0, 0.6, 0], 60, '#dfe6ff', 0.4),
  sweep: spot([0, 3, 4], [0, 0.5, 0], 0, '#fff1dc', 0.18, 0.6),
  top: spot([0, 6, 0.5], [0, 0, 0], 20, '#ffffff', 0.45, 1),
  fill: 0.25,
  fillColor: '#9fb0ff',
  floor: 1,            // visibilidade do piso refletivo (0..1)
  floorY: 0,
  dust: 0.6,           // intensidade das partículas
  dustColor: '#ffe9c7',
  bg: '#060709',
  glow: 0.0,           // brilho radial atrás do assunto
  glowColor: '#1d2230',
  glowPos: [0, 1.2, -4] as V3,
};
