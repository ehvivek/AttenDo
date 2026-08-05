import React, { useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { useAuth } from '../context/AuthContext';
import styles from './DashboardViews.module.css';
import { CheckCircle, XCircle, BookOpen, Percent, ArrowLeft } from 'lucide-react';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { Skeleton } from '../components/Skeleton';

const Overview: React.FC = () => {
  const { records, courses, loadingRecords } = useAttendance();
  const { user } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  // Dynamic greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    const firstName = user?.fullName?.split(' ')[0] || 'there';
    if (hour >= 5 && hour < 12) return `Good morning, ${firstName} 🌅`;
    if (hour >= 12 && hour < 17) return `Good afternoon, ${firstName} ☀️`;
    return `Good evening, ${firstName} 🌙`;
  };

  const todayDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const displayRecords = selectedSubject 
    ? records.filter(r => r.courseCode === selectedSubject)
    : records;

  const totalClasses = displayRecords.length;
  const totalPresent = displayRecords.filter(r => r.status === 'Present').length;
  const totalAbsent = displayRecords.filter(r => r.status === 'Absent').length;
  const percentage = totalClasses === 0 ? 0 : Math.round((totalPresent / totalClasses) * 100);

  const selectedCourseName = selectedSubject ? courses.find(c => c.code === selectedSubject)?.name || selectedSubject : 'Overall';

  const stats = [
    { label: `${selectedCourseName} Attendance`, value: percentage, suffix: '%', icon: <Percent className={styles.iconBlue} /> },
    { label: 'Total Classes', value: totalClasses, suffix: '', icon: <BookOpen className={styles.iconPurple} /> },
    { label: 'Total Present', value: totalPresent, suffix: '', icon: <CheckCircle className={styles.iconGreen} /> },
    { label: 'Total Absent', value: totalAbsent, suffix: '', icon: <XCircle className={styles.iconRed} /> },
  ];

  const getSubjectStats = (courseCode: string) => {
    const courseRecords = records.filter(r => r.courseCode === courseCode);
    const present = courseRecords.filter(r => r.status === 'Present').length;
    const total = courseRecords.length;
    const percentage = total === 0 ? 0 : Math.round((present / total) * 100);
    return { present, total, percentage };
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.title}>{selectedSubject ? 'Subject Details' : getGreeting()}</h1>
            <p className={styles.subtitle}>
              {selectedSubject 
                ? `Viewing attendance for ${courses.find(c => c.code === selectedSubject)?.name || selectedSubject}` 
                : todayDate}
            </p>
          </div>
          {selectedSubject && (
            <button className={styles.backBtn} onClick={() => setSelectedSubject(null)}>
              <ArrowLeft size={16} /> View Overall
            </button>
          )}
        </div>
      </header>

      <div className={styles.statsGrid}>
        {loadingRecords ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className={styles.statCard} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Skeleton width="60%" height="1rem" />
                <Skeleton width="32px" height="32px" borderRadius="var(--radius-full)" />
              </div>
              <Skeleton width="40%" height="2rem" />
            </div>
          ))
        ) : (
          stats.map((stat, idx) => (
            <div key={idx} className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>{stat.label}</span>
                <div className={styles.iconWrapper}>{stat.icon}</div>
              </div>
              <div className={styles.statValue}>
                <AnimatedNumber value={stat.value} />{stat.suffix}
              </div>
            </div>
          ))
        )}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Subject wise Attendance</h2>
        <div className={styles.subjectsList}>
          {loadingRecords ? (
            Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className={styles.subjectCard} style={{ pointerEvents: 'none' }}>
                <div className={styles.subjectInfo} style={{ gap: '0.5rem' }}>
                  <Skeleton width="80%" height="1.2rem" />
                  <Skeleton width="40px" height="1rem" borderRadius="var(--radius-full)" />
                </div>
                <div className={styles.subjectStats} style={{ marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <Skeleton width="60px" height="0.8rem" />
                    <Skeleton width="30px" height="0.8rem" />
                  </div>
                  <Skeleton width="100%" height="8px" borderRadius="var(--radius-full)" />
                </div>
              </div>
            ))
          ) : (
            courses.map(course => {
              const { present, total, percentage } = getSubjectStats(course.code);
              const isSelected = selectedSubject === course.code;
              return (
                <div 
                  key={course.code} 
                  className={`${styles.subjectCard} ${isSelected ? styles.subjectCardSelected : ''}`}
                  onClick={() => setSelectedSubject(course.code)}
                >
                  <div className={styles.subjectInfo}>
                    <h3 className={styles.subjectName}>{course.name}</h3>
                    <span className={`${styles.subjectCode} ${course.type === 'Lab' ? styles.subjectCodeLab : ''}`}>{course.code}</span>
                  </div>
                  <div className={styles.subjectStats}>
                    <div className={styles.progressContainer}>
                      <div className={styles.progressHeader}>
                        <span className={styles.progressText}>{present} / {total} Classes</span>
                        <span className={`${styles.progressPercent} ${percentage < 75 && total > 0 ? styles.textRed : ''}`}>
                          <AnimatedNumber value={percentage} />%
                        </span>
                      </div>
                      <div className={styles.progressBar}>
                        <div 
                          className={`${styles.progressFill} ${percentage < 75 && total > 0 ? styles.bgRed : ''}`} 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Overview;
