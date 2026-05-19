export enum Role {
    STUDENT = "STUDENT",
    STAFF = "STAFF",
    TPO = "TPO",
    ADMIN = "ADMIN",
}

export enum ApplicationStatus {
    APPLIED = "APPLIED",
    SHORTLISTED = "SHORTLISTED",
    REJECTED = "REJECTED",
    PLACED = "PLACED",
}

export enum ScheduleType {
    BATCH = "BATCH",
    BRANCH = "BRANCH",
}

export enum AttendanceSection {
    MORNING = "MORNING",
    AFTERNOON = "AFTERNOON",
}

export enum AttendanceStatus {
    PRESENT = "PRESENT",
    ABSENT = "ABSENT",
}

export interface College {
    id: string;
    name: string;
    code: string;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
}

export interface User {
    id: string;
    name: string;
    username?: string;
    email?: string;
    phone?: string;
    managedBranch?: string;
    role: Role;
    college_id: string;
    mustChangePassword?: boolean;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
    college?: College;
    student_profile?: StudentProfile;
    faculty_profile?: FacultyProfile;
}

export interface FacultyProfile {
    id: string;
    user_id: string;
    name: string;
    email: string;
    phone?: string;
    assignedBranches: string[];
    assignedBatches: string[];
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
    user?: User;
}

export interface StudentProfile {
    id: string;
    user_id: string;
    name?: string;
    email?: string;
    phone?: string;
    rollNumber?: string;
    college_id: string;
    roll_no: string;
    branch: string;
    year: number;
    cgpa: number;
    batch: string;
    status: string;
    is_crt: boolean;
    crt_marks?: number;
    crt_batch_id?: string;
    allocated_batch?: string;
    skills: string[];
    resume_url?: string;
    marks10_url?: string;
    marks12_url?: string;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
    user?: User;
    college?: College;
}

export interface Announcement {
    id: string;
    company_name: string;
    job_role: string;
    description: string;
    application_link?: string;
    required_cgpa?: number;
    required_skills: string[];
    allowed_branches: string[];
    package?: string;
    is_crt_only: boolean;
    deadline: string;
    created_by: string;
    college_id: string;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
    creator?: User;
    college?: College;
}

export interface Application {
    id: string;
    student_id: string;
    announcement_id: string;
    status: ApplicationStatus;
    applied_at: string;
    updated_at: string;
    is_deleted: boolean;
    student?: StudentProfile;
    announcement?: Announcement;
}

export interface Certification {
    name: string;
    issuer: string;
    date: string;
}

export interface Student {
    id: string;
    profileId?: string;
    name?: string;
    email?: string;
    branch?: string;
    year?: string;
    batch?: string;
    cgpa?: number;
    status?: string;
    rollNumber?: string;
    skills?: string[];
    certifications?: Certification[];
    phone?: string;
    shortlistCounts?: { company: string; count: number }[];
    is_crt?: boolean;
    placedCompanies?: string[];
}

export interface Question {
    id: string;
    studentId: string;
    studentName: string;
    question: string;
    answer?: string;
    answeredBy?: string;
    createdAt: string;
    answeredAt?: string;
}

export interface PlacementRecord {
    id: string;
    student_id?: string;
    studentId?: string; // Frontend alias
    company_name: string;
    package?: number;
    offer_letter_url?: string;
    placed_at?: string;
    created_at?: string;
    updated_at?: string;
    is_deleted?: boolean;
    student?: StudentProfile;
    // Flat properties for UI
    year?: number | string;
    branch?: string;
    studentName?: string;
    roll_number?: string;
    cgpa?: number;
    contact?: string;
    status?: string;
}

export interface CRTBatch {
    id: string;
    batch_name: string;
    academic_year: string;
    trainer_name?: string;
    start_date?: string;
    end_date?: string;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
    // Stats for dashboard
    total_students?: number;
    placed_students?: number;
    unplaced_students?: number;
    branch_breakdown?: Record<string, number>;
}

export interface CRTSchedule {
    id: string;
    type: ScheduleType;
    academic_year: string;
    branch?: string;
    name: string;
    start_date: string;
    end_date: string;
    room_no: string;
    status: string;
    attendance_completed: boolean;
    attendance_completed_at?: string;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
    batches?: CRTBatch[];
    faculty?: FacultyProfile[];
}

export interface Attendance {
    id: string;
    student_id: string;
    schedule_id: string;
    date: string;
    section: AttendanceSection;
    status: AttendanceStatus;
    topic?: string;
    marked_at: string;
    updated_at: string;
    is_deleted: boolean;
    student?: StudentProfile;
    schedule?: CRTSchedule;
}

// Common Generic Pagination Response
export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
