export interface ClassSession {
  id: string;
  subjectCode: string;
  subjectName: string;
  type: 'Theory' | 'Tutorial' | 'Lab';
  startTime: string; // HH:mm format (24 hour)
  endTime: string;
  room?: string;
  teacher?: string;
}

export type TimetableSchedule = Record<string, ClassSession[]>;
export type BatchTimetable = Record<'D1' | 'D2' | 'D3' | 'D', TimetableSchedule>;

export const SUBJECT_NAMES: Record<string, string> = {
  'MA222': 'Applied Mathematics-3',
  'MA123': 'Applied Mathematics - 1',
  'ECE102': 'Fundamentals of Electronics Engg.',
  'ECE102L': 'Electronics Engg. Lab',
  'CH262': 'Chemical Engg. Thermodynamics',
  'CH224': 'Fluid Flow & Mechanical Operations',
  'CH224L': 'Fluid Flow Lab',
  'CH171': 'Mass & Energy Balances',
  'CH191': 'Fundamentals of Polymer & Petrochemicals'
};

const TEACHERS: Record<string, string> = {
  'MA222': 'Prof. C. Kundu & Dr. R. Nigam',
  'MA123': 'Dr. Sudeep Kundu',
  'ECE102': 'Dr. Amarish Dubey',
  'ECE102L': 'Dr. Amarish Dubey',
  'CH262': 'Dr. Milan Kumar',
  'CH224': 'Dr. K G Biswas',
  'CH224L': 'Dr. K G Biswas',
  'CH171': 'Dr. G. K. Agrahari',
  'CH191': 'Dr. Vasu Chaudhary'
};

const CREDITS: Record<string, number> = {
  'CH171': 8,
  'CH224': 13,
  'CH262': 11,
  'ECE102': 13,
  'MA222': 11,
  'ECE102L': 2,
  'CH224L': 2,
  'MA123': 11,
  'CH191': 8
};

// Helper to create a class session easily
const createClass = (
  code: string,
  type: 'Theory' | 'Tutorial' | 'Lab',
  startTime: string,
  endTime: string,
  room?: string,
  teacher?: string
): ClassSession => {
  const actualCode = type === 'Tutorial' ? `${code}_TUT` : code;
  return {
    id: `${actualCode}-${type}-${startTime}`,
    subjectCode: actualCode,
    subjectName: (SUBJECT_NAMES[code] || code) + (type === 'Tutorial' ? ' (Tutorial)' : ''),
    type,
    startTime,
    endTime,
    room,
    teacher: teacher || TEACHERS[code]
  };
};

const commonTheoryClasses = {
  Monday: [
    createClass('MA222', 'Theory', '10:00', '10:55', 'AB2 LR6'),
    createClass('CH224', 'Theory', '11:00', '11:55', 'AB2 LR6'),
    createClass('ECE102', 'Theory', '12:00', '12:55', 'AB2 LR6'),
    createClass('CH224', 'Tutorial', '15:00', '15:55', 'AB2 LR6'), // CH224 TUT (D1+D2+D3)
    createClass('CH224L', 'Lab', '16:00', '17:55', 'AB1 GF')
  ],
  Tuesday: [
    createClass('CH262', 'Theory', '09:00', '09:55', 'AB2 LR6'),
    createClass('CH224', 'Theory', '10:00', '10:55', 'AB2 LR6'),
    createClass('CH171', 'Theory', '11:00', '11:55', 'AB2 LR6'),
    createClass('MA123', 'Theory', '12:00', '12:55', 'AB5 LR2'),
  ],
  Wednesday: [
    createClass('CH262', 'Theory', '09:00', '09:55', 'AB2 LR6'),
    createClass('MA222', 'Theory', '10:00', '10:55', 'AB2 LR6'),
    createClass('ECE102', 'Theory', '11:00', '11:55', 'AB2 LR6'),
    createClass('MA123', 'Theory', '16:00', '16:55', 'AB5 LR3'),
  ],
  Thursday: [
    createClass('MA123', 'Theory', '09:00', '09:55', 'AB5 LR3'),
    createClass('CH262', 'Theory', '10:00', '10:55', 'AB2 LR6'),
    createClass('CH171', 'Theory', '11:00', '11:55', 'AB2 LR6'),
    createClass('CH224', 'Theory', '12:00', '12:55', 'AB2 LR6'),
    createClass('CH224L', 'Lab', '14:00', '15:55', 'AB1 GF')
  ],
  Friday: [
    createClass('MA222', 'Theory', '10:00', '10:55', 'AB2 LR6'),
    createClass('ECE102', 'Theory', '11:00', '11:55', 'AB2 LR6'),
    createClass('CH224L', 'Lab', '16:00', '17:55', 'AB1 GF')
  ]
};

