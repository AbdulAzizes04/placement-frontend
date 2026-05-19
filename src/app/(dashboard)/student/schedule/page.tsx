"use client";

import { usePlacement } from "@/contexts/PlacementContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Clock, CheckCircle2, XCircle, BookOpen } from "lucide-react";
import React, { useState, useEffect } from "react";
import api from "@/lib/api";

type AttendanceRecord = {
    id: string;
    date: string;
    section: string;
    status: string;
    topic?: string;
    schedule?: { name: string };
};

export default function StudentSchedulePage() {
    const { crtBatches, crtSchedules } = usePlacement();
    const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchAttendance();
    }, []);

    const fetchAttendance = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/crt/attendance/student');
            setAttendanceHistory(response.data);
        } catch (error) {
            console.error("Failed to fetch attendance:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 pb-10">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Placement Training & Attendance</h2>
                <p className="text-muted-foreground italic">Track your CRT sessions and attendance status in real-time.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-l-4 border-l-blue-500 shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-blue-700">
                            <Clock className="w-5 h-5" />
                            My Training Sections
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="py-2 text-[11px] uppercase tracking-wider">Section Name</TableHead>
                                    <TableHead className="py-2 text-[11px] uppercase tracking-wider">Trainer</TableHead>
                                    <TableHead className="py-2 text-[11px] uppercase tracking-wider">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {crtBatches.length > 0 ? (
                                    crtBatches.map((batch) => {
                                        const end = batch.end_date ? new Date(batch.end_date) : null;
                                        const now = new Date();
                                        const isCompleted = end && end < now;

                                        return (
                                            <TableRow key={batch.id}>
                                                <TableCell className="font-medium py-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm">{batch.batch_name}</span>
                                                        <span className="text-[10px] text-muted-foreground">{batch.academic_year}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <User className="w-3 h-3 text-gray-400" />
                                                        {batch.trainer_name || "TBD"}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    <Badge variant={isCompleted ? "secondary" : "default"} className={!isCompleted ? "bg-green-600 hover:bg-green-700 text-[10px] h-5 px-2" : "text-[10px] h-5 px-2"}>
                                                        {isCompleted ? 'Completed' : 'Active Section'}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground text-sm italic">
                                            No training sections assigned yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500 shadow-md bg-linear-to-br from-white to-purple-50/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-purple-700">
                            <CheckCircle2 className="w-5 h-5" />
                            Attendance Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center min-h-[160px]">
                        {attendanceHistory.length > 0 ? (
                            <>
                                <div className="text-5xl font-black text-purple-600 drop-shadow-sm">
                                    {Math.round((attendanceHistory.filter(a => a.status === 'PRESENT').length / attendanceHistory.length) * 100)}%
                                </div>
                                <p className="text-xs font-semibold text-purple-400 mt-1 uppercase tracking-widest">Aggregate Score</p>
                                <div className="grid grid-cols-3 gap-6 mt-6 w-full max-w-[280px]">
                                    <div className="text-center group">
                                        <div className="text-sm font-bold text-green-600 group-hover:scale-110 transition-transform">{attendanceHistory.filter(a => a.status === 'PRESENT').length}</div>
                                        <div className="text-[10px] font-medium text-muted-foreground uppercase">Present</div>
                                    </div>
                                    <div className="text-center group">
                                        <div className="text-sm font-bold text-red-600 group-hover:scale-110 transition-transform">{attendanceHistory.filter(a => a.status === 'ABSENT').length}</div>
                                        <div className="text-[10px] font-medium text-muted-foreground uppercase">Absent</div>
                                    </div>
                                    <div className="text-center group">
                                        <div className="text-sm font-bold text-blue-600 group-hover:scale-110 transition-transform">{attendanceHistory.length}</div>
                                        <div className="text-[10px] font-medium text-muted-foreground uppercase">Total</div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center text-muted-foreground py-10">
                                <BookOpen className="w-8 h-8 opacity-20 mx-auto mb-2" />
                                <p className="text-sm italic">Attendance data will appear once sessions begin.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card className="border-l-4 border-l-sky-500 shadow-md">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sky-700">
                        <Calendar className="w-5 h-5 text-sky-600" />
                        Upcoming & Active Training Schedules
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="py-2 text-[11px] uppercase tracking-wider">Schedule Name</TableHead>
                                <TableHead className="py-2 text-[11px] uppercase tracking-wider">Type</TableHead>
                                <TableHead className="py-2 text-[11px] uppercase tracking-wider">Dates</TableHead>
                                <TableHead className="py-2 text-[11px] uppercase tracking-wider text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {crtSchedules.length > 0 ? (
                                crtSchedules.map((schedule) => {
                                    const start = new Date(schedule.start_date);
                                    const end = new Date(schedule.end_date);
                                    const now = new Date();
                                    const isActive = start <= now && end >= now;
                                    const isUpcoming = start > now;

                                    return (
                                        <TableRow key={schedule.id} className="hover:bg-sky-50/30 transition-colors">
                                            <TableCell className="font-semibold py-4">
                                                <div className="flex items-center gap-2">
                                                    <BookOpen className="w-4 h-4 text-sky-400" />
                                                    {schedule.name}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <Badge variant="outline" className="text-[10px] uppercase font-bold border-sky-200 text-sky-700 bg-sky-50/50">
                                                    {schedule.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm py-4">
                                                <div className="flex flex-col">
                                                    <span>{start.toLocaleDateString()}</span>
                                                    <span className="text-[10px] text-muted-foreground">to {end.toLocaleDateString()}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4 text-right">
                                                <Badge
                                                    variant={isActive ? "default" : (isUpcoming ? "outline" : "secondary")}
                                                    className={isActive ? "bg-green-600 hover:bg-green-700 text-[10px] h-6" : "text-[10px] h-6"}
                                                >
                                                    {isActive ? 'Ongoing' : (isUpcoming ? 'Upcoming' : 'Completed')}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground text-sm">
                                        No training schedules found for your profile.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card className="shadow-lg border-none bg-white overflow-hidden">
                <CardHeader className="bg-gray-50/50 border-b">
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        My Attendance History
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/30">
                                <TableHead className="w-[150px]">Date</TableHead>
                                <TableHead className="w-[120px]">Session</TableHead>
                                <TableHead>Topic Covered</TableHead>
                                <TableHead>Training</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">Loading attendance data...</TableCell>
                                </TableRow>
                            ) : attendanceHistory.length > 0 ? (
                                attendanceHistory.map((record) => (
                                    <TableRow key={record.id} className="hover:bg-blue-50/30 transition-colors">
                                        <TableCell className="font-medium">
                                            {new Date(record.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`font-semibold ${record.section === 'MORNING' ? 'border-amber-200 text-amber-700 bg-amber-50' : 'border-blue-200 text-blue-700 bg-blue-50'}`}>
                                                {record.section}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-start gap-2 max-w-[300px]">
                                                <BookOpen className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
                                                <span className="text-sm line-clamp-2">{record.topic || "N/A"}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground italic">
                                            {record.schedule?.name || "General CRT"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end">
                                                {record.status === 'PRESENT' ? (
                                                    <div className="flex items-center text-green-600 font-bold gap-1 bg-green-50 px-3 py-1 rounded-full text-xs border border-green-100 shadow-sm">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        PRESENT
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center text-red-600 font-bold gap-1 bg-red-50 px-3 py-1 rounded-full text-xs border border-red-100 shadow-sm">
                                                        <XCircle className="w-3 h-3" />
                                                        ABSENT
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                                            <Calendar className="w-8 h-8 opacity-20 mb-2" />
                                            <p>No attendance records found yet.</p>
                                            <p className="text-xs">Once faculty marks your attendance, it will appear here.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
