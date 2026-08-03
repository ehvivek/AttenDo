import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import styles from './DashboardViews.module.css';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, Save, LogOut, User, Volume2, VolumeX, ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const THEMES = [
  { id: 'light', name: 'Light', color: '#ffffff', border: '#eaeaea' },
  { id: 'dark', name: 'Dark', color: '#000000', border: '#333333' },
  { id: 'ocean', name: 'Ocean', color: '#0B192C', border: '#38BDF8' },
  { id: 'sakura', name: 'Sakura', color: '#FFF0F5', border: '#FF69B4' },
  { id: 'forest', name: 'Forest', color: '#132A13', border: '#4F772D' },
  { id: 'cyberpunk', name: 'Cyberpunk', color: '#0F091F', border: '#FF003C' },
  { id: 'sunrise', name: 'Sunrise', color: '#FFF5EC', border: '#FF6B00' },
];

const Settings: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  
  const [batch, setBatch] = useState<'D1' | 'D2' | 'D3' | 'D'>((user?.batch as any) || 'D1');
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('soundEnabled') !== 'false');
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    if (user) {
      try {
        const { error } = await supabase.auth.updateUser({
          data: { batch }
        });
        if (error) throw error;
        localStorage.setItem('soundEnabled', soundEnabled.toString());
        setMessage('Settings saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } catch (err: any) {
        setMessage('Failed to save settings: ' + err.message);
        setTimeout(() => setMessage(''), 3000);
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.title}>Settings</h1>
            <p className={styles.subtitle}>Manage your account preferences.</p>
          </div>
          <div className={styles.iconWrapper} style={{ backgroundColor: 'transparent' }}>
            <SettingsIcon size={24} color="var(--text-color)" />
          </div>
        </div>
      </header>

      <div className={styles.section} style={{ maxWidth: '600px' }}>
        <h2 className={styles.sectionTitle}>Profile Settings</h2>
        <div className={styles.statCard} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem', padding: '1.5rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ 
              width: '4rem', 
              height: '4rem', 
              borderRadius: '50%', 
              backgroundColor: 'var(--accent-color)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--accent-text)'
            }}>
              <User size={32} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {user?.fullName}
                {user?.role === 'admin' && (
                  <span style={{ 
                    display: 'flex', alignItems: 'center', gap: '0.25rem', 
                    fontSize: '0.75rem', backgroundColor: 'var(--accent-color)', color: 'var(--accent-text)', 
                    padding: '0.125rem 0.5rem', borderRadius: '1rem', fontWeight: 500 
                  }}>
                    <ShieldCheck size={12} /> Admin
                  </span>
                )}
              </h3>
              <p style={{ color: 'var(--text-secondary)', margin: 0, marginTop: '0.25rem' }}>{user?.email}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>Roll Number</label>
              <p style={{ fontWeight: 500, marginTop: '0.25rem', fontSize: '1.1rem' }}>{user?.rollNumber || 'N/A'}</p>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>Role</label>
              <p style={{ fontWeight: 500, marginTop: '0.25rem', fontSize: '1.1rem', textTransform: 'capitalize' }}>{user?.role}</p>
            </div>
          </div>
          
          <div style={{ paddingTop: '0.5rem' }}>
            <Select
              label="Tutorial / Lab Batch"
              value={batch}
              onChange={(e) => setBatch(e.target.value as 'D1' | 'D2' | 'D3' | 'D')}
              options={[
                { value: 'D', label: 'Combined Batch D' },
                { value: 'D1', label: 'Batch D1' },
                { value: 'D2', label: 'Batch D2' },
                { value: 'D3', label: 'Batch D3' }
              ]}
            />
          </div>
            
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            padding: '1rem',
            backgroundColor: 'var(--bg-color)',
            borderRadius: '0.75rem',
            border: '1px solid var(--border-color)',
            marginTop: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ 
                width: '2.5rem', height: '2.5rem', borderRadius: '50%', 
                backgroundColor: soundEnabled ? 'var(--accent-color)' : 'var(--border-color)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: soundEnabled ? 'var(--accent-text)' : 'var(--text-secondary)',
                transition: 'all 0.2s'
              }}>
                {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </div>
              <div>
                <p style={{ fontWeight: 600, margin: 0 }}>Sound Effects</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, marginTop: '0.125rem' }}>Play sounds when marking attendance.</p>
              </div>
            </div>
            
            <label style={{ position: 'relative', display: 'inline-block', width: '3rem', height: '1.5rem' }}>
              <input 
                type="checkbox" 
                checked={soundEnabled} 
                onChange={(e) => setSoundEnabled(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: soundEnabled ? 'var(--accent-color)' : 'var(--border-color)',
                transition: '.4s', borderRadius: '1.5rem'
              }}>
                <span style={{
                  position: 'absolute', content: '""', height: '1.25rem', width: '1.25rem',
                  left: soundEnabled ? '1.625rem' : '0.125rem', bottom: '0.125rem',
                  backgroundColor: soundEnabled ? 'var(--accent-text)' : 'var(--bg-color)', transition: '.4s', borderRadius: '50%',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }} />
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
            <Button onClick={handleSave} style={{ width: 'auto' }}>
              <Save size={18} style={{ marginRight: '0.5rem' }} /> Save Profile
            </Button>
            {message && <span style={{ color: 'var(--success-color)', fontSize: '0.875rem', fontWeight: 500 }}>{message}</span>}
          </div>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h2 className={styles.sectionTitle}>Appearance</h2>
          <div className={styles.statCard} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
            <div>
              <p style={{ fontWeight: 500, marginBottom: '0.25rem' }}>Theme Preset</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Choose a color scheme for your dashboard.</p>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id as any)}
                    style={{
                      width: '3rem',
                      height: '3rem',
                      borderRadius: '50%',
                      backgroundColor: t.color,
                      border: `3px solid ${theme === t.id ? t.border : 'var(--border-color)'}`,
                      cursor: 'pointer',
                      outline: theme === t.id ? `2px solid ${t.border}` : 'none',
                      outlineOffset: '2px',
                      transition: 'all 0.2s',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                    title={t.name}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h2 className={styles.sectionTitle}>Contact</h2>
          <div className={styles.statCard} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem', padding: '1.5rem', lineHeight: '1.6' }}>
            <p style={{ margin: 0, color: 'var(--text-color)' }}>
              For any queries or feedback, please email{' '}
              <a href="mailto:25ce3061@rgipt.ac.in" style={{ color: 'var(--accent-color)', fontWeight: 600, textDecoration: 'none' }}>
                25ce3061@rgipt.ac.in
              </a>
            </p>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Please write <strong>"AttenDo"</strong> as the subject of your email and describe your query, issue, or feedback in the email body.
            </p>
            <div style={{ marginTop: '1.5rem', lineHeight: '1.2' }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-color)' }}>Thank you,</p>
              <p style={{ margin: 0, fontFamily: '"Great Vibes", cursive', fontSize: '2.5rem', color: 'var(--accent-color)' }}>Vivek Kumar</p>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h2 className={styles.sectionTitle} style={{ color: 'var(--danger-color)' }}>Account Actions</h2>
          <div className={styles.statCard} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Log out of your account on this device.</p>
            <Button 
              onClick={handleLogout} 
              variant="outline" 
              style={{ 
                width: 'auto', 
                alignSelf: 'flex-start',
                borderColor: 'var(--danger-color)',
                color: 'var(--danger-color)'
              }}
            >
              <LogOut size={18} style={{ marginRight: '0.5rem' }} /> Log Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
