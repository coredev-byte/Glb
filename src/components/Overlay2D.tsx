/**
 * Camada 2D de composição (legendas, rodapé de fonte, CTA) — só para textos pequenos, onde a legibilidade
 * importa mais que o volume. Atualizada de forma imperativa pelo relógio global (determinística na exportação).
 */
import { useEffect, useRef } from 'react';
import { clock } from '../engine/clock';
import { brand } from '../config/brand';
import { pricingSample, pricingStats } from '../config/pricing-data';
import { clamp, ease } from '../motion/easings';

interface Item { key: string; from: number; to: number; fadeIn?: number; fadeOut?: number; rise?: number; className: string; html: string }

const items: Item[] = [
  {
    key: 'src3', from: 8.2, to: 13.2, className: 'ov-foot',
    html: `${pricingSample.product} · ${pricingStats.count} lojas brasileiras · coleta ${pricingSample.collectedAtLabel}`,
  },
  { key: 'cap4', from: 16.45, to: 17.75, className: 'ov-caption ov-top', html: 'Do menor ao maior preço da amostra.' },
  {
    key: 'src4', from: 13.9, to: 17.75, className: 'ov-foot ov-top2',
    html: `Amostra de ${pricingStats.count} lojas, ${pricingSample.collectedAtLabel}. Valores e condições sujeitos a alterações.`,
  },
  {
    key: 'cta', from: 45.3, to: 99, rise: 18, className: 'ov-cta',
    html: `<div class="ov-tag">${brand.tagline}</div><div class="ov-pill">${brand.cta}</div><div class="ov-handle">${brand.instagram}${brand.whatsapp ? ' · ' + brand.whatsapp : ''}</div>`,
  },
];

export function Overlay2D({ safeZone = false }: { safeZone?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const els = new Map<string, HTMLDivElement>();
    items.forEach((it) => {
      const d = document.createElement('div');
      d.className = `ov ${it.className}`;
      d.innerHTML = it.html;
      root.current!.appendChild(d);
      els.set(it.key, d);
    });
    const update = (t: number) => {
      items.forEach((it) => {
        const d = els.get(it.key)!;
        const fi = it.fadeIn ?? 0.35, fo = it.fadeOut ?? 0.25;
        const a = Math.min(ease.out(clamp((t - it.from) / fi)), 1 - ease.in(clamp((t - (it.to - fo)) / fo)));
        d.style.opacity = String(Math.max(0, a));
        d.style.transform = `translate(-50%, ${(1 - ease.out(clamp((t - it.from) / 0.6))) * (it.rise ?? 10)}px)`;
        d.style.visibility = a > 0.001 ? 'visible' : 'hidden';
      });
    };
    update(clock.t);
    const un = clock.subscribe(update);
    return () => { un(); els.forEach((e) => e.remove()); };
  }, []);
  return (
    <div ref={root} className="overlay">
      {safeZone && <div className="safe-zone" />}
    </div>
  );
}
