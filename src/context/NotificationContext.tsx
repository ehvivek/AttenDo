import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export interface Notification {
  id: string;
  title: string;
  message: string;
  link: string | null;
  target_batch: string;
  type: string;
  created_at: string;
  is_read?: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => void;
  clearAllNotifications: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'created_at'>) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

/**
 * Request notification permissions on native platforms.
 * Safe to call multiple times — it only prompts once.
 */
const requestNotificationPermission = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display === 'prompt' || perm.display === 'prompt-with-rationale') {
      await LocalNotifications.requestPermissions();
    }
  } catch (e) {
    console.warn('Could not request notification permissions:', e);
  }
};

/**
 * Fire a native Android/iOS notification.
 */
const fireNativeNotification = async (title: string, body: string) => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') return;

    await LocalNotifications.schedule({
      notifications: [
        {
          id: Date.now(),
          title,
          body,
          smallIcon: 'ic_launcher',
          largeIcon: 'ic_launcher',
          sound: 'default',
        },
      ],
    });
  } catch (e) {
    console.warn('Could not fire native notification:', e);
  }
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const hasRequestedPerms = useRef(false);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('attendo_deleted_notifs');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  
  // Request notification permissions once on mount
  useEffect(() => {
    if (!hasRequestedPerms.current) {
      hasRequestedPerms.current = true;
      requestNotificationPermission();
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    
    fetchNotifications();
    
    // Subscribe to new notifications
    const subscription = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotif = payload.new as Notification;
          // Only add if it's for this user's batch or all or parent batch
          const targetBatches = ['All'];
          if (user.batch) {
            targetBatches.push(user.batch);
            targetBatches.push(user.batch.replace(/[0-9]/g, ''));
          }
          if (targetBatches.includes(newNotif.target_batch)) {
            setNotifications(prev => [{ ...newNotif, is_read: false }, ...prev]);
            
            // 🔔 Fire native Android notification
            fireNativeNotification(
              newNotif.title,
              newNotif.message
            );
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    
    const targetBatches = ['All', user.batch || 'D1'];
    if (user.batch) targetBatches.push(user.batch.replace(/[0-9]/g, ''));
    
    // Fetch notifications meant for this user's batch or all
    const { data: notifsData, error: notifsError } = await supabase
      .from('notifications')
      .select('*')
      .in('target_batch', targetBatches)
      .gte('created_at', user.createdAt)
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (notifsError) {
      console.error('Error fetching notifications:', notifsError);
      return;
    }
    
    // Fetch user's read status
    const { data: readsData, error: readsError } = await supabase
      .from('notification_reads')
      .select('notification_id')
      .eq('user_id', user.id);
      
    if (readsError) {
      console.error('Error fetching notification reads:', readsError);
      return;
    }
    
    const readIds = new Set(readsData.map(r => r.notification_id));
    
    const formattedNotifs = notifsData.map(n => ({
      ...n,
      is_read: readIds.has(n.id)
    }));
    
    setNotifications(formattedNotifs);
  };

  const markAsRead = async (notificationId: string) => {
    if (!user) return;
    
    // Optimistic update
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, is_read: true } : n
    ));
    
    const { error } = await supabase
      .from('notification_reads')
      .insert({ user_id: user.id, notification_id: notificationId });
      
    if (error) {
      console.error('Error marking as read:', error);
      // Revert if error? For now just log
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    
    const inserts = unreadIds.map(id => ({ user_id: user.id, notification_id: id }));
    
    const { error } = await supabase
      .from('notification_reads')
      .insert(inserts);
      
    if (error) {
      console.error('Error marking all as read:', error);
    }
  };
  
  const addNotification = async (notification: Omit<Notification, 'id' | 'created_at'>) => {
    if (!user) return;
    const { error } = await supabase
      .from('notifications')
      .insert(notification);
      
    if (error) {
      console.error('Error adding notification:', error);
    }
  };

  const deleteNotification = (id: string) => {
    const newDeleted = new Set(deletedIds).add(id);
    setDeletedIds(newDeleted);
    localStorage.setItem('attendo_deleted_notifs', JSON.stringify([...newDeleted]));
  };

  const clearAllNotifications = () => {
    const allIds = notifications.map(n => n.id);
    const newDeleted = new Set([...deletedIds, ...allIds]);
    setDeletedIds(newDeleted);
    localStorage.setItem('attendo_deleted_notifs', JSON.stringify([...newDeleted]));
  };

  const visibleNotifications = notifications.filter(n => !deletedIds.has(n.id));
  const unreadCount = visibleNotifications.filter(n => !n.is_read).length;

  return (
    <NotificationContext.Provider value={{ notifications: visibleNotifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications, addNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
