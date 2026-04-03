import { useState, useRef } from 'react';
import { getUsers } from '../../data/portalData';

interface Props {
    email: string;
    onClose: () => void;
    onSave?: () => void;
}

export default function ProfileSettingsModal({ email, onClose, onSave }: Props) {
    const users = getUsers();
    const currentUser = users.find(u => u.email === email);
    
    // We store the base64 URL of the profile pic
    const [profilePic, setProfilePic] = useState(currentUser?.profilePic || '');
    const [saved, setSaved] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setProfilePic(base64String);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = () => {
        if (!currentUser) return;
        const updatedUsers = users.map(u => {
            if (u.email === email) {
                return { ...u, profilePic };
            }
            return u;
        });
        localStorage.setItem('pp_users', JSON.stringify(updatedUsers));
        setSaved(true);
        setTimeout(() => {
            setSaved(false);
            if (onSave) onSave();
            onClose();
        }, 800);
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', fontFamily: "'Outfit', sans-serif"
        }} onClick={onClose}>
            <div style={{ background: '#fff', borderRadius: 10, width: 360, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>Profile Picture</h3>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6B7280' }}>✕</button>
                </div>
                
                <div style={{ padding: '24px', textAlign: 'center' }}>
                    
                    {/* Avatar Preview */}
                    <div style={{
                        width: 120, height: 120, borderRadius: '50%', margin: '0 auto 20px',
                        background: profilePic ? `url(${profilePic}) center/cover` : '#F3F4F6',
                        border: '2px dashed #D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#9CA3AF', overflow: 'hidden'
                    }}>
                        {!profilePic && (
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        )}
                    </div>

                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
                    
                    <button onClick={() => fileInputRef.current?.click()} style={{
                        padding: '8px 16px', borderRadius: 6, border: '1px solid #D1D5DB', background: '#fff',
                        color: '#374151', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', marginBottom: 24,
                        transition: 'background 0.15s'
                    }} onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                        {profilePic ? 'Change Picture' : 'Upload Picture'}
                    </button>

                    <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 6, border: '1px solid #D1D5DB', background: '#fff', color: '#374151', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                        <button onClick={handleSave} style={{ flex: 1, padding: '10px', borderRadius: 6, border: 'none', background: '#1D4ED8', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
                            {saved ? 'Saved!' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
