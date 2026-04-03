import { useState, useRef } from 'react';
import { getUsers, getAllSubmissions, saveSubmissions, saveUser, type Submission, getParamData, PARAMETERS, CODING_TIERS, GENERIC_PARAM_DATA } from '../../data/portalData';
import StudentProfileView from './StudentProfileView';
import ProfileSettingsModal from './ProfileSettingsModal';

interface Props {
    email: string;
    onLogout: () => void;
}

export default function StaffDashboard({ email, onLogout }: Props) {
    const users = getUsers();
    const staffUser = users.find((u: any) => u.email === email);
    const department = staffUser?.department || 'Unknown';
    const section = staffUser?.section || 'Unknown';

    // UI States
    const [statusFilter, setStatusFilter] = useState<'All' | 'Completed' | 'Pending'>('All');
    const [profileImage, setProfileImage] = useState<string | null>(() => localStorage.getItem(`pp_avatar_${email}`));
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const url = ev.target?.result as string;
            setProfileImage(url);
            localStorage.setItem(`pp_avatar_${email}`, url);
        };
        reader.readAsDataURL(file);
    };

    // ── Get All Pending Submissions for this specific Dept + Section ──
    const allStudentData = getAllSubmissions();
    const studentsInSection = users.filter((u: any) => u.role === 'student' && u.department === department && u.section === section);

    // Combine student profiles with their submissions
    const myStudents = studentsInSection.map((s: any) => {
        const subData = allStudentData.find(d => d.email === s.email);
        return { ...s, submissions: subData ? subData.subs : [] };
    });

    const pendingQueue: { studentEmail: string; studentName: string; studentReg: string; sub: Submission }[] = [];
    myStudents.forEach((student: any) => {
        student.submissions.forEach((sub: Submission) => {
            if (sub.status === 'pending') {
                pendingQueue.push({
                    studentEmail: student.email,
                    studentName: student.name,
                    studentReg: student.regNo || 'N/A',
                    sub
                });
            }
        });
    });

    // ── Handlers ──
    const [toast, setToast] = useState('');
    const [showSettings, setShowSettings] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
    const [selectedVerificationItem, setSelectedVerificationItem] = useState<{ studentEmail: string, studentName: string, studentReg: string, sub: Submission } | null>(null);

    // Helpers
    function getEarnedMarks(subs: Submission[], paramId: number) {
        const approved = subs.filter(s => s.parameterId === paramId && s.status === 'approved');
        if (approved.length === 0) return 0;

        let best = 0;
        if (paramId === 1) {
            const bestTier = Math.max(...approved.map(s => s.tierId));
            best = CODING_TIERS.find(t => t.id === bestTier)?.marks ?? 0;
        } else {
            const data = GENERIC_PARAM_DATA[paramId];
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

    function checkParamCompleted(subs: Submission[], paramId: number) {
        return getEarnedMarks(subs, paramId) > 0;
    }

    const downloadCSV = () => {
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Name,Email,Reg No,Status,Pending Parameters\n";

        myStudents.forEach((student: any) => {
            const pendingParams = PARAMETERS.filter(p => !checkParamCompleted(student.submissions, p.id));
            const isCompleted = pendingParams.length === 0;
            const pendingNames = pendingParams.map(p => p.name).join('; ');
            
            const row = `"${student.name}","${student.email}","${student.regNo || 'N/A'}","${isCompleted ? 'Completed' : 'Uncompleted'}","${isCompleted ? '' : pendingNames}"`;
            csvContent += row + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Student_Status_${department}_${section}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Tab State
    const [activeTab, setActiveTab] = useState<'dashboard' | 'verification' | 'students' | 'onboard'>('dashboard');

    // Onboarding form state
    const [obName, setObName] = useState('');
    const [obEmail, setObEmail] = useState('');
    const [obPass, setObPass] = useState('');
    const [obDept, setObDept] = useState(department);
    const [obSec, setObSec] = useState(section);
    const [obYear, setObYear] = useState('1');
    const [obRegNo, setObRegNo] = useState('');
    const [obError, setObError] = useState('');
    const [obSuccess, setObSuccess] = useState('');

    const filteredStudents = myStudents.filter((s: any) => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.regNo && s.regNo.toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesSearch) return false;

        const isCompleted = PARAMETERS.every(p => checkParamCompleted(s.submissions, p.id));
        if (statusFilter === 'Completed' && !isCompleted) return false;
        if (statusFilter === 'Pending' && isCompleted) return false;

        return true;
    });

    const handleRefresh = () => {
        setSearchQuery('');
        setStatusFilter('All');
        setToast('Table refreshed');
        setTimeout(() => setToast(''), 3000);
    };

    function handleVerify(studentEmail: string, submissionDate: string, isApproved: boolean) {
        // Fetch fresh submissions for this exact student to prevent race conditions
        const targetStudent = allStudentData.find(d => d.email === studentEmail);
        if (!targetStudent) return;

        const updatedSubs = targetStudent.subs.map(s => {
            if (s.submittedAt === submissionDate) {
                return { ...s, status: isApproved ? 'approved' : 'rejected' } as Submission;
            }
            return s;
        });

        saveSubmissions(studentEmail, updatedSubs);
        setToast(`Submission ${isApproved ? 'Approved' : 'Rejected'} for ${studentEmail}`);
        setTimeout(() => setToast(''), 3000);
        setSelectedVerificationItem(null); // Close modal if open
        // Page will naturally re-render when state changes because of React logic... 
        // but since we rely on localStorage primarily for mock DB, we force a re-render here:
        window.location.reload();
    }

    const navItems: { key: 'dashboard' | 'verification' | 'students' | 'onboard'; label: string }[] = [
        { key: 'dashboard', label: 'Home' },
        { key: 'verification', label: 'Verification Queue' },
        { key: 'students', label: 'Student Management' },
        { key: 'onboard', label: 'Onboard Student' },
    ];

    const handleOnboardStudent = () => {
        setObError('');
        setObSuccess('');
        if (!obName.trim() || !obEmail.trim() || !obPass.trim() || !obDept.trim() || !obSec.trim() || !obRegNo.trim()) {
            setObError('All fields are required. Please fill in every field.');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(obEmail.trim())) {
            setObError('Please enter a valid email address.');
            return;
        }
        const success = saveUser({
            email: obEmail.trim().toLowerCase(),
            password: obPass.trim(),
            role: 'student',
            name: obName.trim(),
            department: obDept.trim().toUpperCase(),
            section: obSec.trim().toUpperCase(),
            year: obYear,
            regNo: obRegNo.trim().toUpperCase()
        });
        if (!success) {
            setObError('A user with this email already exists.');
            return;
        }
        setObSuccess(`Student "${obName.trim()}" has been onboarded successfully.`);
        setObName(''); setObEmail(''); setObPass(''); setObRegNo('');
        setObDept(department); setObSec(section); setObYear('1');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F9FAFB', fontFamily: "'Outfit', sans-serif" }}>
            {/* ── Horizontal Navbar ── */}
            <header style={{
                background: '#FFFFFF', borderBottom: '1px solid #E5E7EB',
                display: 'flex', alignItems: 'center', padding: '0 32px', height: 64, flexShrink: 0,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)', zIndex: 20
            }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginRight: 40 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 9,
                        background: '#1F2937',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1rem', color: '#111827', fontWeight: 800, lineHeight: 1.2 }}>Placement Portal</h1>
                        <p style={{ margin: 0, fontSize: '0.65rem', color: '#6B7280', fontWeight: 600 }}>{department}-{section} Staff</p>
                    </div>
                </div>

                {/* Nav Tabs */}
                <nav style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                    {navItems.map(item => (
                        <button key={item.key} onClick={() => setActiveTab(item.key)} style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 8,
                            background: activeTab === item.key ? '#F3F4F6' : 'transparent',
                            border: 'none', color: activeTab === item.key ? '#111827' : '#6B7280',
                            fontSize: '0.88rem', fontWeight: activeTab === item.key ? 700 : 500, cursor: 'pointer',
                            transition: 'all 0.15s', position: 'relative'
                        }} onMouseEnter={e => { if (activeTab !== item.key) e.currentTarget.style.background = '#F9FAFB'; }}
                           onMouseLeave={e => { if (activeTab !== item.key) e.currentTarget.style.background = 'transparent'; }}>
                            <span>{item.label}</span>
                            {item.key === 'verification' && pendingQueue.length > 0 && (
                                <span style={{
                                    background: '#EF4444', color: '#fff', fontSize: '0.65rem',
                                    padding: '1px 7px', borderRadius: 10, fontWeight: 700, lineHeight: '16px'
                                }}>{pendingQueue.length}</span>
                            )}
                        </button>
                    ))}
                </nav>

                {/* Right: user info + logout */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginLeft: 'auto' }}>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#111827', fontWeight: 700 }}>{staffUser?.name}</p>
                        <p style={{ margin: 0, fontSize: '0.68rem', color: '#6B7280' }}>{staffUser?.email}</p>
                    </div>
                    {staffUser?.profilePic ? (
                        <img src={staffUser.profilePic} alt="Profile" style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover', border: '1px solid #E5E7EB' }} />
                    ) : null}
                    <button onClick={() => setShowSettings(true)} title="Upload Photo" style={{
                        width: 34, height: 34, borderRadius: 8, border: '1px solid #E5E7EB', flexShrink: 0,
                        background: '#fff', color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
                    }} onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6'; }}
                       onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    </button>
                    <button onClick={onLogout} title="Logout" style={{
                        width: 34, height: 34, borderRadius: 8, border: '1px solid #E5E7EB', flexShrink: 0,
                        background: '#fff', color: '#6B7280',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        transition: 'all 0.2s'
                    }} onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.borderColor = '#FECACA'; }}
                       onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.borderColor = '#E5E7EB'; }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                    </button>
                </div>
            </header>

            {/* ── Main Content ── */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ padding: '32px 40px' }}>

                    {activeTab === 'dashboard' && (() => {
                        // Computed dashboard metrics
                        const completedStudents = myStudents.filter((s: any) => PARAMETERS.every(p => checkParamCompleted(s.submissions, p.id))).length;
                        const pendingStudentsCount = myStudents.length - completedStudents;

                        // Weekly performance data (last 7 days)
                        const now = new Date();
                        const weekDays = Array.from({ length: 7 }, (_, i) => {
                            const d = new Date(now);
                            d.setDate(d.getDate() - (6 - i));
                            return d;
                        });
                        const dayLabels = weekDays.map(d => d.toLocaleDateString('en-US', { weekday: 'short' }));
                        const dateLabels = weekDays.map(d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

                        // Count submissions per day — includes all statuses (pending, approved, rejected)
                        const weeklySubmissionCounts = weekDays.map(day => {
                            const dayStr = day.toISOString().split('T')[0];
                            let count = 0;
                            myStudents.forEach((s: any) => {
                                s.submissions.forEach((sub: any) => {
                                    if (sub.submittedAt) {
                                        const subDay = new Date(sub.submittedAt).toISOString().split('T')[0];
                                        if (subDay === dayStr) count++;
                                    }
                                });
                            });
                            return count;
                        });

                        // Also count approved submissions per day for a second line
                        const weeklyApprovedCounts = weekDays.map(day => {
                            const dayStr = day.toISOString().split('T')[0];
                            let count = 0;
                            myStudents.forEach((s: any) => {
                                s.submissions.forEach((sub: any) => {
                                    if (sub.submittedAt && sub.status === 'approved') {
                                        const subDay = new Date(sub.submittedAt).toISOString().split('T')[0];
                                        if (subDay === dayStr) count++;
                                    }
                                });
                            });
                            return count;
                        });

                        const totalThisWeek = weeklySubmissionCounts.reduce((a, b) => a + b, 0);
                        const approvedThisWeek = weeklyApprovedCounts.reduce((a, b) => a + b, 0);
                        const maxCount = Math.max(...weeklySubmissionCounts, ...weeklyApprovedCounts, 1);

                        // Full-width SVG graph dimensions
                        const gW = 700, gH = 180, padX = 50, padY = 20, padBottom = 30;
                        const usableW = gW - padX - 20;
                        const usableH = gH - padY - padBottom;

                        // Submission line points
                        const subPoints = weeklySubmissionCounts.map((v, i) => ({
                            x: padX + (i / 6) * usableW,
                            y: padY + usableH - (v / maxCount) * usableH
                        }));
                        const subPolyline = subPoints.map(p => `${p.x},${p.y}`).join(' ');
                        const subArea = `M ${padX},${padY + usableH} ` + subPoints.map(p => `L ${p.x},${p.y}`).join(' ') + ` L ${padX + usableW},${padY + usableH} Z`;

                        // Approved line points
                        const appPoints = weeklyApprovedCounts.map((v, i) => ({
                            x: padX + (i / 6) * usableW,
                            y: padY + usableH - (v / maxCount) * usableH
                        }));
                        const appPolyline = appPoints.map(p => `${p.x},${p.y}`).join(' ');

                        // Y-axis grid lines
                        const yTicks = 4;
                        const yGridLines = Array.from({ length: yTicks + 1 }, (_, i) => {
                            const val = Math.round((maxCount / yTicks) * i);
                            const y = padY + usableH - (i / yTicks) * usableH;
                            return { val, y };
                        });

                        // Time-based greeting
                        const hour = now.getHours();
                        const greeting = hour < 12 ? ' Good Morning' : hour < 17 ? ' Good Afternoon' : ' Good Evening';

                        return (
                        <div style={{ animation: 'fadeIn 0.3s ease' }}>
                            {/* Greeting */}
                            <div style={{ marginBottom: 28 }}>
                                <h2 style={{ margin: '0 0 4px', fontSize: '1.6rem', color: '#111827', fontWeight: 800 }}>{greeting}, {staffUser?.name?.split(' ')[0] || 'Staff'}</h2>
                                <p style={{ margin: 0, color: '#6B7280', fontSize: '0.9rem' }}>Let's see how your section is doing today.</p>
                            </div>

                            {/* Profile Card — full width */}
                            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', padding: 28, display: 'flex', alignItems: 'center', gap: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 28 }}>
                                {/* Avatar with upload */}
                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                    <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                                    <div onClick={() => fileInputRef.current?.click()} style={{
                                        width: 96, height: 96, borderRadius: '50%', overflow: 'hidden', cursor: 'pointer',
                                        background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        border: '3px solid #E5E7EB', position: 'relative', transition: 'border-color 0.2s'
                                    }} onMouseEnter={e => e.currentTarget.style.borderColor = '#3B82F6'} onMouseLeave={e => e.currentTarget.style.borderColor = '#E5E7EB'}>
                                        {profileImage ? (
                                            <img src={profileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                        )}
                                    </div>
                                    <div onClick={() => fileInputRef.current?.click()} style={{
                                        position: 'absolute', bottom: 2, right: 2, width: 26, height: 26, borderRadius: '50%',
                                        background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                                    }}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                                    </div>
                                </div>

                                {/* Info */}
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ margin: '0 0 10px', fontSize: '1.3rem', color: '#111827', fontWeight: 800 }}>{staffUser?.name}</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.88rem', color: '#4B5563' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                            <span>{email}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                            <span>Staff / Class Advisor</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                            <span>{department} - Section {section}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Resume card */}
                                <div style={{ background: '#F0FDF4', borderRadius: 10, padding: '16px 20px', maxWidth: 240, border: '1px solid #BBF7D0' }}>
                                    <p style={{ margin: '0 0 4px', fontSize: '0.8rem', color: '#15803D', fontWeight: 700 }}>Start where you left  →</p>
                                    <p style={{ margin: '0 0 10px', fontSize: '0.8rem', color: '#4B5563' }}>{pendingQueue.length > 0 ? `${pendingQueue.length} submissions awaiting review` : 'All submissions reviewed!'}</p>
                                    {pendingQueue.length > 0 && (
                                        <button onClick={() => setActiveTab('verification')} style={{
                                            padding: '8px 16px', borderRadius: 8, border: 'none', background: '#16A34A', color: '#fff',
                                            fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s'
                                        }} onMouseEnter={e => e.currentTarget.style.background = '#15803D'} onMouseLeave={e => e.currentTarget.style.background = '#16A34A'}>Review now</button>
                                    )}
                                </div>
                            </div>

                            {/* Quick Access (4 cards) — full width */}
                            <div style={{ marginBottom: 28 }}>
                                <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', color: '#111827', fontWeight: 800 }}>Quick Access</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
                                    {/* Student List */}
                                    <div onClick={() => setActiveTab('students')} style={{
                                        background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', padding: '20px 18px',
                                        cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.2s',
                                        display: 'flex', flexDirection: 'column', gap: 6
                                    }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#3B82F6'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(59,130,246,0.12)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Student List</p>
                                        <p style={{ margin: 0, fontSize: '1.8rem', color: '#111827', fontWeight: 800 }}>{myStudents.length}</p>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: '#9CA3AF', marginTop: 4 }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                                        </div>
                                    </div>

                                    {/* Verification */}
                                    <div onClick={() => setActiveTab('verification')} style={{
                                        background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', padding: '20px 18px',
                                        cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.2s',
                                        display: 'flex', flexDirection: 'column', gap: 6
                                    }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#F59E0B'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(245,158,11,0.12)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Verification</p>
                                        <p style={{ margin: 0, fontSize: '1.8rem', color: '#111827', fontWeight: 800 }}>{pendingQueue.length}</p>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: '#9CA3AF', marginTop: 4 }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                                        </div>
                                    </div>

                                    {/* Completed Students */}
                                    <div style={{
                                        background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', padding: '20px 18px',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 6
                                    }}>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Completed</p>
                                        <p style={{ margin: 0, fontSize: '1.8rem', color: '#10B981', fontWeight: 800 }}>{completedStudents}</p>
                                        <p style={{ margin: 0, fontSize: '0.7rem', color: '#9CA3AF', marginTop: 4 }}>students</p>
                                    </div>

                                    {/* Pending Students */}
                                    <div style={{
                                        background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', padding: '20px 18px',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 6
                                    }}>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending</p>
                                        <p style={{ margin: 0, fontSize: '1.8rem', color: '#EF4444', fontWeight: 800 }}>{pendingStudentsCount}</p>
                                        <p style={{ margin: 0, fontSize: '0.7rem', color: '#9CA3AF', marginTop: 4 }}>students</p>
                                    </div>
                                </div>
                            </div>

                            {/* Performance Graph — full width */}
                            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', padding: '24px 28px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 4px', fontSize: '1.1rem', color: '#111827', fontWeight: 800 }}>Weekly Performance</h4>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#6B7280' }}>Student submissions & approvals over the last 7 days</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div style={{ width: 12, height: 3, borderRadius: 2, background: '#3B82F6' }} />
                                            <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600 }}>Submissions ({totalThisWeek})</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div style={{ width: 12, height: 3, borderRadius: 2, background: '#10B981' }} />
                                            <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600 }}>Approved ({approvedThisWeek})</span>
                                        </div>
                                    </div>
                                </div>

                                {/* SVG Chart */}
                                <div style={{ width: '100%', overflowX: 'auto' }}>
                                    <svg width="100%" height={gH} viewBox={`0 0 ${gW} ${gH}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
                                        <defs>
                                            <linearGradient id="subAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.15" />
                                                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.01" />
                                            </linearGradient>
                                        </defs>

                                        {/* Horizontal grid lines + Y-axis labels */}
                                        {yGridLines.map((tick, i) => (
                                            <g key={i}>
                                                <line x1={padX} y1={tick.y} x2={padX + usableW} y2={tick.y} stroke="#F3F4F6" strokeWidth="1" />
                                                <text x={padX - 10} y={tick.y + 4} textAnchor="end" fontSize="10" fill="#9CA3AF" fontFamily="Inter, sans-serif">{tick.val}</text>
                                            </g>
                                        ))}

                                        {/* Submission area fill */}
                                        <path d={subArea} fill="url(#subAreaGrad)" />

                                        {/* Submission line */}
                                        <polyline points={subPolyline} fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                                        {/* Approved line */}
                                        <polyline points={appPolyline} fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 3" />

                                        {/* Submission dots */}
                                        {subPoints.map((p, i) => (
                                            <g key={`s${i}`}>
                                                <circle cx={p.x} cy={p.y} r="5" fill="#fff" stroke="#3B82F6" strokeWidth="2.5" />
                                                {weeklySubmissionCounts[i] > 0 && (
                                                    <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" fill="#3B82F6" fontWeight="700" fontFamily="Inter, sans-serif">{weeklySubmissionCounts[i]}</text>
                                                )}
                                            </g>
                                        ))}

                                        {/* Approved dots */}
                                        {appPoints.map((p, i) => (
                                            <g key={`a${i}`}>
                                                <circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke="#10B981" strokeWidth="2" />
                                            </g>
                                        ))}

                                        {/* X-axis labels */}
                                        {subPoints.map((p, i) => (
                                            <g key={`xl${i}`}>
                                                <text x={p.x} y={gH - 5} textAnchor="middle" fontSize="10" fill="#9CA3AF" fontWeight="600" fontFamily="Inter, sans-serif">{dayLabels[i]}</text>
                                                <text x={p.x} y={gH + 7} textAnchor="middle" fontSize="8" fill="#D1D5DB" fontFamily="Inter, sans-serif">{dateLabels[i]}</text>
                                            </g>
                                        ))}
                                    </svg>
                                </div>

                                {/* Summary strip */}
                                <div style={{ display: 'flex', gap: 24, marginTop: 16, paddingTop: 16, borderTop: '1px solid #F3F4F6' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                                        </div>
                                        <div>
                                            <p style={{ margin: 0, fontSize: '1rem', color: '#111827', fontWeight: 800 }}>{totalThisWeek}</p>
                                            <p style={{ margin: 0, fontSize: '0.7rem', color: '#6B7280' }}>Total submissions</p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                        </div>
                                        <div>
                                            <p style={{ margin: 0, fontSize: '1rem', color: '#111827', fontWeight: 800 }}>{approvedThisWeek}</p>
                                            <p style={{ margin: 0, fontSize: '0.7rem', color: '#6B7280' }}>Approved</p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                        </div>
                                        <div>
                                            <p style={{ margin: 0, fontSize: '1rem', color: '#111827', fontWeight: 800 }}>{totalThisWeek - approvedThisWeek}</p>
                                            <p style={{ margin: 0, fontSize: '0.7rem', color: '#6B7280' }}>Pending review</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        );
                    })()}

                    {activeTab === 'verification' && (
                        <div style={{ animation: 'fadeIn 0.3s ease' }}>
                            <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ margin: '0 0 8px', fontSize: '1.8rem', color: '#111827', fontWeight: 800 }}>Verification Queue</h2>
                                    <p style={{ margin: 0, color: '#6B7280', fontSize: '0.95rem' }}>Review student submissions for Section {section}.</p>
                                </div>
                                <span style={{ background: '#FEE2E2', color: '#991B1B', padding: '6px 16px', borderRadius: 20, fontSize: '0.9rem', fontWeight: 700 }}>
                                    {pendingQueue.length} Pending
                                </span>
                            </div>

                            {toast && (
                                <div style={{ background: '#D1FAE5', color: '#065F46', padding: '12px 16px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, marginBottom: 24 }}>
                                    ✅ {toast}
                                </div>
                            )}

                            {pendingQueue.length === 0 ? (
                                <div style={{ background: '#fff', borderRadius: 16, padding: 60, textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                                    <p style={{ fontSize: '3.5rem', margin: '0 0 16px' }}></p>
                                    <h3 style={{ margin: '0 0 8px', color: '#111827', fontSize: '1.25rem', fontWeight: 800 }}>Empty!</h3>
                                    <p style={{ margin: 0, color: '#6B7280', fontSize: '0.9rem' }}>No pending submissions from Section {section} students.</p>
                                </div>
                            ) : (
                                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr auto', gap: 16, padding: '12px 20px', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB', color: '#6B7280', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Student Details</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Parameter & Tier</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Submitted On</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Claim Details</div>
                                        <div>Action</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        {pendingQueue.map((item, idx) => {
                                            const pData = getParamData(item.sub.parameterId);
                                            const tData = pData?.tiers.find(t => t.id === item.sub.tierId);
                                            const paramDef = PARAMETERS.find(p => p.id === item.sub.parameterId);

                                            return (
                                                <div key={idx} style={{
                                                    display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr auto', gap: 16, padding: '14px 20px',
                                                    borderBottom: '1px solid #F3F4F6', alignItems: 'center', background: '#fff'
                                                }}>
                                                    {/* Student Details */}
                                                    <div>
                                                        <span style={{ fontWeight: 600, color: '#1F2937', fontSize: '0.9rem', display: 'block', marginBottom: 2 }}>{item.studentName}</span>
                                                        <span style={{ color: '#4B5563', fontSize: '0.8rem' }}>{item.studentReg} | {item.studentEmail}</span>
                                                    </div>
                                                    
                                                    {/* Parameter & Tier */}
                                                    <div>
                                                        <span style={{ fontWeight: 600, color: '#374151', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                                            {paramDef?.name || `Parameter ${item.sub.parameterId}`}
                                                            {item.sub.isUpdate && (
                                                                <span style={{ background: '#EFF6FF', color: '#2563EB', padding: '2px 6px', borderRadius: 100, fontSize: '0.65rem', fontWeight: 800 }}>UPDATE</span>
                                                            )}
                                                        </span>
                                                        <span style={{ color: '#6B7280', fontSize: '0.8rem' }}>Tier {item.sub.tierId}</span>
                                                    </div>

                                                    {/* Submitted On */}
                                                    <div style={{ color: '#4B5563', fontSize: '0.85rem' }}>
                                                        {new Date(item.sub.submittedAt).toLocaleDateString()}
                                                    </div>

                                                    {/* Claim Details */}
                                                    <div>
                                                        <span style={{ color: '#374151', fontSize: '0.85rem', fontWeight: 500, display: 'block', marginBottom: 2 }}>{tData?.salary || '--'}</span>
                                                        {item.sub.platform && <span style={{ color: '#1B4FCC', fontSize: '0.75rem', fontWeight: 500 }}>{item.sub.platform}</span>}
                                                    </div>

                                                    {/* Action Button */}
                                                    <div>
                                                        <button onClick={() => setSelectedVerificationItem(item)} style={{
                                                            padding: '6px 14px', borderRadius: 6, background: '#EFF6FF', color: '#2563EB',
                                                            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            gap: 6, fontSize: '0.85rem', fontWeight: 600, transition: 'background 0.15s'
                                                        }} onMouseEnter={e => e.currentTarget.style.background = '#DBEAFE'} onMouseLeave={e => e.currentTarget.style.background = '#EFF6FF'}>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                                            View
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'students' && (
                        <div style={{ animation: 'fadeIn 0.3s ease' }}>
                            {toast && (
                                <div style={{ background: '#D1FAE5', color: '#065F46', padding: '12px 16px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, marginBottom: 24 }}>
                                    ✅ {toast}
                                </div>
                            )}

                            <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h2 style={{ margin: '0 0 8px', fontSize: '1.8rem', color: '#111827', fontWeight: 800 }}>Student Management</h2>
                                    <p style={{ margin: 0, color: '#6B7280', fontSize: '0.95rem' }}>Search and view profiles for any student in {department}-{section}.</p>
                                </div>
                                <button onClick={downloadCSV} style={{
                                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 6,
                                    background: '#fff', border: '1px solid #E5E7EB', color: '#374151',
                                    fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', fontSize: '0.85rem',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }} onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                    Export CSV
                                </button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                <button onClick={handleRefresh} style={{
                                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 6,
                                    background: '#fff', border: '1px solid #E5E7EB', color: '#4B5563',
                                    fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', fontSize: '0.85rem', whiteSpace: 'nowrap',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }} onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                                    Refresh Table
                                </button>
                                
                                <div style={{ position: 'relative' }}>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value as any)}
                                        style={{
                                            appearance: 'none',
                                            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 36px 8px 14px', borderRadius: 6,
                                            background: '#fff', border: '1px solid #E5E7EB', color: '#4B5563',
                                            fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', fontSize: '0.85rem', whiteSpace: 'nowrap',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)', outline: 'none'
                                        }}
                                    >
                                        <option value="All">Show Filters (All)</option>
                                        <option value="Completed">Completed Only</option>
                                        <option value="Pending">Pending Only</option>
                                    </select>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6B7280' }}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                                </div>

                                <div style={{ borderLeft: '1px solid #E5E7EB', height: 24, margin: '0 8px' }}></div>

                                <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 12, justifyContent: 'flex-end' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#6B7280', fontWeight: 600, whiteSpace: 'nowrap' }}>Search field <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline-block', verticalAlign:'middle', marginLeft: 2, marginTop:-2}}><polyline points="6 9 12 15 18 9" /></svg></span>
                                    <div style={{ position: 'relative', width: 260 }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                        <input type="text" placeholder={`Search by name or Reg No...`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                            style={{
                                                width: '100%', boxSizing: 'border-box', border: '1px solid #E5E7EB', outline: 'none', background: '#fff',
                                                fontFamily: 'inherit', fontSize: '0.85rem', color: '#111827', padding: '10px 12px 10px 36px', borderRadius: 6,
                                                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                                            }} />
                                    </div>
                                </div>
                            </div>

                                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E5E7EB', fontSize: '0.85rem', color: '#6B7280' }}>
                                        <span>Showing <b>{filteredStudents.length} of {myStudents.length}</b> entries</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Show <select style={{ border: 'none', fontWeight: 600, cursor: 'pointer', color: '#111827' }}><option>All</option></select> rows</span>
                                    </div>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr auto', gap: 16, padding: '12px 20px', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB', color: '#6B7280', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Full Name <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="7 15 12 20 17 15" /><polyline points="7 9 12 4 17 9" /></svg></div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Register No <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="7 15 12 20 17 15" /><polyline points="7 9 12 4 17 9" /></svg></div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Dept Sec <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="7 15 12 20 17 15" /><polyline points="7 9 12 4 17 9" /></svg></div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Status <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="7 15 12 20 17 15" /><polyline points="7 9 12 4 17 9" /></svg></div>
                                        <div>Mentor</div>
                                        <div>Action</div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        {filteredStudents.length === 0 ? (
                                            <p style={{ textAlign: 'center', color: '#6B7280', padding: 30, margin: 0 }}>No students found matching "{searchQuery}"</p>
                                        ) : (
                                            filteredStudents.map((student: any) => {
                                                const isCompleted = PARAMETERS.every(p => checkParamCompleted(student.submissions, p.id));
                                                return (
                                                    <div key={student.email} style={{
                                                        display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr auto', gap: 16, padding: '14px 20px',
                                                        borderBottom: '1px solid #F3F4F6', alignItems: 'center', background: '#fff'
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                                            </div>
                                                            <span style={{ fontWeight: 500, color: '#1F2937', fontSize: '0.9rem' }}>{student.name}</span>
                                                        </div>
                                                        <div style={{ color: '#4B5563', fontSize: '0.85rem' }}>{student.regNo || 'N/A'}</div>
                                                        <div style={{ color: '#4B5563', fontSize: '0.85rem' }}>{student.department}-{student.section}</div>
                                                        
                                                        {/* Status Pill Badge */}
                                                        <div>
                                                            <span style={{
                                                                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px 4px 12px',
                                                                borderRadius: 4, border: `1px solid ${isCompleted ? '#A7F3D0' : '#FCD34D'}`, 
                                                                background: isCompleted ? '#ECFDF5' : '#FFFBEB',
                                                                color: isCompleted ? '#059669' : '#D97706',
                                                                fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
                                                            }}>
                                                                {isCompleted ? 'Completed' : 'Pending'}
                                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                                                            </span>
                                                        </div>
                                                        
                                                        <div style={{ color: '#6B7280', fontSize: '0.85rem' }}>{staffUser?.name || 'Assigned'}</div>

                                                        <div>
                                                            <button onClick={() => setSelectedStudent(student)} style={{
                                                                padding: '6px 16px', borderRadius: 6, background: '#FFF', color: '#374151',
                                                                border: '1px solid #D1D5DB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                                fontWeight: 600, fontSize: '0.8rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'all 0.15s'
                                                            }} onMouseEnter={e => {e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.borderColor = '#9CA3AF';}} onMouseLeave={e => {e.currentTarget.style.background = '#FFF'; e.currentTarget.style.borderColor = '#D1D5DB';}}>
                                                                View
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                </div>
                        </div>
                    )}

                    {activeTab === 'onboard' && (
                        <div style={{ animation: 'fadeIn 0.3s ease', maxWidth: 680, margin: '0 auto' }}>
                            <div style={{ marginBottom: 32 }}>
                                <h2 style={{ margin: '0 0 8px', fontSize: '1.6rem', color: '#111827', fontWeight: 800 }}>Onboard New Student</h2>
                                <p style={{ margin: 0, color: '#6B7280', fontSize: '0.92rem' }}>Register a new student under your department and section.</p>
                            </div>

                            {obError && (
                                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', padding: '12px 16px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                    {obError}
                                </div>
                            )}

                            {obSuccess && (
                                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', padding: '12px 16px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                    {obSuccess}
                                </div>
                            )}

                            <div style={{
                                background: '#FFFFFF', borderRadius: 10, border: '1px solid #E5E7EB',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden'
                            }}>
                                {/* Form header */}
                                <div style={{ padding: '20px 28px', borderBottom: '1px solid #F3F4F6', background: '#F9FAFB' }}>
                                    <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#374151', fontWeight: 700 }}>Student Information</h3>
                                </div>

                                <div style={{ padding: '28px 28px 8px' }}>
                                    {/* Full Name */}
                                    <div style={{ marginBottom: 22 }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#374151', fontWeight: 700, marginBottom: 7, letterSpacing: '0.01em' }}>Full Name</label>
                                        <input type="text" value={obName} onChange={e => setObName(e.target.value)} placeholder="Enter student full name"
                                            style={{
                                                width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 7,
                                                border: '1px solid #D1D5DB', outline: 'none', fontSize: '0.9rem', color: '#111827',
                                                fontFamily: 'inherit', background: '#fff', transition: 'border-color 0.15s'
                                            }}
                                            onFocus={e => e.currentTarget.style.borderColor = '#6B7280'}
                                            onBlur={e => e.currentTarget.style.borderColor = '#D1D5DB'}
                                        />
                                    </div>

                                    {/* Email + Reg No row */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 22 }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#374151', fontWeight: 700, marginBottom: 7 }}>Email Address</label>
                                            <input type="email" value={obEmail} onChange={e => setObEmail(e.target.value)} placeholder="student@college.edu.in"
                                                style={{
                                                    width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 7,
                                                    border: '1px solid #D1D5DB', outline: 'none', fontSize: '0.9rem', color: '#111827',
                                                    fontFamily: 'inherit', background: '#fff', transition: 'border-color 0.15s'
                                                }}
                                                onFocus={e => e.currentTarget.style.borderColor = '#6B7280'}
                                                onBlur={e => e.currentTarget.style.borderColor = '#D1D5DB'}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#374151', fontWeight: 700, marginBottom: 7 }}>Register Number</label>
                                            <input type="text" value={obRegNo} onChange={e => setObRegNo(e.target.value)} placeholder="e.g. REG12345"
                                                style={{
                                                    width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 7,
                                                    border: '1px solid #D1D5DB', outline: 'none', fontSize: '0.9rem', color: '#111827',
                                                    fontFamily: 'inherit', background: '#fff', transition: 'border-color 0.15s'
                                                }}
                                                onFocus={e => e.currentTarget.style.borderColor = '#6B7280'}
                                                onBlur={e => e.currentTarget.style.borderColor = '#D1D5DB'}
                                            />
                                        </div>
                                    </div>

                                    {/* Password */}
                                    <div style={{ marginBottom: 22 }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#374151', fontWeight: 700, marginBottom: 7 }}>Password</label>
                                        <input type="text" value={obPass} onChange={e => setObPass(e.target.value)} placeholder="Register number as default password"
                                            style={{
                                                width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 7,
                                                border: '1px solid #D1D5DB', outline: 'none', fontSize: '0.9rem', color: '#111827',
                                                fontFamily: 'inherit', background: '#fff', transition: 'border-color 0.15s'
                                            }}
                                            onFocus={e => e.currentTarget.style.borderColor = '#6B7280'}
                                            onBlur={e => e.currentTarget.style.borderColor = '#D1D5DB'}
                                        />
                                        <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: '#9CA3AF' }}>Default password is typically the student's register number.</p>
                                    </div>

                                    {/* Department, Section, Year row */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18, marginBottom: 28 }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#374151', fontWeight: 700, marginBottom: 7 }}>Department</label>
                                            <select value={obDept} onChange={e => setObDept(e.target.value)}
                                                style={{
                                                    width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 7,
                                                    border: '1px solid #D1D5DB', outline: 'none', fontSize: '0.9rem', color: '#111827',
                                                    fontFamily: 'inherit', background: '#fff', cursor: 'pointer', appearance: 'none'
                                                }}>
                                                <option value="CSE">CSE</option>
                                                <option value="IT">IT</option>
                                                <option value="AIDS">AIDS</option>
                                                <option value="ECE">ECE</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#374151', fontWeight: 700, marginBottom: 7 }}>Section</label>
                                            <select value={obSec} onChange={e => setObSec(e.target.value)}
                                                style={{
                                                    width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 7,
                                                    border: '1px solid #D1D5DB', outline: 'none', fontSize: '0.9rem', color: '#111827',
                                                    fontFamily: 'inherit', background: '#fff', cursor: 'pointer', appearance: 'none'
                                                }}>
                                                <option value="A">A</option>
                                                <option value="B">B</option>
                                                <option value="C">C</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#374151', fontWeight: 700, marginBottom: 7 }}>Year</label>
                                            <select value={obYear} onChange={e => setObYear(e.target.value)}
                                                style={{
                                                    width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 7,
                                                    border: '1px solid #D1D5DB', outline: 'none', fontSize: '0.9rem', color: '#111827',
                                                    fontFamily: 'inherit', background: '#fff', cursor: 'pointer', appearance: 'none'
                                                }}>
                                                <option value="1">1st Year</option>
                                                <option value="2">2nd Year</option>
                                                <option value="3">3rd Year</option>
                                                <option value="4">4th Year</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Form footer */}
                                <div style={{ padding: '16px 28px', borderTop: '1px solid #F3F4F6', background: '#F9FAFB', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                                    <button onClick={() => { setObName(''); setObEmail(''); setObPass(''); setObRegNo(''); setObDept(department); setObSec(section); setObYear('1'); setObError(''); setObSuccess(''); }}
                                        style={{
                                            padding: '10px 22px', borderRadius: 7, border: '1px solid #D1D5DB', background: '#fff',
                                            color: '#374151', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                    >Clear</button>
                                    <button onClick={handleOnboardStudent}
                                        style={{
                                            padding: '10px 28px', borderRadius: 7, border: 'none', background: '#1F2937',
                                            color: '#fff', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', transition: 'background 0.15s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#374151'}
                                        onMouseLeave={e => e.currentTarget.style.background = '#1F2937'}
                                    >Onboard Student</button>
                                </div>
                            </div>

                            {/* Recently onboarded */}
                            {(() => {
                                const recentStudents = getUsers().filter((u: any) => u.role === 'student' && u.department === department && u.section === section);
                                if (recentStudents.length === 0) return null;
                                return (
                                    <div style={{ marginTop: 32 }}>
                                        <h3 style={{ margin: '0 0 14px', fontSize: '0.95rem', color: '#374151', fontWeight: 700 }}>Students in {department}-{section}</h3>
                                        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', gap: 12, padding: '10px 20px', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB', fontSize: '0.72rem', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                <div>Name</div><div>Email</div><div>Reg No</div><div>Year</div>
                                            </div>
                                            {recentStudents.map((s: any, i: number) => (
                                                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', gap: 12, padding: '12px 20px', borderBottom: '1px solid #F3F4F6', fontSize: '0.85rem', color: '#374151' }}>
                                                    <div style={{ fontWeight: 600, color: '#111827' }}>{s.name}</div>
                                                    <div style={{ color: '#6B7280' }}>{s.email}</div>
                                                    <div>{s.regNo || '—'}</div>
                                                    <div>{s.year ? `Year ${s.year}` : '—'}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>
            </div>

            {selectedStudent && (
                <StudentProfileView
                    studentEmail={selectedStudent.email}
                    studentName={selectedStudent.name}
                    studentReg={selectedStudent.regNo || 'N/A'}
                    studentDept={selectedStudent.department}
                    studentSec={selectedStudent.section}
                    onClose={() => setSelectedStudent(null)}
                />
            )}

            {/* ── Verification Detail Modal ── */}
            {selectedVerificationItem && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(17, 24, 39, 0.4)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 700,
                        maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #E5E7EB' }}>
                            <div>
                                <h3 style={{ margin: '0 0 4px', fontSize: '1.25rem', color: '#111827', fontWeight: 800 }}>Review Submission</h3>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#6B7280' }}>Verify the proof provided by the student.</p>
                            </div>
                            <button onClick={() => setSelectedVerificationItem(null)} style={{
                                width: 32, height: 32, borderRadius: '50%', background: '#F3F4F6', border: 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B7280', transition: 'background 0.2s'
                            }} onMouseEnter={e => e.currentTarget.style.background = '#E5E7EB'} onMouseLeave={e => e.currentTarget.style.background = '#F3F4F6'}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {/* Student & Param Info Row */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                <div style={{ background: '#F9FAFB', padding: 16, borderRadius: 12, border: '1px solid #F3F4F6' }}>
                                    <h4 style={{ margin: '0 0 12px', fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Student details</h4>
                                    <p style={{ margin: '0 0 4px', fontSize: '1.05rem', color: '#111827', fontWeight: 700 }}>{selectedVerificationItem.studentName}</p>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#4B5563' }}>{selectedVerificationItem.studentReg} | {selectedVerificationItem.studentEmail}</p>
                                </div>
                                <div style={{ background: '#F9FAFB', padding: 16, borderRadius: 12, border: '1px solid #F3F4F6' }}>
                                    <h4 style={{ margin: '0 0 12px', fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Submission details</h4>
                                    <p style={{ margin: '0 0 4px', fontSize: '0.95rem', color: '#111827', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        Parameter {selectedVerificationItem.sub.parameterId} • Tier {selectedVerificationItem.sub.tierId}
                                        {selectedVerificationItem.sub.isUpdate && (
                                            <span style={{ background: '#EFF6FF', color: '#2563EB', padding: '2px 8px', borderRadius: 100, fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em' }}>UPDATE</span>
                                        )}
                                    </p>
                                    <p style={{ margin: '0 0 4px', fontSize: '0.85rem', color: '#4B5563' }}>Submitted: {new Date(selectedVerificationItem.sub.submittedAt).toLocaleString()}</p>
                                    {selectedVerificationItem.sub.platform && <p style={{ margin: 0, fontSize: '0.85rem', color: '#1B4FCC', fontWeight: 600 }}>Platform: {selectedVerificationItem.sub.platform}</p>}
                                </div>
                            </div>

                            {/* Image Proof */}
                            <div>
                                <h4 style={{ margin: '0 0 12px', fontSize: '0.85rem', color: '#374151', fontWeight: 700 }}>Attached Proof</h4>
                                <div style={{ background: '#F3F4F6', borderRadius: 12, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, border: '1px solid #E5E7EB' }}>
                                    {selectedVerificationItem.sub.imageDataUrl ? (
                                        Array.isArray(selectedVerificationItem.sub.imageDataUrl) ? (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: 10, justifyContent: 'center' }}>
                                                {selectedVerificationItem.sub.imageDataUrl.map((url, i) => (
                                                    <img key={i} src={url} style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, display: 'block' }} alt={`Proof ${i+1}`} />
                                                ))}
                                            </div>
                                        ) : (
                                            <img src={selectedVerificationItem.sub.imageDataUrl} style={{ maxWidth: '100%', maxHeight: 300, display: 'block' }} alt="Proof" />
                                        )
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500 }}>No image provided</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 12, padding: '20px 24px', borderTop: '1px solid #E5E7EB', background: '#F9FAFB', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
                            <button onClick={() => setSelectedVerificationItem(null)} style={{
                                flex: 1, padding: '12px 0', borderRadius: 8, border: '1px solid #D1D5DB', background: '#fff',
                                color: '#374151', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s'
                            }} onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>Cancel</button>
                            <button onClick={() => handleVerify(selectedVerificationItem!.studentEmail, selectedVerificationItem!.sub.submittedAt, false)} style={{
                                flex: 1, padding: '12px 0', borderRadius: 8, border: '1px solid #EF4444', background: '#FEF2F2',
                                color: '#EF4444', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s'
                            }} onMouseEnter={e => e.currentTarget.style.background = '#FEE2E2'} onMouseLeave={e => e.currentTarget.style.background = '#FEF2F2'}>Reject</button>
                            <button onClick={() => handleVerify(selectedVerificationItem!.studentEmail, selectedVerificationItem!.sub.submittedAt, true)} style={{
                                flex: 1, padding: '12px 0', borderRadius: 8, border: 'none', background: '#10B981',
                                color: '#fff', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s'
                            }} onMouseEnter={e => e.currentTarget.style.background = '#059669'} onMouseLeave={e => e.currentTarget.style.background = '#10B981'}>Approve</button>
                        </div>
                    </div>
                </div>
            )}

            {showSettings && (
                <ProfileSettingsModal email={email} onClose={() => setShowSettings(false)} />
            )}
        </div>
    );
}
