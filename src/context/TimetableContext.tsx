import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { ClassSession } from '../utils/timetableData';
import { timetableData, futureTimetableData, SUBJECT_NAMES } from '../utils/timetableData';

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
    const tempId = `temp-${Date.now()}`;
    const optimisticOverride = { ...override, id: tempId } as TimetableOverride;
    
    // Optimistic Update
    setOverrides(prev => [...prev, optimisticOverride]);

    try {
      const { data, error } = await supabase
        .from('timetable_overrides')
        .insert([override])
        .select()
        .single();

      if (error) throw error;
      
      if (data) {
        // Replace temp with real DB record
        setOverrides(prev => prev.map(o => o.id === tempId ? (data as TimetableOverride) : o));

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
          // Fire and forget notification
          supabase.from('notifications').insert({
            title: notifTitle,
            message: notifMessage,
            link: 'timetable',
            target_batch: override.batch || 'All',
            type: 'class'
          }).then();
        }
      }
    } catch (err) {
      console.error('Error adding override:', err);
      // Revert on error
      setOverrides(prev => prev.filter(o => o.id !== tempId));
      throw err;
    }
  };

  const deleteOverride = async (id: string) => {
    const previousOverrides = [...overrides];
    
    // Optimistic Update
    setOverrides(prev => prev.filter(o => o.id !== id));

    try {
      const { error } = await supabase
        .from('timetable_overrides')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Error deleting override:', err);
      // Revert on error
      setOverrides(previousOverrides);
      throw err;
    }
  };

  const getClassesForDay = (targetDate: Date, batch: string) => {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayStr = daysOfWeek[targetDate.getDay()];
    
    // Switch to new timetable starting Aug 13, 2026
    const isFuture = targetDate.getTime() >= new Date('2026-08-13T00:00:00').getTime();
    const activeTimetable = isFuture ? futureTimetableData : timetableData;
    
    // 1. Get base classes
    const baseClasses = activeTimetable[batch as keyof typeof timetableData]?.[currentDayStr] || [];
    
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
            const resolvedType = override.new_type || c.type;
            const baseCode = (override.new_subject_code || c.subjectCode).replace('_TUT', '');
            const resolvedCode = resolvedType === 'Tutorial' ? `${baseCode}_TUT` : baseCode;
            const baseName = override.new_subject_code ? (SUBJECT_NAMES[baseCode] || baseCode) : c.subjectName.replace(' (Tutorial)', '');
            const resolvedName = resolvedType === 'Tutorial' && !baseName.includes('(Tutorial)') ? `${baseName} (Tutorial)` : baseName;

            return {
              ...c,
              subjectCode: resolvedCode,
              subjectName: resolvedName,
              type: resolvedType,
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
        const resolvedType = override.new_type!;
        const baseCode = override.new_subject_code!.replace('_TUT', '');
        const resolvedCode = resolvedType === 'Tutorial' ? `${baseCode}_TUT` : baseCode;
        const baseName = SUBJECT_NAMES[baseCode] || baseCode;
        const resolvedName = resolvedType === 'Tutorial' ? `${baseName} (Tutorial)` : baseName;

        finalClasses.push({
          id: `added-${override.id}`,
          subjectCode: resolvedCode,
          subjectName: resolvedName,
          type: resolvedType,
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
