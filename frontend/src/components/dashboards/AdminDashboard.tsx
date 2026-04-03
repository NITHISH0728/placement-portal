import { useState } from 'react';
import { getUsers, saveUser, getAllSubmissions, PARAMETERS } from '../../data/portalData';
import StudentProfileView from './StudentProfileView';
import ProfileSettingsModal from './ProfileSettingsModal';

function checkParamCompleted(subs: any[], paramId: number) {
    return subs?.some((s: any) => s.parameterId === paramId && s.status === 'approved');
}

interface Props {
    email: string;
    onLogout: () => void;
}

const SECTIONS = ['A', 'B', 'C', 'D', 'E'];

export default function AdminDashboard({ email, onLogout }: Props) {
    const users = getUsers();
    const adminUser = users.find((u: any) => u.email === email);
    const department = adminUser?.department || 'Unknown';

    const allStudents = users.filter((u: any) => u.role === 'student' && u.department === department);
    const deptStudents = allStudents.length;
    const allStaffInDept = users.filter((u: any) => u.role === 'staff' && u.department === department);
    const deptStaff = allStaffInDept.length;

    // Completed students count
    const allSubData = getAllSubmissions();
    const completedStudents = allStudents.filter((s: any) => {
        const subEntry = allSubData.find(d => d.email === s.email);
        const subs = subEntry ? subEntry.subs : [];
        return PARAMETERS.every(p => checkParamCompleted(subs, p.id));
    }).length;
    const pendingStudents = deptStudents - completedStudents;

    // Tab, form, filter states
    const [activeTab, setActiveTab] = useState<'home' | 'students' | 'staff'>('home');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | 'Completed' | 'Pending'>('All');
    const [sectionFilter, setSectionFilter] = useState<string>('All');
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
    const [showOnboardStaff, setShowOnboardStaff] = useState(false);

    // Staff onboard form
    const [newEmail, setNewEmail] = useState('');
    const [newPass, setNewPass] = useState('');
    const [newName, setNewName] = useState('');
    const [newSection, setNewSection] = useState(SECTIONS[0]);
    const [obError, setObError] = useState('');
    const [obSuccess, setObSuccess] = useState('');

    // Staff search
    const [staffSearch, setStaffSearch] = useState('');

    const filteredStaff = allStaffInDept.filter((s: any) => {
        return s.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
            s.email.toLowerCase().includes(staffSearch.toLowerCase());
    });

    function handleRefresh() {
        setSearchQuery('');
        setStatusFilter('All');
        setSectionFilter('All');
    }

    const filteredStudents = allStudents.filter((s: any) => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.regNo && s.regNo.toLowerCase().includes(searchQuery.toLowerCase()));
        const subEntry = allSubData.find(d => d.email === s.email);
        const subs = subEntry ? subEntry.subs : [];
        const isCompleted = PARAMETERS.every(p => checkParamCompleted(subs, p.id));
        const matchesStatus = statusFilter === 'All' ? true : statusFilter === 'Completed' ? isCompleted : !isCompleted;
        const matchesSection = sectionFilter === 'All' ? true : s.section === sectionFilter;
        return matchesSearch && matchesStatus && matchesSection;
    });

    function downloadCSV() {
        if (allStudents.length === 0) return;
        const headers = ['Name', 'Reg No', 'Email', 'Section', 'Status'];
        const csvRows = [headers.join(',')];
        allStudents.forEach((student: any) => {
            const subEntry = allSubData.find(d => d.email === student.email);
            const subs = subEntry ? subEntry.subs : [];
            const isCompleted = PARAMETERS.every(p => checkParamCompleted(subs, p.id));
            csvRows.push([`"${student.name}"`, `"${student.regNo || 'N/A'}"`, `"${student.email}"`, `"${department}-${student.section}"`, `"${isCompleted ? 'Completed' : 'Pending'}"`].join(','));
        });
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${department}_Students.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function handleCreateStaff() {
        setObError(''); setObSuccess('');
        if (!newName.trim() || !newEmail.trim() || !newPass.trim()) {
            setObError('All fields are required.'); return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
            setObError('Please enter a valid email address.'); return;
        }
        const success = saveUser({ email: newEmail.trim().toLowerCase(), password: newPass.trim(), name: newName.trim(), role: 'staff', department, section: newSection });
        if (!success) { setObError('Email already exists in the system.'); return; }
        setObSuccess(`Staff "${newName.trim()}" onboarded for ${department}-${newSection}.`);
        setNewEmail(''); setNewPass(''); setNewName(''); setNewSection(SECTIONS[0]);
    }

    // Get staff stats for modal
    function getStaffStats(_staffEmail: string, staffSection: string) {
        const studentsInClass = users.filter((u: any) => u.role === 'student' && u.department === department && u.section === staffSection);
        const total = studentsInClass.length;
        const completed = studentsInClass.filter((s: any) => {
            const subEntry = allSubData.find(d => d.email === s.email);
            const subs = subEntry ? subEntry.subs : [];
            return PARAMETERS.every(p => checkParamCompleted(subs, p.id));
        }).length;
        return { total, completed, pending: total - completed };
    }

    const navItems: { key: 'home' | 'students' | 'staff'; label: string }[] = [
        { key: 'home', label: 'Home' },
        { key: 'students', label: 'Student Management' },
        { key: 'staff', label: 'Staff Management' },
    ];

    const inputStyle: React.CSSProperties = {
        width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 7,
        border: '1px solid #D1D5DB', outline: 'none', fontSize: '0.9rem', color: '#111827',
        fontFamily: 'inherit', background: '#fff', transition: 'border-color 0.15s'
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F9FAFB', fontFamily: "'Outfit', sans-serif" }}>
            {/* Horizontal Navbar */}
            <header style={{
                background: '#FFFFFF', borderBottom: '1px solid #E5E7EB',
                display: 'flex', alignItems: 'center', padding: '0 32px', height: 64, flexShrink: 0,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)', zIndex: 20
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginRight: 40 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: '#1F2937', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1rem', color: '#111827', fontWeight: 800, lineHeight: 1.2 }}>Placement Portal</h1>
                        <p style={{ margin: 0, fontSize: '0.65rem', color: '#6B7280', fontWeight: 600 }}>{department} HOD</p>
                    </div>
                </div>

                <nav style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                    {navItems.map(item => (
                        <button key={item.key} onClick={() => setActiveTab(item.key)} style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 8,
                            background: activeTab === item.key ? '#F3F4F6' : 'transparent',
                            border: 'none', color: activeTab === item.key ? '#111827' : '#6B7280',
                            fontSize: '0.88rem', fontWeight: activeTab === item.key ? 700 : 500, cursor: 'pointer',
                            transition: 'all 0.15s'
                        }} onMouseEnter={e => { if (activeTab !== item.key) e.currentTarget.style.background = '#F9FAFB'; }}
                           onMouseLeave={e => { if (activeTab !== item.key) e.currentTarget.style.background = 'transparent'; }}>
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginLeft: 'auto' }}>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#111827', fontWeight: 700 }}>{adminUser?.name}</p>
                        <p style={{ margin: 0, fontSize: '0.68rem', color: '#6B7280' }}>{adminUser?.email}</p>
                    </div>
                    {adminUser?.profilePic ? (
                        <img src={adminUser.profilePic} alt="Profile" style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover', border: '1px solid #E5E7EB' }} />
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
                        background: '#fff', color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
                    }} onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.borderColor = '#FECACA'; }}
                       onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.borderColor = '#E5E7EB'; }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ padding: '32px 40px', maxWidth: 1400, margin: '0 auto' }}>

                    {/* ═══ HOME TAB ═══ */}
                    {activeTab === 'home' && (
                        <div style={{ animation: 'fadeIn 0.3s ease' }}>
                            <div style={{ marginBottom: 28 }}>
                                <h2 style={{ margin: '0 0 6px', fontSize: '1.5rem', color: '#111827', fontWeight: 800 }}>
                                    {(() => { const h = new Date().getHours(); return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening'; })()}, {adminUser?.name?.split(' ')[0] || 'Admin'}.
                                </h2>
                                <p style={{ margin: 0, color: '#6B7280', fontSize: '0.9rem' }}>Here's your {department} department overview.</p>
                            </div>

                            {/* Profile Card */}
                            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '24px 28px', marginBottom: 28, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                                    <div style={{ width: 60, height: 60, borderRadius: 8, background: '#F3F4F6', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#9CA3AF' }}>
                                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem', color: '#111827', fontWeight: 800 }}>{adminUser?.name}</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#6B7280' }}>
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                                {adminUser?.email}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#6B7280' }}>
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                                Admin / HOD
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#6B7280' }}>
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                                Head of {department} Department
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Access Cards */}
                            <h3 style={{ margin: '0 0 14px', fontSize: '1rem', color: '#111827', fontWeight: 800 }}>Quick Access</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
                                {[
                                    { label: 'STUDENT LIST', value: deptStudents, sub: 'students', tab: 'students' as const, color: '#111827' },
                                    { label: 'STAFF LIST', value: deptStaff, sub: 'staff members', tab: 'staff' as const, color: '#111827' },
                                    { label: 'COMPLETED', value: completedStudents, sub: `of ${deptStudents} students`, tab: 'students' as const, color: '#16A34A' },
                                    { label: 'PENDING', value: pendingStudents, sub: `of ${deptStudents} students`, tab: 'students' as const, color: '#DC2626' },
                                ].map((card, i) => (
                                    <div key={i} onClick={() => setActiveTab(card.tab)} style={{
                                        background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '20px 22px',
                                        cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 100
                                    }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#9CA3AF'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
                                       onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}>
                                        <p style={{ margin: '0 0 8px', fontSize: '0.7rem', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</p>
                                        <p style={{ margin: '0 0 4px', fontSize: '1.8rem', color: card.color, fontWeight: 800, lineHeight: 1 }}>{card.value}</p>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 500 }}>{card.sub}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ═══ STUDENT MANAGEMENT TAB ═══ */}
                    {activeTab === 'students' && (
                        <div style={{ animation: 'fadeIn 0.3s ease' }}>
                            <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h2 style={{ margin: '0 0 6px', fontSize: '1.5rem', color: '#111827', fontWeight: 800 }}>Student Management</h2>
                                    <p style={{ margin: 0, color: '#6B7280', fontSize: '0.9rem' }}>Search and view profiles for any student in {department}.</p>
                                </div>
                                <button onClick={downloadCSV} style={{
                                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 7,
                                    background: '#fff', border: '1px solid #E5E7EB', color: '#374151',
                                    fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'all 0.15s'
                                }} onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                    Export CSV
                                </button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                <button onClick={handleRefresh} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 7, background: '#fff', border: '1px solid #E5E7EB', color: '#4B5563', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'all 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                                    Refresh
                                </button>
                                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} style={{ appearance: 'none', padding: '8px 32px 8px 14px', borderRadius: 7, background: '#fff', border: '1px solid #E5E7EB', color: '#4B5563', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', outline: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                    <option value="All">All Status</option><option value="Completed">Completed</option><option value="Pending">Pending</option>
                                </select>
                                <select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)} style={{ appearance: 'none', padding: '8px 32px 8px 14px', borderRadius: 7, background: '#fff', border: '1px solid #E5E7EB', color: '#4B5563', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', outline: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                    <option value="All">All Sections</option>
                                    {SECTIONS.map(s => <option key={s} value={s}>{department}-{s}</option>)}
                                </select>
                                <div style={{ flex: 1 }} />
                                <div style={{ position: 'relative', width: 260 }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                                    <input type="text" placeholder="Search by name or Reg No..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                        style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #E5E7EB', outline: 'none', background: '#fff', fontFamily: 'inherit', fontSize: '0.85rem', color: '#111827', padding: '9px 12px 9px 36px', borderRadius: 7 }} />
                                </div>
                            </div>

                            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #E5E7EB', fontSize: '0.82rem', color: '#6B7280' }}>
                                    <span>Showing <b>{filteredStudents.length} of {allStudents.length}</b> entries</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr auto', gap: 16, padding: '10px 20px', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB', color: '#6B7280', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    <div>Full Name</div><div>Register No</div><div>Dept Sec</div><div>Status</div><div>Action</div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    {filteredStudents.length === 0 ? (
                                        <p style={{ textAlign: 'center', color: '#6B7280', padding: 30, margin: 0, fontSize: '0.9rem' }}>No students found matching your criteria</p>
                                    ) : filteredStudents.map((student: any) => {
                                        const subEntry = allSubData.find(d => d.email === student.email);
                                        const subs = subEntry ? subEntry.subs : [];
                                        const isCompleted = PARAMETERS.every(p => checkParamCompleted(subs, p.id));
                                        return (
                                            <div key={student.email} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr auto', gap: 16, padding: '12px 20px', borderBottom: '1px solid #F3F4F6', alignItems: 'center', background: '#fff', transition: 'background 0.1s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{ width: 28, height: 28, borderRadius: 6, background: '#F3F4F6', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                                    </div>
                                                    <span style={{ fontWeight: 600, color: '#1F2937', fontSize: '0.88rem' }}>{student.name}</span>
                                                </div>
                                                <div style={{ color: '#4B5563', fontSize: '0.85rem' }}>{student.regNo || 'N/A'}</div>
                                                <div style={{ color: '#4B5563', fontSize: '0.85rem' }}>{student.department}-{student.section}</div>
                                                <div>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 700, background: isCompleted ? '#F0FDF4' : '#FEF2F2', color: isCompleted ? '#16A34A' : '#DC2626', border: `1px solid ${isCompleted ? '#BBF7D0' : '#FECACA'}` }}>
                                                        {isCompleted ? 'Completed' : 'Pending'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <button onClick={() => setSelectedStudent(student)} style={{ padding: '5px 14px', borderRadius: 6, background: '#fff', color: '#374151', border: '1px solid #D1D5DB', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', transition: 'all 0.15s' }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.borderColor = '#9CA3AF'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#D1D5DB'; }}>View</button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ STAFF MANAGEMENT TAB ═══ */}
                    {activeTab === 'staff' && (
                        <div style={{ animation: 'fadeIn 0.3s ease' }}>
                            <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h2 style={{ margin: '0 0 6px', fontSize: '1.5rem', color: '#111827', fontWeight: 800 }}>Staff Management</h2>
                                    <p style={{ margin: 0, color: '#6B7280', fontSize: '0.9rem' }}>View and manage staff members in {department} department.</p>
                                </div>
                                <button onClick={() => setShowOnboardStaff(true)} style={{
                                    display: 'flex', alignItems: 'center', gap: 8, padding: '9px 20px', borderRadius: 7,
                                    background: '#1F2937', border: 'none', color: '#fff',
                                    fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', transition: 'background 0.15s'
                                }} onMouseEnter={e => e.currentTarget.style.background = '#374151'} onMouseLeave={e => e.currentTarget.style.background = '#1F2937'}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                    Onboard Staff
                                </button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                <div style={{ position: 'relative', width: 300 }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                                    <input type="text" placeholder="Search staff by name or email..." value={staffSearch} onChange={e => setStaffSearch(e.target.value)}
                                        style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #E5E7EB', outline: 'none', background: '#fff', fontFamily: 'inherit', fontSize: '0.85rem', color: '#111827', padding: '9px 12px 9px 36px', borderRadius: 7 }} />
                                </div>
                                <span style={{ fontSize: '0.82rem', color: '#6B7280', fontWeight: 600 }}>Showing <b>{filteredStaff.length}</b> staff</span>
                            </div>

                            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr auto', gap: 16, padding: '10px 20px', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB', color: '#6B7280', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    <div>Name</div><div>Email</div><div>Class & Sec</div><div>Action</div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    {filteredStaff.length === 0 ? (
                                        <p style={{ textAlign: 'center', color: '#6B7280', padding: 30, margin: 0, fontSize: '0.9rem' }}>No staff found in {department} department</p>
                                    ) : filteredStaff.map((staff: any) => (
                                        <div key={staff.email} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr auto', gap: 16, padding: '12px 20px', borderBottom: '1px solid #F3F4F6', alignItems: 'center', background: '#fff', transition: 'background 0.1s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 28, height: 28, borderRadius: 6, background: '#F3F4F6', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', overflow: 'hidden' }}>
                                                    {(() => { const av = localStorage.getItem(`pp_avatar_${staff.email}`); return av ? <img src={av} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; })()}
                                                </div>
                                                <span style={{ fontWeight: 600, color: '#1F2937', fontSize: '0.88rem' }}>{staff.name}</span>
                                            </div>
                                            <div style={{ color: '#6B7280', fontSize: '0.85rem' }}>{staff.email}</div>
                                            <div style={{ color: '#4B5563', fontSize: '0.85rem', fontWeight: 600 }}>{department}-{staff.section || 'N/A'}</div>
                                            <div>
                                                <button onClick={() => setSelectedStaff(staff)} style={{ padding: '5px 14px', borderRadius: 6, background: '#fff', color: '#374151', border: '1px solid #D1D5DB', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', transition: 'all 0.15s' }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.borderColor = '#9CA3AF'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#D1D5DB'; }}>View</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ STUDENT PROFILE MODAL ═══ */}
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

            {/* ═══ STAFF DETAIL MODAL ═══ */}
            {selectedStaff && (() => {
                const stats = getStaffStats(selectedStaff.email, selectedStaff.section || '');
                const avatarUrl = localStorage.getItem(`pp_avatar_${selectedStaff.email}`);
                return (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(17,24,39,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease', fontFamily: "'Outfit', sans-serif" }} onClick={() => setSelectedStaff(null)}>
                        <div style={{ background: '#fff', borderRadius: 10, width: '100%', maxWidth: 520, boxShadow: '0 8px 30px rgba(0,0,0,0.12)', overflow: 'hidden', animation: 'slideUp 0.25s cubic-bezier(0.16,1,0.3,1)' }} onClick={e => e.stopPropagation()}>
                            {/* Top bar */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}>
                                <span style={{ fontSize: '0.88rem', color: '#374151', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                    Staff Profile
                                </span>
                                <button onClick={() => setSelectedStaff(null)} style={{ width: 30, height: 30, borderRadius: 6, background: '#fff', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B7280', transition: 'all 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#EF4444'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#6B7280'; }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                </button>
                            </div>
                            {/* Profile */}
                            <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid #E5E7EB' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                                    <div style={{ width: 64, height: 64, borderRadius: 8, background: '#F3F4F6', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#9CA3AF', overflow: 'hidden' }}>
                                        {avatarUrl ? <img src={avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> :
                                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                        }
                                    </div>
                                    <div>
                                        <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem', color: '#111827', fontWeight: 800 }}>{selectedStaff.name}</h3>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#6B7280' }}>{selectedStaff.email}</p>
                                        <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#9CA3AF' }}>{department} - Section {selectedStaff.section || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                            {/* Stats */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: '#E5E7EB' }}>
                                <div style={{ background: '#fff', padding: '18px 20px', textAlign: 'center' }}>
                                    <p style={{ margin: '0 0 2px', fontSize: '1.3rem', color: '#111827', fontWeight: 800 }}>{stats.total}</p>
                                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#6B7280', fontWeight: 600 }}>Total Students</p>
                                </div>
                                <div style={{ background: '#fff', padding: '18px 20px', textAlign: 'center' }}>
                                    <p style={{ margin: '0 0 2px', fontSize: '1.3rem', color: '#16A34A', fontWeight: 800 }}>{stats.completed}<span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 600 }}>/{stats.total}</span></p>
                                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#6B7280', fontWeight: 600 }}>Completed</p>
                                </div>
                                <div style={{ background: '#fff', padding: '18px 20px', textAlign: 'center' }}>
                                    <p style={{ margin: '0 0 2px', fontSize: '1.3rem', color: '#DC2626', fontWeight: 800 }}>{stats.pending}<span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 600 }}>/{stats.total}</span></p>
                                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#6B7280', fontWeight: 600 }}>Pending</p>
                                </div>
                            </div>
                            {/* Footer */}
                            <div style={{ padding: '14px 24px', borderTop: '1px solid #E5E7EB', background: '#F9FAFB', display: 'flex', justifyContent: 'flex-end' }}>
                                <button onClick={() => setSelectedStaff(null)} style={{ padding: '8px 22px', borderRadius: 7, border: '1px solid #D1D5DB', background: '#fff', color: '#374151', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>Close</button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ═══ ONBOARD STAFF MODAL ═══ */}
            {showOnboardStaff && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(17,24,39,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease', fontFamily: "'Outfit', sans-serif" }} onClick={() => { setShowOnboardStaff(false); setObError(''); setObSuccess(''); }}>
                    <div style={{ background: '#fff', borderRadius: 10, width: '100%', maxWidth: 560, boxShadow: '0 8px 30px rgba(0,0,0,0.12)', overflow: 'hidden', animation: 'slideUp 0.25s cubic-bezier(0.16,1,0.3,1)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}>
                            <span style={{ fontSize: '0.88rem', color: '#374151', fontWeight: 700 }}>Onboard New Staff</span>
                            <button onClick={() => { setShowOnboardStaff(false); setObError(''); setObSuccess(''); }} style={{ width: 30, height: 30, borderRadius: 6, background: '#fff', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B7280' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                        <div style={{ padding: '24px 24px 8px' }}>
                            {obError && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', padding: '10px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{obError}
                            </div>}
                            {obSuccess && <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', padding: '10px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>{obSuccess}
                            </div>}
                            <div style={{ marginBottom: 18 }}>
                                <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', fontWeight: 700, marginBottom: 6 }}>Full Name</label>
                                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Mr. Staff Name" style={inputStyle} onFocus={e => e.currentTarget.style.borderColor = '#6B7280'} onBlur={e => e.currentTarget.style.borderColor = '#D1D5DB'} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', fontWeight: 700, marginBottom: 6 }}>College Email</label>
                                    <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder={`staff@college.edu`} style={inputStyle} onFocus={e => e.currentTarget.style.borderColor = '#6B7280'} onBlur={e => e.currentTarget.style.borderColor = '#D1D5DB'} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', fontWeight: 700, marginBottom: 6 }}>Password (Mobile No)</label>
                                    <input type="text" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="9876543210" style={inputStyle} onFocus={e => e.currentTarget.style.borderColor = '#6B7280'} onBlur={e => e.currentTarget.style.borderColor = '#D1D5DB'} />
                                </div>
                            </div>
                            <div style={{ marginBottom: 22 }}>
                                <label style={{ display: 'block', fontSize: '0.78rem', color: '#374151', fontWeight: 700, marginBottom: 6 }}>Section</label>
                                <select value={newSection} onChange={e => setNewSection(e.target.value)} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
                                    {SECTIONS.map(s => <option key={s} value={s}>{department}-{s}</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ padding: '14px 24px', borderTop: '1px solid #F3F4F6', background: '#F9FAFB', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            <button onClick={() => { setShowOnboardStaff(false); setObError(''); setObSuccess(''); setNewName(''); setNewEmail(''); setNewPass(''); }} style={{ padding: '9px 20px', borderRadius: 7, border: '1px solid #D1D5DB', background: '#fff', color: '#374151', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>Cancel</button>
                            <button onClick={handleCreateStaff} style={{ padding: '9px 24px', borderRadius: 7, border: 'none', background: '#1F2937', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'background 0.15s' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#374151'} onMouseLeave={e => e.currentTarget.style.background = '#1F2937'}>Onboard Staff</button>
                        </div>
                    </div>
                </div>
            )}

            {showSettings && (
                <ProfileSettingsModal email={email} onClose={() => setShowSettings(false)} />
            )}

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}
