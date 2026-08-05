import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLocalDateString } from '../utils/dateUtils';
import { useTimetable } from '../context/TimetableContext';
import { playPopSound, playThudSound } from '../utils/audio';
import { SUBJECT_NAMES } from '../utils/timetableData';
import type { ClassSession } from '../utils/timetableData';
import { useAttendance } from '../context/AttendanceContext';
import styles from './DashboardViews.module.css';
import { Clock, MapPin, BookOpen, FlaskConical, ChevronLeft, ChevronRight, User, Check, X, RotateCcw, Trash2, Edit2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player } from '@lottiefiles/react-lottie-player';

const Timetable: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { records, addRecord, deleteRecord } = useAttendance();
  const { getClassesForDay, fetchOverrides, addOverride, deleteOverride } = useTimetable();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dayOffset, setDayOffset] = useState(0);
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null);
  const [modalData, setModalData] = useState({ subjectCode: 'MA222', type: 'Theory', startTime: '10:00', endTime: '11:00', room: 'AB2 LR6', teacher: '' });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const targetDate = new Date(currentTime);
  targetDate.setDate(targetDate.getDate() + dayOffset);
  
  const batch = user?.batch || 'D1';

  useEffect(() => {
    fetchOverrides(getLocalDateString(targetDate), batch);
  }, [dayOffset, batch]);
  
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDayStr = daysOfWeek[targetDate.getDay()];
  
  // Rolling 28-day window (14 days back, today, 14 days forward)
  // This automatically shifts as the days pass
  const minOffset = -14;
  const maxOffset = 14;
  
  const todaysClasses = getClassesForDay(targetDate, batch);

  const subjectClassCounts = todaysClasses.reduce((acc, curr) => {
    if (!curr.isCancelled) {
      const key = `${curr.subjectCode}-${curr.type}`;
      acc[key] = (acc[key] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  const subjectSessionIndices: Record<string, number> = {};

  const timeToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  const getStatus = (session: ClassSession) => {
    if (dayOffset < 0) return 'Ended';
    if (dayOffset > 0) return 'Upcoming';

    const startMins = timeToMinutes(session.startTime);
    const endMins = timeToMinutes(session.endTime);
    
    if (currentMinutes >= startMins && currentMinutes < endMins) return 'Live';
    if (currentMinutes >= endMins) return 'Ended';
    return 'Upcoming';
  };

  const formatTime = (time24: string) => {
    const [hours, minutes] = time24.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${minutes} ${ampm}`;
  };

  const getIcon = (type: string, subjectCode: string) => {
    const isMA123 = subjectCode === 'MA123';
    
    if (type === 'Lab') return <FlaskConical size={18} className={styles.iconPurple} style={{ flexShrink: 0 }} />;
    if (type === 'Tutorial') {
      return (
        <div 
          className={isMA123 ? styles.iconRed : styles.iconGreen} 
          style={{ 
            width: 24, 
            height: 24, 
            flexShrink: 0,
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '14px', 
            fontWeight: 'bold',
            backgroundColor: isMA123 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            borderRadius: '8px'
          }}
        >
          T
        </div>
      );
    }
    return <BookOpen size={18} className={isMA123 ? styles.iconRed : styles.iconBlue} style={{ flexShrink: 0 }} />;
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>Timetable</h1>
            
            <div className={styles.dateNavigation}>
              <button 
                onClick={() => setDayOffset(prev => prev - 1)} 
                className={styles.dateBtn}
                disabled={dayOffset <= minOffset}
                style={{ opacity: dayOffset <= minOffset ? 0.3 : 1, cursor: dayOffset <= minOffset ? 'not-allowed' : 'pointer' }}
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className={styles.dateDisplay}>
                <span className={styles.relativeDay}>
                  {dayOffset === 0 ? 'Today' : dayOffset === -1 ? 'Yesterday' : dayOffset === 1 ? 'Tomorrow' : currentDayStr}
                </span>
                <span className={styles.fullDate}>
                  {targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} • Batch {batch}
                </span>
              </div>
              
              <button 
                onClick={() => setDayOffset(prev => prev + 1)} 
                className={styles.dateBtn}
                disabled={dayOffset >= maxOffset}
                style={{ opacity: dayOffset >= maxOffset ? 0.3 : 1, cursor: dayOffset >= maxOffset ? 'not-allowed' : 'pointer' }}
              >
                <ChevronRight size={20} />
              </button>
            </div>
            {isAdmin && (
              <button 
                onClick={() => {
                  setModalData({ subjectCode: 'MA222', type: 'Theory', startTime: '09:00', endTime: '10:00', room: 'AB2 LR6', teacher: '' });
                  setShowAddModal(true);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 0.75rem', backgroundColor: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', marginTop: '0.5rem' }}
              >
                <Plus size={16} /> Add Class
              </button>
            )}
          </div>
          <div className={styles.clockWidget}>
            <Clock size={16} />
            <span>
              {currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </span>
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={dayOffset}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          style={{ width: '100%' }}
        >
          {todaysClasses.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIllustration} style={{ margin: '0 auto 2rem auto', display: 'flex', justifyContent: 'center' }}>
                {currentDayStr === 'Saturday' ? (
                  <img src="/rest-day-nobg.png" alt="Rest Day" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <Player
                    autoplay
                    loop
                    src="/sleeping-cat.json"
                    style={{ height: '250px', width: '250px' }}
                  />
                )}
              </div>
              <h3>No classes today!</h3>
              <p>Enjoy your free time.</p>
            </div>
          ) : (
            <div className={styles.timeline}>
              {todaysClasses.map((session, index) => {
                const status = getStatus(session);
                const targetDateStr = getLocalDateString(targetDate);
                
                // For legacy records without startTime, we might still match multiple, but going forward it will be precise.
                const existingRecord = records.find(r => 
                  r.courseCode === session.subjectCode && 
                  r.date === targetDateStr &&
                  (r.startTime === session.startTime || !r.startTime)
                );

                const key = `${session.subjectCode}-${session.type}`;
                const isMultiple = subjectClassCounts[key] > 1 && !session.isCancelled;
                let sessionTag = null;
                if (isMultiple) {
                  subjectSessionIndices[key] = (subjectSessionIndices[key] || 0) + 1;
                  sessionTag = (
                    <motion.span 
                      animate={{ opacity: [0.7, 1, 0.7], scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      style={{ 
                        color: '#F59E0B', 
                        textShadow: '0 0 8px rgba(245, 158, 11, 0.4)',
                        fontWeight: 700,
                        fontSize: '0.65rem',
                        marginLeft: '0.4rem',
                        padding: '0.1rem 0.4rem',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        borderRadius: '12px',
                        display: 'inline-block',
                        verticalAlign: 'middle',
                        whiteSpace: 'nowrap',
                        lineHeight: 1
                      }}
                    >
                      Session {subjectSessionIndices[key]}
                    </motion.span>
                  );
                }

                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={`${styles.timelineItem} ${styles['status' + status]}`}
                  >
                    <div className={styles.timelineTime}>
                      <span className={styles.startTime}>{formatTime(session.startTime)}</span>
                      <span className={styles.endTime}>{formatTime(session.endTime)}</span>
                    </div>
                    <div className={styles.timelineLine}>
                      <div className={styles.timelineDot} />
                    </div>
                    <div className={`${styles.timelineContent} ${session.type === 'Tutorial' ? (session.subjectCode === 'MA123' ? styles.cornerHighlightRed : styles.cornerHighlightGreen) : ''}`}>
                      <div className={styles.classHeader}>
                        <div className={styles.classTitleGroup}>
                          {getIcon(session.type, session.subjectCode)}
                          <h3 className={styles.subjectName} style={{ textDecoration: session.isCancelled ? 'line-through' : 'none', opacity: session.isCancelled ? 0.5 : 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                            {session.subjectName}
                            {sessionTag}
                            {session.subjectCode === 'CH224L' && session.type === 'Lab' && ['Monday', 'Thursday', 'Friday'].includes(currentDayStr) && (
                              <span style={{ 
                                marginLeft: '8px',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                backgroundColor: 'rgba(139, 92, 246, 0.15)',
                                color: '#8b5cf6',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                border: '1px solid rgba(139, 92, 246, 0.3)'
                              }}>
                                {currentDayStr === 'Monday' ? 'B1' : currentDayStr === 'Thursday' ? 'B2' : currentDayStr === 'Friday' ? 'B3' : ''}
                              </span>
                            )}
                          </h3>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span className={`${styles.statusBadge} ${styles['badge' + status]}`} style={session.isCancelled ? { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)' } : {}}>
                            {session.isCancelled ? 'CANCELLED' : status === 'Live' ? 'Live Now' : status}
                          </span>
                          {isAdmin && !session.isCancelled && (
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button className={styles.iconBtn} onClick={async () => {
                                try {
                                  if (session.isAdded && session.overrideId) {
                                    await deleteOverride(session.overrideId);
                                  } else {
                                    const override = {
                                      date: targetDateStr,
                                      batch,
                                      action: 'CANCEL' as const,
                                      target_class_id: session.id
                                    };
                                    await addOverride(override);
                                  }
                                } catch (e) {
                                  alert('Failed to delete/cancel class!');
                                }
                              }} title={session.isAdded ? "Remove Added Class" : "Cancel Class"}>
                                <Trash2 size={16} color={session.isAdded ? "#ec4899" : "var(--danger-color)"} />
                              </button>
                              <button className={styles.iconBtn} onClick={() => {
                                setSelectedSession(session);
                                setModalData({
                                  subjectCode: session.subjectCode,
                                  type: session.type,
                                  startTime: session.startTime,
                                  endTime: session.endTime,
                                  room: session.room || '',
                                  teacher: session.teacher || ''
                                });
                                setShowReplaceModal(true);
                              }} title="Replace Class">
                                <Edit2 size={16} color="var(--accent-color)" />
                              </button>
                            </div>
                          )}
                          {isAdmin && session.isCancelled && session.overrideId && (
                            <button className={styles.iconBtn} onClick={async () => {
                              try {
                                await deleteOverride(session.overrideId!);
                              } catch (e) {
                                alert('Failed to restore! Make sure RLS is disabled.');
                              }
                            }} title="Restore Class">
                              <RotateCcw size={16} color="var(--text-secondary)" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className={styles.classDetails}>
                        <span className={styles.subjectCode}>{session.subjectCode} • {session.type}</span>
                        {session.room && (
                          <span className={styles.room}>
                            <MapPin size={14} /> {session.room}
                          </span>
                        )}
                        {session.teacher && (
                          <span className={styles.room}>
                            <User size={14} /> {session.teacher}
                          </span>
                        )}
                      </div>
                      
                      {status === 'Ended' && !existingRecord && !session.isCancelled && (
                        <div className={styles.actionButtons}>
                          <button 
                            className={`${styles.actionBtn} ${styles.actionBtnPresent}`}
                            onClick={() => {
                              playPopSound();
                              addRecord({
                                courseCode: session.subjectCode,
                                date: targetDateStr,
                                startTime: session.startTime,
                                status: 'Present'
                              });
                            }}
                          >
                            <Check size={14} /> Attended
                          </button>
                          <button 
                            className={`${styles.actionBtn} ${styles.actionBtnAbsent}`}
                            onClick={() => {
                              playThudSound();
                              addRecord({
                                courseCode: session.subjectCode,
                                date: targetDateStr,
                                startTime: session.startTime,
                                status: 'Absent'
                              });
                            }}
                          >
                            <X size={14} /> Missed
                          </button>
                        </div>
                      )}

                      {existingRecord && (
                        <div className={styles.loggedBadgeWrapper}>
                          <div className={styles.loggedBadge} style={{ color: existingRecord.status === 'Present' ? 'var(--success-color)' : 'var(--danger-color)' }}>
                            {existingRecord.status === 'Present' ? <Check size={14} /> : <X size={14} />} 
                            Logged as {existingRecord.status}
                          </div>
                          <button 
                            className={styles.undoBtn}
                            onClick={() => deleteRecord(existingRecord.id)}
                            title="Undo"
                          >
                            <RotateCcw size={14} /> Undo
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Admin Modals */}
      {(showAddModal || showReplaceModal) && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-color)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0 }}>{showAddModal ? 'Add Extra Class' : 'Replace Class'}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Subject</label>
              <select 
                value={modalData.subjectCode} 
                onChange={e => setModalData({...modalData, subjectCode: e.target.value})}
                style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
              >
                {Object.keys(SUBJECT_NAMES).map(code => (
                  <option key={code} value={code}>{code} - {SUBJECT_NAMES[code]}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Type</label>
              <select 
                value={modalData.type} 
                onChange={e => setModalData({...modalData, type: e.target.value as any})}
                style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
              >
                <option value="Theory">Theory</option>
                <option value="Tutorial">Tutorial</option>
                <option value="Lab">Lab</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Start Time</label>
                <input type="time" value={modalData.startTime} onChange={e => setModalData({...modalData, startTime: e.target.value})} style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>End Time</label>
                <input type="time" value={modalData.endTime} onChange={e => setModalData({...modalData, endTime: e.target.value})} style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Room <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(Optional)</span></label>
              <input type="text" value={modalData.room} onChange={e => setModalData({...modalData, room: e.target.value})} style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Teacher <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(Optional)</span></label>
              <input type="text" value={modalData.teacher} onChange={e => setModalData({...modalData, teacher: e.target.value})} style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button 
                onClick={() => { setShowAddModal(false); setShowReplaceModal(false); }}
                style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: 'none', backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  try {
                    const targetDateStr = getLocalDateString(targetDate);
                    if (showAddModal) {
                      await addOverride({
                        date: targetDateStr,
                        batch,
                        action: 'ADD',
                        new_subject_code: modalData.subjectCode,
                        new_type: modalData.type as any,
                        new_start_time: modalData.startTime,
                        new_end_time: modalData.endTime,
                        new_room: modalData.room,
                        new_teacher: modalData.teacher
                      });
                    } else if (showReplaceModal && selectedSession) {
                      await addOverride({
                        date: targetDateStr,
                        batch,
                        action: 'REPLACE',
                        target_class_id: selectedSession.id,
                        new_subject_code: modalData.subjectCode,
                        new_type: modalData.type as any,
                        new_start_time: modalData.startTime,
                        new_end_time: modalData.endTime,
                        new_room: modalData.room,
                        new_teacher: modalData.teacher
                      });
                    }
                    setShowAddModal(false);
                    setShowReplaceModal(false);
                  } catch (e) {
                    alert('Failed to save! Make sure the timetable_overrides table exists in Supabase and RLS is disabled (or a policy allows inserts).');
                  }
                }}
                style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: 'none', backgroundColor: 'var(--accent-color)', color: 'white', cursor: 'pointer', fontWeight: 600 }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timetable;
