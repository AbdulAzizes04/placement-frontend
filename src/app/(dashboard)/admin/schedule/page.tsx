"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Calendar, Users, Eye, Trash2 } from "lucide-react";
import api from "@/lib/api"; // Updated import
import { Badge } from "@/components/ui/badge"; // Assuming this exists or I will use span
import { toast } from "sonner";

interface Schedule {
    id: string;
    name: string;
    type: string;
    academic_year: string;
    start_date: string;
    end_date: string;
    status: string;
    faculty: { name: string }[];
    _count: { attendances: number };
}

export default function AdminSchedulePage() {
    const router = useRouter();
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState("2024-2028");
    const [isHydrated, setIsHydrated] = useState(false);
    const academicYears = ["2022-2026", "2023-2027", "2024-2028", "2025-2029"];

    useEffect(() => {
        // 1. Check URL first
        const params = new URLSearchParams(window.location.search);
        const urlYear = params.get("year");

        if (urlYear && academicYears.includes(urlYear)) {
            setSelectedYear(urlYear);
        } else {
            // 2. Check localStorage
            const savedYear = localStorage.getItem("schedule_selected_year");
            if (savedYear && academicYears.includes(savedYear)) {
                setSelectedYear(savedYear);
            }
        }
        setIsHydrated(true);
    }, []);

    useEffect(() => {
        if (!isHydrated) return;

        fetchSchedules();

        // Sync to URL
        const url = new URL(window.location.href);
        url.searchParams.set("year", selectedYear);
        window.history.replaceState({}, "", url.toString());

        // Sync to LocalStorage
        localStorage.setItem("schedule_selected_year", selectedYear);
    }, [selectedYear, isHydrated]);

    const fetchSchedules = async () => {
        setIsLoading(true);
        try {
            const res = await api.get(`/crt/schedule?academic_year=${selectedYear}`);
            setSchedules(res.data.schedules || []);
        } catch (error) {
            console.error("Failed to fetch schedules", error);
            setSchedules([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteSchedule = async (id: string) => {
        if (!confirm("Are you sure you want to delete this schedule?")) return;
        
        try {
            await api.delete(`/crt/schedule/${id}`);
            toast.success("Schedule deleted successfully");
            setSchedules(schedules.filter(s => s.id !== id));
        } catch (error) {
            console.error("Failed to delete schedule", error);
            toast.error("Failed to delete schedule");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        CRT Training Schedule
                    </h2>
                    <p className="text-muted-foreground">Manage training periods, attendance, and faculty assignments.</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        className="h-10 pl-3 pr-8 rounded-md border border-slate-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                    >
                        {academicYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                    <Button onClick={() => router.push("/admin/schedule/create")} className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200">
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Schedule
                    </Button>
                </div>
            </div>

            <Card className="border-t-4 border-t-blue-600 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        Upcoming & Active Schedules
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Schedule Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Year</TableHead>
                                <TableHead>Assigned Faculty</TableHead>
                                <TableHead>Dates</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">Loading schedules...</TableCell>
                                </TableRow>
                            ) : schedules.length > 0 ? (
                                schedules.map((schedule) => {
                                    const start = new Date(schedule.start_date);
                                    const end = new Date(schedule.end_date);
                                    const now = new Date();
                                    const isActive = start <= now && end >= now;

                                    return (
                                        <TableRow key={schedule.id} className="hover:bg-gray-50 transition-colors">
                                            <TableCell className="font-semibold text-gray-800">{schedule.name}</TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${schedule.type === 'BATCH' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                                                    {schedule.type}
                                                </span>
                                            </TableCell>
                                            <TableCell>{schedule.academic_year}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1.5 max-w-[200px]">
                                                    {schedule.faculty.length > 0 ? (
                                                        <>
                                                            {schedule.faculty.slice(0, 3).map((f, i) => (
                                                                <div key={i} className="flex items-center gap-2" title={f.name}>
                                                                    <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 shrink-0 flex items-center justify-center text-[10px] font-bold text-blue-600">
                                                                        {f.name.charAt(0)}
                                                                    </div>
                                                                    <span className="text-sm font-medium text-gray-700 truncate">{f.name}</span>
                                                                </div>
                                                            ))}
                                                            {schedule.faculty.length > 3 && (
                                                                <span className="text-xs text-muted-foreground pl-8">+{schedule.faculty.length - 3} more</span>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="text-sm text-gray-400 italic">Unassigned</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-500">
                                                {start.toLocaleDateString()} - {end.toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${isActive ? 'bg-green-100 text-green-700' :
                                                    (end < now) ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {isActive ? 'Active' : (end < now ? 'Completed' : 'Upcoming')}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/schedule/${schedule.id}`)}>
                                                        <Eye className="w-4 h-4 text-gray-500 hover:text-blue-600" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteSchedule(schedule.id)}>
                                                        <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                        No schedules found. Click &quot;Create New Schedule&quot; to start.
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
