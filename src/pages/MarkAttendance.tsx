import React, { useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { getLocalDateString } from '../utils/dateUtils';
import { playPopSound, playThudSound } from '../utils/audio';
import styles from './DashboardViews.module.css';

const MarkAttendance: React.FC = () => {
  const { records, courses, addRecord, updateRecord } = useAttendance();
  const [courseCode, setCourseCode] = useState(courses.length > 0 ? courses[0].code : '');
  const [date, setDate] = useState(getLocalDateString());
  const [status, setStatus] = useState<'Present' | 'Absent'>('Present');
  const [note, setNote] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const existingRecord = records.find(r => r.courseCode === courseCode && r.date === date);

  React.useEffect(() => {
    if (existingRecord) {
      setStatus(existingRecord.status);
      setNote(existingRecord.note || '');
    } else {
      setStatus('Present');
      setNote('');
    }
  }, [courseCode, date, records]); // This will safely re-evaluate if they change the dropdowns

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (status === 'Present') {
      playPopSound();
    } else {
      playThudSound();
    }

    if (existingRecord) {
      updateRecord(existingRecord.id, { status, note });
      setSuccessMsg('Attendance updated successfully!');
    } else {
      addRecord({
        courseCode,
        date,
        status,
        note
      });
      setSuccessMsg('Attendance marked successfully!');
      setNote('');
    }
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Mark Attendance</h1>
        <p className={styles.subtitle}>Record your attendance for today's classes.</p>
      </header>

      <div className={styles.formCard}>
        <form onSubmit={handleSubmit} className={styles.form}>
          
          <div className={styles.formGroup}>
            <label className={styles.label}>Course</label>
            <select 
              value={courseCode} 
              onChange={(e) => setCourseCode(e.target.value)}
              className={styles.select}
            >
              {courses.map(c => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={getLocalDateString()}
            required
          />

          <div className={styles.formGroup}>
            <label className={styles.label}>Status</label>
            <div className={styles.statusToggle}>
              <button 
                type="button"
                className={`${styles.toggleBtn} ${status === 'Present' ? styles.toggleActivePresent : ''}`}
                onClick={() => setStatus('Present')}
              >
                Present
              </button>
              <button 
                type="button"
                className={`${styles.toggleBtn} ${status === 'Absent' ? styles.toggleActiveAbsent : ''}`}
                onClick={() => setStatus('Absent')}
              >
                Absent
              </button>
            </div>
          </div>

          {status === 'Absent' && (
            <Input
              label="Note (Optional)"
              placeholder="e.g. Medical Leave, Traffic, etc."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          )}

          <Button type="submit" className={styles.submitBtn}>
            {existingRecord ? 'Update Attendance' : 'Save Attendance'}
          </Button>

          {successMsg && <div className={styles.successMessage}>{successMsg}</div>}
        </form>
      </div>
    </div>
  );
};

export default MarkAttendance;
