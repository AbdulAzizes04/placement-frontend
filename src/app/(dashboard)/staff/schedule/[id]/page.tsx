"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Download, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { CRTSchedule, Attendance, StudentProfile } from "@/types";

type ScheduleData = {
    schedule: CRTSchedule;
    stats: Record<string, number>;
    attendance: Attendance[];
    students: StudentProfile[];
};

export default function StaffScheduleDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);

    const [data, setData] = useState<ScheduleData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState<SessionInfo | null>(null);

    useEffect(() => {
        fetchAnalytics();
    }, [id]);

    const fetchAnalytics = async () => {
        try {
            const res = await api.get(`/crt/schedule/${id}`);
            setData(res.data);
        } catch (error) {
            console.error("Failed to fetch analytics", error);
            toast.error("Failed to load schedule details");
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportCSV = () => {
        if (!data || !data.students || !data.attendance) return;

        const { students, attendance, schedule } = data;

        const sessions = Array.from(new Set(attendance.map((a: Attendance) => `${a.date.split('T')[0]} - ${a.section}`))).sort() as string[];

        let csvContent = "Roll Number,Student Name,Branch," + sessions.join(",") + ",Total Present,Total Absent,Attendance %\n";

        students.forEach((student: StudentProfile) => {
            const studentAttendance = attendance.filter((a: Attendance) => a.student_id === student.id);
            const presentCount = studentAttendance.filter((a: Attendance) => a.status === "PRESENT").length;
            const absentCount = studentAttendance.filter((a: Attendance) => a.status === "ABSENT").length;
            const percentage = (presentCount + absentCount) ? ((presentCount / (presentCount + absentCount)) * 100).toFixed(2) : "0";

            let row = `${student.roll_no},${student.name},${student.branch}`;

            sessions.forEach((session: string) => {
                const [dateStr, section] = session.split(" - ");
                const record = studentAttendance.find((a: Attendance) => a.date.startsWith(dateStr) && a.section === section);
                row += `,${record ? record.status : "N/A"}`;
            });

            row += `,${presentCount},${absentCount},${percentage}%`;
            csvContent += row + "\n";
        });

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${schedule.name}_Attendance_Report.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isLoading) return <div className="p-8 text-center">Loading details...</div>;
    if (!data) return <div className="p-8 text-center">Schedule not found</div>;

    const { schedule, stats } = data;
    const isActive = new Date(schedule.end_date) >= new Date();

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold">{schedule.name}</h2>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{schedule.type}</Badge>
                        <span>{schedule.academic_year}</span>
                        <span>•</span>
                        <span>{new Date(schedule.start_date).toLocaleDateString()} - {new Date(schedule.end_date).toLocaleDateString()}</span>
                    </div>
                </div>
                <div className="ml-auto flex gap-2">
                    <Button onClick={handleExportCSV} variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Export Report
                    </Button>
                    <Button
                        onClick={() => router.push(`/staff/schedule/${id}/attendance`)}
                        className="bg-purple-600 hover:bg-purple-700"
                        disabled={!isActive}
                    >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Mark Attendance
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Classes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalClasses}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Attendance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {stats.presentPercentage.toFixed(1)}%
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Present</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.totalPresent}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Absent</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.totalAbsent}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Class History Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-gray-500" />
                        Class History & Topics
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ClassHistoryTable
                        data={data}
                        onViewSession={(session) => setSelectedSession(session)}
                    />
                </CardContent>
            </Card>

            {/* Session Details Modal */}
            <SessionDetailsModal
                isOpen={!!selectedSession}
                onClose={() => setSelectedSession(null)}
                session={selectedSession}
                data={data}
            />
        </div>
    );
}

export type SessionInfo = {
    date: string;
    section: string;
    topic: string;
    present: number;
    absent: number;
    total: number;
};

