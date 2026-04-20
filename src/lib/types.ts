export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export type Frequency = 'once' | 'twice';

export type AttendanceStatus = 'present' | 'absent' | 'leave' | 'holiday' | 'halfday';

export interface HouseHelp {
  id: string;
  name: string;
  phone?: string;
  category: string;
  workingDays: DayOfWeek[];
  frequency: Frequency;
  rate?: number;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  houseHelpId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export const DAYS_OF_WEEK: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: 'bg-emerald-500',
  absent: 'bg-red-500',
  leave: 'bg-amber-500',
  holiday: 'bg-blue-500',
  halfday: 'bg-orange-400',
};

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  leave: 'Leave',
  holiday: 'Holiday',
  halfday: 'Half Day',
};

export const CATEGORIES = [
  'Maid',
  'Cook',
  'Driver',
  'Gardener',
  'Nanny',
  'Watchman',
  'Other',
];
