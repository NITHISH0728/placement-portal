import { PARAMETERS, CODING_TIERS, GENERIC_PARAM_DATA, getSubmissions, getUsers, type Submission } from '../../data/portalData';
import { useState } from 'react';

interface Props {
    studentEmail: string;
    studentName: string;
    studentReg: string;
    studentDept?: string;
    studentSec?: string;
    onClose: () => void;
}

export default function StudentProfileView({ studentEmail, studentName, studentReg, studentDept, studentSec, onClose }: Props) {
    const subs = getSubmissions(studentEmail);
    const student = getUsers().find(u => u.email === studentEmail);
    const [previewImage, setPreviewImage] = useState<string | string[] | null>(null);

    function getEarnedMarks(subs: Submission[], paramId: number): number {
        const approved = subs.filter(s => s.parameterId === paramId && s.status === 'approved');
        if (approved.length === 0) return 0;

        let best = 0;

        if (paramId === 1) {
            // Coding parameter: use CODING_TIERS marks directly
            const bestTier = Math.max(...approved.map(s => s.tierId));
            best = CODING_TIERS.find(t => t.id === bestTier)?.marks ?? 0;
        } else {
            // Generic params: look up actual achievement marks from GENERIC_PARAM_DATA
            const data = GENERIC_PARAM_DATA[paramId];
            if (data) {
                approved.forEach(s => {
                    const tier = data.tiers.find(t => t.id === s.tierId);
                    if (tier) {
                        // Match by achievement label if available
                        if (s.achievementLabel) {
                            const ach = tier.achievements.find(a => a.label === s.achievementLabel);
                            if (ach) { best = Math.max(best, ach.marks); return; }
                        }
                        // Fallback: use max marks from that tier
                        best = Math.max(best, Math.max(...tier.achievements.map(a => a.marks)));
                    }
                });
            } else {
                // Unknown param, fallback to tier-based max
                const bestTier = Math.max(...approved.map(s => s.tierId));
                best = CODING_TIERS.find(t => t.id === bestTier)?.marks ?? 0;
            }
        }

        return best;
    }

    const totalScore = PARAMETERS.reduce((sum, p) => sum + getEarnedMarks(subs, p.id), 0);
    const maxPossible = PARAMETERS.reduce((sum, p) => sum + p.maxMarks, 0);
    const completedCount = PARAMETERS.filter(p => getEarnedMarks(subs, p.id) > 0).length;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(17, 24, 39, 0.5)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.2s ease', padding: 20,
            fontFamily: "'Outfit', sans-serif"
        }} onClick={onClose}>

            <div style={{
                background: '#fff', borderRadius: 10, width: '100%', maxWidth: 620,
                boxShadow: '0 8px 30px rgba(0,0,0,0.12)', overflow: 'hidden',
                animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex', flexDirection: 'column', maxHeight: '92vh'
            }} onClick={e => e.stopPropagation()}>

                {/* ── Top bar ── */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 24px', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                        <span style={{ fontSize: '0.88rem', color: '#374151', fontWeight: 700 }}>Student Profile</span>
                    </div>
                    <button onClick={onClose} style={{
                        width: 30, height: 30, borderRadius: 6, background: '#fff', border: '1px solid #E5E7EB',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        color: '#6B7280', transition: 'all 0.15s'
                    }} onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.borderColor = '#FECACA'; }}
                       onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.borderColor = '#E5E7EB'; }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>

                {/* ── Profile header ── */}
                <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid #E5E7EB' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
                        {/* Avatar */}
                        {student?.profilePic ? (
                            <img src={student.profilePic} alt={student.name} style={{
                                width: 56, height: 56, borderRadius: 8, objectFit: 'cover', border: '1px solid #E5E7EB'
                            }} />
                        ) : (
                            <div style={{
                                width: 56, height: 56, borderRadius: 8, background: '#F3F4F6', border: '1px solid #E5E7EB',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#9CA3AF'
                            }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                            </div>
                        )}
                        <div style={{ flex: 1 }}>
                            <h2 style={{ margin: '0 0 4px', fontSize: '1.2rem', color: '#111827', fontWeight: 800, lineHeight: 1.2 }}>{studentName}</h2>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#6B7280' }}>{studentEmail}</p>
                        </div>
                    </div>

                    {/* Info grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 1, background: '#E5E7EB', borderRadius: 8, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                        {[
                            { label: 'Register No', value: studentReg },
                            { label: 'Department', value: studentDept || 'N/A' },
                            { label: 'Section', value: studentSec || 'N/A' },
                            { label: 'Batch', value: String(new Date().getFullYear()) },
                        ].map((item, i) => (
                            <div key={i} style={{ background: '#fff', padding: '12px 14px' }}>
                                <p style={{ margin: '0 0 3px', fontSize: '0.65rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</p>
                                <p style={{ margin: 0, fontSize: '0.88rem', color: '#111827', fontWeight: 700 }}>{item.value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Score summary strip ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: '#E5E7EB', borderBottom: '1px solid #E5E7EB' }}>
                    <div style={{ background: '#fff', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: '1.1rem', color: '#111827', fontWeight: 800 }}>{totalScore}<span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 600 }}>/{maxPossible}</span></p>
                            <p style={{ margin: 0, fontSize: '0.68rem', color: '#6B7280', fontWeight: 600 }}>Total Score</p>
                        </div>
                    </div>
                    <div style={{ background: '#fff', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: '1.1rem', color: '#111827', fontWeight: 800 }}>{completedCount}<span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 600 }}>/{PARAMETERS.length}</span></p>
                            <p style={{ margin: 0, fontSize: '0.68rem', color: '#6B7280', fontWeight: 600 }}>Completed</p>
                        </div>
                    </div>
                    <div style={{ background: '#fff', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: '1.1rem', color: '#111827', fontWeight: 800 }}>{PARAMETERS.length - completedCount}</p>
                            <p style={{ margin: 0, fontSize: '0.68rem', color: '#6B7280', fontWeight: 600 }}>Pending</p>
                        </div>
                    </div>
                </div>

                {/* ── Parameters table ── */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {/* Table header */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: '36px 1fr 80px 90px 80px', gap: 8,
                        padding: '10px 24px', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB',
                        fontSize: '0.68rem', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                        position: 'sticky', top: 0, zIndex: 2
                    }}>
                        <div>#</div>
                        <div>Parameter</div>
                        <div style={{ textAlign: 'center' }}>Marks</div>
                        <div style={{ textAlign: 'center' }}>Status</div>
                        <div style={{ textAlign: 'center' }}>Proof</div>
                    </div>

                    {/* Table rows */}
                    {PARAMETERS.map((param, index) => {
                        const marks = getEarnedMarks(subs, param.id);
                        const isCompleted = marks > 0;

                        return (
                            <div key={param.id} style={{
                                display: 'grid', gridTemplateColumns: '36px 1fr 80px 90px 80px', gap: 8,
                                padding: '12px 24px', borderBottom: '1px solid #F3F4F6',
                                alignItems: 'center', background: '#fff',
                                transition: 'background 0.1s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                                {/* Number */}
                                <div style={{
                                    width: 26, height: 26, borderRadius: 6,
                                    background: isCompleted ? '#F0FDF4' : '#F9FAFB',
                                    border: `1px solid ${isCompleted ? '#BBF7D0' : '#E5E7EB'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.75rem', fontWeight: 800,
                                    color: isCompleted ? '#16A34A' : '#9CA3AF'
                                }}>
                                    {index + 1}
                                </div>

                                {/* Name */}
                                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1F2937' }}>{param.name}</div>

                                {/* Marks */}
                                <div style={{ textAlign: 'center' }}>
                                    <span style={{
                                        fontSize: '0.85rem', fontWeight: 800,
                                        color: isCompleted ? '#111827' : '#D1D5DB'
                                    }}>{marks}<span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>/{param.maxMarks}</span></span>
                                </div>

                                {/* Status */}
                                <div style={{ textAlign: 'center' }}>
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                        padding: '3px 10px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 700,
                                        background: isCompleted ? '#F0FDF4' : '#FEF2F2',
                                        color: isCompleted ? '#16A34A' : '#DC2626',
                                        border: `1px solid ${isCompleted ? '#BBF7D0' : '#FECACA'}`
                                    }}>
                                        {isCompleted ? (
                                            <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Done</>
                                        ) : (
                                            <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Pending</>
                                        )}
                                    </span>
                                </div>

                                {/* Proof */}
                                <div style={{ textAlign: 'center' }}>
                                    {isCompleted ? (
                                        <button onClick={() => {
                                            const approvedSub = subs.find(s => s.parameterId === param.id && s.status === 'approved');
                                            if (approvedSub && approvedSub.imageDataUrl) setPreviewImage(approvedSub.imageDataUrl);
                                        }} style={{
                                            padding: '4px 12px', borderRadius: 5, background: '#fff', color: '#374151',
                                            border: '1px solid #D1D5DB', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700,
                                            transition: 'all 0.15s', display: 'inline-flex', alignItems: 'center', gap: 4
                                        }} onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.borderColor = '#9CA3AF'; }}
                                           onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#D1D5DB'; }}>
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                            View
                                        </button>
                                    ) : (
                                        <span style={{ fontSize: '0.75rem', color: '#D1D5DB' }}>—</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Footer ── */}
                <div style={{
                    padding: '14px 24px', borderTop: '1px solid #E5E7EB', background: '#F9FAFB',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#9CA3AF', fontWeight: 600 }}>
                        Showing {PARAMETERS.length} parameters
                    </p>
                    <button onClick={onClose} style={{
                        padding: '8px 22px', borderRadius: 7, border: '1px solid #D1D5DB', background: '#fff',
                        color: '#374151', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s'
                    }} onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
                       onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                        Close
                    </button>
                </div>
            </div>

            {previewImage && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40
                }} onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }}>
                    <div style={{ position: 'relative', display: 'flex', gap: 20, overflowX: 'auto', maxWidth: '100%', padding: 20, alignItems: 'center' }}>
                        {Array.isArray(previewImage) ? previewImage.map((img, i) => (
                            <img key={i} src={img} style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 6 }} alt={`Proof preview ${i+1}`} />
                        )) : (
                            <img src={previewImage} style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 6 }} alt="Proof preview" />
                        )}
                        <button onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }} style={{
                            position: 'fixed', top: 20, right: 20, width: 40, height: 40, borderRadius: '50%',
                            background: '#fff', color: '#111827', border: '1px solid #E5E7EB', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                        }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>
                </div>
            )}

            <style>
                {`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(16px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                `}
            </style>
        </div>
    );
}
