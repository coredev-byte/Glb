/**
 * Relógio global ÚNICO do filme. Tudo (câmera, partículas, luzes, textos) é função pura de `clock.t`.
 * O preview avança o relógio em tempo real; a exportação define o tempo exato de cada frame.
 */
type Listener = (t: number) => void;

export const clock = {
  t: 0,
  playing: false,
  rate: 1,
  listeners: new Set<Listener>(),
  set(t: number) {
    this.t = t;
    this.listeners.forEach((l) => l(t));
  },
  subscribe(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  },
};

export const isRenderMode = new URLSearchParams(location.search).has('render');
