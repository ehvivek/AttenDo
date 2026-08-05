import React from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { SwipeableNotification } from '../components/SwipeableNotification';
import styles from './NotificationsView.module.css';

interface NotificationsViewProps {
  setActiveTab: (tab: string) => void;
}

const NotificationsView: React.FC<NotificationsViewProps> = ({ setActiveTab }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications } = useNotifications();

  // Optionally mark all as read automatically when visiting? No, let user read them.

  const handleNotificationClick = async (notif: any) => {
    if (!notif.is_read) {
      await markAsRead(notif.id);
    }
    if (notif.link) {
      setActiveTab(notif.link);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Notifications</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {unreadCount > 0 && (
            <button className={styles.markAllBtn} onClick={markAllAsRead}>
              <Check size={16} /> Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button className={styles.clearAllBtn} onClick={() => {
              if (window.confirm('Are you sure you want to clear all notifications?')) {
                clearAllNotifications();
              }
            }} title="Clear all notifications">
              <Trash2 size={16} /> Clear All
            </button>
          )}
        </div>
      </div>

      <div className={styles.list}>
        {notifications.length === 0 ? (
          <div className={styles.emptyState}>
            <Bell size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <SwipeableNotification
              key={notif.id}
              onDelete={() => deleteNotification(notif.id)}
              onClick={() => handleNotificationClick(notif)}
            >
              <div className={`${styles.card} ${!notif.is_read ? styles.unread : ''}`}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>{notif.title}</h3>
                  {!notif.is_read && <span className={styles.unreadDot} />}
                </div>
                <p className={styles.cardMessage}>{notif.message}</p>
                <span className={styles.cardTime}>
                  {new Date(notif.created_at).toLocaleDateString()} at {new Date(notif.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            </SwipeableNotification>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsView;
