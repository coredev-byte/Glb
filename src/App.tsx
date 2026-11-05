import { useEffect, useRef, useState } from 'react';
import { Film } from './components/Film';
import { Overlay2D } from './components/Overlay2D';
import { clock, isRenderMode } from './engine/clock';
import { DURATION, FPS, scenes, sceneAt, TOTAL_FRAMES, vo } from './config/timeline';
import { assets } from './config/assets';

const fmtTime = (t: number) => {
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`;
};

function useClock() {
  const [t, setT] = useState(clock.t);
  useEffect(() => { const un = clock.subscribe((v) => setT(v)); return () => { un(); }; }, []);
  return t;
}

/** Moldura 1080×1920 escalada para caber na tela (o conteúdo interno sempre trabalha em 1080×1920). */
function Frame({ children, scale }: { children: React.ReactNode; scale: number }) {
  return (
    <div className="frame-wrap" style={{ width: 1080 * scale, height: 1920 * scale }}>
      <div id="frame" className="frame" style={{ transform: `scale(${scale})` }}>{children}</div>
    </div>
  );
}

function RenderApp() {
  return (
    <div id="frame" className="frame render">
      <Film quality="high" />
      <Overlay2D />
    </div>
  );
}

function PreviewApp() {
  const t = useClock();
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [quality, setQuality] = useState<'draft' | 'high'>('draft');
  const [safe, setSafe] = useState(false);
  const [muted, setMuted] = useState(false);
  const [scale, setScale] = useState(0.4);

  useEffect(() => {
    const fit = () => setScale(Math.min((window.innerHeight - 24) / 1920, (window.innerWidth - 24) / 1080, 0.6));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const play = () => {
    if (clock.t >= DURATION - 0.05) clock.set(0);
    clock.playing = true; clock.rate = rate; setPlaying(true);
    const a = audio.current!;
    a.currentTime = clock.t; a.playbackRate = rate; a.muted = muted;
    a.play().catch(() => {});
  };
  const pause = () => { clock.playing = false; setPlaying(false); audio.current?.pause(); };
  const seek = (v: number) => { clock.set(v); if (audio.current) audio.current.currentTime = v; };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); clock.playing ? pause() : play(); }
      if (e.code === 'ArrowRight') seek(Math.min(DURATION, clock.t + (e.shiftKey ? 1 : 1 / FPS)));
      if (e.code === 'ArrowLeft') seek(Math.max(0, clock.t - (e.shiftKey ? 1 : 1 / FPS)));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  useEffect(() => { if (!clock.playing && playing) setPlaying(false); }, [t, playing]);

  const frame = Math.round(t * FPS);
  const cur = sceneAt(t);
  const line = vo.find((l) => t >= l.start && t <= l.end);

  return (
    <div className="preview">
      <Frame scale={scale}>
        <Film quality={quality} audio={audio.current} />
        <Overlay2D safeZone={safe} />
      </Frame>
      <aside className="panel">
        <h1>LR Imports <span>Motion 3D</span></h1>
        <div className="time">{fmtTime(t)} <small>/ {fmtTime(DURATION)}</small></div>
        <div className="frameno">frame {frame} / {TOTAL_FRAMES} · {cur.id.toUpperCase()} — {cur.name}</div>
        <input className="scrub" type="range" min={0} max={TOTAL_FRAMES - 1} value={frame}
          onChange={(e) => seek(Number(e.target.value) / FPS)} />
        <div className="row">
          <button className="primary" onClick={() => (playing ? pause() : play())}>{playing ? 'Pausar' : 'Play'}</button>
          <button onClick={() => seek(Math.max(0, t - 1 / FPS))}>−1 frame</button>
          <button onClick={() => seek(Math.min(DURATION, t + 1 / FPS))}>+1 frame</button>
        </div>
        <div className="row">
          <label>Velocidade
            <select value={rate} onChange={(e) => { const r = Number(e.target.value); setRate(r); clock.rate = r; if (audio.current) audio.current.playbackRate = r; }}>
              <option value={0.25}>0,25×</option><option value={0.5}>0,5×</option><option value={1}>1×</option>
            </select>
          </label>
          <label>Qualidade
            <select value={quality} onChange={(e) => setQuality(e.target.value as any)}>
              <option value="draft">Rascunho</option><option value="high">Final</option>
            </select>
          </label>
        </div>
        <div className="row">
          <label className="check"><input type="checkbox" checked={safe} onChange={(e) => setSafe(e.target.checked)} /> Zona segura</label>
          <label className="check"><input type="checkbox" checked={muted} onChange={(e) => { setMuted(e.target.checked); if (audio.current) audio.current.muted = e.target.checked; }} /> Mudo</label>
        </div>
        <div className="scenes">
          {scenes.map((s) => (
            <button key={s.id} className={s.id === cur.id ? 'on' : ''} onClick={() => seek(s.start + 0.001)}>
              <b>{s.id.slice(1)}</b> {s.name} <small>{s.start.toFixed(1)}s</small>
            </button>
          ))}
        </div>
        <div className="vo">{line ? <>“{line.text}” <small>{line.tags}</small></> : <span className="muted">— pausa —</span>}</div>
        <audio ref={audio} src={assets.audio.mix} preload="auto" />
      </aside>
    </div>
  );
}

export function App() {
  return isRenderMode ? <RenderApp /> : <PreviewApp />;
}