function ClassHistoryTable({ data, onViewSession }: { data: ScheduleData, onViewSession: (s: SessionInfo) => void }) {
    const { attendance } = data;
    const sessionsMap = new Map<string, SessionInfo>();

    attendance.forEach((record: Attendance) => {
        const key = `${record.date.split('T')[0]}_${record.section}`;
        if (!sessionsMap.has(key)) {
            sessionsMap.set(key, {
                date: record.date,
                section: record.section,
                topic: record.topic || "No Topic",
                present: 0,
                absent: 0,
                total: 0
            });
        }
        const session = sessionsMap.get(key);
        if (!session) return;
        session.total++;
        if (record.status === 'PRESENT') session.present++;
        else session.absent++;

        if (record.topic && session!.topic === "No Topic") {
            session!.topic = record.topic;
        }
    });

    const sessions = Array.from(sessionsMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-medium">
                    <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Section</th>
                        <th className="p-3">Topic Covered</th>
                        <th className="p-3 text-center">Attendance</th>
                        <th className="p-3 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {sessions.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="p-4 text-center text-muted-foreground">No classes recorded yet.</td>
                        </tr>
                    ) : (
                        sessions.map((session: SessionInfo, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="p-3">{new Date(session.date).toLocaleDateString()}</td>
                                <td className="p-3">
                                    <Badge variant="outline">{session.section}</Badge>
                                </td>
                                <td className="p-3 font-medium text-gray-800">{session.topic}</td>
                                <td className="p-3 text-center">
                                    <div className="flex flex-col items-center">
                                        <span className="text-xs font-semibold text-green-600">{session.present} P</span>
                                        <span className="text-xs text-red-500">{session.absent} A</span>
                                    </div>
                                </td>
                                <td className="p-3 text-right">
                                    <Button variant="outline" size="sm" onClick={() => onViewSession(session)}>
                                        View List
                                    </Button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

type SessionDetailsProps = {
    isOpen: boolean;
    onClose: () => void;
    session: SessionInfo | null;
    data: ScheduleData | null;
};

function SessionDetailsModal({ isOpen, onClose, session, data }: SessionDetailsProps) {
    const [filter, setFilter] = useState<'ALL' | 'PRESENT' | 'ABSENT'>('ALL');

    if (!session || !data) return null;

    const dateStr = session.date.split('T')[0];
    const sessionRecords = data.attendance.filter((a: Attendance) =>
        a.date.startsWith(dateStr) && a.section === session.section
    );

    const studentsWithStatus = data.students.map((student: StudentProfile) => {
        const record = sessionRecords.find((r: Attendance) => r.student_id === student.id);
        return {
            ...student,
            status: record ? record.status : 'N/A'
        };
    }).filter((s) => s.status !== 'N/A');

    const filteredStudents = studentsWithStatus.filter((s) => {
        if (filter === 'ALL') return true;
        return s.status === filter;
    });

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`${new Date(session.date).toLocaleDateString()} - ${session.section}`}>
            <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-md mb-2">
                    <p className="text-sm text-gray-500">Topic Covered</p>
                    <p className="font-medium">{session.topic}</p>
                </div>

                <div className="flex p-1 bg-gray-100 rounded-lg">
                    {['ALL', 'PRESENT', 'ABSENT'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as 'ALL' | 'PRESENT' | 'ABSENT')}
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${filter === f ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {f.charAt(0) + f.slice(1).toLowerCase()} ({
                                studentsWithStatus.filter((s) => f === 'ALL' ? true : s.status === f).length
                            })
                        </button>
                    ))}
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-2">
                    {filteredStudents.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">No students found for this filter.</div>
                    ) : (
                        filteredStudents.map((student) => (
                            <div key={student.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded border border-gray-100">
                                <div>
                                    <p className="font-medium text-sm">{student.name}</p>
                                    <p className="text-xs text-muted-foreground">{student.roll_no} • {student.branch}</p>
                                </div>
                                <Badge variant={student.status === 'PRESENT' ? 'default' : 'destructive'}
                                    className={student.status === 'PRESENT' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}>
                                    {student.status}
                                </Badge>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Modal>
    );
}
