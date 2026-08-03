import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, CheckCircle, BarChart3, LogOut, Moon, Sun, Calendar, Settings as SettingsIcon, Folder, Bell, Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import styles from './Sidebar.module.css';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen?: boolean;
  setIsOpen?: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      {isOpen && (
        <div 
          className={styles.overlay} 
          onClick={() => setIsOpen && setIsOpen(false)} 
        />
      )}
      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }} onClick={() => setActiveTab('overview')}>
          <img src="/logo.png" alt="Logo" className={styles.logo} />
        </div>
        <button 
          onClick={() => setActiveTab('notifications')}
          style={{ background: 'transparent', border: 'none', color: activeTab === 'notifications' ? 'var(--accent-color)' : 'var(--text-secondary)', cursor: 'pointer', position: 'relative', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Notifications"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: 0, right: 0, background: 'var(--danger-color)', color: 'white', fontSize: '0.65rem', fontWeight: 'bold', padding: '0.1rem 0.3rem', borderRadius: '10px', transform: 'translate(25%, -25%)' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{user?.fullName}</span>
          <span className={styles.rollNumber}>{user?.rollNumber}</span>
        </div>
      </div>

      <nav className={styles.nav}>
        <button 
          className={`${styles.navItem} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => { setActiveTab('overview'); setIsOpen && setIsOpen(false); }}
        >
          <LayoutDashboard size={20} />
          <span>Overview</span>
        </button>
        <button 
          className={`${styles.navItem} ${activeTab === 'timetable' ? styles.active : ''}`}
          onClick={() => { setActiveTab('timetable'); setIsOpen && setIsOpen(false); }}
        >
          <Calendar size={20} />
          <span>Timetable</span>
        </button>
        <button 
          className={`${styles.navItem} ${activeTab === 'mark' ? styles.active : ''}`}
          onClick={() => { setActiveTab('mark'); setIsOpen && setIsOpen(false); }}
        >
          <CheckCircle size={20} />
          <span>Mark Attendance</span>
        </button>
        <button 
          className={`${styles.navItem} ${activeTab === 'tracker' ? styles.active : ''}`}
          onClick={() => { setActiveTab('tracker'); setIsOpen && setIsOpen(false); }}
        >
          <BarChart3 size={20} />
          <span>Tracker</span>
        </button>
        <button 
          className={`${styles.navItem} ${activeTab === 'discover' ? styles.active : ''}`}
          onClick={() => { setActiveTab('discover'); setIsOpen && setIsOpen(false); }}
        >
          <Compass size={20} />
          <span>Discover</span>
        </button>
        <button 
          className={`${styles.navItem} ${activeTab === 'assets' ? styles.active : ''}`}
          onClick={() => { setActiveTab('assets'); setIsOpen && setIsOpen(false); }}
        >
          <Folder size={20} />
          <span>Assets</span>
        </button>
      </nav>

      <div className={styles.footer}>
        <button 
          className={`${styles.navItem} ${activeTab === 'settings' ? styles.active : ''}`}
          onClick={() => { setActiveTab('settings'); setIsOpen && setIsOpen(false); }}
        >
          <SettingsIcon size={20} />
          <span>Settings</span>
        </button>
        <button className={styles.actionBtn} onClick={toggleTheme}>
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
        </button>
        <button className={styles.actionBtn} onClick={handleLogout}>
          <LogOut size={20} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
    </>
  );
};
