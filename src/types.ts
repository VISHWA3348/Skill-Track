export type UserRole = 'super_admin' | 'admin' | 'hod' | 'staff' | 'student' | (string & {});

export type CertificateStatus = 'pending' | 'staff_reviewed' | 'staff_approved' | 'hod_approved' | 'verified' | 'approved' | 'rejected';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  profilePhoto?: string;
  collegeId?: string;
  college_id?: string;
  departmentId?: string;
  preferences?: {
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    theme?: 'light' | 'dark' | 'system';
    careerInterests?: string[];
    hobbies?: string;
  };
  socialLinks?: {
    linkedin?: string;
    github?: string;
    twitter?: string;
    portfolio?: string;
  };
  skills?: string;
  bio?: string;
  rollNo?: string;
  class?: string;
  year?: string;
  section?: string;
  city?: string;
  phoneNumber?: string;
  photoUrl?: string;
  collegeName?: string;
  createdAt: string;
  isActive?: boolean;
  status?: 'active' | 'suspended' | 'inactive';
  lastLogin?: string;
}

export interface College {
  id: string;
  college_id: string;
  name: string;
  college_name?: string;
  type?: string;
  location: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  createdAt: string;
}

export interface Department {
  id: string;
  department_id: string;
  department_name?: string;
  collegeId: string;
  college_id?: string;
  name: string;
}

export interface Remark {
  userId: string;
  role: UserRole;
  comment: string;
  timestamp: string;
  status?: string;
}

export type ParticipationType = 'participation' | 'winner' | 'runner-up' | 'organizer';
export type PrizePosition = '1st Place' | '2nd Place' | '3rd Place' | 'Other' | '';
export type PrizeType = 'Cash Prize' | 'Certificate Only' | 'Trophy / Medal' | 'Internship Offer' | 'Other' | '';

export interface Certificate {
  id: string;
  userId: string;
  studentName: string;
  rollNo?: string;
  class?: string;
  year?: string;
  phoneNumber?: string;
  city?: string;
  collegeName?: string;
  collegeId: string;
  departmentId: string;
  eventName: string;
  eventCollegeName: string;
  eventLocation?: string;
  date: string;
  type: ParticipationType;
  fileUrl: string;
  photoUrl: string;
  gps: {
    lat: number;
    lng: number;
  };
  
  // New fields for winners
  prizePosition?: PrizePosition;
  customPrizePosition?: string;
  prizeType?: PrizeType;
  cashPrizeAmount?: number;
  prizeDescription?: string;

  // New fields for GPS/Fraud verification
  gpsPhotoUrl?: string; // The uploaded proof photo
  gpsPhotoLat?: number; // Extracted from EXIF
  gpsPhotoLng?: number; // Extracted from EXIF
  gpsPhotoTimestamp?: string; // Extracted from EXIF
  gpsVerified?: boolean; // True if EXIF matches browser GPS
  fraudFlag?: boolean; // True if mismatch or suspicious
  fraudReason?: string; // Description of the fraud flag
  fileHash?: string; // SHA-256 hash of the uploaded file

  status: CertificateStatus;
  remarks: Remark[];
  is_deleted?: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  details: string;
  collegeId?: string;
  timestamp: string;
}

export interface CareerActivity {
  docId: string;
  studentId: string;
  userId: string;
  collegeId: string;
  departmentId: string;
  type: 'Internship' | 'Workshop' | 'Online Course' | 'Project';
  organization: string;
  duration: string;
  details: string;
  status: 'pending' | 'staff_reviewed' | 'hod_approved' | 'approved' | 'rejected';
  timestamp: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: any;
}

export const PERMISSIONS = {
  super_admin: ['*'],
  admin: [
    'certificates_view',
    'certificates_verify',
    'certificates_delete',
    'activities_view',
    'activities_approve',
    'students_view',
    'students_manage',
    'students_import',
    'users_manage',
    'reports_view',
    'settings_manage',
    'audit_logs_view'
  ],
  hod: [
    'certificates_view',
    'certificates_review',
    'certificates_approve',
    'activities_view',
    'activities_approve',
    'students_view',
    'students_manage',
    'users_manage',
    'reports_view'
  ],
  staff: [
    'certificates_view',
    'certificates_review',
    'activities_view',
    'activities_create',
    'students_view',
    'students_manage',
    'users_manage'
  ],
  student: [
    'certificates_view',
    'certificates_upload',
    'activities_view',
    'activities_create'
  ]
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS][number] | (string & {});
