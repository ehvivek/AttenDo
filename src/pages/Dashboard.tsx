import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import Overview from './Overview';
import MarkAttendance from './MarkAttendance';
import Tracker from './Tracker';
import Timetable from './Timetable';
import Settings from './Settings';
import Assets from './Assets';
import Discover from './Discover';
import styles from './Dashboard.module.css';
import { LayoutDashboard, CheckCircle, BarChart3, Calendar, Folder, Bell, Compass, Menu, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import NotificationsView from './NotificationsView';

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <Overview />;
      case 'timetable':
        return <Timetable />;
      case 'mark':
        return <MarkAttendance />;
      case 'tracker':
        return <Tracker />;
      case 'assets':
        return <Assets />;
      case 'settings':
        return <Settings />;
      case 'discover':
        return <Discover />;
      case 'notifications':
        return <NotificationsView setActiveTab={setActiveTab} />;
      default:
        return <Overview />;
    }
  };

  return (
    <div className={styles.layout}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <main className={styles.mainContent}>
        <header className={styles.mobileHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Menu 
              size={24} 
              color="var(--text-secondary)" 
              style={{ cursor: 'pointer' }} 
              onClick={() => setIsSidebarOpen(true)}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }} onClick={() => setActiveTab('overview')}>
              <img src="/logo.png" alt="AttenDo" className={styles.mobileLogo} style={{ height: '45px' }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button 
              onClick={() => setActiveTab('notifications')}
              style={{ background: 'transparent', border: 'none', color: activeTab === 'notifications' ? 'var(--accent-color)' : 'var(--text-secondary)', cursor: 'pointer', position: 'relative', padding: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: 0, right: 0, background: 'var(--danger-color)', color: 'white', fontSize: '0.65rem', fontWeight: 'bold', padding: '0.1rem 0.3rem', borderRadius: '10px', transform: 'translate(25%, -25%)' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {user?.rollNumber && (
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '0.2rem 0.5rem', borderRadius: '12px' }}>
                {user.rollNumber}
              </div>
            )}
            <div 
              onClick={() => setActiveTab('settings')}
              style={{ 
                width: '32px', height: '32px', borderRadius: '50%', 
                backgroundColor: 'var(--accent-color)', display: 'flex', 
                alignItems: 'center', justifyContent: 'center', color: 'var(--accent-text)',
                cursor: 'pointer', marginLeft: '0.25rem', boxShadow: 'var(--shadow-sm)'
              }}
            >
              <User size={18} />
            </div>
          </div>
        </header>
        <div className={styles.contentScroll}>
          {renderContent()}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className={styles.mobileNav}>
        <button 
          className={`${styles.mobileNavItem} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <LayoutDashboard size={22} />
          <span>Overview</span>
        </button>
        <button 
          className={`${styles.mobileNavItem} ${activeTab === 'timetable' ? styles.active : ''}`}
          onClick={() => setActiveTab('timetable')}
        >
          <Calendar size={22} />
          <span>Timetable</span>
        </button>
        <button 
          className={`${styles.mobileNavItem} ${activeTab === 'mark' ? styles.active : ''}`}
          onClick={() => setActiveTab('mark')}
        >
          <CheckCircle size={22} />
          <span>Mark</span>
        </button>
        <button 
          className={`${styles.mobileNavItem} ${activeTab === 'tracker' ? styles.active : ''}`}
          onClick={() => setActiveTab('tracker')}
        >
          <BarChart3 size={22} />
          <span>Tracker</span>
        </button>
        <button 
          className={`${styles.mobileNavItem} ${activeTab === 'discover' ? styles.active : ''}`}
          onClick={() => setActiveTab('discover')}
        >
          <Compass size={22} />
          <span>Discover</span>
        </button>
        <button 
          className={`${styles.mobileNavItem} ${activeTab === 'assets' ? styles.active : ''}`}
          onClick={() => setActiveTab('assets')}
        >
          <Folder size={22} />
          <span>Assets</span>
        </button>
      </nav>
    </div>
  );
};

export default Dashboard;
