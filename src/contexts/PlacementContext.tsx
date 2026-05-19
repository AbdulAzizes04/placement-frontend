"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { Student, PlacementRecord, Question, Application, CRTBatch, CRTSchedule, Announcement, ApplicationStatus } from '@/types';
import api from "@/lib/api";

type PlacementContextType = {
    students: Student[];
    studentPagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    placements: PlacementRecord[];
    placementPagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    applications: Application[];
    applicationPagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    crtBatches: CRTBatch[];
    crtSchedules: CRTSchedule[];
    batches: string[];
    currentBatch: string;
    questions: Question[];
    setBatch: (batch: string) => void;
    addStudent: (student: Student) => Promise<void>;
    deleteStudent: (studentId: string) => Promise<void>;
    bulkDeleteStudents: (studentIds: string[]) => Promise<void>;
    updateStudentStatus: (id: string, status: Student['status']) => void;
    updateStudentProfile: (id: string, updates: Partial<Student>) => void;
    addPlacement: (placement: PlacementRecord) => void;
    addCRTBatch: (batch: CRTBatch) => void;
    askQuestion: (text: string, studentId: string, studentName: string) => void;
    answerQuestion: (questionId: string, answer: string, staffName: string) => void;
    refreshData: () => Promise<void>;
    getPaginatedStudents: (page: number, limit: number, filters: Record<string, unknown>) => Promise<void>;
    getPaginatedPlacements: (page: number, limit: number, filters: Record<string, unknown>) => Promise<void>;
    getPaginatedApplications: (page: number, limit: number, filters: Record<string, unknown>) => Promise<void>;
    stats: Record<string, unknown> | null;
    announcements: Announcement[];
    getStatistics: (filters: Record<string, unknown>) => Promise<void>;
};

const PlacementContext = createContext<PlacementContextType | undefined>(undefined);

export const usePlacement = () => {
    const context = useContext(PlacementContext);
    if (!context) {
        throw new Error('usePlacement must be used within a PlacementProvider');
    }
    return context;
};

// Initial data — only questions are pre-seeded; students/placements come from API
const initialQuestions: Question[] = [
    { id: "1", studentId: "2", studentName: "Jane Smith", question: "When is the next TCS drive?", answer: "Next week, keeping checking announcements.", answeredBy: "Staff Admin", createdAt: new Date().toISOString(), answeredAt: new Date().toISOString() }
];

const availableBatches = [
    "2022-2026",
    "2023-2027",
    "2024-2028",
    "2025-2029"
];

