import { useRef, useState } from 'react';
import {
    CODING_TIERS,
    getSubmissions,
    LPA_THRESHOLDS,
    PARAMETERS,
    saveSubmissions,
    type Submission,
    GENERIC_PARAM_DATA,
    getUsers,
} from '../data/portalData';
import CodingModal from './parameters/CodingModal';
import GenericParameterModal from './parameters/GenericParameterModal';
import ProfileSettingsModal from './dashboards/ProfileSettingsModal';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function getBestApprovedTier(subs: Submission[], parameterId: number): number {
    const approved = subs
        .filter(s => s.parameterId === parameterId && s.status === 'approved')
        .map(s => s.tierId);
    return approved.length ? Math.max(...approved) : 0;
}

function getEarnedMarks(subs: Submission[], parameterId: number): number {
    const approved = subs.filter(s => s.parameterId === parameterId && s.status === 'approved');
    if (approved.length === 0) return 0;

    let best = 0;

    if (parameterId === 1) {
        // Coding parameter: use CODING_TIERS marks directly
        const bestTier = Math.max(...approved.map(s => s.tierId));
        best = CODING_TIERS.find(t => t.id === bestTier)?.marks ?? 0;
    } else {
        const data = GENERIC_PARAM_DATA[parameterId];
        if (data) {
            approved.forEach(s => {
                const tier = data.tiers.find(t => t.id === s.tierId);
                if (tier) {
                    if (s.achievementLabel) {
                        const ach = tier.achievements.find(a => a.label === s.achievementLabel);
                        if (ach) { best = Math.max(best, ach.marks); return; }
                    }
                    best = Math.max(best, Math.max(...tier.achievements.map(a => a.marks)));
                }
            });
        } else {
            const bestTier = Math.max(...approved.map(s => s.tierId));
            best = CODING_TIERS.find(t => t.id === bestTier)?.marks ?? 0;
        }
    }

    return best;
}

/* ─── Props ───────────────────────────────────────────────────────────────── */
interface Props {
    email: string;
    onLogout: () => void;
}

