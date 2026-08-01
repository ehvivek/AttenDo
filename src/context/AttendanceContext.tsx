import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

export interface AttendanceRecord {
  id: string;
  courseCode: string;
  date: string;
  status: 'Present' | 'Absent';
  note?: string;
}

import { getCoursesForBatch } from '../utils/timetableData';

export interface Course {
  code: string;
  name: string;
  credits: number;
  type?: 'Theory' | 'Lab' | 'Tutorial';
}

interface AttendanceContextType {
  courses: Course[];
  records: AttendanceRecord[];
  addRecord: (record: Omit<AttendanceRecord, 'id'>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  updateRecord: (id: string, updatedRecord: Partial<AttendanceRecord>) => Promise<void>;
  loadingRecords: boolean;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const courses = user?.batch ? getCoursesForBatch(user.batch) : getCoursesForBatch('D1');

  useEffect(() => {
    if (user) {
      fetchRecords();
    } else {
      setRecords([]);
    }
  }, [user]);

  const fetchRecords = async () => {
    if (!user) return;
    setLoadingRecords(true);
    
    // Simulate slight network delay to allow skeleton to be visible
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', user.id);
      
    if (error) {
      console.error('Error fetching attendance:', error);
      return;
    }
    
    const formattedRecords: AttendanceRecord[] = data.map((row: any) => ({
      id: row.id,
      courseCode: row.course_code,
      date: row.date,
      status: row.status,
      note: row.note
    }));
    
    setRecords(formattedRecords);
    setLoadingRecords(false);
  };

  const addRecord = async (record: Omit<AttendanceRecord, 'id'>) => {
    if (!user) return;

    // Optimistic update
    const tempId = crypto.randomUUID();
    const newRecord = { ...record, id: tempId };
    setRecords(prev => [...prev, newRecord]);

    const { data, error } = await supabase
      .from('attendance')
      .insert({
        user_id: user.id,
        course_code: record.courseCode,
        date: record.date,
        status: record.status,
        note: record.note
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding record:', error);
      // Revert optimistic update on error
      setRecords(prev => prev.filter(r => r.id !== tempId));
    } else {
      // Update with real ID from DB
      setRecords(prev => prev.map(r => r.id === tempId ? {
        id: data.id,
        courseCode: data.course_code,
        date: data.date,
        status: data.status,
        note: data.note
      } : r));
    }
  };

  const deleteRecord = async (id: string) => {
    if (!user) return;

    // Optimistic update
    const previousRecords = [...records];
    setRecords(prev => prev.filter(r => r.id !== id));

    const { error } = await supabase
      .from('attendance')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting record:', error);
      // Revert on error
      setRecords(previousRecords);
    }
  };

  const updateRecord = async (id: string, updatedRecord: Partial<AttendanceRecord>) => {
    if (!user) return;

    // Optimistic update
    const previousRecords = [...records];
    setRecords(prev => prev.map(r => r.id === id ? { ...r, ...updatedRecord } : r));

    const updates: any = {};
    if (updatedRecord.courseCode) updates.course_code = updatedRecord.courseCode;
    if (updatedRecord.date) updates.date = updatedRecord.date;
    if (updatedRecord.status) updates.status = updatedRecord.status;
    if (updatedRecord.note !== undefined) updates.note = updatedRecord.note;

    const { error } = await supabase
      .from('attendance')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating record:', error);
      // Revert on error
      setRecords(previousRecords);
    }
  };

  return (
    <AttendanceContext.Provider 
      value={{ 
        courses, 
        records, 
        addRecord, 
        deleteRecord,
        updateRecord,
        loadingRecords
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (context === undefined) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
};