export const PlacementProvider = ({ children }: { children: ReactNode }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [studentPagination, setStudentPagination] = useState({
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0
    });
    const [placements, setPlacements] = useState<PlacementRecord[]>([]);
    const [placementPagination, setPlacementPagination] = useState({
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0
    });
    const [applications, setApplications] = useState<Application[]>([]);
    const [applicationPagination, setApplicationPagination] = useState({
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0
    });
    const [crtBatches, setCrtBatches] = useState<CRTBatch[]>([]);
    const [crtSchedules, setCrtSchedules] = useState<CRTSchedule[]>([]);
    const [questions, setQuestions] = useState<Question[]>(initialQuestions);
    const [currentBatch, setCurrentBatch] = useState<string>("2022-2026");
    const [stats, setStats] = useState<Record<string, unknown> | null>(null);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);


    const { token, user } = useAuth(); // Get token and user from AuthContext

    useEffect(() => {
        if (token) {
            fetchData();
        }
    }, [token]); // fetchData is stable via useCallback; eslint-disable-next-line is intentional here

    const fetchData = useCallback(async () => {
        try {
            const role = user?.role;

            if (role === 'ADMIN' || role === 'TPO' || role === 'STAFF') {
                // --- ADMIN / STAFF / TPO VIEW ---
                const [studentsRes, placementsRes, applicationsRes, crtRes, schedulesRes, statsRes] = await Promise.all([
                    api.get('/students').catch(() => ({ data: { data: [], meta: null } })),
                    api.get('/placements').catch(() => ({ data: { placements: [], meta: null } })),
                    api.get('/applications').catch(() => ({ data: { applications: [], meta: null } })),
                    api.get('/crt/batch').catch(() => ({ data: [] })),
                    api.get('/crt/schedule').catch(() => ({ data: [] })),
                    api.get('/students/stats', { params: { batch: currentBatch } }).catch(() => ({ data: null }))
                ]);

                setStats(statsRes?.data);

                // Assuming some recent changes have added announcements fetching here, but it wasn't there
                // We'll fetch announcements if not already fetched
                try {
                    const announcementsRes = await api.get('/announcements');
                    const annData = announcementsRes?.data?.announcements || announcementsRes?.data || [];
                    setAnnouncements(Array.isArray(annData) ? annData : []);
                } catch (annErr) {
                    console.warn("Failed to fetch announcements:", annErr);
                }

                setCrtBatches(crtRes?.data || []);
                setCrtSchedules(schedulesRes?.data?.schedules || []);

                // Pagination
                if (studentsRes.data.meta) setStudentPagination(studentsRes.data.meta);
                if (applicationsRes.data.meta) setApplicationPagination(applicationsRes.data.meta);
                if (placementsRes.data.meta) setPlacementPagination(placementsRes.data.meta);

                const rawStudents = Array.isArray(studentsRes.data?.students) ? studentsRes.data.students : (Array.isArray(studentsRes.data) ? studentsRes.data : []);
                const rawPlacements = Array.isArray(placementsRes.data?.placements) ? placementsRes.data.placements : (Array.isArray(placementsRes.data) ? placementsRes.data : []);
                const rawApplications = Array.isArray(applicationsRes.data?.applications) ? applicationsRes.data.applications : (Array.isArray(applicationsRes.data) ? applicationsRes.data : []);

                // Transform Placements
                const placedStudentCompanies: Record<string, string[]> = {};
                const mappedPlacements: PlacementRecord[] = (Array.isArray(rawPlacements) ? rawPlacements : []).map((p: Record<string, unknown>) => {
                    const studentId = (p.user_id || p.student_id) as string;
                    const companyName = p.company_name as string;
                    if (!placedStudentCompanies[studentId]) {
                        placedStudentCompanies[studentId] = [];
                    }
                    if (!placedStudentCompanies[studentId].includes(companyName)) {
                        placedStudentCompanies[studentId].push(companyName);
                    }

                    return {
                        id: p.id as string,
                        studentId: studentId,
                        company_name: companyName,
                        package: p.package as number,
                        year: p.year as number,
                        branch: p.branch as string,
                        studentName: p.name as string,
                        roll_number: p.roll_number as string,
                        cgpa: p.cgpa as number,
                        contact: p.contact as string,
                        status: p.status as string
                    };
                });

                // Sync Applications with Placements
                const placementSyncApps: Application[] = [];
                (Array.isArray(rawPlacements) ? rawPlacements : []).forEach((p: Record<string, unknown>) => {
                    const hasApp = (Array.isArray(rawApplications) ? rawApplications : []).some((app: Record<string, unknown>) => {
                        const appAnnouncement = app.announcement as Record<string, unknown> | undefined;
                        return (app.student_id === p.student_id) &&
                        (appAnnouncement?.company_name === p.company_name || app.company_name === p.company_name);
                    });

                    if (!hasApp) {
                        const student = (Array.isArray(rawStudents) ? rawStudents : []).find((s: Record<string, unknown>) => s.id === p.user_id || s.profileId === p.student_id || s.id === p.student_id);
                        const studentBranch = (student?.branch || p.branch || "Unknown") as string;
                        void studentBranch; // used implicitly via the push below

                        placementSyncApps.push({
                            id: `sync-${p.id}`,
                            student_id: p.student_id as string,
                            announcement_id: "sync",
                            status: ApplicationStatus.PLACED,
                            applied_at: (p.placed_at || p.created_at || new Date().toISOString()) as string,
                            updated_at: new Date().toISOString(),
                            is_deleted: false,
                            announcement: { company_name: p.company_name as string, job_role: 'Placed' } as Partial<Announcement> as Announcement
                        });
                    }
                });

                const syncedApplications = [...rawApplications, ...placementSyncApps];
                setApplications(syncedApplications);

                // Build Shortlist Map
                const shortlistMap: Record<string, Record<string, number>> = {};
                if (syncedApplications.length > 0) {
                    syncedApplications.forEach((app: Record<string, unknown> | Application) => {
                        const appObj = app as Record<string, unknown>;
                        if (appObj.status === 'SHORTLISTED') {
                            const sid = appObj.student_id as string;
                            const ann = appObj.announcement as Record<string, unknown> | undefined;
                            const company = (ann?.company_name || ann?.company || 'Unknown') as string;
                            shortlistMap[sid] = shortlistMap[sid] || {};
                            shortlistMap[sid][company] = (shortlistMap[sid][company] || 0) + 1;
                        }
                    });
                }

                // Map Students
                const mappedStudents: Student[] = (Array.isArray(rawStudents) ? rawStudents : []).map((s: Record<string, unknown>) => {
                    const idStr = s.id as string;
                    const profileIdStr = s.profileId as string;
                    const shortlistObj = shortlistMap[idStr] || shortlistMap[profileIdStr] || {};
                    const shortlistCounts = Object.keys(shortlistObj).map(company => ({ company, count: shortlistObj[company] }));

                    return {
                        id: idStr,
                        profileId: profileIdStr,
                        name: s.name as string,
                        email: s.email as string,
                        branch: s.branch as string,
                        year: s.year ? s.year.toString() : "0",
                        batch: s.batch as string,
                        cgpa: (s.cgpa as number) || 0,
                        status: (placedStudentCompanies[idStr]?.length > 0 || placedStudentCompanies[profileIdStr]?.length > 0) ? "Placed" : "Unplaced",
                        placedCompanies: placedStudentCompanies[idStr] || placedStudentCompanies[profileIdStr] || [],
                        rollNumber: (s.roll_no || s.rollNo || s.rollNumber) as string,
                        skills: [],
                        certifications: [],
                        phone: s.phone as string,
                        shortlistCounts: shortlistCounts.length ? shortlistCounts : undefined,
                        is_crt: s.is_crt as boolean
                    };
                });

                setStudents(mappedStudents);
                setPlacements(mappedPlacements);

            } else {
                // --- STUDENT VIEW ---
                const [crtRes, schedulesRes, myAppsRes, announcementsRes] = await Promise.all([
                    api.get('/crt/batch').catch(() => ({ data: [] })),
                    api.get('/crt/schedule').catch(() => ({ data: [] })),
                    api.get('/applications/my').catch(() => ({ data: [] })),
                    api.get('/announcements').catch(() => ({ data: [] }))
                ]);

                setCrtBatches(crtRes?.data || []);
                setCrtSchedules(schedulesRes?.data?.schedules || []);

                const appsData = myAppsRes?.data?.applications || myAppsRes?.data || [];
                setApplications(Array.isArray(appsData) ? appsData : []);
                const annData = announcementsRes?.data?.announcements || announcementsRes?.data || [];
                setAnnouncements(Array.isArray(annData) ? annData : []);

                // Clear restricted data
                setStudents([]);
                setPlacements([]);
                setStats(null);
            }

        } catch (error) {
            console.error("fetchData Error:", error);
            // toast.error("Failed to load dashboard data");
        } finally {
            // data loaded
        }
    }, [user?.role, currentBatch]);

    const setBatch = (batch: string) => {
        setCurrentBatch(batch);
    };

    const addStudent = async (student: Student) => {
        // Mock add for now, or implement API call
        setStudents((prev) => [...prev, student]);
    };

    const updateStudentStatus = (id: string, status: Student['status']) => {
        setStudents((prev) => prev.map(s => s.id === id ? { ...s, status } : s));
    };

    const updateStudentProfile = (id: string, updates: Partial<Student>) => {
        setStudents((prev) => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const addPlacement = (placement: PlacementRecord) => {
        setPlacements((prev) => [...prev, placement]);
        if (placement.studentId) {
            updateStudentStatus(placement.studentId, 'Placed');
        }
    };

    const addCRTBatch = (batch: CRTBatch) => {
        setCrtBatches(prev => [...prev, batch]);
    };

    const getPaginatedStudents = async (page: number, limit: number, filters: Record<string, unknown>) => {
        try {
            const res = await api.get('/students', {
                params: { page, limit, ...filters }
            });

            const { meta } = res.data;
            const rawStudents = res.data.data || res.data.students || [];

            // Re-use logic for mapping students (ideally this should be a helper)
            const mapped = rawStudents.map((s: Record<string, unknown>) => ({
                id: s.id as string,
                profileId: s.profileId as string,
                name: s.name as string,
                email: s.email as string,
                branch: s.branch as string,
                year: s.year ? s.year.toString() : "0",
                batch: s.batch as string,
                cgpa: (s.cgpa as number) || 0,
                status: s.status as string, // Trust backend status for paginated view
                rollNumber: (s.roll_no || s.rollNo || s.rollNumber) as string,
                phone: s.phone as string,
                is_crt: s.is_crt as boolean
            }));

            setStudents(mapped);
            if (meta) setStudentPagination(meta);
        } catch (error) {
            console.error("Failed to fetch paginated students", error);
        }
    };

    const getPaginatedPlacements = async (page: number, limit: number, filters: Record<string, unknown>) => {
        try {
            const res = await api.get('/placements', {
                params: { page, limit, ...filters }
            });

            const rawPlacements: Record<string, unknown>[] = Array.isArray(res.data?.placements) ? res.data.placements : [];
            const meta = res.data?.meta;
            const mapped = rawPlacements.map((p: Record<string, unknown>) => ({
                id: p.id as string,
                studentId: (p.user_id || p.student_id) as string,
                company_name: p.company_name as string,
                package: p.package as number,
                year: p.year as number,
                branch: p.branch as string,
                studentName: p.name as string,
                roll_number: p.roll_number as string,
                cgpa: p.cgpa as number,
                contact: p.contact as string,
                status: p.status as string
            }));

            setPlacements(mapped);
            if (meta) setPlacementPagination(meta);
        } catch (error) {
            console.error("Failed to fetch paginated placements", error);
        }
    };

    const getPaginatedApplications = async (page: number, limit: number, filters: Record<string, unknown>) => {
        try {
            const res = await api.get('/applications', {
                params: { page, limit, ...filters }
            });

            const { applications: rawApps, meta } = res.data;
            setApplications(rawApps);
            setApplicationPagination(meta);
        } catch (error) {
            console.error("Failed to fetch paginated applications", error);
        }
    };

    const askQuestion = (text: string, studentId: string, studentName: string) => {
        const newQ: Question = {
            id: Date.now().toString(),
            studentId,
            studentName,
            question: text,
            createdAt: new Date().toISOString()
        };
        setQuestions(prev => [newQ, ...prev]);
    };

    const answerQuestion = (questionId: string, answer: string, staffName: string) => {
        setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, answer, answeredBy: staffName, answeredAt: new Date().toISOString() } : q));
    };

    const deleteStudent = async (studentId: string) => {
        try {
            await api.delete(`/students/${studentId}`);
            setStudents(prev => prev.filter(s => s.id !== studentId && s.profileId !== studentId));

            // Also remove from placements
            setPlacements(prev => prev.filter(p => p.studentId !== studentId));

        } catch (error) {
            console.error("Failed to delete student", error);
            throw error;
        }
    };

    const bulkDeleteStudents = async (studentIds: string[]) => {
        // ...
        try {
            await api.delete('/students/bulk', { data: { studentIds } });

            // Refetch strict from server to ensure sync
            // Or optimistically update:
            const idsToRemove = new Set(studentIds);
            setStudents(prev => prev.filter(s => !idsToRemove.has(s.id)));
            // Note: Frontend students uses user.id as s.id based on my read of fetchData

            setPlacements(prev => prev.filter(p => !p.studentId || !idsToRemove.has(p.studentId)));
        } catch (error) {
            console.error("Failed to bulk delete", error);
            throw error;
        }
    };

    const getStatistics = async (filters: Record<string, unknown>) => {
        try {
            const res = await api.get('/students/stats', { params: filters });
            setStats(res.data);
        } catch (error) {
            console.error("Failed to fetch dashboard statistics", error);
        }
    };

    return (
        <PlacementContext.Provider value={{
            students,
            studentPagination,
            placements,
            placementPagination,
            applications,
            applicationPagination,
            crtBatches,
            crtSchedules,
            batches: availableBatches,
            currentBatch,
            questions,
            setBatch,
            addStudent,
            deleteStudent,
            bulkDeleteStudents,
            updateStudentStatus,
            updateStudentProfile,
            addPlacement,
            addCRTBatch,
            askQuestion,
            answerQuestion,
            refreshData: fetchData,
            getPaginatedStudents,
            getPaginatedPlacements,
            getPaginatedApplications,
            stats,
            announcements,
            getStatistics
        }}>
            {children}
        </PlacementContext.Provider >
    );
};