/* ─── Component ───────────────────────────────────────────────────────────── */
export default function StudentDashboard({ email, onLogout }: Props) {
    const [subs, setSubs] = useState<Submission[]>(() => getSubmissions(email));
    const [openParam, setOpenParam] = useState<number | null>(null);
    const [selectedLpa, setSelectedLpa] = useState(0); // 0 = show all, 1/2/3 = specific
    const [showSettings, setShowSettings] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const headerRef = useRef<HTMLDivElement>(null);

    function handleNewSub(sub: Submission) {
        const updated = [...subs, sub];
        setSubs(updated);
        saveSubmissions(email, updated);
    }

    const totalMarks = PARAMETERS.reduce((acc, p) => acc + getEarnedMarks(subs, p.id), 0);
    const maxMarks = PARAMETERS.reduce((acc, p) => acc + p.maxMarks, 0);

    // Calculate score for each LPA tier using cascading logic
    function getTierScore(tierId: number): number {
        let score = 0;
        PARAMETERS.forEach(param => {
            const best = getBestApprovedTier(subs, param.id);
            if (!best) return;
            // Cascading: if approved tier >= tierId being checked, count marks at that tier level
            if (best >= tierId) {
                // Use marks for the requested tier level (not the approved tier)
                if (param.id === 1) {
                    // Coding: use CODING_TIERS directly
                    const tierData = CODING_TIERS.find(t => t.id === tierId);
                    score += tierData?.marks || 0;
                } else {
                    // Generic params: get marks from param data for requested tier
                    const data = GENERIC_PARAM_DATA[param.id];
                    if (data) {
                        const tierData = data.tiers.find(t => t.id === tierId);
                        if (tierData && tierData.achievements.length > 0) {
                            // Use the max marks available at this tier
                            score += Math.max(...tierData.achievements.map(a => a.marks));
                        }
                    }
                }
            }
        });
        return score;
    }

    /* ── Status badge for a parameter ── */
    function ParameterStatusBadge({ parameterId }: { parameterId: number }) {
        const best = getBestApprovedTier(subs, parameterId);
        const pending = subs.some(s => s.parameterId === parameterId && s.status === 'pending');
        if (best) {
            return (
                <span style={{
                    padding: '4px 8px', borderRadius: 4,
                    background: '#22C55E', color: '#fff',
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase'
                }}>
                    Complete
                </span>
            );
        }
        if (pending) {
            return (
                <span style={{
                    padding: '4px 8px', borderRadius: 4,
                    background: '#F59E0B', color: '#fff',
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase'
                }}>
                    Pending
                </span>
            );
        }
        return (
            <span style={{
                padding: '4px 8px', borderRadius: 4,
                background: '#E5E7EB', color: '#6B7280',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase'
            }}>
                Not Started
            </span>
        );
    }

    return (
        <div style={{
            minHeight: '100vh', background: '#F0F4FF',
            fontFamily: "'Outfit', sans-serif",
        }}>

            {/* ── Header ──────────────────────────────────────────────────────── */}
            <div
                ref={headerRef}
                style={{
                    background: 'linear-gradient(135deg, #0A1628 0%, #1B4FCC 100%)',
                    padding: '0 40px',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
                    position: 'sticky', top: 0, zIndex: 10,
                }}
            >
                <div style={{
                    maxWidth: 1200, margin: '0 auto',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', height: 68,
                }}>
                    {/* Logo */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                        </div>
                        <span style={{ color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: '-0.3px' }}>
                            Placement<span style={{ color: '#93C5FD' }}>Portal</span>
                        </span>
                    </div>

                    {/* Centre score */}
                    <div style={{ textAlign: 'center' }}>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            Total Score
                        </span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, justifyContent: 'center' }}>
                            <span style={{ color: '#FBBF24', fontWeight: 900, fontSize: 28, lineHeight: 1 }}>{totalMarks}</span>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>/ {maxMarks}</span>
                        </div>
                    </div>

                    {/* User + logout */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0, color: '#fff', fontWeight: 600, fontSize: 14 }}>
                                {email.split('@')[0]}
                            </p>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>{email}</p>
                        </div>
                        <div key={refreshKey} style={{ display: 'flex', alignItems: 'center' }}>
                            {(() => {
                                const u = getUsers().find((x: any) => x.email === email);
                                return u?.profilePic ? (
                                    <img src={u.profilePic} alt="Profile" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)' }} />
                                ) : (
                                    <div style={{
                                        width: 38, height: 38, borderRadius: '50%',
                                        background: 'linear-gradient(135deg,#6366F1,#8B5CF6)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#fff', fontWeight: 800, fontSize: 15,
                                    }}>
                                        {email[0].toUpperCase()}
                                    </div>
                                );
                            })()}
                        </div>

                        <button
                            onClick={onLogout}
                            style={{
                                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)',
                                color: '#fff', borderRadius: 8, padding: '7px 16px',
                                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                transition: 'background 0.2s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Sub-header with Progress Bars ──────────────────────────────── */}
            <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '20px 40px 24px' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0A1628' }}>
                                My Placement Progress
                            </h2>
                            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#9CA3AF' }}>
                                Complete each checkpoint to unlock placement opportunities.
                                Upload proof for verification.
                            </p>
                        </div>
                        <select value={selectedLpa} onChange={e => setSelectedLpa(Number(e.target.value))} style={{
                            appearance: 'none', padding: '8px 32px 8px 14px', borderRadius: 7,
                            border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#374151',
                            fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', outline: 'none',
                            fontFamily: "'Outfit', sans-serif"
                        }}>
                            <option value={0}>All LPA Tiers</option>
                            {LPA_THRESHOLDS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                    </div>

                    {/* Three progress bars */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {LPA_THRESHOLDS.filter(t => selectedLpa === 0 || t.id === selectedLpa).map(tier => {
                            const score = getTierScore(tier.id);
                            const pct = Math.min((score / tier.maxMarks) * 100, 100);
                            const isEligible = score >= tier.minMarks;
                            const eligLabel = (() => {
                                if (tier.id === 1) return isEligible ? 'Eligible for below 5 LPA' : `Need ${tier.minMarks - score} more marks`;
                                if (tier.id === 2) {
                                    if (score >= 80) return 'Eligible for 5 - Below 10 LPA';
                                    if (score >= 50) return 'Eligible for below 5 LPA only';
                                    return `Need ${50 - score} more marks`;
                                }
                                // tier 3
                                if (score >= 145) return 'Eligible for 10 LPA and above';
                                if (score >= 80) return 'Eligible for 5 - Below 10 LPA';
                                if (score >= 50) return 'Eligible for below 5 LPA only';
                                return `Need ${50 - score} more marks`;
                            })();

                            return (
                                <div key={tier.id} style={{
                                    background: '#FAFAFA', border: '1px solid #E5E7EB', borderRadius: 10,
                                    padding: '14px 18px', transition: 'all 0.2s'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{
                                                background: tier.color, color: '#fff', borderRadius: 4,
                                                padding: '2px 8px', fontSize: '0.65rem', fontWeight: 700,
                                                letterSpacing: '0.05em', textTransform: 'uppercase'
                                            }}>TIER {tier.id}</span>
                                            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827' }}>{tier.label}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#111827' }}>
                                                {score}<span style={{ fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 600 }}>/{tier.minMarks} min</span>
                                            </span>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: 4, fontSize: '0.68rem', fontWeight: 700,
                                                background: isEligible ? '#F0FDF4' : '#FEF2F2',
                                                color: isEligible ? '#16A34A' : '#DC2626',
                                                border: `1px solid ${isEligible ? '#BBF7D0' : '#FECACA'}`
                                            }}>
                                                {isEligible ? 'Eligible' : 'Not Yet'}
                                            </span>
                                        </div>
                                    </div>
                                    {/* Progress bar */}
                                    <div style={{
                                        width: '100%', height: 8, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            width: `${pct}%`, height: '100%', borderRadius: 4,
                                            background: isEligible
                                                ? `linear-gradient(90deg, ${tier.color}, ${tier.color}dd)`
                                                : '#9CA3AF',
                                            transition: 'width 0.5s ease'
                                        }} />
                                    </div>
                                    <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: '#6B7280', fontWeight: 500 }}>
                                        {eligLabel}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── 8 Parameter Cards ───────────────────────────────────────────── */}
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 40px' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: 20,
                }}>
                    {PARAMETERS.map(param => {
                        const marks = getEarnedMarks(subs, param.id);
                        const best = getBestApprovedTier(subs, param.id);

                        return (
                            <div
                                key={param.id}
                                onClick={() => param.available && setOpenParam(param.id)}
                                style={{
                                    background: '#fff',
                                    borderRadius: 6,
                                    padding: '20px',
                                    border: `1px solid ${param.available ? '#E5E7EB' : '#F3F4F6'}`,
                                    cursor: param.available ? 'pointer' : 'default',
                                    transition: 'all 0.15s',
                                    display: 'flex', flexDirection: 'column',
                                    minHeight: 180,
                                }}
                                onMouseEnter={e => {
                                    if (!param.available) return;
                                    (e.currentTarget as HTMLDivElement).style.borderColor = '#9CA3AF';
                                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)';
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLDivElement).style.borderColor = '#E5E7EB';
                                    (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                                }}
                            >
                                {/* Top Badges */}
                                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
                                    <ParameterStatusBadge parameterId={param.id} />
                                </div>

                                {/* Title & Subtitle */}
                                <div style={{ flex: 1 }}>
                                    <h3 style={{
                                        margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 600,
                                        color: param.available ? '#1F2937' : '#9CA3AF',
                                        lineHeight: 1.3,
                                    }}>
                                        {param.name}
                                    </h3>
                                    <div style={{ fontSize: '0.85rem', color: '#6B7280', marginBottom: 12 }}>
                                        {marks} / {param.maxMarks} pts Earned
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#9CA3AF', lineHeight: 1.4 }}>
                                        {param.id === 1 ? 'Minimum 50+ problems required.' : 'Submission and verification required.'}
                                    </div>
                                </div>

                                {/* Bottom Tags & Action */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16 }}>
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        {param.id === 1 ? (
                                            <>
                                                <span style={{ border: '1px solid #38BDF8', color: '#0284C7', padding: '2px 6px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700 }}>LEETCODE</span>
                                                <span style={{ border: '1px solid #38BDF8', color: '#0284C7', padding: '2px 6px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700 }}>CC/CF</span>
                                            </>
                                        ) : (
                                            <span style={{ border: '1px solid #38BDF8', color: '#0284C7', padding: '2px 6px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>{param.name.split(' ')[0]}</span>
                                        )}
                                    </div>
                                    
                                    {param.available ? (
                                        <div style={{
                                            fontSize: '0.8rem', color: '#0284C7', fontWeight: 600,
                                            display: 'flex', alignItems: 'center', gap: 4,
                                        }}>
                                            {best > 0 ? 'VIEW' : 'OPEN'} &rarr;
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: '0.8rem', color: '#D1D5DB', fontWeight: 600 }}>COMING SOON</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Coding Modal ────────────────────────────────────────────────── */}
            {openParam === 1 && (
                <CodingModal
                    subs={subs}
                    onNewSub={handleNewSub}
                    onClose={() => setOpenParam(null)}
                />
            )}

            {/* ── Generic Parameter Modals (2–8) ──────────────────────────────── */}
            {openParam !== null && openParam !== 1 && (
                <GenericParameterModal
                    parameterId={openParam}
                    subs={subs}
                    onNewSub={handleNewSub}
                    onClose={() => setOpenParam(null)}
                />
            )}
            {showSettings && (
                <ProfileSettingsModal email={email} onClose={() => setShowSettings(false)} onSave={() => setRefreshKey(k => k + 1)} />
            )}
        </div>
    );
}
