import { useRef, useState } from 'react';
import { PARAMETERS, getParamData, type GenericTier, type Submission } from '../../data/portalData';
import ParameterIcon from '../ParameterIcon';

interface Props {
    parameterId: number;
    subs: Submission[];
    onNewSub: (sub: Submission) => void;
    onClose: () => void;
}

const TIER_STYLE = {
    1: { bg: '#ffffff', border: '#E5E7EB', text: '#374151', badge: '#6B7280', badgeBg: '#6B7280' },
    2: { bg: '#ffffff', border: '#E5E7EB', text: '#374151', badge: '#4B5563', badgeBg: '#4B5563' },
    3: { bg: '#F9FAFB', border: '#D1D5DB', text: '#111827', badge: '#1F2937', badgeBg: '#1F2937' },
} as const;

type Step = 'tiers' | 'upload' | 'done';

export default function GenericParameterModal({ parameterId, subs, onNewSub, onClose }: Props) {
    const param = PARAMETERS.find(p => p.id === parameterId)!;
    const data = getParamData(parameterId);

    const [step, setStep] = useState<Step>('tiers');
    const [selectedTier, setSelectedTier] = useState<GenericTier | null>(null);
    const [selectedAchs, setSelectedAchs] = useState<string[]>([]);
    const [selectedPlatform, setPlatform] = useState<string>('');
    const [imageDataUrl, setImage] = useState('');
    const [fileName, setFileName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [updateMode, setUpdateMode] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    function parseMinRequired(req: string): number {
        const map: Record<string, number> = { 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5 };
        const match = req.toLowerCase().match(/minimum\s+(\w+)/);
        return match ? (map[match[1]] || parseInt(match[1]) || 1) : 1;
    }

    if (!data) return null;

    const codingSubs = subs.filter(s => s.parameterId === parameterId);
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

    function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = ev => setImage(ev.target?.result as string);
        reader.readAsDataURL(file);
    }

    function handleSubmit() {
        if (!selectedTier || selectedAchs.length === 0 || !imageDataUrl) return;
        setSubmitting(true);
        setTimeout(() => {
            onNewSub({
                parameterId,
                tierId: selectedTier.id,
                platform: selectedPlatform || '—',
                imageDataUrl,
                status: 'pending',
                submittedAt: new Date().toISOString(),
                achievementLabel: selectedAchs.join(' + '),
                isUpdate: updateMode,
            });
            setSubmitting(false);
            setStep('done');
        }, 700);
    }

    function reset() {
        setStep('tiers');
        setSelectedTier(null);
        setSelectedAchs([]);
        setPlatform('');
        setImage('');
        setFileName('');
        setUpdateMode(false);
    }

    const cs = selectedTier ? TIER_STYLE[selectedTier.id] : null;

    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            background: 'rgba(10,22,40,0.52)', padding: 20,
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                background: '#fff', borderRadius: 12,
                width: '100%', maxWidth: 760,
                maxHeight: '92vh', overflowY: 'auto',
                boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                fontFamily: "'Outfit', sans-serif",
                animation: 'gpModalIn 0.35s cubic-bezier(0.22,1,0.36,1) forwards',
            }}>

                {/* ── Header ── */}
                <div style={{
                    padding: '22px 28px 18px', borderBottom: '1px solid #F3F4F6',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    position: 'sticky', top: 0, background: '#fff', zIndex: 2,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: `#F3F4F6`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                        }}><ParameterIcon name={param.icon as string} /></div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0A1628' }}>
                                {param.name}
                            </h2>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#9CA3AF' }}>
                                {step === 'tiers'
                                    ? 'Select a tier to apply for'
                                    : step === 'upload'
                                        ? `Applying for Tier ${selectedTier?.id} — ${selectedTier?.salary}`
                                        : 'Submission complete'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        background: '#F3F4F6', border: 'none', width: 32, height: 32,
                        borderRadius: 8, cursor: 'pointer', color: '#6B7280', fontSize: 15,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>✕</button>
                </div>

                <div style={{ padding: '22px 28px 28px' }}>

                    {/* ══════════════ PENDING LOCKOUT ══════════════ */}
                    {hasPending && step !== 'done' && (
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
                    {hasApproved && !updateMode && step !== 'done' && !hasPending && (
                        <div style={{ padding: '20px 0', textAlign: 'center' }}>
                           <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                            <h3 style={{ margin: '0 0 8px', fontSize: '1.3rem', color: '#111827', fontWeight: 800 }}>Parameter Completed</h3>
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

                    {/* ══ STEP 1 — TIER SELECTION ══ */}
                    {step === 'tiers' && !hasPending && (!hasApproved || updateMode) && (
                        <>
                            <p style={{ margin: '0 0 18px', fontSize: '0.83rem', color: '#6B7280' }}>
                                ⚡ <strong>Tip:</strong> You may apply directly for the highest tier.
                                If approved, points are awarded without climbing lower tiers first.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {data.tiers.map(tier => {
                                    const c = TIER_STYLE[tier.id];
                                    const existing = getSubForTier(tier.id);
                                    return (
                                        <div key={tier.id} style={{
                                            border: `1px solid ${c.border}`, borderRadius: 6,
                                            padding: '16px 20px', background: c.bg, cursor: 'pointer',
                                            transition: 'all 0.15s',
                                        }}
                                            onMouseEnter={e => {
                                                (e.currentTarget as HTMLDivElement).style.borderColor = '#9CA3AF';
                                            }}
                                            onMouseLeave={e => {
                                                (e.currentTarget as HTMLDivElement).style.borderColor = c.border;
                                            }}
                                            onClick={() => { setSelectedTier(tier); setStep('upload'); }}
                                        >
                                            {/* Tier header */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                                <span style={{
                                                    background: c.badgeBg, color: '#fff', borderRadius: 4,
                                                    padding: '3px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase'
                                                }}>Tier {tier.id}</span>
                                                <span style={{ fontWeight: 700, color: c.text, fontSize: '0.9rem' }}>
                                                    {tier.salary}
                                                </span>
                                                <span style={{
                                                    marginLeft: 'auto', fontSize: '0.78rem',
                                                    color: c.badge, fontWeight: 700,
                                                    background: `${c.badgeBg}18`, padding: '2px 10px', borderRadius: 20,
                                                }}>{tier.requirement}</span>
                                            </div>

                                            {/* Achievements list */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                                {tier.achievements.map((a, i) => (
                                                    <div key={i} style={{
                                                        display: 'flex', alignItems: 'flex-start', gap: 8,
                                                        fontSize: '0.8rem', color: c.text,
                                                    }}>
                                                        <span style={{ fontWeight: 800, marginTop: 1, flexShrink: 0 }}>✓</span>
                                                        <span>
                                                            {a.label}
                                                            {a.timeframe && (
                                                                <span style={{
                                                                    marginLeft: 6, fontSize: 10,
                                                                    background: `${c.badgeBg}22`,
                                                                    color: c.badge, fontWeight: 700,
                                                                    padding: '1px 7px', borderRadius: 10,
                                                                }}>{a.timeframe}</span>
                                                            )}
                                                        </span>
                                                        <span style={{
                                                            marginLeft: 'auto', flexShrink: 0,
                                                            fontWeight: 800, fontSize: '0.82rem', color: c.badge,
                                                        }}>{a.marks} pts</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Existing submission badge */}
                                            {existing && (
                                                <div style={{
                                                    marginTop: 14, padding: '8px 12px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 600,
                                                    border: `1px solid ${existing.status === 'approved' ? '#A7F3D0' : existing.status === 'rejected' ? '#FECACA' : '#FDE68A'}`,
                                                    background: existing.status === 'approved' ? '#ECFDF5' : existing.status === 'rejected' ? '#FEF2F2' : '#FFFBEB',
                                                    color: existing.status === 'approved' ? '#059669' : existing.status === 'rejected' ? '#DC2626' : '#D97706',
                                                    display: 'flex', alignItems: 'center', gap: 6,
                                                }}>
                                                    {existing.status === 'approved' ? '✓' : existing.status === 'rejected' ? '✕' : '⏳'}
                                                    {existing.status === 'approved' ? 'Approved'
                                                        : existing.status === 'rejected' ? 'Rejected — click to re-upload'
                                                            : 'Pending verification'}
                                                    {existing.achievementLabel && <> · {existing.achievementLabel}</>}
                                                </div>
                                            )}
                                            <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: c.badge }}>
                                                → Click to upload proof
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* ══ STEP 2 — UPLOAD ══ */}
                    {step === 'upload' && selectedTier && cs && (
                        <>
                            <button onClick={reset} style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: '#6B7280', fontSize: 13, fontWeight: 600,
                                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, padding: 0,
                            }}>← Back to tiers</button>

                            {/* Tier recap */}
                            <div style={{
                                border: `1px solid ${cs.border}`, background: cs.bg,
                                borderRadius: 6, padding: '12px 16px', marginBottom: 20,
                                display: 'flex', alignItems: 'center', gap: 12,
                            }}>
                                <span style={{
                                    background: cs.badgeBg, color: '#fff',
                                    borderRadius: 4, padding: '3px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase'
                                }}>Tier {selectedTier.id}</span>
                                <span style={{ fontWeight: 700, color: cs.text, fontSize: '0.88rem' }}>
                                    {selectedTier.salary} — {selectedTier.requirement}
                                </span>
                            </div>

                            {/* Select which achievement */}
                            {(() => {
                                const minReq = parseMinRequired(selectedTier.requirement);
                                const isMulti = minReq > 1;
                                return (
                                    <div style={{ marginBottom: 18 }}>
                                        <label style={{
                                            display: 'block', fontSize: '0.75rem', fontWeight: 700,
                                            color: '#374151', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em',
                                        }}>Which achievement are you claiming? *</label>
                                        {isMulti && (
                                            <p style={{ margin: '0 0 10px', fontSize: '0.78rem', color: selectedAchs.length === minReq ? '#16A34A' : '#6B7280', fontWeight: 600 }}>
                                                Selected {selectedAchs.length} of {minReq} required
                                            </p>
                                        )}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {selectedTier.achievements.map((a, i) => {
                                                const isSelected = selectedAchs.includes(a.label);
                                                const isDisabled = !isSelected && isMulti && selectedAchs.length >= minReq;
                                                return (
                                                    <label key={i} style={{
                                                        display: 'flex', alignItems: 'flex-start', gap: 10,
                                                        padding: '10px 14px', borderRadius: 10,
                                                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                        border: `1.5px solid ${isSelected ? '#1F2937' : '#E5E7EB'}`,
                                                        background: isSelected ? '#F3F4F6' : isDisabled ? '#FAFAFA' : '#FAFAFA',
                                                        opacity: isDisabled ? 0.5 : 1,
                                                        transition: 'all 0.15s',
                                                    }}>
                                                        <input
                                                            type={isMulti ? 'checkbox' : 'radio'}
                                                            name="achievement"
                                                            value={a.label}
                                                            checked={isSelected}
                                                            disabled={isDisabled}
                                                            onChange={() => {
                                                                if (isMulti) {
                                                                    if (isSelected) {
                                                                        setSelectedAchs(prev => prev.filter(x => x !== a.label));
                                                                    } else if (selectedAchs.length < minReq) {
                                                                        setSelectedAchs(prev => [...prev, a.label]);
                                                                    }
                                                                } else {
                                                                    setSelectedAchs([a.label]);
                                                                }
                                                            }}
                                                            style={{ marginTop: 2, accentColor: '#1F2937' }}
                                                        />
                                                        <span style={{ flex: 1, fontSize: '0.85rem', color: '#374151', fontWeight: 500 }}>
                                                            {a.label}
                                                            {a.timeframe && (
                                                                <span style={{ marginLeft: 6, fontSize: 10, color: '#9CA3AF' }}>
                                                                    ({a.timeframe})
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span style={{ fontWeight: 800, color: '#1F2937', fontSize: '0.85rem', flexShrink: 0 }}>
                                                            {a.marks} pts
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Platform selector (only if tier has platforms) */}
                            {selectedTier.platforms && selectedTier.platforms.length > 0 && (
                                <div style={{ marginBottom: 18 }}>
                                    <label style={{
                                        display: 'block', fontSize: '0.75rem', fontWeight: 700,
                                        color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em',
                                    }}>Platform *</label>
                                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                        {selectedTier.platforms.map(p => (
                                            <button key={p} onClick={() => setPlatform(p)} type="button" style={{
                                                padding: '8px 18px', borderRadius: 10, cursor: 'pointer',
                                                border: `2px solid ${selectedPlatform === p ? '#1F2937' : '#E5E7EB'}`,
                                                background: selectedPlatform === p ? `#F3F4F6` : '#F9FAFB',
                                                color: selectedPlatform === p ? '#1F2937' : '#6B7280',
                                                fontWeight: selectedPlatform === p ? 700 : 500,
                                                fontSize: '0.85rem', fontFamily: "'Outfit', sans-serif",
                                                transition: 'all 0.15s',
                                            }}>{p}</button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* File upload */}
                            <div style={{ marginBottom: 22 }}>
                                <label style={{
                                    display: 'block', fontSize: '0.75rem', fontWeight: 700,
                                    color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em',
                                }}>Upload Screenshot / Proof *</label>
                                <div onClick={() => fileRef.current?.click()} style={{
                                    border: `2px dashed ${imageDataUrl ? '#1F2937' : '#D1D5DB'}`,
                                    borderRadius: 12, padding: '22px', textAlign: 'center', cursor: 'pointer',
                                    background: imageDataUrl ? `#F3F4F6` : '#FAFAFA', transition: 'all 0.2s',
                                }}>
                                    <input ref={fileRef} type="file" accept="image/*"
                                        style={{ display: 'none' }} onChange={handleFile} />
                                    {imageDataUrl ? (
                                        <>
                                            <img src={imageDataUrl} alt="preview" style={{
                                                maxHeight: 150, maxWidth: '100%', borderRadius: 8,
                                                marginBottom: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                                            }} />
                                            <p style={{ margin: 0, fontSize: 12, color: '#1F2937', fontWeight: 600 }}>
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
                                            <p style={{ margin: 0, fontWeight: 700, color: '#374151', fontSize: '0.88rem' }}>
                                                Click to upload screenshot
                                            </p>
                                            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9CA3AF' }}>
                                                PNG, JPG, JPEG — max 5MB
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Submit */}
                            {(() => {
                                const minReq = parseMinRequired(selectedTier.requirement);
                                const achReady = minReq > 1 ? selectedAchs.length === minReq : selectedAchs.length === 1;
                                const canSubmit = achReady && !!imageDataUrl && (selectedTier.platforms?.length ? !!selectedPlatform : true) && !submitting;
                                return (
                                    <button onClick={handleSubmit} disabled={!canSubmit} style={{
                                        width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                                        fontSize: '1rem', fontWeight: 700, cursor: canSubmit ? 'pointer' : 'not-allowed',
                                        fontFamily: "'Outfit', sans-serif",
                                        background: canSubmit ? '#1F2937' : '#E5E7EB',
                                        color: canSubmit ? '#fff' : '#9CA3AF',
                                        boxShadow: canSubmit ? '0 6px 20px rgba(31,41,55,0.3)' : 'none',
                                        transition: 'all 0.2s',
                                    }}>
                                        {submitting ? 'Submitting…' : 'Submit for Verification'}
                                    </button>
                                );
                            })()}
                        </>
                    )}

                    {/* ══ STEP 3 — SUCCESS ══ */}
                    {step === 'done' && (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <div style={{
                                width: 70, height: 70, borderRadius: '50%',
                                background: `#111827`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 20px',
                                boxShadow: `0 8px 28px rgba(31,41,55,0.3)`,
                            }}>
                                <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
                                    stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                            <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 800, color: '#0A1628' }}>
                                Submitted Successfully!
                            </h3>
                            <p style={{ color: '#6B7280', margin: '0 0 6px', lineHeight: 1.6, fontSize: '0.9rem' }}>
                                <strong>{selectedAchs.join(' + ')}</strong><br />
                                Tier {selectedTier?.id} ({selectedTier?.salary}) is now pending mentor review.
                            </p>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
                                <button onClick={reset} style={{
                                    padding: '10px 22px', borderRadius: 10,
                                    border: '2px solid #E5E7EB', background: '#fff',
                                    color: '#374151', fontWeight: 700, cursor: 'pointer',
                                    fontSize: '0.88rem', fontFamily: "'Outfit', sans-serif",
                                }}>Submit Another</button>
                                <button onClick={onClose} style={{
                                    padding: '10px 22px', borderRadius: 10,
                                    background: '#1F2937', border: 'none',
                                    color: '#fff', fontWeight: 700, cursor: 'pointer',
                                    fontSize: '0.88rem', fontFamily: "'Outfit', sans-serif",
                                }}>Back to Dashboard</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
        @keyframes gpModalIn {
          from { opacity: 0; transform: scale(0.93) translateY(20px); }
          to   { opacity: 1; transform: scale(1)   translateY(0);     }
        }
      `}</style>
        </div>
    );
}
