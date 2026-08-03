import jsPDF from 'jspdf';
import { downloadFile } from './nativeDownload';
import type { AttendanceRecord, Course } from '../context/AttendanceContext';

interface UserInfo {
  name: string;
  rollNumber: string;
  batch: string;
}

export const generateReportCardPDF = async (records: AttendanceRecord[], user: UserInfo, courses: Course[]) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const primaryColor: [number, number, number] = [15, 23, 42];
  const accentColor: [number, number, number] = [59, 130, 246];
  const successColor: [number, number, number] = [16, 185, 129];
  const dangerColor: [number, number, number] = [239, 68, 68];
  const mutedColor: [number, number, number] = [148, 163, 184];
  const lightBg: [number, number, number] = [248, 250, 252];

  // ── Load Logo ──
  let logoBase64: string | null = null;
  try {
    const response = await fetch('/logovg.png');
    const blob = await response.blob();
    logoBase64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    // Logo won't be shown if fetch fails
  }

  // ── Centered Watermark (behind everything) ──
  doc.saveGraphicsState();
  doc.setTextColor(245, 245, 245);
  doc.setFontSize(72);
  doc.setFont('helvetica', 'bold');
  const wmText = 'AttenDo';
  const wmWidth = doc.getTextWidth(wmText);
  doc.text(wmText, (pageWidth - wmWidth) / 2, pageHeight / 2, { angle: 0 });
  doc.restoreGraphicsState();

  // ── Header Band ──
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Accent stripe below header
  doc.setFillColor(...accentColor);
  doc.rect(0, 40, pageWidth, 2.5, 'F');

  // Fox Logo
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin + 2, 8, 24, 24);
  }

  // App name next to logo
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('AttenDo', margin + 30, 19);

  // Tagline
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 200, 230);
  doc.text('Attendance Report Card', margin + 30, 27);

  // Date on right side
  doc.setFontSize(9);
  doc.setTextColor(180, 200, 230);
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  doc.text(`Generated: ${dateStr}`, pageWidth - margin, 24, { align: 'right' });

  // ── Student Info Card ──
  let y = 52;
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'S');

  const col1X = margin + 8;
  const col2X = margin + contentWidth * 0.38;
  const col3X = margin + contentWidth * 0.72;

  doc.setTextColor(...mutedColor);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('STUDENT NAME', col1X, y + 8);
  doc.text('ROLL NUMBER', col2X, y + 8);
  doc.text('BATCH', col3X, y + 8);

  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(user.name, col1X, y + 17);
  doc.text(user.rollNumber, col2X, y + 17);
  doc.text(`Batch ${user.batch}`, col3X, y + 17);

  // ── Overall Summary ──
  y = 86;
  doc.setTextColor(...primaryColor);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Overall Summary', margin, y);
  y += 6;

  const totalClasses = records.length;
  const totalPresent = records.filter(r => r.status === 'Present').length;
  const totalAbsent = totalClasses - totalPresent;
  const overallPct = totalClasses === 0 ? 0 : Math.round((totalPresent / totalClasses) * 100);

  const boxWidth = (contentWidth - 9) / 4;
  const boxHeight = 20;
  const summaryData = [
    { label: 'Overall', value: `${overallPct}%`, color: overallPct >= 75 ? successColor : dangerColor },
    { label: 'Total Classes', value: `${totalClasses}`, color: accentColor },
    { label: 'Present', value: `${totalPresent}`, color: successColor },
    { label: 'Absent', value: `${totalAbsent}`, color: dangerColor },
  ];

  summaryData.forEach((item, idx) => {
    const x = margin + idx * (boxWidth + 3);

    // Box background
    doc.setFillColor(...lightBg);
    doc.roundedRect(x, y, boxWidth, boxHeight, 2, 2, 'F');

    // Top accent bar
    doc.setFillColor(...item.color);
    doc.roundedRect(x, y, boxWidth, 2, 2, 2, 'F');
    doc.rect(x, y + 1, boxWidth, 1, 'F'); // fill the bottom corners of the accent

    // Value
    doc.setTextColor(...item.color);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(item.value, x + boxWidth / 2, y + 12, { align: 'center' });

    // Label
    doc.setTextColor(...mutedColor);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(item.label, x + boxWidth / 2, y + 18, { align: 'center' });
  });

  // ── Subject-wise Table ──
  y += boxHeight + 10;
  doc.setTextColor(...primaryColor);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Subject-wise Breakdown', margin, y);
  y += 6;

  // Table header
  doc.setFillColor(...primaryColor);
  doc.roundedRect(margin, y, contentWidth, 9, 1.5, 1.5, 'F');

  const colSubject = margin + 4;
  const colCode = margin + contentWidth * 0.50;
  const colPresent = margin + contentWidth * 0.62;
  const colAbsent = margin + contentWidth * 0.74;
  const colTotal = margin + contentWidth * 0.84;
  const colPct = margin + contentWidth * 0.94;

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('SUBJECT', colSubject, y + 6);
  doc.text('CODE', colCode, y + 6);
  doc.text('PRESENT', colPresent, y + 6, { align: 'center' });
  doc.text('ABSENT', colAbsent, y + 6, { align: 'center' });
  doc.text('TOTAL', colTotal, y + 6, { align: 'center' });
  doc.text('%', colPct, y + 6, { align: 'center' });
  y += 11;

  // Table rows
  courses.forEach((course, idx) => {
    const courseRecords = records.filter(r => r.courseCode === course.code);
    const present = courseRecords.filter(r => r.status === 'Present').length;
    const total = courseRecords.length;
    const absent = total - present;
    const pct = total === 0 ? 0 : Math.round((present / total) * 100);

    // Zebra
    if (idx % 2 === 0) {
      doc.setFillColor(...lightBg);
      doc.rect(margin, y - 4, contentWidth, 10, 'F');
    }

    // Subject name (truncate if too long)
    doc.setTextColor(...primaryColor);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    const maxNameLen = 42;
    const displayName = course.name.length > maxNameLen
      ? course.name.substring(0, maxNameLen) + '...'
      : course.name;
    doc.text(displayName, colSubject, y + 2);

    // Code
    doc.setTextColor(...mutedColor);
    doc.setFontSize(8);
    doc.text(course.code, colCode, y + 2);

    // Present
    doc.setTextColor(...successColor);
    doc.setFont('helvetica', 'bold');
    doc.text(present.toString(), colPresent, y + 2, { align: 'center' });

    // Absent
    doc.setTextColor(...dangerColor);
    doc.text(absent.toString(), colAbsent, y + 2, { align: 'center' });

    // Total
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'normal');
    doc.text(total.toString(), colTotal, y + 2, { align: 'center' });

    // Percentage
    const pctColor = pct >= 75 ? successColor : (total === 0 ? mutedColor : dangerColor);
    doc.setTextColor(...pctColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`${pct}%`, colPct, y + 2, { align: 'center' });

    y += 10;
    
    if (y > pageHeight - 30) {
      doc.addPage();
      y = margin;
    }
  });

  // ── Bar Chart ──
  y += 6;
  if (y > pageHeight - 40) {
    doc.addPage();
    y = margin;
  }
  doc.setTextColor(...primaryColor);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Attendance Comparison', margin, y);
  y += 8;



  const labelWidth = 28;
  const barMaxWidth = contentWidth - labelWidth - 16;
  const barHeight = 8;
  const barGap = 4;

  courses.forEach((course) => {
    const courseRecords = records.filter(r => r.courseCode === course.code);
    const present = courseRecords.filter(r => r.status === 'Present').length;
    const total = courseRecords.length;
    const pct = total === 0 ? 0 : Math.round((present / total) * 100);

    // Label
    doc.setTextColor(...mutedColor);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(course.code, margin, y + 5.5);

    // Bar background
    const barStartX = margin + labelWidth;
    doc.setFillColor(230, 235, 241);
    doc.roundedRect(barStartX, y, barMaxWidth, barHeight, 2, 2, 'F');

    // Bar fill
    const fillWidth = (pct / 100) * barMaxWidth;
    if (fillWidth > 0) {
      const barColor = pct >= 75 ? successColor : dangerColor;
      doc.setFillColor(...barColor);
      doc.roundedRect(barStartX, y, Math.max(fillWidth, 4), barHeight, 2, 2, 'F');
    }

    // Percentage label after bar
    doc.setTextColor(...primaryColor);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`${pct}%`, barStartX + barMaxWidth + 3, y + 5.5);

    y += barHeight + barGap;
    
    if (y > pageHeight - 30) {
      doc.addPage();
      y = margin;
    }
  });

  // ── Footer ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = pageHeight - 12;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

    doc.setTextColor(...mutedColor);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('This report was auto-generated by AttenDo — Smart Attendance Tracker', margin, footerY);
    doc.text('© AttenDo 2026 • Not an official university document', pageWidth - margin, footerY, { align: 'right' });
  }

  // Save
  const fileName = `AttenDo_Report_${user.rollNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
  const pdfBlob = doc.output('blob');
  await downloadFile(pdfBlob, fileName, 'application/pdf');
};
