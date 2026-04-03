import { useEffect, useRef, useState } from 'react';
import campusImg from '../assets/campus.jpg';
import campus2Img from '../assets/campus2.jpg';
import LoginModal from './LoginModal';

/* ─── Slide data ──────────────────────────────────────────────────────────── */
const slides = [
    {
        headline: 'Where talent meets\nopportunity.',
        sub: 'Start your journey from campus to career.',
        image: campusImg,
    },
    {
        headline: 'Build your future with\nthe right opportunities.',
        sub: 'Your gateway to jobs, and growth.',
        image: campus2Img,
    },
];

/* ─── Animation keyframes injected once ────────────────────────────────────── */
const STYLE = `
  @keyframes textIn {
    0%   { opacity: 0; transform: scale(0.90) translateY(30px); filter: blur(6px); }
    100% { opacity: 1; transform: scale(1)    translateY(0px);  filter: blur(0px); }
  }
  @keyframes textOut {
    0%   { opacity: 1; transform: scale(1)    translateY(0px);  filter: blur(0px); }
    100% { opacity: 0; transform: scale(1.08) translateY(-24px); filter: blur(5px); }
  }
  @keyframes imgIn {
    0%   { opacity: 0; transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1);    }
  }
  @keyframes imgOut {
    0%   { opacity: 1; transform: scale(1);    }
    100% { opacity: 0; transform: scale(0.96); }
  }
  .text-in  { animation: textIn  1.2s cubic-bezier(0.22,1,0.36,1) forwards; }
  .text-out { animation: textOut 1.0s cubic-bezier(0.55,0,1,0.45) forwards; }
  .img-in   { animation: imgIn   1.4s cubic-bezier(0.22,1,0.36,1) forwards; }
  .img-out  { animation: imgOut  1.0s ease                         forwards; }
`;

import { type Role } from '../data/portalData';

