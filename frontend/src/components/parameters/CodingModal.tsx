import { useRef, useState } from 'react';
import { CODING_TIERS, PLATFORMS, type Submission } from '../../data/portalData';

interface Props {
    subs: Submission[];
    onNewSub: (sub: Submission) => void;
    onClose: () => void;
}

type UploadStep = 'tiers' | 'upload';

const TIER_COLORS: Record<number, { bg: string; border: string; text: string; badge: string }> = {
    1: { bg: '#ffffff', border: '#E5E7EB', text: '#374151', badge: '#6B7280' },
    2: { bg: '#ffffff', border: '#E5E7EB', text: '#374151', badge: '#4B5563' },
    3: { bg: '#F9FAFB', border: '#D1D5DB', text: '#111827', badge: '#1F2937' },
};

export default function CodingModal({ subs, onNewSub, onClose }: Props) {
    const [step, setStep] = useState<UploadStep>('tiers');
    const [selectedTier, setTier] = useState<1 | 2 | 3 | null>(null);
    const [platform, setPlatform] = useState('');
    const [imageDataUrl, setImage] = useState('');
    const [fileName, setFileName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [updateMode, setUpdateMode] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    /* Existing submissions for this parameter */
    const codingSubs = subs.filter(s => s.parameterId === 1);
    const getSubForTier = (tierId: number) => codingSubs.find(s => s.tierId === tierId);

    const pendingSubs = codingSubs.filter(s => s.status === 'pending');
    const hasPending = pendingSubs.length > 0;

    const approvedSubs = codingSubs.filter(s => s.status === 'approved');
    const hasApproved = approvedSubs.length > 0;

    let highestTier = 0;
    if (hasApproved) {
        approvedSubs.forEach(s => {
            if (s.tierId > highestTier) highestTier = s.tierId;
        });
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = ev => setImage(ev.target?.result as string);
        reader.readAsDataURL(file);
    }

    function handleSubmit() {
        if (!selectedTier || !platform || !imageDataUrl) return;
        setSubmitting(true);
        setTimeout(() => {
            onNewSub({
                parameterId: 1,
                tierId: selectedTier,
                platform,
                imageDataUrl,
                status: 'pending',
                submittedAt: new Date().toISOString(),
                isUpdate: updateMode,
            });
            setSubmitting(false);
            setDone(true);
        }, 800);
    }

    function reset() {
        setStep('tiers');
        setTier(null);
        setPlatform('');
        setImage('');
        setFileName('');
        setDone(false);
        setUpdateMode(false);
    }

    const tier = selectedTier ? CODING_TIERS.find(t => t.id === selectedTier)! : null;
    const colors = selectedTier ? TIER_COLORS[selectedTier] : null;

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 100,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                background: 'rgba(10,22,40,0.5)',
                padding: '20px',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#fff',
                    borderRadius: 12,
                    width: '100%', maxWidth: 720,
                    maxHeight: '92vh',
                    overflowY: 'auto',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                    fontFamily: "'Outfit', sans-serif",
                    animation: 'modalIn 0.35s cubic-bezier(0.22,1,0.36,1) forwards',
                }}
            >
                {/* ── Modal Header ── */}
                <div style={{
                    padding: '24px 28px 20px',
                    borderBottom: '1px solid #F3F4F6',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    position: 'sticky', top: 0, background: '#fff', zIndex: 2,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: '#F3F4F6',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                                stroke="#1F2937" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="16 18 22 12 16 6" />
                                <polyline points="8 6 2 12 8 18" />
                            </svg>
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0A1628' }}>
                                Coding Problems Solved
                            </h2>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: '#9CA3AF' }}>
                                {step === 'tiers' ? 'Select a tier to apply for' : `Uploading for ${tier?.label} — ${tier?.salary}`}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        background: '#F3F4F6', border: 'none', width: 32, height: 32,
                        borderRadius: 8, cursor: 'pointer', fontSize: 16, color: '#6B7280',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>✕</button>
                </div>

                <div style={{ padding: '24px 28px 28px' }}>

                    {/* ══════════════ PENDING LOCKOUT ══════════════ */}
                    {hasPending && !done && (
                        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            </div>
                            <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', color: '#111827', fontWeight: 800 }}>Verification Pending</h3>
                            <p style={{ margin: '0 0 24px', color: '#6B7280', fontSize: '0.95rem' }}>You have a submission currently under review by the staff. Please wait for it to be verified before uploading another one.</p>
                            <button onClick={onClose} style={{ padding: '10px 24px', background: '#1F2937', color: '#fff', borderRadius: 8, border: 'none', fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>Got it</button>
                        </div>
                    )}

                    {/* ══════════════ COMPLETED LOCKOUT ══════════════ */}
                    {hasApproved && !updateMode && !done && !hasPending && (
                        <div style={{ padding: '20px 0', textAlign: 'center' }}>
                           <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                            <h3 style={{ margin: '0 0 8px', fontSize: '1.3rem', color: '#111827', fontWeight: 800 }}>Criteria Completed</h3>
                            <p style={{ margin: '0 0 24px', color: '#6B7280', fontSize: '0.95rem' }}>You have successfully completed this parameter. Your highest achieved tier is <strong>Tier {highestTier}</strong>.</p>
                            
                            {highestTier < 3 && (
                                <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', padding: 20, borderRadius: 12, marginBottom: 24, textAlign: 'left' }}>
                                    <p style={{ margin: '0 0 12px', color: '#374151', fontSize: '0.9rem', fontWeight: 600 }}>Achieved a higher tier? <span style={{color: '#6B7280', fontWeight: 400}}>(Updates will be manually verified)</span></p>
                                    <button onClick={() => setUpdateMode(true)} style={{ padding: '10px 20px', background: '#fff', border: '1px solid #D1D5DB', borderRadius: 8, cursor: 'pointer', fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Outfit', sans-serif", fontSize: '0.9rem' }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.1 15.6a9 9 0 1 0 3-9.7l-3-2"/></svg>
                                        Update to Higher Tier
                                    </button>
                                </div>
                            )}
                            
                           <button onClick={onClose} style={{ padding: '10px 24px', background: '#1F2937', color: '#fff', borderRadius: 8, border: 'none', fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>Close Dialog</button>
                        </div>
                    )}

                    {/* ══════════════ STEP 1: TIER SELECTION ══════════════ */}
                    {step === 'tiers' && !hasPending && (!hasApproved || updateMode) && (
                        <>
                            <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: '#6B7280' }}>
                                ⚡ <strong>Tip:</strong> You can apply directly for Tier 3. If approved, full 30 marks are awarded without needing to climb tiers first.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {CODING_TIERS.map(ct => {
                                    const existing = getSubForTier(ct.id);
                                    const c = TIER_COLORS[ct.id];

                                    return (
                                        <div
                                            key={ct.id}
                                            style={{
                                                border: `1px solid ${c.border}`,
                                                borderRadius: 6,
                                                padding: '16px 20px',
                                                background: c.bg,
                                                cursor: 'pointer',
                                                transition: 'all 0.15s',
                                            }}
                                            onMouseEnter={e => {
                                                (e.currentTarget as HTMLDivElement).style.borderColor = '#9CA3AF';
                                            }}
                                            onMouseLeave={e => {
                                                (e.currentTarget as HTMLDivElement).style.borderColor = c.border;
                                            }}
                                            onClick={() => {
                                                setTier(ct.id);
                                                setStep('upload');
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                                        <span style={{
                                                            background: c.badge, color: '#fff',
                                                            borderRadius: 4, padding: '3px 8px',
                                                            fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase'
                                                        }}>{ct.label}</span>
                                                        <span style={{
                                                            fontSize: '0.95rem', fontWeight: 700, color: c.text,
                                                        }}>{ct.salary}</span>
                                                        <span style={{
                                                            marginLeft: 'auto',
                                                            fontSize: '0.95rem', fontWeight: 800,
                                                            color: '#374151',
                                                        }}>{ct.marks} pts</span>
                                                    </div>

                                                    {/* Requirements */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                        <Req label={`${ct.totalProblems}+ problems on any platform`} color={c.text} />
                                                        <Req label={`${ct.leetcodeMin}+ LeetCode problems (mandatory)`} color={c.text} />
                                                    </div>

                                                    {/* Platforms */}
                                                    <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                                                        {PLATFORMS.map(p => (
                                                            <span key={p} style={{
                                                                background: 'rgba(255,255,255,0.7)',
                                                                border: `1px solid ${c.border}`,
                                                                borderRadius: 6, padding: '2px 10px',
                                                                fontSize: 10, fontWeight: 600, color: c.text,
                                                            }}>{p}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Existing submission badge */}
                                            {existing && (
                                                <div style={{
                                                    marginTop: 14, padding: '8px 12px',
                                                    borderRadius: 4, fontSize: '0.8rem', fontWeight: 600,
                                                    border: `1px solid ${existing.status === 'approved' ? '#A7F3D0' : existing.status === 'rejected' ? '#FECACA' : '#FDE68A'}`,
                                                    background: existing.status === 'approved'
                                                        ? '#ECFDF5' : existing.status === 'rejected'
                                                            ? '#FEF2F2' : '#FFFBEB',
                                                    color: existing.status === 'approved'
                                                        ? '#059669' : existing.status === 'rejected'
                                                            ? '#DC2626' : '#D97706',
                                                    display: 'flex', alignItems: 'center', gap: 8,
                                                }}>
                                                    {existing.status === 'approved' ? '✓' : existing.status === 'rejected' ? '✕' : '⏳'}
                                                    {existing.status === 'approved' ? 'Approved'
                                                        : existing.status === 'rejected' ? 'Rejected — click to re-upload'
                                                            : 'Pending verification'
                                                    }
                                                    &nbsp;·&nbsp; via {existing.platform}
                                                    &nbsp;·&nbsp; {new Date(existing.submittedAt).toLocaleDateString()}
                                                </div>
                                            )}

                                            {/* Apply CTA */}
                                            <div style={{
                                                marginTop: 10, fontSize: 12, fontWeight: 700,
                                                color: c.badge, display: 'flex', alignItems: 'center', gap: 4,
                                            }}>
                                                {existing?.status !== 'approved' ? '→ Click to upload proof' : '→ Click to view'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* ══════════════ STEP 2: UPLOAD ══════════════ */}
                    {step === 'upload' && tier && colors && !done && (
                        <>
                            <button
                                onClick={reset}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: '#6B7280', fontSize: 13, fontWeight: 600,
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    marginBottom: 20, padding: 0,
                                }}
                            >
                                ← Back to tiers
                            </button>

                            {/* Tier recap */}
                            <div style={{
                                border: `1px solid ${colors.border}`,
                                background: colors.bg, borderRadius: 6,
                                padding: '12px 16px', marginBottom: 22,
                                display: 'flex', gap: 12, alignItems: 'center',
                            }}>
                                <span style={{
                                    background: colors.badge, color: '#fff',
                                    borderRadius: 4, padding: '3px 8px',
                                    fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase'
                                }}>{tier.label}</span>
                                <span style={{ fontSize: '0.85rem', color: colors.text, fontWeight: 600 }}>
                                    {tier.salary} — {tier.totalProblems}+ problems · {tier.leetcodeMin}+ LeetCode · {tier.marks} pts
                                </span>
                            </div>

                            {/* Platform selector */}
                            <div style={{ marginBottom: 18 }}>
                                <label style={{
                                    display: 'block', fontSize: '0.78rem', fontWeight: 700,
                                    color: '#374151', marginBottom: 8,
                                    textTransform: 'uppercase', letterSpacing: '0.08em',
                                }}>
                                    Select Platform *
                                </label>
                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                    {PLATFORMS.map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setPlatform(p)}
                                            style={{
                                                padding: '9px 18px', borderRadius: 10, cursor: 'pointer',
                                                border: `2px solid ${platform === p ? '#1F2937' : '#E5E7EB'}`,
                                                background: platform === p ? '#F3F4F6' : '#F9FAFB',
                                                color: platform === p ? '#111827' : '#6B7280',
                                                fontWeight: platform === p ? 700 : 500,
                                                fontSize: '0.88rem',
                                                transition: 'all 0.15s',
                                                fontFamily: "'Outfit', sans-serif",
                                            }}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* File upload */}
                            <div style={{ marginBottom: 22 }}>
                                <label style={{
                                    display: 'block', fontSize: '0.78rem', fontWeight: 700,
                                    color: '#374151', marginBottom: 8,
                                    textTransform: 'uppercase', letterSpacing: '0.08em',
                                }}>
                                    Upload Screenshot Proof *
                                </label>
                                <div
                                    onClick={() => fileRef.current?.click()}
                                    style={{
                                        border: `2px dashed ${imageDataUrl ? '#1F2937' : '#D1D5DB'}`,
                                        borderRadius: 12, padding: '24px',
                                        textAlign: 'center', cursor: 'pointer',
                                        background: imageDataUrl ? '#F3F4F6' : '#FAFAFA',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={handleFileChange}
                                    />
                                    {imageDataUrl ? (
                                        <>
                                            <img src={imageDataUrl} alt="preview" style={{
                                                maxHeight: 160, maxWidth: '100%',
                                                borderRadius: 8, marginBottom: 8,
                                                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                                            }} />
                                            <p style={{ margin: 0, fontSize: 12, color: '#374151', fontWeight: 600 }}>
                                                {fileName} — click to change
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                                                stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                                                style={{ marginBottom: 8 }}>
                                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                                <circle cx="8.5" cy="8.5" r="1.5" />
                                                <polyline points="21 15 16 10 5 21" />
                                            </svg>
                                            <p style={{ margin: 0, fontWeight: 700, color: '#374151', fontSize: '0.9rem' }}>
                                                Click to upload screenshot
                                            </p>
                                            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9CA3AF' }}>
                                                PNG, JPG, JPEG supported
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                onClick={handleSubmit}
                                disabled={!platform || !imageDataUrl || submitting}
                                style={{
                                    width: '100%', padding: '14px',
                                    background: (!platform || !imageDataUrl) ? '#F3F4F6' : '#1F2937',
                                    color: (!platform || !imageDataUrl) ? '#9CA3AF' : '#fff',
                                    border: 'none', borderRadius: 12, fontSize: '1rem',
                                    fontWeight: 700, cursor: (!platform || !imageDataUrl) ? 'not-allowed' : 'pointer',
                                    boxShadow: 'none',
                                    transition: 'all 0.2s',
                                    fontFamily: "'Outfit', sans-serif",
                                }}
                            >
                                {submitting ? 'Submitting…' : 'Submit for Verification'}
                            </button>
                        </>
                    )}

                    {/* ══════════════ STEP 3: SUCCESS ══════════════ */}
                    {done && (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <div style={{
                                width: 72, height: 72, borderRadius: '50%',
                                background: '#111827',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 20px',
                            }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                                    stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                            <h3 style={{ margin: '0 0 8px', fontSize: '1.3rem', fontWeight: 800, color: '#0A1628' }}>
                                Submitted Successfully!
                            </h3>
                            <p style={{ color: '#6B7280', margin: '0 0 24px', lineHeight: 1.6 }}>
                                Your proof for <strong>{tier?.label} ({tier?.salary})</strong> via{' '}
                                <strong>{platform}</strong> is under review.<br />
                                A mentor will verify it shortly.
                            </p>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                <button onClick={reset} style={{
                                    padding: '11px 24px', borderRadius: 10,
                                    border: '2px solid #E5E7EB', background: '#fff',
                                    color: '#374151', fontWeight: 700, cursor: 'pointer',
                                    fontSize: '0.9rem', fontFamily: "'Outfit', sans-serif",
                                }}>
                                    Submit Another Tier
                                </button>
                                <button onClick={onClose} style={{
                                    padding: '11px 24px', borderRadius: 10,
                                    background: '#1F2937', border: 'none',
                                    color: '#fff', fontWeight: 700, cursor: 'pointer',
                                    fontSize: '0.9rem', fontFamily: "'Outfit', sans-serif",
                                }}>
                                    Back to Dashboard
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.93) translateY(20px); }
          to   { opacity: 1; transform: scale(1)   translateY(0);     }
        }
      `}</style>
        </div>
    );
}

/* ── Micro-component ── */
function Req({ label, color }: { label: string; color: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.82rem', color }}>
            <span style={{ fontWeight: 800 }}>✓</span>
            <span>{label}</span>
        </div>
    );
}
