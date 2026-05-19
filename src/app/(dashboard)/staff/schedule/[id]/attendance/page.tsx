"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Calendar, Clock, CheckCircle2, XCircle, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import api from "@/lib/api";
import { toast } from "sonner";

interface Student {
    id: string;
    roll_no: string;
    user: {
        name: string;
    };
    branch: string;
}

interface Schedule {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    academic_year: string;
    type: string;
    branch?: string;
    attendance_completed: boolean;
    totalSessions: number;
    markedSessions: number;
}

export default function AttendancePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);

    const [schedule, setSchedule] = useState<Schedule | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    // Form State
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [section, setSection] = useState<"MORNING" | "AFTERNOON">("MORNING");
    const [topic, setTopic] = useState("");
    const [attendance, setAttendance] = useState<Record<string, "PRESENT" | "ABSENT">>({});

    useEffect(() => {
        fetchData();
        // Initialize section based on time
        const hour = new Date().getHours();
        if (hour >= 13) setSection("AFTERNOON");
    }, [id]);

    useEffect(() => {
        if (schedule && students.length > 0) {
            fetchExistingAttendance();
        }
    }, [date, section, schedule, students.length]);

    const fetchExistingAttendance = async () => {
        try {
            const res = await api.get(`/crt/schedule/${id}/attendance`, {
                params: { date, section }
            });

            const existing = res.data;
            if (existing.records && existing.records.length > 0) {
                const newAttendance: Record<string, "PRESENT" | "ABSENT"> = {};

                // Initialize with current students as PRESENT in case some are not in existing records
                students.forEach(s => {
                    newAttendance[s.id] = "PRESENT";
                });

                existing.records.forEach((r: { student_id: string; status: "PRESENT" | "ABSENT" }) => {
                    newAttendance[r.student_id] = r.status;
                });

                setAttendance(newAttendance);
                setTopic(existing.topic || "");
                if (existing.records.length > 0 && !schedule?.attendance_completed) {
                    toast.info("Previously marked attendance loaded");
                }
            } else {
                // Reset to defaults if no records found for this slot
                const defaultAttendance: Record<string, "PRESENT" | "ABSENT"> = {};
                students.forEach(s => {
                    defaultAttendance[s.id] = "PRESENT";
                });
                setAttendance(defaultAttendance);
                setTopic("");
            }
        } catch (error) {
            console.error("Failed to fetch existing attendance", error);
        }
    };

    const fetchData = async () => {
        try {
            const scheduleRes = await api.get(`/crt/schedule/${id}`);
            const scheduleData = scheduleRes.data.schedule;
            setSchedule(scheduleData);

            const studentsRes = await api.get(`/crt/schedule/${id}/students`);
            setStudents(studentsRes.data);

            const initialAttendance: Record<string, "PRESENT" | "ABSENT"> = {};
            studentsRes.data.forEach((s: Student) => {
                initialAttendance[s.id] = "PRESENT";
            });
            setAttendance(initialAttendance);

        } catch (error) {
            console.error("Failed to load data", error);
            toast.error("Failed to load schedule data");
        } finally {
            setIsLoading(false);
        }
    };

    const toggleStatus = (studentId: string) => {
        if (schedule?.attendance_completed) return;
        setAttendance(prev => ({
            ...prev,
            [studentId]: prev[studentId] === "PRESENT" ? "ABSENT" : "PRESENT"
        }));
    };

    const markAll = (status: "PRESENT" | "ABSENT") => {
        if (schedule?.attendance_completed) return;
        const newAttendance = { ...attendance };
        students.forEach(s => newAttendance[s.id] = status);
        setAttendance(newAttendance);
    };

    const handlePreSubmit = () => {
        if (!schedule) return;
        if (schedule.attendance_completed) return;
        if (!date || !topic) return toast.error("Please fill in Date and Topic");

        // Validate Date Range
        const selectedDate = new Date(date);
        const start = new Date(schedule.start_date);
        const end = new Date(schedule.end_date);
        start.setHours(0, 0, 0, 0);

        if (selectedDate < start || selectedDate > end) {
            return toast.error("Date is outside schedule range");
        }

        setIsConfirmOpen(true);
    };

    const confirmAndSubmit = async () => {
        setIsConfirmOpen(false);
        const records = Object.entries(attendance).map(([student_id, status]) => ({
            student_id,
            status
        }));

        setIsSubmitting(true);
        try {
            await api.post(`/crt/schedule/${id}/attendance`, {
                date,
                section,
                topic,
                records
            });
            toast.success("Attendance marked successfully");

            // Refresh schedule data to see updated progress
            const scheduleRes = await api.get(`/crt/schedule/${id}`);
            setSchedule(scheduleRes.data.schedule);

            if (scheduleRes.data.schedule.attendance_completed) {
                toast.success("Schedule attendance completed!");
                router.push("/staff/schedule");
            }
        } catch (error: unknown) {
            console.error("Submit error", error);
            const axErr = error as { response?: { data?: { error?: string } } };
            toast.error(axErr.response?.data?.error || "Failed to submit attendance");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center">Loading...</div>;
    if (!schedule) return <div className="p-8 text-center">Schedule not found</div>;

    const presentCount = Object.values(attendance).filter(s => s === "PRESENT").length;
    const absentCount = Object.values(attendance).filter(s => s === "ABSENT").length;
    const progressPercent = (schedule.markedSessions / schedule.totalSessions) * 100;

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">{schedule.name}</h1>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-100">{schedule.type}</Badge>
                            <span>{schedule.academic_year}</span>
                            <span>•</span>
                            <span>{new Date(schedule.start_date).toLocaleDateString()} - {new Date(schedule.end_date).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 min-w-[240px]">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Attendance Progress</span>
                        <span className="text-xs font-bold text-gray-800">{schedule.markedSessions}/{schedule.totalSessions} Sessions</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
                        <div
                            className={`h-2 rounded-full transition-all duration-500 ${schedule.attendance_completed ? 'bg-green-500' : 'bg-purple-500'}`}
                            style={{ width: `${progressPercent}%` }}
                        ></div>
                    </div>
                    {schedule.attendance_completed ? (
                        <div className="text-[10px] text-green-600 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> All sessions marked
                        </div>
                    ) : (
                        <div className="text-[10px] text-purple-600 font-medium whitespace-nowrap">
                            {schedule.totalSessions - schedule.markedSessions} sessions remaining
                        </div>
                    )}
                </div>
            </div>

            {schedule.attendance_completed && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex items-center gap-3 text-green-800 animate-in fade-in slide-in-from-top-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    <div>
                        <p className="font-semibold">Attendance Fully Marked</p>
                        <p className="text-sm opacity-90">All required sections for this training schedule have been completed. Further changes are disabled.</p>
                    </div>
                </div>
            )}

            {/* Controls */}
            <Card className="border-t-4 border-t-purple-600 shadow-sm">
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-500 uppercase">Date</Label>
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                min={new Date(schedule.start_date).toISOString().split('T')[0]}
                                max={new Date(schedule.end_date).toISOString().split('T')[0]}
                                disabled={schedule.attendance_completed}
                                className="focus:ring-purple-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-500 uppercase">Section</Label>
                            <Select
                                value={section}
                                onValueChange={(v: "MORNING" | "AFTERNOON") => setSection(v)}
                                disabled={schedule.attendance_completed}
                            >
                                <SelectTrigger className="focus:ring-purple-500">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MORNING">Morning Session</SelectItem>
                                    <SelectItem value="AFTERNOON">Afternoon Session</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-500 uppercase">Topic Covered</Label>
                            <Input
                                placeholder="e.g. Ratio & Proportion, Mock Interview..."
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                disabled={schedule.attendance_completed}
                                className="focus:ring-purple-500"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Student List */}
            <Card className="shadow-sm border-gray-200 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between border-b bg-gray-50/50 py-3 px-6">
                    <CardTitle className="text-lg flex items-center gap-2 font-bold text-gray-700">
                        <CheckSquare className="h-5 w-5 text-purple-600" />
                        Students List
                    </CardTitle>
                    {!schedule.attendance_completed && (
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => markAll("PRESENT")} className="text-xs h-8">Mark All P</Button>
                            <Button variant="outline" size="sm" onClick={() => markAll("ABSENT")} className="text-xs h-8 text-red-600 hover:text-red-700">Mark All A</Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableHead className="w-[150px] font-bold text-gray-600 pl-6">Roll No</TableHead>
                                    <TableHead className="font-bold text-gray-600">Student Name</TableHead>
                                    <TableHead className="font-bold text-gray-600">Branch</TableHead>
                                    <TableHead className="text-right font-bold text-gray-600 pr-6">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {students.map((student) => (
                                    <TableRow key={student.id}
                                        className={`${attendance[student.id] === "ABSENT" ? "bg-red-50/30" : "hover:bg-gray-50/50"} transition-colors border-b`}
                                    >
                                        <TableCell className="font-medium pl-6">{student.roll_no}</TableCell>
                                        <TableCell className="text-gray-700">{student.user.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-[10px] font-medium">{student.branch}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    size="sm"
                                                    variant={attendance[student.id] === "PRESENT" ? "default" : "outline"}
                                                    className={`h-8 w-10 text-xs ${attendance[student.id] === "PRESENT" ? "bg-green-600 hover:bg-green-700 shadow-sm" : "text-gray-400"}`}
                                                    onClick={() => !schedule.attendance_completed && setAttendance(prev => ({ ...prev, [student.id]: "PRESENT" }))}
                                                    disabled={schedule.attendance_completed}
                                                >
                                                    P
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={attendance[student.id] === "ABSENT" ? "destructive" : "outline"}
                                                    className={`h-8 w-10 text-xs ${attendance[student.id] === "ABSENT" ? "shadow-sm" : "text-gray-400"}`}
                                                    onClick={() => !schedule.attendance_completed && setAttendance(prev => ({ ...prev, [student.id]: "ABSENT" }))}
                                                    disabled={schedule.attendance_completed}
                                                >
                                                    A
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Footer Summary */}
                    <div className="p-6 bg-gray-50 border-t flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex gap-8 text-sm items-center">
                            <span className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-green-600"></span>
                                <span className="text-gray-500 font-medium">Present:</span>
                                <strong className="text-gray-800">{presentCount}</strong>
                            </span>
                            <span className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
                                <span className="text-gray-500 font-medium">Absent:</span>
                                <strong className="text-gray-800">{absentCount}</strong>
                            </span>
                            <div className="h-4 w-px bg-gray-300 mx-2 hidden md:block"></div>
                            <span className="text-gray-500 font-medium">
                                Total Scale: <span className="text-gray-800 font-bold">{students.length} Students</span>
                            </span>
                        </div>

                        {!schedule.attendance_completed ? (
                            <Button
                                onClick={handlePreSubmit}
                                disabled={isSubmitting || !topic}
                                className="bg-purple-600 hover:bg-purple-700 text-white min-w-[160px] shadow-lg shadow-purple-100"
                            >
                                {isSubmitting ? "Processing..." : "Submit Attendance"}
                            </Button>
                        ) : (
                            <Button disabled className="bg-green-100 text-green-700 border-green-200 min-w-[160px]">
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Attendance Marked
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Absentees</AlertDialogTitle>
                        <AlertDialogDescription>
                            Please review the list of students marked as ABSENT for this session before submitting:
                        </AlertDialogDescription>
                        <div className="mt-4 max-h-[300px] overflow-y-auto space-y-2 border rounded-md p-2 bg-gray-50 text-left">
                            {students.filter(s => attendance[s.id] === "ABSENT").length > 0 ? (
                                students.filter(s => attendance[s.id] === "ABSENT").map(s => (
                                    <div key={s.id} className="text-sm font-medium text-red-700 flex justify-between px-2 py-1 border-b last:border-0 border-red-100 bg-red-50/50">
                                        <span>{s.roll_no}</span>
                                        <span>{s.user.name}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-sm text-center py-4 text-gray-500">
                                    All students present. Perfect attendance!
                                </div>
                            )}
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Go Back & Edit</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmAndSubmit} className="bg-purple-600 hover:bg-purple-700">
                            Confirm & Submit
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

