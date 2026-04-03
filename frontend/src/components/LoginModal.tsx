import { useState } from 'react';
import { getUsers, type Role } from '../data/portalData';

interface Props {
    onClose: () => void;
    onSuccess: (email: string, role: Role) => void;
}

export default function LoginModal({ onClose, onSuccess }: Props) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState('');

    function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Simulate a brief async check
        setTimeout(() => {
            const users = getUsers();
            const matchedUser = users.find(
                u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
            );

            if (matchedUser) {
                // ✅ Show professional toast, close modal after 2.2 s
                setToast(matchedUser.email);
                setLoading(false);
                setTimeout(() => { onSuccess(matchedUser.email, matchedUser.role); onClose(); }, 2200);
                return;
            } else {
                setError('Invalid college mail or password.');
            }
            setLoading(false);
        }, 600);
    }

    return (
        /* ── Backdrop ─────────────────────────────────────────────────────── */
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 100,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                background: 'rgba(10, 22, 40, 0.45)',
                animation: 'backdropIn 0.3s ease forwards',
            }}
        >
            {/* ── Modal card ──────────────────────────────────────────────────── */}
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'rgba(255,255,255,0.92)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: 20,
                    padding: '48px 44px 40px',
                    width: 420,
                    boxShadow: '0 24px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.5)',
                    animation: 'modalIn 0.35s cubic-bezier(0.22,1,0.36,1) forwards',
                    position: 'relative',
                    fontFamily: "'Outfit', sans-serif",
                }}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: 18, right: 18,
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: '#9CA3AF', fontSize: 20, lineHeight: 1,
                        width: 32, height: 32, borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F3F4F6')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                    ✕
                </button>

                {/* Logo / header */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: '50%',
                        background: 'linear-gradient(135deg,#1B4FCC,#3E7BFF)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 14px',
                        boxShadow: '0 6px 20px rgba(27,79,204,0.35)',
                    }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                            stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <h2 style={{
                        fontSize: '1.55rem', fontWeight: 800,
                        color: '#0A1628', margin: 0, letterSpacing: '-0.3px',
                    }}>
                        Placement<span style={{ color: '#1B4FCC' }}>Portal</span>
                    </h2>
                    <p style={{ color: '#6B7280', fontSize: '0.88rem', marginTop: 6, margin: 0 }}>
                        Sign in to your account
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                    {/* College mail */}
                    <div>
                        <label style={{
                            display: 'block', fontSize: '0.8rem',
                            fontWeight: 700, color: '#374151',
                            marginBottom: 7, letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                        }}>
                            College Mail
                        </label>
                        <div style={{ position: 'relative' }}>
                            <span style={{
                                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                                color: '#9CA3AF',
                            }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                </svg>
                            </span>
                            <input
                                type="email"
                                required
                                placeholder="yourname@college.edu"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                style={{
                                    width: '100%', padding: '13px 14px 13px 40px',
                                    borderRadius: 10,
                                    border: '1.5px solid #E5E7EB',
                                    fontSize: '0.95rem', color: '#0A1628',
                                    background: '#F9FAFB',
                                    outline: 'none', boxSizing: 'border-box',
                                    transition: 'border-color 0.2s, box-shadow 0.2s',
                                    fontFamily: "'Outfit', sans-serif",
                                }}
                                onFocus={e => {
                                    e.target.style.borderColor = '#1B4FCC';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(27,79,204,0.12)';
                                }}
                                onBlur={e => {
                                    e.target.style.borderColor = '#E5E7EB';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>
                    </div>

                    {/* Password / Reg No */}
                    <div>
                        <label style={{
                            display: 'block', fontSize: '0.8rem',
                            fontWeight: 700, color: '#374151',
                            marginBottom: 7, letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                        }}>
                            Password (Reg No)
                        </label>
                        <div style={{ position: 'relative' }}>
                            <span style={{
                                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                                color: '#9CA3AF',
                            }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                            </span>
                            <input
                                type={showPass ? 'text' : 'password'}
                                required
                                placeholder="Registration Number"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                style={{
                                    width: '100%', padding: '13px 44px 13px 40px',
                                    borderRadius: 10,
                                    border: '1.5px solid #E5E7EB',
                                    fontSize: '0.95rem', color: '#0A1628',
                                    background: '#F9FAFB',
                                    outline: 'none', boxSizing: 'border-box',
                                    transition: 'border-color 0.2s, box-shadow 0.2s',
                                    fontFamily: "'Outfit', sans-serif",
                                }}
                                onFocus={e => {
                                    e.target.style.borderColor = '#1B4FCC';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(27,79,204,0.12)';
                                }}
                                onBlur={e => {
                                    e.target.style.borderColor = '#E5E7EB';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                            {/* Show/hide password */}
                            <button
                                type="button"
                                onClick={() => setShowPass(p => !p)}
                                style={{
                                    position: 'absolute', right: 13, top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: '#9CA3AF', padding: 2,
                                }}
                            >
                                {showPass ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </svg>
                                ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div style={{
                            background: '#FEF2F2', border: '1px solid #FCA5A5',
                            borderRadius: 8, padding: '10px 14px',
                            color: '#DC2626', fontSize: '0.85rem', fontWeight: 500,
                            display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            marginTop: 4,
                            padding: '14px',
                            background: loading ? '#93AAEE' : '#1B4FCC',
                            color: '#fff', border: 'none',
                            borderRadius: 10, fontSize: '1rem',
                            fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                            boxShadow: '0 8px 24px rgba(27,79,204,0.3)',
                            transition: 'background 0.2s, transform 0.1s',
                            fontFamily: "'Outfit', sans-serif",
                            letterSpacing: '0.02em',
                        }}
                        onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#1340B0'; }}
                        onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#1B4FCC'; }}
                    >
                        {loading ? 'Signing in…' : 'Sign In →'}
                    </button>
                </form>

                {/* Footer note */}
                <p style={{
                    textAlign: 'center', marginTop: 20,
                    fontSize: '0.78rem', color: '#9CA3AF',
                }}>
                    Use your college mail & registration number
                </p>
            </div>

            {/* ── SUCCESS TOAST ─────────────────────────────────────────────── */}
            {toast && (
                <div style={{
                    position: 'fixed', top: 24, right: 24, zIndex: 200,
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: '#fff',
                    border: '1px solid #D1FAE5',
                    borderLeft: '4px solid #10B981',
                    borderRadius: 14,
                    padding: '14px 20px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
                    animation: 'toastIn 0.45s cubic-bezier(0.22,1,0.36,1) forwards',
                    fontFamily: "'Outfit', sans-serif",
                    minWidth: 280,
                    maxWidth: 360,
                }}>
                    {/* Green check circle */}
                    <div style={{
                        width: 38, height: 38, borderRadius: '50%',
                        background: 'linear-gradient(135deg,#10B981,#059669)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 4px 12px rgba(16,185,129,0.35)',
                    }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>

                    {/* Text */}
                    <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#065F46' }}>
                            Login Successful!
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#6B7280', wordBreak: 'break-all' }}>
                            Welcome, {toast}
                        </p>
                    </div>

                    {/* Progress bar */}
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0,
                        height: 3, borderRadius: '0 0 14px 14px',
                        background: 'linear-gradient(90deg,#10B981,#34D399)',
                        animation: 'toastBar 2.2s linear forwards',
                        width: '100%',
                    }} />
                </div>
            )}

            {/* Keyframes for modal */}
            <style>{`
        @keyframes backdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.92) translateY(16px); }
          to   { opacity: 1; transform: scale(1)    translateY(0px);  }
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(60px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0)    scale(1);    }
        }
        @keyframes toastBar {
          from { width: 100%; }
          to   { width: 0%;   }
        }
      `}</style>
        </div>
    );
}
