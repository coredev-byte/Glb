import { createRoot } from 'react-dom/client';
import { App } from './App';
import { loadFonts } from './components/Text3D';
import { clock, isRenderMode } from './engine/clock';
import { FPS } from './config/timeline';
import './styles.css';

async function boot() {
  await Promise.all([loadFonts(), document.fonts.ready]);
  const q = new URLSearchParams(location.search);
  if (q.has('t')) clock.set(Number(q.get('t')));
  if (isRenderMode) {
    // API usada pelo exportador (Playwright): define o tempo exato e renderiza um frame.
    const { advance } = await import('@react-three/fiber');
    (window as any).__renderFrame = async (frame: number) => {
      clock.set(frame / FPS);
      advance(performance.now());
      const gl = (window as any).__gl;
      gl?.getContext().finish();
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      return true;
    };
  }
  createRoot(document.getElementById('root')!).render(<App />);
}
boot();
