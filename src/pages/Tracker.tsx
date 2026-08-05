import React, { useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { useAuth } from '../context/AuthContext';
import styles from './DashboardViews.module.css';
import { Trash2, Search, Download, FileText } from 'lucide-react';
import ExcelJS from 'exceljs';
import { generateReportCardPDF } from '../utils/pdfReport';
import { downloadFile } from '../utils/nativeDownload';
import { formatTime12Hour } from '../utils/dateUtils';
import { ConfirmModal } from '../components/ConfirmModal';

const Tracker: React.FC = () => {
  const { records, courses, deleteRecord } = useAttendance();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

  // Sort by date descending
  const sortedRecords = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredRecords = sortedRecords.filter(r => {
    const matchesSearch = r.note?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.date.includes(searchTerm) ||
                        courses.find(c => c.code === r.courseCode)?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCourse = filterCourse === 'All' || r.courseCode === filterCourse;
    const matchesStatus = filterStatus === 'All' || r.status === filterStatus;
    
    return matchesSearch && matchesCourse && matchesStatus;
  });

  const downloadExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    
    // Helper to style the status column
    const styleStatusColumn = (worksheet: ExcelJS.Worksheet, statusColIndex: number) => {
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        const statusCell = row.getCell(statusColIndex);
        if (statusCell.value === 'Present') {
          statusCell.font = { color: { argb: 'FF10B981' }, bold: true }; // Green
        } else if (statusCell.value === 'Absent') {
          statusCell.font = { color: { argb: 'FFEF4444' }, bold: true }; // Red
        }
      });
    };

    const wsOverall = workbook.addWorksheet('Overall');
    wsOverall.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Time', key: 'time', width: 10 },
      { header: 'Subject Code', key: 'code', width: 15 },
      { header: 'Subject Name', key: 'name', width: 45 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Note', key: 'note', width: 40 }
    ];

    // Make header bold
    wsOverall.getRow(1).font = { bold: true };

    filteredRecords.forEach(record => {
      wsOverall.addRow({
        date: new Date(record.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
        time: formatTime12Hour(record.startTime),
        code: record.courseCode,
        name: courses.find(c => c.code === record.courseCode)?.name || record.courseCode,
        status: record.status,
        note: record.note || ''
      });
    });

    styleStatusColumn(wsOverall, 5);

    // 2. Create separate sheets for each subject
    const subjects = Array.from(new Set(filteredRecords.map(r => r.courseCode)));
    
    subjects.forEach(subjectCode => {
      let safeSheetName = subjectCode.substring(0, 31).replace(/[\[\]\*\?\:\/\\]/g, '');
      const wsSubject = workbook.addWorksheet(safeSheetName);
      
      wsSubject.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Time', key: 'time', width: 10 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Note', key: 'note', width: 40 }
      ];
      
      wsSubject.getRow(1).font = { bold: true };

      const subjectRecords = filteredRecords.filter(r => r.courseCode === subjectCode);
      subjectRecords.forEach(record => {
        wsSubject.addRow({
          date: new Date(record.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
          time: formatTime12Hour(record.startTime),
          status: record.status,
          note: record.note || ''
        });
      });
      
      styleStatusColumn(wsSubject, 3);
    });

    // 3. Generate and download file
    const excelBuffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const { getLocalDateString } = await import('../utils/dateUtils');
    const fileName = `AttenDo_Report_${getLocalDateString()}.xlsx`;
    await downloadFile(blob, fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Attendance Tracker</h1>
        <p className={styles.subtitle}>View, filter, and manage your attendance history.</p>
      </header>

      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search by date, note, or subject..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        
        <div className={styles.filterActions}>
          <select 
            value={filterCourse} 
            onChange={(e) => setFilterCourse(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="All">All Subjects</option>
            {courses.map(c => (
              <option key={c.code} value={c.code}>{c.code}</option>
            ))}
          </select>

          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="All">All Statuses</option>
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
          </select>
          
          <button className={styles.exportBtn} onClick={downloadExcel}>
            <Download size={16} /> Export Excel
          </button>
          <button 
            className={styles.exportBtn} 
            onClick={async () => await generateReportCardPDF(records, {
              name: user?.fullName || 'Student',
              rollNumber: user?.rollNumber || '',
              batch: user?.batch || 'D1'
            }, courses)}
            style={{ background: 'var(--accent-color)', color: 'var(--accent-text)' }}
          >
            <FileText size={16} /> PDF Report
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        {filteredRecords.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Note</th>
                <th className={styles.actionsCol}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map(record => {
                const courseName = courses.find(c => c.code === record.courseCode)?.name || record.courseCode;
                return (
                  <tr key={record.id}>
                    <td>{new Date(record.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{formatTime12Hour(record.startTime)}</td>
                    <td>
                      <div className={styles.tableSubject}>
                        <span className={styles.tableCourseName}>{courseName}</span>
                        <span className={styles.tableCourseCode}>{record.courseCode}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${record.status === 'Present' ? styles.badgePresent : styles.badgeAbsent}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className={styles.noteCell}>{record.note || '-'}</td>
                    <td className={styles.actionsCol}>
                      <button 
                        onClick={() => setRecordToDelete(record.id)}
                        className={styles.deleteBtn}
                        title="Delete record"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className={styles.emptyState}>
            <p>No attendance records found.</p>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!recordToDelete}
        title="Delete Attendance Record"
        message="Are you sure you want to delete this attendance record? This action cannot be undone."
        confirmText="Delete"
        onConfirm={() => {
          if (recordToDelete) {
            deleteRecord(recordToDelete);
            setRecordToDelete(null);
          }
        }}
        onCancel={() => setRecordToDelete(null)}
      />
    </div>
  );
};

export default Tracker;