export const timetableData: BatchTimetable = {
  'D1': {
    Monday: [
      ...commonTheoryClasses.Monday,
      createClass('MA123', 'Tutorial', '09:00', '09:55', 'AB1 LR4') // TD1
    ].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    Tuesday: [
      ...commonTheoryClasses.Tuesday,
      createClass('ECE102', 'Tutorial', '16:00', '16:55', 'AB2 LR6'),
      createClass('MA222', 'Tutorial', '17:00', '17:55', 'AB2 LR6')
    ].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    Wednesday: [
      ...commonTheoryClasses.Wednesday,
      createClass('CH171', 'Tutorial', '12:00', '12:55', 'AB2 LR6')
    ].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    Thursday: [
      ...commonTheoryClasses.Thursday,
      createClass('ECE102L', 'Lab', '16:00', '17:55', 'Plaza 4th Floor')
    ].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    Friday: [
      ...commonTheoryClasses.Friday,
      createClass('CH262', 'Tutorial', '09:00', '09:55', 'AB2 LR6')
    ].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    Saturday: [],
    Sunday: []
  },
  'D2': {
    Monday: [
      ...commonTheoryClasses.Monday,
      createClass('MA123', 'Tutorial', '09:00', '09:55', 'AB1 LR5') // TD2
    ].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    Tuesday: [
      ...commonTheoryClasses.Tuesday,
      createClass('ECE102', 'Tutorial', '16:00', '16:55', 'AB2 LR5'),
      createClass('MA222', 'Tutorial', '17:00', '17:55', 'AB2 LR5')
    ].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    Wednesday: [
      ...commonTheoryClasses.Wednesday,
      createClass('ECE102L', 'Lab', '14:00', '15:55', 'Plaza 4th Floor')
    ].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    Thursday: [
      ...commonTheoryClasses.Thursday
    ].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    Friday: [
      ...commonTheoryClasses.Friday,
      createClass('CH171', 'Tutorial', '12:00', '12:55', 'AB2 LR6'),
      createClass('CH262', 'Tutorial', '15:00', '15:55', 'AB2 LR6')
    ].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    Saturday: [],
    Sunday: []
  },
  'D3': {
    Monday: [
      ...commonTheoryClasses.Monday,
      createClass('CH191', 'Theory', '14:00', '14:55', 'AB2 LR5')
    ].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    Tuesday: [
      ...commonTheoryClasses.Tuesday,
      createClass('CH191', 'Theory', '14:00', '14:55', 'AB2 LR5'),
      createClass('ECE102', 'Tutorial', '16:00', '16:55', 'AB2 LR5')
    ].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    Wednesday: [
      ...commonTheoryClasses.Wednesday,
      createClass('ECE102L', 'Lab', '14:00', '15:55', 'Plaza 4th Floor')
    ].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    Thursday: [
      ...commonTheoryClasses.Thursday
    ].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    Friday: [
      ...commonTheoryClasses.Friday,
      createClass('CH171', 'Tutorial', '12:00', '12:55', 'AB2 LR6'),
      createClass('CH262', 'Tutorial', '15:00', '15:55', 'AB2 LR6')
    ].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    Saturday: [],
    Sunday: []
  },
  'D': {
    Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
  }
};

const days: ('Monday'|'Tuesday'|'Wednesday'|'Thursday'|'Friday'|'Saturday'|'Sunday')[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

days.forEach(day => {
  const allClasses = [
    ...(timetableData['D1'][day] || []),
    ...(timetableData['D2'][day] || []),
    ...(timetableData['D3'][day] || [])
  ];
  
  const uniqueClasses: ClassSession[] = [];
  const seen = new Set();
  
  allClasses.forEach(c => {
    // Unique identifier for a class to avoid duplicating common theory classes
    const key = `${c.subjectCode}-${c.type}-${c.startTime}-${c.room}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueClasses.push(c);
    }
  });
  
  timetableData['D'][day] = uniqueClasses.sort((a, b) => a.startTime.localeCompare(b.startTime));
});

export const getCoursesForBatch = (batch: string) => {
  const schedule = timetableData[batch as keyof BatchTimetable];
  if (!schedule) return [];
  
  const coursesMap = new Map<string, { code: string, name: string, credits: number, type: 'Theory' | 'Lab' | 'Tutorial' }>();
  
  Object.values(schedule).flat().forEach(session => {
    if (!coursesMap.has(session.subjectCode)) {
      const baseCode = session.subjectCode.replace('_TUT', '');
      coursesMap.set(session.subjectCode, {
        code: session.subjectCode,
        name: session.subjectName,
        credits: CREDITS[baseCode] || 3,
        type: session.type
      });
    }
  });
  
  return Array.from(coursesMap.values());
};
