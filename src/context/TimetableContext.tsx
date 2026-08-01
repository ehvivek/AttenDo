import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { ClassSession } from '../utils/timetableData';
import { timetableData, SUBJECT_NAMES } from '../utils/timetableData';

export interface TimetableOverride {
  id: string;
  date: string; // YYYY-MM-DD
  batch: string;
  action: 'CANCEL' | 'REPLACE' | 'ADD';
  target_class_id?: string;
  new_subject_code?: string;
  new_type?: 'Theory' | 'Tutorial' | 'Lab';
  new_start_time?: string;
  new_end_time?: string;
  new_room?: string;
  new_teacher?: string;
}

interface TimetableContextType {
  overrides: TimetableOverride[];
  loadingOverrides: boolean;
  fetchOverrides: (date: string, batch: string) => Promise<void>;
  addOverride: (override: Omit<TimetableOverride, 'id' | 'created_at'>) => Promise<void>;
  deleteOverride: (id: string) => Promise<void>;
  getClassesForDay: (date: Date, batch: string) => (ClassSession & { isCancelled?: boolean, isReplaced?: boolean, isAdded?: boolean, overrideId?: string })[];
}

const TimetableContext = createContext<TimetableContextType | undefined>(undefined);

export const TimetableProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [overrides, setOverrides] = useState<TimetableOverride[]>([]);
  const [loadingOverrides, setLoadingOverrides] = useState(false);

  useEffect(() => {
    const channel = supabase.channel('timetable_overrides_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'timetable_overrides' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOverrides(prev => {
              if (prev.some(o => o.id === payload.new.id)) return prev;
              return [...prev, payload.new as TimetableOverride];
            });
          } else if (payload.eventType === 'DELETE') {
            setOverrides(prev => prev.filter(o => o.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setOverrides(prev => prev.map(o => o.id === payload.new.id ? payload.new as TimetableOverride : o));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOverrides = async (dateStr: string, batch: string) => {
    setLoadingOverrides(true);
    try {
      const { data, error } = await supabase
        .from('timetable_overrides')
        .select('*')
        .eq('date', dateStr)
        .eq('batch', batch);

      if (error) {
        console.error('Error fetching overrides:', error);
      } else if (data) {
        setOverrides(data as TimetableOverride[]);
      }
    } catch (err) {
      console.error('Unexpected error fetching overrides:', err);
    } finally {
      setLoadingOverrides(false);
    }
  };

  const addOverride = async (override: Omit<TimetableOverride, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('timetable_overrides')
        .insert([override])
        .select()
        .single();

      if (error) throw error;
      
      if (data) {
        setOverrides(prev => [...prev, data as TimetableOverride]);

        let notifTitle = '';
        let notifMessage = '';
        
        if (override.action === 'ADD') {
          notifTitle = 'Extra Class Added';
          notifMessage = `${override.new_subject_code} scheduled on ${override.date}`;
        } else if (override.action === 'CANCEL') {
          notifTitle = 'Class Cancelled';
          notifMessage = `A class was cancelled on ${override.date}`;
        } else if (override.action === 'REPLACE') {
          notifTitle = 'Class Updated';
          notifMessage = `Schedule updated to ${override.new_subject_code} on ${override.date}`;
        }
        
        if (notifTitle) {
          await supabase.from('notifications').insert({
            title: notifTitle,
            message: notifMessage,
            link: 'timetable',
            target_batch: override.batch || 'All',
            type: 'class'
          });
        }
      }
    } catch (err) {
      console.error('Error adding override:', err);
      throw err;
    }
  };

  const deleteOverride = async (id: string) => {
    try {
      const { error } = await supabase
        .from('timetable_overrides')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setOverrides(prev => prev.filter(o => o.id !== id));
    } catch (err) {
      console.error('Error deleting override:', err);
      throw err;
    }
  };

  const getClassesForDay = (targetDate: Date, batch: string) => {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayStr = daysOfWeek[targetDate.getDay()];
    
    // 1. Get base classes
    const baseClasses = timetableData[batch as keyof typeof timetableData]?.[currentDayStr] || [];
    
    // 2. Clone to avoid mutating original
    let finalClasses: (ClassSession & { isCancelled?: boolean, isReplaced?: boolean, isAdded?: boolean, overrideId?: string })[] = [...baseClasses].map(c => ({ ...c }));
    
    // 3. Apply overrides (CANCEL, REPLACE, ADD)
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    const targetDateStr = `${year}-${month}-${day}`;
    
    const todaysOverrides = overrides.filter(o => 
      o.date === targetDateStr && 
      (o.batch === batch || (o.batch === 'D' && batch.startsWith('D')))
    );

    todaysOverrides.forEach(override => {
      if (override.action === 'CANCEL') {
        finalClasses = finalClasses.map(c => {
          if (c.id === override.target_class_id) {
            return { ...c, isCancelled: true, overrideId: override.id };
          }
          return c;
        });
      } else if (override.action === 'REPLACE') {
        finalClasses = finalClasses.map(c => {
          if (c.id === override.target_class_id) {
            return {
              ...c,
              subjectCode: override.new_subject_code || c.subjectCode,
              subjectName: override.new_subject_code ? SUBJECT_NAMES[override.new_subject_code] || override.new_subject_code : c.subjectName,
              type: override.new_type || c.type,
              startTime: override.new_start_time || c.startTime,
              endTime: override.new_end_time || c.endTime,
              room: override.new_room !== undefined ? override.new_room : c.room,
              teacher: override.new_teacher !== undefined ? override.new_teacher : c.teacher,
              isReplaced: true,
              overrideId: override.id
            };
          }
          return c;
        });
      } else if (override.action === 'ADD') {
        finalClasses.push({
          id: `added-${override.id}`,
          subjectCode: override.new_subject_code!,
          subjectName: SUBJECT_NAMES[override.new_subject_code!] || override.new_subject_code!,
          type: override.new_type!,
          startTime: override.new_start_time!,
          endTime: override.new_end_time!,
          room: override.new_room,
          teacher: override.new_teacher,
          isAdded: true,
          overrideId: override.id
        });
      }
    });

    // Sort by start time
    return finalClasses.sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  return (
    <TimetableContext.Provider value={{
      overrides,
      loadingOverrides,
      fetchOverrides,
      addOverride,
      deleteOverride,
      getClassesForDay
    }}>
      {children}
    </TimetableContext.Provider>
  );
};

export const useTimetable = () => {
  const context = useContext(TimetableContext);
  if (context === undefined) {
    throw new Error('useTimetable must be used within a TimetableProvider');
  }
  return context;
};
