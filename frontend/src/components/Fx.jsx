import { useEffect, useRef, useState } from 'react';

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Fond animé : pièces flottantes en perspective 3D (canvas), réagit à la souris.
export function CoinField() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; const ctx = c.getContext('2d');
    let w, h, raf, mx = 0, my = 0;
    const N = 46;
    const coins = Array.from({ length: N }, () => ({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() * 0.9 + 0.1, a: Math.random() * 6.28, s: Math.random() * 0.006 + 0.002 }));
    const resize = () => { w = c.width = innerWidth; h = c.height = innerHeight; };
    const move = (e) => { mx = (e.clientX / w - 0.5) * 2; my = (e.clientY / h - 0.5) * 2; };
    resize(); addEventListener('resize', resize); addEventListener('pointermove', move);
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of coins) {
        p.a += p.s * 2; p.y -= p.s * p.z * 0.5; if (p.y < -1.2) { p.y = 1.2; p.x = Math.random() * 2 - 1; }
        const sc = 1 / (1.6 - p.z);
        const x = w / 2 + (p.x + mx * 0.08 * p.z) * w * 0.55 * sc, y = h / 2 + (p.y + my * 0.08 * p.z) * h * 0.55 * sc;
        const r = 16 * p.z * sc, squash = Math.abs(Math.cos(p.a));
        ctx.save(); ctx.translate(x, y); ctx.globalAlpha = 0.10 + p.z * 0.30;
        const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
        g.addColorStop(0, '#fff3b0'); g.addColorStop(0.5, '#f2b632'); g.addColorStop(1, '#9a6a08');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, r * (0.25 + squash * 0.75), r, 0, 0, 6.28); ctx.fill();
        ctx.restore();
      }
      raf = requestAnimationFrame(draw);
    };
    if (!reduced()) draw();
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize); removeEventListener('pointermove', move); };
  }, []);
  return <canvas ref={ref} className="coinfield" aria-hidden="true" />;
}

// Carte inclinable en 3D suivant la souris.
export function Tilt({ children, className = '', max = 8, ...rest }) {
  const ref = useRef(null);
  const onMove = (e) => {
    if (reduced()) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.transform = `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) translateZ(0)`;
    ref.current.style.setProperty('--gx', `${(px + 0.5) * 100}%`); ref.current.style.setProperty('--gy', `${(py + 0.5) * 100}%`);
  };
  const onLeave = () => { if (ref.current) ref.current.style.transform = ''; };
  return <div ref={ref} className={`card tilt ${className}`} onPointerMove={onMove} onPointerLeave={onLeave} {...rest}>{children}</div>;
}

// Apparition au défilement.
export function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null); const [on, setOn] = useState(false);
  useEffect(() => {
    if (reduced() || !('IntersectionObserver' in window)) { setOn(true); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(ref.current); return () => io.disconnect();
  }, []);
  return <div ref={ref} className={`reveal ${on ? 'in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

// Compteur animé.
export function CountUp({ value, format = (n) => n.toLocaleString('fr-FR') }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (reduced()) { setN(value); return undefined; }
    let raf; const t0 = performance.now(); const dur = 900;
    const step = (t) => { const k = Math.min(1, (t - t0) / dur); setN(Math.round(value * (1 - (1 - k) ** 3))); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(n)}</>;
}

// Halo lumineux qui suit le curseur (écrans à souris uniquement).
export function CursorGlow() {
  const ref = useRef(null);
  useEffect(() => {
    if (reduced() || !matchMedia('(pointer: fine)').matches) return undefined;
    const move = (e) => { if (ref.current) ref.current.style.transform = `translate(${e.clientX - 150}px, ${e.clientY - 150}px)`; };
    addEventListener('pointermove', move); return () => removeEventListener('pointermove', move);
  }, []);
  return <div ref={ref} className="cursor-glow" aria-hidden="true" />;
}

export function Coin3D() {
  return (
    <div className="coin3d" aria-hidden="true">
      <div className="coin-body">
        {Array.from({ length: 14 }, (_, i) => <span key={i} className="coin-edge" style={{ transform: `translateZ(${(i - 7) * 2}px)` }} />)}
        <span className="coin-face front">₣</span><span className="coin-face back">T</span>
      </div>
    </div>
  );
}
