import { useRef, useState } from 'react';
import { getUsers, saveUser, getSubmissions, PARAMETERS } from '../../data/portalData';
import StudentProfileView from './StudentProfileView';

interface Props {
    email: string;
    onLogout: () => void;
}

const DEPARTMENTS = ['CSE', 'IT', 'AIDS', 'ECE', 'EEE', 'MECH', 'CIVIL'];
const SECTIONS = ['A', 'B', 'C', 'D', 'E'];
type Tab = 'home' | 'onboarding' | 'students' | 'admins';
type OnboardType = 'admin' | 'student';
type StudentMode = 'single' | 'bulk';

/* ─── Tiny shared input style ─── */
const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '10px 14px', border: '1px solid #D1D5DB',
    borderRadius: 6, fontFamily: "'Outfit', sans-serif",
    fontSize: '0.88rem', color: '#111827', outline: 'none',
    background: '#fff', transition: 'border-color 0.15s',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
            {children}
        </div>
    );
}

/* ─── Excel bulk-template columns ─── */
const TEMPLATE_COLS = ['Class (A/B/…)', 'Reg No (Password)', 'Name', 'Email'];

function downloadTemplate() {
    const header = TEMPLATE_COLS.join(',');
    const rows = [
        'A,22CS001,Arun Kumar,22cs001@college.edu',
        'A,22CS002,Bhavya Sri,22cs002@college.edu',
        'B,22CS051,Chetan R,22cs051@college.edu',
    ];
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'bulk_student_template.csv';
    a.click(); URL.revokeObjectURL(url);
}

function parseCSV(text: string): { class: string; regNo: string; name: string; email: string }[] {
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    return lines.slice(1).map(line => {
        const [cls, regNo, name, email] = line.split(',').map(s => s.trim());
        return { class: cls || '', regNo: regNo || '', name: name || '', email: email || '' };
    }).filter(r => r.email && r.regNo && r.name && r.class);
}