/* ─── Component ─────────────────────────────────────────────────────────────── */
export default function LandingPage({ onLoginSuccess }: { onLoginSuccess: (email: string, role: Role) => void }) {
    const [current, setCurrent] = useState(0);
    const [phase, setPhase] = useState<'in' | 'out'>('in');
    const [showLogin, setShowLogin] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => {
        // Hold for 3 s, then exit, swap, enter
        timer.current = setTimeout(() => {
            setPhase('out');
            setTimeout(() => {
                setCurrent(p => (p + 1) % slides.length);
                setPhase('in');
            }, 1100); // matches textOut / imgOut duration
        }, 3000);

        return () => clearTimeout(timer.current);
    }, [current]);

    const slide = slides[current];
    const textCls = phase === 'in' ? 'text-in' : 'text-out';
    const imgCls = phase === 'in' ? 'img-in' : 'img-out';

    return (
        <>
            {/* Inject keyframes once */}
            <style>{STYLE}</style>

            <div style={{
                display: 'flex', height: '100vh', width: '100vw',
                overflow: 'hidden', fontFamily: "'Outfit', sans-serif",
                position: 'relative', background: '#fff',
            }}>

                {/* ════════════════════════ LEFT PANEL ════════════════════════════ */}
                <div style={{
                    width: '52%', background: '#ffffff',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center',
                    padding: '0 72px', position: 'relative', zIndex: 2,
                }}>

                    {/* Logo — fixed */}
                    <div style={{ position: 'absolute', top: 36, left: 56 }}>
                        <span style={{ fontSize: 24, fontWeight: 800, color: '#0A1628', letterSpacing: '-0.5px' }}>
                            Placement<span style={{ color: '#1B4FCC' }}>Portal</span>
                        </span>
                    </div>

                    {/* ── Animated text block (headline + sub only) ── */}
                    <div
                        key={current + phase}   /* re-mount triggers animation */
                        className={textCls}
                        style={{ marginBottom: 40 }}
                    >
                        {/* Tag pill */}
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            background: '#EEF3FF', border: '1px solid #C7D7FF',
                            color: '#1B4FCC', borderRadius: 100,
                            padding: '6px 18px', fontSize: 11,
                            fontWeight: 700, letterSpacing: '0.14em',
                            textTransform: 'uppercase', marginBottom: 32,
                        }}>
                            <span style={{
                                height: 6, width: 6, borderRadius: '50%',
                                background: '#1B4FCC', display: 'inline-block',
                            }} />
                            Campus Recruitment
                        </div>

                        {/* Headline */}
                        <h1 style={{
                            fontSize: '3.6rem', fontWeight: 900,
                            color: '#0A1628', lineHeight: 1.12,
                            marginBottom: 20, whiteSpace: 'pre-line',
                            textShadow: '0 4px 24px rgba(0,0,0,0.08)',
                        }}>
                            {slide.headline.split('\n')[0]}
                            <br />
                            <span style={{ color: '#1B4FCC' }}>
                                {slide.headline.split('\n')[1]}
                            </span>
                        </h1>

                        {/* Sub-text */}
                        <p style={{
                            fontSize: '1.15rem', color: '#6B7280',
                            lineHeight: 1.7, maxWidth: 400,
                            textShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        }}>
                            {slide.sub}
                        </p>
                    </div>

                    {/* ── Login button — STABLE, never animates ── */}
                    <button
                        onClick={() => setShowLogin(true)}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 10,
                            background: '#1B4FCC', color: '#fff', border: 'none',
                            borderRadius: 10, padding: '15px 38px',
                            fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
                            letterSpacing: '0.02em', width: 'fit-content',
                            boxShadow: '0 8px 28px rgba(27,79,204,0.32)',
                            transition: 'background 0.2s, box-shadow 0.2s',
                        }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = '#1340B0';
                            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 12px 32px rgba(27,79,204,0.45)';
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = '#1B4FCC';
                            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 28px rgba(27,79,204,0.32)';
                        }}
                    >
                        Login
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5"
                            strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </button>

                    {/* Slide dots — stable */}
                    <div style={{
                        position: 'absolute', bottom: 44, left: 72,
                        display: 'flex', gap: 8,
                    }}>
                        {slides.map((_, i) => (
                            <div key={i} style={{
                                height: 7,
                                width: i === current ? 28 : 7,
                                borderRadius: 4,
                                background: i === current ? '#1B4FCC' : '#D1D5DB',
                                transition: 'all 0.5s ease',
                            }} />
                        ))}
                    </div>
                </div>

                {/* ══════════════════ DIAGONAL DIVIDER ════════════════════════════ */}
                <div style={{
                    position: 'absolute', top: 0, left: '49%',
                    width: 68, height: '100%',
                    background: '#ffffff',
                    transform: 'skewX(-5deg)',
                    zIndex: 4, boxShadow: '6px 0 20px rgba(0,0,0,0.10)',
                }} />
                <div style={{
                    position: 'absolute', top: 0, left: '52%',
                    width: 12, height: '100%',
                    background: 'rgba(200,220,255,0.5)',
                    transform: 'skewX(-5deg)', zIndex: 4,
                }} />

                {/* ════════════════════════ RIGHT PANEL ═══════════════════════════ */}
                <div style={{
                    flex: 1, position: 'relative',
                    overflow: 'hidden', background: '#0A1628',
                }}>
                    {/* Animated image — no heavy blue overlay */}
                    <img
                        key={current + phase + '-img'}   /* re-mount triggers animation */
                        src={slide.image}
                        alt="Campus"
                        className={imgCls}
                        style={{
                            position: 'absolute', inset: 0,
                            width: '100%', height: '100%',
                            objectFit: 'cover',
                        }}
                    />

                    {/* Very light vignette only — no heavy blue tint */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.22) 100%)',
                    }} />

                    {/* Decorative circles */}
                    <div style={{
                        position: 'absolute', top: -80, right: -80,
                        width: 300, height: 300, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.04)',
                    }} />

                    {/* Portal branding */}
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 2,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}>
                        <div style={{
                            width: 58, height: 58, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.18)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backdropFilter: 'blur(8px)', marginBottom: 8,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
                        }}>
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                                stroke="white" strokeWidth="2"
                                strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                        </div>
                        <p style={{
                            fontSize: 30, fontWeight: 900, color: '#fff',
                            letterSpacing: '0.1em', margin: 0,
                            textShadow: '0 4px 18px rgba(0,0,0,0.35)',
                        }}>PLACEMENT</p>
                        <p style={{
                            fontSize: 11, fontWeight: 400,
                            color: 'rgba(220,235,255,0.85)',
                            letterSpacing: '0.45em', textTransform: 'uppercase', margin: 0,
                        }}>Portal</p>
                        <div style={{
                            width: 60, height: 1,
                            background: 'rgba(255,255,255,0.3)', margin: '12px 0',
                        }} />
                        <p style={{
                            fontSize: 12, color: 'rgba(200,225,255,0.75)',
                            textAlign: 'center', maxWidth: 180,
                            lineHeight: 1.7, margin: 0,
                        }}>
                            Bridging academia and industry
                        </p>
                    </div>
                </div>

            </div>

            {/* ── Login Modal ── */}
            {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSuccess={onLoginSuccess} />}
        </>
    );
}