export default function SuperAdminDashboard({ email, onLogout }: Props) {
    const [refreshKey, setRefreshKey] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const users = getUsers();
    const adminUser = users.find(u => u.email === email);

    /* ── Stats ── */
    const totalStudents = users.filter(u => u.role === 'student').length;
    const totalHODs = users.filter(u => u.role === 'admin').length;
    const totalStaff = users.filter(u => u.role === 'staff').length;
    const allStudents = users.filter(u => u.role === 'student');
    const allAdmins = users.filter(u => u.role === 'admin');
    const allStaffUsers = users.filter(u => u.role === 'staff');

    /* ── Tabs & Modes ── */
    const [activeTab, setActiveTab] = useState<Tab>('home');
    const [onboardType, setOnboardType] = useState<OnboardType>('admin');
    const [studentMode, setStudentMode] = useState<StudentMode>('single');

    /* ── Admin Onboard Form ── */
    const [adminName, setAdminName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPass, setAdminPass] = useState('');
    const [adminPhone, setAdminPhone] = useState('');
    const [adminDept, setAdminDept] = useState(DEPARTMENTS[0]);
    const [adminToast, setAdminToast] = useState<{ msg: string; ok: boolean } | null>(null);

    /* ── Single Student Form ── */
    const [stName, setStName] = useState('');
    const [stEmail, setStEmail] = useState('');
    const [stReg, setStReg] = useState('');
    const [stDept, setStDept] = useState(DEPARTMENTS[0]);
    const [stSec, setStSec] = useState(SECTIONS[0]);
    const [stToast, setStToast] = useState<{ msg: string; ok: boolean } | null>(null);

    /* ── Bulk Upload ── */
    const [bulkRows, setBulkRows] = useState<ReturnType<typeof parseCSV>>([]);
    const [bulkFile, setBulkFile] = useState('');
    const [bulkResult, setBulkResult] = useState<{ added: number; skipped: number } | null>(null);
    const [bulkError, setBulkError] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    /* ── Student Search & Profile ── */
    const [searchQ, setSearchQ] = useState('');
    const [deptFilter, setDeptFilter] = useState('ALL');
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

    /* ── Admin Management ── */
    const [selectedHOD, setSelectedHOD] = useState<any | null>(null);
    const [selectedStaffView, setSelectedStaffView] = useState<any | null>(null);
    const [hodStaffExpanded, setHodStaffExpanded] = useState(false);

    const deptStudents = deptFilter === 'ALL' ? allStudents : allStudents.filter(s => s.department === deptFilter);
    const filteredStudents = deptStudents
        .filter(s => searchQ.trim() === '' || s.name.toLowerCase().includes(searchQ.toLowerCase()) || (s.regNo && s.regNo.toLowerCase().includes(searchQ.toLowerCase())))
        .sort((a, b) => {
            const secA = (a.section || '').toUpperCase();
            const secB = (b.section || '').toUpperCase();
            return secA.localeCompare(secB) || (a.name || '').localeCompare(b.name || '');
        });

    function toast(setter: (v: any) => void, msg: string, ok: boolean) {
        setter({ msg, ok });
        setTimeout(() => setter(null), 3500);
    }

    function handleAdminOnboard(e: React.FormEvent) {
        e.preventDefault();
        const ok = saveUser({ email: adminEmail.trim().toLowerCase(), password: adminPass.trim(), name: adminName.trim(), role: 'admin', department: adminDept });
        if (ok) { toast(setAdminToast, `HOD "${adminName}" onboarded successfully for ${adminDept}.`, true); setAdminName(''); setAdminEmail(''); setAdminPass(''); setAdminPhone(''); }
        else toast(setAdminToast, 'Email already exists in the system.', false);
    }

    function handleSingleStudent(e: React.FormEvent) {
        e.preventDefault();
        const ok = saveUser({ email: stEmail.trim().toLowerCase(), password: stReg.trim(), name: stName.trim(), role: 'student', department: stDept, section: stSec, regNo: stReg.trim() });
        if (ok) { toast(setStToast, `Student "${stName}" onboarded successfully.`, true); setStName(''); setStEmail(''); setStReg(''); }
        else toast(setStToast, 'Email already exists in the system.', false);
    }

    function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setBulkFile(file.name);
        setBulkResult(null);
        setBulkError('');
        const reader = new FileReader();
        reader.onload = ev => {
            const text = ev.target?.result as string;
            const rows = parseCSV(text);
            if (rows.length === 0) { setBulkError('No valid rows found. Please use the template format.'); setBulkRows([]); return; }
            // Sort by class (section) alphabetically then by name
            rows.sort((a, b) => a.class.toUpperCase().localeCompare(b.class.toUpperCase()) || a.name.localeCompare(b.name));
            setBulkRows(rows);
        };
        reader.readAsText(file);
    }

    function handleBulkSubmit() {
        if (bulkRows.length === 0) return;
        let added = 0, skipped = 0;
        bulkRows.forEach(r => {
            const dept = stDept; // use selected dept for bulk
            const ok = saveUser({ email: r.email.toLowerCase(), password: r.regNo, name: r.name, role: 'student', department: dept, section: r.class.toUpperCase(), regNo: r.regNo });
            if (ok) added++;
            else skipped++;
        });
        setBulkResult({ added, skipped });
        setBulkRows([]);
        setBulkFile('');
        if (fileRef.current) fileRef.current.value = '';
    }

    /* ── Nav item style ── */
    function navBtn(tab: Tab, label: string) {
        const active = activeTab === tab;
        return (
            <button onClick={() => setActiveTab(tab)} style={{
                padding: '0 4px', height: '100%', border: 'none', background: 'none',
                color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                fontWeight: active ? 700 : 500, fontSize: '0.88rem',
                borderBottom: active ? '3px solid #FBBF24' : '3px solid transparent',
                cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                transition: 'all 0.15s', letterSpacing: '0.01em', whiteSpace: 'nowrap',
            }}>{label}</button>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#F1F5F9', fontFamily: "'Outfit', sans-serif" }}>

            {/* ══════════ TOP NAVBAR ══════════ */}
            <nav style={{
                background: 'linear-gradient(135deg, #0A1628 0%, #1B2F55 100%)',
                padding: '0 40px', position: 'sticky', top: 0, zIndex: 50,
                boxShadow: '0 2px 16px rgba(0,0,0,0.22)',
            }}>
                <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'stretch', height: 62, gap: 0 }}>
                    {/* Logo */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 40 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                        </div>
                        <div>
                            <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem', display: 'block', lineHeight: 1.1 }}>PlacementPortal</span>
                            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Super Admin</span>
                        </div>
                    </div>

                    {/* Nav Tabs */}
                    <div style={{ display: 'flex', gap: 32, alignItems: 'stretch', flex: 1 }}>
                        {navBtn('home', 'Home')}
                        {navBtn('onboarding', 'Onboarding')}
                        {navBtn('students', 'Student Management')}
                        {navBtn('admins', 'Admin Management')}
                    </div>

                    {/* Right: user + logout */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0, color: '#fff', fontWeight: 600, fontSize: '0.82rem' }}>{adminUser?.name}</p>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '0.68rem' }}>{adminUser?.email}</p>
                        </div>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14 }}>
                            {(adminUser?.name || 'S')[0].toUpperCase()}
                        </div>
                        <button onClick={onLogout} style={{ padding: '7px 16px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", transition: 'background 0.15s' }}>Logout</button>
                    </div>
                </div>
            </nav>

            {/* ══════════════════════════════════════
                TAB: HOME
            ══════════════════════════════════════ */}
            {activeTab === 'home' && (
                <div style={{ maxWidth: 1280, margin: '0 auto', padding: '36px 40px' }}>
                    {/* Page title */}
                    <div style={{ marginBottom: 28 }}>
                        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0A1628' }}>Dashboard Overview</h1>
                        <p style={{ margin: '4px 0 0', color: '#6B7280', fontSize: '0.85rem' }}>System-wide statistics and quick access controls.</p>
                    </div>

                    {/* Profile card */}
                    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '24px 28px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 22, flexShrink: 0 }}>
                            {(adminUser?.name || 'S')[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem', color: '#111827' }}>{adminUser?.name}</p>
                            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#6B7280' }}>{adminUser?.email}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <span style={{ padding: '4px 14px', border: '1px solid #E5E7EB', borderRadius: 4, fontSize: '0.72rem', fontWeight: 700, color: '#374151', letterSpacing: '0.05em', textTransform: 'uppercase', background: '#F9FAFB' }}>SUPER ADMIN</span>
                        </div>
                    </div>

                    {/* Stat cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16, marginBottom: 28 }}>
                        {[
                            { label: 'Total Students', value: totalStudents, accent: '#1B4FCC', icon: '🎓', action: () => setActiveTab('students') },
                            { label: 'HODs (Admins)', value: totalHODs, accent: '#059669', icon: '👔', action: () => setActiveTab('onboarding') },
                            { label: 'Staff Members', value: totalStaff, accent: '#7C3AED', icon: '🧑‍🏫', action: null },
                            { label: 'Departments', value: DEPARTMENTS.length, accent: '#D97706', icon: '🏛', action: null },
                        ].map(card => (
                            <div key={card.label} onClick={card.action || undefined} style={{
                                background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8,
                                padding: '20px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                                cursor: card.action ? 'pointer' : 'default', transition: 'all 0.15s',
                            }}
                                onMouseEnter={e => { if (card.action) { (e.currentTarget as HTMLDivElement).style.borderColor = '#9CA3AF'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.07)'; } }}
                                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#E5E7EB'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
                            >
                                <p style={{ margin: '0 0 12px', fontSize: '1.4rem' }}>{card.icon}</p>
                                <p style={{ margin: 0, fontSize: '1.9rem', fontWeight: 800, color: card.accent }}>{card.value}</p>
                                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</p>
                                {card.action && <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: card.accent, fontWeight: 700 }}>Quick Access →</p>}
                            </div>
                        ))}
                    </div>

                    {/* Department roster */}
                    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                        <div style={{ padding: '16px 22px', borderBottom: '1px solid #E5E7EB' }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: '#111827' }}>DEPARTMENT ROSTER</p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 0 }}>
                            {DEPARTMENTS.map((dept, i) => {
                                const hod = users.find(u => u.role === 'admin' && u.department === dept);
                                const count = users.filter(u => u.role === 'student' && u.department === dept).length;
                                return (
                                    <div key={dept} style={{ padding: '16px 20px', borderRight: (i + 1) % 4 !== 0 ? '1px solid #F3F4F6' : 'none', borderBottom: '1px solid #F3F4F6' }}>
                                        <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '1rem', color: '#1B4FCC' }}>{dept}</p>
                                        <p style={{ margin: 0, fontSize: '0.72rem', color: '#6B7280' }}>{count} student{count !== 1 ? 's' : ''}</p>
                                        <p style={{ margin: '2px 0 0', fontSize: '0.68rem', color: hod ? '#059669' : '#9CA3AF', fontWeight: 600 }}>{hod ? 'HOD: ' + hod.name.split(' ')[0] : 'No HOD'}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════
                TAB: ONBOARDING
            ══════════════════════════════════════ */}
            {activeTab === 'onboarding' && (
                <div style={{ maxWidth: 900, margin: '0 auto', padding: '36px 40px' }}>
                    <div style={{ marginBottom: 24 }}>
                        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0A1628' }}>Onboarding</h1>
                        <p style={{ margin: '4px 0 0', color: '#6B7280', fontSize: '0.85rem' }}>Provision new HOD (Admin) or Student accounts.</p>
                    </div>

                    {/* Type toggle */}
                    <div style={{ display: 'flex', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: 4, marginBottom: 28, width: 'fit-content', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                        {(['admin', 'student'] as OnboardType[]).map(t => (
                            <button key={t} onClick={() => setOnboardType(t)} style={{
                                padding: '9px 28px', borderRadius: 6, border: 'none',
                                background: onboardType === t ? '#0A1628' : 'transparent',
                                color: onboardType === t ? '#fff' : '#6B7280',
                                fontWeight: onboardType === t ? 700 : 500,
                                fontSize: '0.85rem', cursor: 'pointer',
                                fontFamily: "'Outfit', sans-serif", transition: 'all 0.15s',
                                letterSpacing: '0.02em',
                            }}>{t === 'admin' ? 'Admin (HOD)' : 'Student'}</button>
                        ))}
                    </div>

                    {/* ─── ADMIN ONBOARD FORM ─── */}
                    {onboardType === 'admin' && (
                        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                            <div style={{ padding: '18px 24px', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}>
                                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: '#111827', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Onboard New HOD / Admin</p>
                                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#6B7280' }}>Create a Head of Department account. They will manage their department's student data.</p>
                            </div>
                            <div style={{ padding: '28px 28px' }}>
                                {adminToast && (
                                    <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 6, border: `1px solid ${adminToast.ok ? '#A7F3D0' : '#FECACA'}`, background: adminToast.ok ? '#F0FDF4' : '#FEF2F2', color: adminToast.ok ? '#065F46' : '#991B1B', fontSize: '0.82rem', fontWeight: 600 }}>
                                        {adminToast.ok ? '✓' : '✕'} {adminToast.msg}
                                    </div>
                                )}
                                <form onSubmit={handleAdminOnboard} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                        <Field label="Full Name">
                                            <input required style={inp} type="text" value={adminName} onChange={e => setAdminName(e.target.value)} placeholder="Dr. John Doe" />
                                        </Field>
                                        <Field label="Department">
                                            <select required style={{ ...inp, background: '#fff' }} value={adminDept} onChange={e => setAdminDept(e.target.value)}>
                                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="College Email">
                                            <input required style={inp} type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="hod.cse@college.edu" />
                                        </Field>
                                        <Field label="Phone Number">
                                            <input required style={inp} type="tel" value={adminPhone} onChange={e => setAdminPhone(e.target.value)} placeholder="9876543210" maxLength={10} />
                                        </Field>
                                        <Field label="Initial Password">
                                            <input required style={inp} type="text" value={adminPass} onChange={e => setAdminPass(e.target.value)} placeholder="Mobile number (used as password)" />
                                        </Field>
                                    </div>
                                    <div style={{ paddingTop: 4 }}>
                                        <button type="submit" style={{
                                            padding: '12px 32px', borderRadius: 6, border: 'none', background: '#0A1628',
                                            color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
                                            fontFamily: "'Outfit', sans-serif", letterSpacing: '0.02em',
                                            boxShadow: '0 4px 12px rgba(10,22,40,0.25)', transition: 'all 0.15s',
                                        }}>Create HOD Account</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* ─── STUDENT ONBOARD ─── */}
                    {onboardType === 'student' && (
                        <div>
                            {/* Single / Bulk toggle */}
                            <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderRadius: 6, overflow: 'hidden', border: '1px solid #E5E7EB', width: 'fit-content' }}>
                                {(['single', 'bulk'] as StudentMode[]).map((m, i) => (
                                    <button key={m} onClick={() => setStudentMode(m)} style={{
                                        padding: '9px 26px', border: 'none',
                                        borderLeft: i > 0 ? '1px solid #E5E7EB' : 'none',
                                        background: studentMode === m ? '#0A1628' : '#fff',
                                        color: studentMode === m ? '#fff' : '#6B7280',
                                        fontWeight: studentMode === m ? 700 : 500,
                                        fontSize: '0.83rem', cursor: 'pointer',
                                        fontFamily: "'Outfit', sans-serif", transition: 'all 0.15s',
                                    }}>{m === 'single' ? 'Single Enrol' : 'Bulk Upload'}</button>
                                ))}
                            </div>

                            {/* ── SINGLE STUDENT ── */}
                            {studentMode === 'single' && (
                                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                    <div style={{ padding: '18px 24px', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}>
                                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: '#111827', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Single Student Enrolment</p>
                                        <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#6B7280' }}>Register number is used as the initial password.</p>
                                    </div>
                                    <div style={{ padding: '28px 28px' }}>
                                        {stToast && (
                                            <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 6, border: `1px solid ${stToast.ok ? '#A7F3D0' : '#FECACA'}`, background: stToast.ok ? '#F0FDF4' : '#FEF2F2', color: stToast.ok ? '#065F46' : '#991B1B', fontSize: '0.82rem', fontWeight: 600 }}>
                                                {stToast.ok ? '✓' : '✕'} {stToast.msg}
                                            </div>
                                        )}
                                        <form onSubmit={handleSingleStudent} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                                <Field label="Full Name">
                                                    <input required style={inp} type="text" value={stName} onChange={e => setStName(e.target.value)} placeholder="Student full name" />
                                                </Field>
                                                <Field label="College Email">
                                                    <input required style={inp} type="email" value={stEmail} onChange={e => setStEmail(e.target.value)} placeholder="22cs001@college.edu" />
                                                </Field>
                                                <Field label="Register Number (Password)">
                                                    <input required style={inp} type="text" value={stReg} onChange={e => setStReg(e.target.value)} placeholder="e.g. 22CS001" />
                                                </Field>
                                                <Field label="Department">
                                                    <select required style={{ ...inp, background: '#fff' }} value={stDept} onChange={e => setStDept(e.target.value)}>
                                                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                                    </select>
                                                </Field>
                                                <Field label="Class / Section">
                                                    <select required style={{ ...inp, background: '#fff' }} value={stSec} onChange={e => setStSec(e.target.value)}>
                                                        {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </Field>
                                            </div>
                                            <div>
                                                <button type="submit" style={{ padding: '12px 32px', borderRadius: 6, border: 'none', background: '#0A1628', color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", boxShadow: '0 4px 12px rgba(10,22,40,0.25)' }}>
                                                    Enrol Student
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}

                            {/* ── BULK UPLOAD ── */}
                            {studentMode === 'bulk' && (
                                <div>
                                    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 20 }}>
                                        <div style={{ padding: '18px 24px', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div>
                                                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: '#111827', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bulk Student Upload</p>
                                                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#6B7280' }}>Upload a CSV file. Students are auto-sorted and assigned by class.</p>
                                            </div>
                                            <button onClick={downloadTemplate} style={{ padding: '9px 18px', borderRadius: 6, border: '1px solid #D1D5DB', background: '#fff', color: '#374151', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: 7, transition: 'all 0.15s', }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                                Download Template
                                            </button>
                                        </div>
                                        <div style={{ padding: '28px 28px' }}>
                                            {/* Department selector for bulk */}
                                            <div style={{ marginBottom: 20 }}>
                                                <Field label="Department for bulk upload">
                                                    <select style={{ ...inp, maxWidth: 240, background: '#fff' }} value={stDept} onChange={e => setStDept(e.target.value)}>
                                                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                                    </select>
                                                </Field>
                                            </div>

                                            {/* Drop zone */}
                                            <div onClick={() => fileRef.current?.click()} style={{
                                                border: `2px dashed ${bulkRows.length > 0 ? '#0A1628' : '#D1D5DB'}`,
                                                borderRadius: 8, padding: '32px 20px', textAlign: 'center', cursor: 'pointer',
                                                background: bulkRows.length > 0 ? '#F8F9FF' : '#FAFAFA', transition: 'all 0.2s',
                                            }}>
                                                <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileUpload} />
                                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={bulkRows.length > 0 ? '#0A1628' : '#9CA3AF'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10 }}>
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                                                </svg>
                                                {bulkFile ? (
                                                    <p style={{ margin: 0, fontWeight: 700, color: '#0A1628', fontSize: '0.88rem' }}>{bulkFile} — {bulkRows.length} rows loaded</p>
                                                ) : (
                                                    <>
                                                        <p style={{ margin: 0, fontWeight: 700, color: '#374151', fontSize: '0.88rem' }}>Click to upload CSV file</p>
                                                        <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#9CA3AF' }}>Columns: Class, Reg No, Name, Email</p>
                                                    </>
                                                )}
                                            </div>
                                            {bulkError && <p style={{ margin: '10px 0 0', fontSize: '0.8rem', color: '#DC2626', fontWeight: 600 }}>{bulkError}</p>}
                                        </div>
                                    </div>

                                    {/* Preview table */}
                                    {bulkRows.length > 0 && (
                                        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 16 }}>
                                            <div style={{ padding: '14px 22px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F9FAFB' }}>
                                                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.82rem', color: '#111827', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Preview — {bulkRows.length} Students</p>
                                                <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>Auto-sorted alphabetically by class then name</span>
                                            </div>
                                            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                    <thead>
                                                        <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                                                            {['#', 'Class', 'Reg No', 'Name', 'Email'].map(h => (
                                                                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {bulkRows.map((r, i) => (
                                                            <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                                                <td style={{ padding: '10px 16px', fontSize: '0.78rem', color: '#9CA3AF', fontWeight: 600 }}>{i + 1}</td>
                                                                <td style={{ padding: '10px 16px', fontSize: '0.82rem', fontWeight: 700, color: '#1B4FCC' }}>{r.class.toUpperCase()}</td>
                                                                <td style={{ padding: '10px 16px', fontSize: '0.82rem', color: '#374151' }}>{r.regNo}</td>
                                                                <td style={{ padding: '10px 16px', fontSize: '0.82rem', color: '#111827', fontWeight: 600 }}>{r.name}</td>
                                                                <td style={{ padding: '10px 16px', fontSize: '0.78rem', color: '#6B7280' }}>{r.email}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div style={{ padding: '16px 22px', borderTop: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 16 }}>
                                                <button onClick={handleBulkSubmit} style={{ padding: '11px 28px', borderRadius: 6, border: 'none', background: '#0A1628', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", boxShadow: '0 4px 12px rgba(10,22,40,0.25)' }}>
                                                    Enrol {bulkRows.length} Students
                                                </button>
                                                <button onClick={() => { setBulkRows([]); setBulkFile(''); if (fileRef.current) fileRef.current.value = ''; }} style={{ padding: '11px 20px', borderRadius: 6, border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                                                    Clear
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Bulk result */}
                                    {bulkResult && (
                                        <div style={{ padding: '16px 22px', borderRadius: 8, border: '1px solid #A7F3D0', background: '#F0FDF4', color: '#065F46', fontSize: '0.85rem', fontWeight: 600 }}>
                                            ✓ Bulk upload complete — <strong>{bulkResult.added}</strong> students enrolled, <strong>{bulkResult.skipped}</strong> skipped (already exist).
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════
                TAB: STUDENT MANAGEMENT
            ══════════════════════════════════════ */}
            {activeTab === 'students' && (
                <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0A1628' }}>Student Management</h1>
                            <p style={{ margin: '4px 0 0', color: '#6B7280', fontSize: '0.85rem' }}>Search and view profiles for any student in the college.</p>
                        </div>
                        <button onClick={() => {
                            setIsRefreshing(true);
                            setRefreshKey(k => k + 1);
                            setTimeout(() => setIsRefreshing(false), 500);
                        }} style={{ padding: '8px 18px', borderRadius: 6, border: '1px solid #D1D5DB', background: '#fff', color: '#374151', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: 7, transition: 'all 0.15s' }}>
                            <svg className={isRefreshing ? 'spin' : ''} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
                            {isRefreshing ? 'Refreshing...' : 'Refresh'}
                            <style>{`
                                @keyframes spin { 100% { transform: rotate(360deg); } }
                                .spin { animation: spin 0.5s linear infinite; }
                            `}</style>
                        </button>
                    </div>

                    {/* Search + Filter bar */}
                    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '14px 22px', marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', gap: 14, alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                            <input type="text" placeholder="Search by name or register number…" value={searchQ} onChange={e => setSearchQ(e.target.value)} style={{ ...inp, paddingLeft: 42, background: '#F9FAFB' }} />
                        </div>
                        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={{ ...inp, width: 'auto', minWidth: 160, background: '#F9FAFB' }}>
                            <option value="ALL">All Departments</option>
                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>

                    {/* List */}
                    <div key={refreshKey} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                        {filteredStudents.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' }}>
                                <p style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 600, color: '#4B5563' }}>{allStudents.length === 0 ? 'No Students Yet' : 'No Results'}</p>
                                <p style={{ margin: 0, fontSize: '0.85rem' }}>{allStudents.length === 0 ? 'Use the Onboarding tab to enrol students.' : `No students match your current filters.`}</p>
                            </div>
                        ) : (() => {
                            const sorted = [...filteredStudents].sort((a, b) => {
                                const dept = (a.department || '').localeCompare(b.department || '');
                                if (dept !== 0) return dept;
                                const sec = (a.section || '').localeCompare(b.section || '');
                                if (sec !== 0) return sec;
                                return (a.name || '').localeCompare(b.name || '');
                            });
                            let lastGroup = '';
                            return (
                                <div>
                                    <div style={{ padding: '12px 22px', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}>
                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}{deptFilter !== 'ALL' ? ` in ${deptFilter}` : ''} — sorted by dept + class</span>
                                    </div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead><tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                                            {['Name', 'Register No', 'Department', 'Class', 'Email', 'Action'].map(h => (
                                                <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                            ))}
                                        </tr></thead>
                                        <tbody>
                                            {sorted.map((s: any) => {
                                                const group = `${s.department}-${s.section}`;
                                                const showGroup = group !== lastGroup;
                                                lastGroup = group;
                                                return [
                                                    showGroup ? (
                                                        <tr key={`g-${group}`} style={{ background: '#F1F5F9' }}>
                                                            <td colSpan={6} style={{ padding: '8px 18px', fontSize: '0.72rem', fontWeight: 800, color: '#1B4FCC', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.department} — Class {s.section}</td>
                                                        </tr>
                                                    ) : null,
                                                    <tr key={s.email} style={{ borderBottom: '1px solid #F3F4F6', transition: 'background 0.12s' }}
                                                        onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                                        <td style={{ padding: '11px 18px', fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>{s.name}</td>
                                                        <td style={{ padding: '11px 18px', fontSize: '0.82rem', color: '#374151' }}>{s.regNo || '—'}</td>
                                                        <td style={{ padding: '11px 18px', fontSize: '0.82rem', color: '#374151' }}>{s.department}</td>
                                                        <td style={{ padding: '11px 18px' }}><span style={{ background: '#EFF6FF', color: '#1D4ED8', borderRadius: 4, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }}>{s.section}</span></td>
                                                        <td style={{ padding: '11px 18px', fontSize: '0.78rem', color: '#6B7280' }}>{s.email}</td>
                                                        <td style={{ padding: '11px 18px' }}>
                                                            <button onClick={() => setSelectedStudent(s)} style={{ padding: '5px 14px', borderRadius: 5, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>View</button>
                                                        </td>
                                                    </tr>
                                                ];
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════
                TAB: ADMIN MANAGEMENT
            ══════════════════════════════════════ */}
            {activeTab === 'admins' && (
                <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 40px' }}>
                    <div style={{ marginBottom: 24 }}>
                        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0A1628' }}>Admin Management</h1>
                        <p style={{ margin: '4px 0 0', color: '#6B7280', fontSize: '0.85rem' }}>View and manage all HOD (Admin) accounts.</p>
                    </div>

                    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                        <div style={{ padding: '12px 22px', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{allAdmins.length} HOD{allAdmins.length !== 1 ? 's' : ''} Registered</span>
                        </div>
                        {allAdmins.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' }}>
                                <p style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 600, color: '#4B5563' }}>No HODs Onboarded</p>
                                <p style={{ margin: 0, fontSize: '0.85rem' }}>Use the Onboarding tab to create HOD accounts.</p>
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead><tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                                    {['Name', 'Email', 'Department', 'Action'].map(h => (
                                        <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody>
                                    {allAdmins.map((hod: any) => (
                                        <tr key={hod.email} style={{ borderBottom: '1px solid #F3F4F6', transition: 'background 0.12s' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                            <td style={{ padding: '12px 18px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#059669,#10B981)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{(hod.name || 'A')[0].toUpperCase()}</div>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>{hod.name}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 18px', fontSize: '0.82rem', color: '#6B7280' }}>{hod.email}</td>
                                            <td style={{ padding: '12px 18px' }}><span style={{ background: '#F0FDF4', color: '#059669', borderRadius: 4, padding: '3px 12px', fontSize: '0.72rem', fontWeight: 700 }}>{hod.department}</span></td>
                                            <td style={{ padding: '12px 18px' }}>
                                                <button onClick={() => { setSelectedHOD(hod); setHodStaffExpanded(false); setSelectedStaffView(null); }} style={{ padding: '6px 16px', borderRadius: 5, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>View</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ HOD DETAIL MODAL ═══ */}
            {selectedHOD && !selectedStaffView && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedHOD(null)}>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }} />
                    <div onClick={e => e.stopPropagation()} style={{ position: 'relative', background: '#fff', borderRadius: 10, width: '95%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                        {/* Header */}
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827' }}>HOD Profile</span>
                            </div>
                            <button onClick={() => setSelectedHOD(null)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #E5E7EB', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B7280', fontSize: 16, fontWeight: 700 }}>✕</button>
                        </div>
                        {/* Profile */}
                        <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: '1px solid #F3F4F6' }}>
                            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#059669,#10B981)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 22, flexShrink: 0 }}>{(selectedHOD.name || 'A')[0].toUpperCase()}</div>
                            <div>
                                <p style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem', color: '#111827' }}>{selectedHOD.name}</p>
                                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#6B7280' }}>{selectedHOD.email}</p>
                                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#059669', fontWeight: 600 }}>{selectedHOD.department} Department</p>
                            </div>
                        </div>
                        {/* Stats */}
                        {(() => {
                            const deptStu = users.filter(u => u.role === 'student' && u.department === selectedHOD.department);
                            const total = deptStu.length;
                            const completed = deptStu.filter(s => {
                                const subs = getSubmissions(s.email);
                                return subs.length > 0 && PARAMETERS.every(p => subs.some(sub => sub.parameterId === p.id && sub.status === 'approved'));
                            }).length;
                            const pending = total - completed;
                            return (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, borderBottom: '1px solid #F3F4F6' }}>
                                    <div style={{ padding: '20px', textAlign: 'center', borderRight: '1px solid #F3F4F6' }}>
                                        <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#111827' }}>{total}</p>
                                        <p style={{ margin: '4px 0 0', fontSize: '0.72rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Total Students</p>
                                    </div>
                                    <div style={{ padding: '20px', textAlign: 'center', borderRight: '1px solid #F3F4F6' }}>
                                        <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#059669' }}>{completed}<span style={{ fontSize: '0.85rem', color: '#9CA3AF', fontWeight: 500 }}>/{total}</span></p>
                                        <p style={{ margin: '4px 0 0', fontSize: '0.72rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Completed</p>
                                    </div>
                                    <div style={{ padding: '20px', textAlign: 'center' }}>
                                        <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#DC2626' }}>{pending}<span style={{ fontSize: '0.85rem', color: '#9CA3AF', fontWeight: 500 }}>/{total}</span></p>
                                        <p style={{ margin: '4px 0 0', fontSize: '0.72rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Pending</p>
                                    </div>
                                </div>
                            );
                        })()}
                        {/* Staff dropdown */}
                        <div style={{ padding: '0' }}>
                            <button onClick={() => setHodStaffExpanded(!hodStaffExpanded)} style={{ width: '100%', padding: '14px 24px', border: 'none', borderBottom: hodStaffExpanded ? '1px solid #F3F4F6' : 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>Staff Members — {selectedHOD.department}</span>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: hodStaffExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9" /></svg>
                            </button>
                            {hodStaffExpanded && (() => {
                                const deptStaff = allStaffUsers.filter(s => s.department === selectedHOD.department);
                                return deptStaff.length === 0 ? (
                                    <p style={{ padding: '16px 24px', margin: 0, fontSize: '0.82rem', color: '#9CA3AF' }}>No staff assigned to this department.</p>
                                ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead><tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                                            {['Name', 'Email', 'Class & Sec', 'Action'].map(h => (
                                                <th key={h} style={{ padding: '8px 18px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                            ))}
                                        </tr></thead>
                                        <tbody>
                                            {deptStaff.map((st: any) => (
                                                <tr key={st.email} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                                    <td style={{ padding: '10px 18px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 11, flexShrink: 0 }}>{(st.name || 'S')[0].toUpperCase()}</div>
                                                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827' }}>{st.name}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '10px 18px', fontSize: '0.78rem', color: '#6B7280' }}>{st.email}</td>
                                                    <td style={{ padding: '10px 18px', fontSize: '0.78rem', color: '#374151', fontWeight: 600 }}>{st.department}-{st.section}</td>
                                                    <td style={{ padding: '10px 18px' }}>
                                                        <button onClick={() => setSelectedStaffView(st)} style={{ padding: '4px 12px', borderRadius: 5, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>View</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                );
                            })()}
                        </div>
                        {/* Close button */}
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setSelectedHOD(null)} style={{ padding: '9px 24px', borderRadius: 6, border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#374151', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ STAFF PROFILE MODAL ═══ */}
            {selectedStaffView && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedStaffView(null)}>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }} />
                    <div onClick={e => e.stopPropagation()} style={{ position: 'relative', background: '#fff', borderRadius: 10, width: '95%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827' }}>Staff Profile</span>
                            </div>
                            <button onClick={() => setSelectedStaffView(null)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #E5E7EB', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B7280', fontSize: 16, fontWeight: 700 }}>✕</button>
                        </div>
                        {/* Staff info */}
                        <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: '1px solid #F3F4F6' }}>
                            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 22, flexShrink: 0 }}>{(selectedStaffView.name || 'S')[0].toUpperCase()}</div>
                            <div>
                                <p style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem', color: '#111827' }}>{selectedStaffView.name}</p>
                                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#6B7280' }}>{selectedStaffView.email}</p>
                                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#6366F1', fontWeight: 600 }}>{selectedStaffView.department} - Section {selectedStaffView.section}</p>
                            </div>
                        </div>
                        {/* Staff stats */}
                        {(() => {
                            const secStu = users.filter(u => u.role === 'student' && u.department === selectedStaffView.department && u.section === selectedStaffView.section);
                            const total = secStu.length;
                            const completed = secStu.filter(s => {
                                const subs = getSubmissions(s.email);
                                return subs.length > 0 && PARAMETERS.every(p => subs.some(sub => sub.parameterId === p.id && sub.status === 'approved'));
                            }).length;
                            const pending = total - completed;
                            return (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
                                    <div style={{ padding: '20px', textAlign: 'center', borderRight: '1px solid #F3F4F6' }}>
                                        <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#111827' }}>{total}</p>
                                        <p style={{ margin: '4px 0 0', fontSize: '0.72rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Total Students</p>
                                    </div>
                                    <div style={{ padding: '20px', textAlign: 'center', borderRight: '1px solid #F3F4F6' }}>
                                        <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#059669' }}>{completed}<span style={{ fontSize: '0.85rem', color: '#9CA3AF', fontWeight: 500 }}>/{total}</span></p>
                                        <p style={{ margin: '4px 0 0', fontSize: '0.72rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Completed</p>
                                    </div>
                                    <div style={{ padding: '20px', textAlign: 'center' }}>
                                        <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#DC2626' }}>{pending}<span style={{ fontSize: '0.85rem', color: '#9CA3AF', fontWeight: 500 }}>/{total}</span></p>
                                        <p style={{ margin: '4px 0 0', fontSize: '0.72rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Pending</p>
                                    </div>
                                </div>
                            );
                        })()}
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setSelectedStaffView(null)} style={{ padding: '9px 24px', borderRadius: 6, border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#374151', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Student Profile Modal */}
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

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}
