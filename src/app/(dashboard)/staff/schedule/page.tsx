"use client";


import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckSquare, AlertCircle, CheckCircle } from "lucide-react";
import api from "@/lib/api";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";

interface Schedule {
    id: string;
    name: string;
    type: string;
    academic_year: string;
    branch?: string;
    start_date: string;
    end_date: string;
    room_no: string;
    status: string;
    attendance_completed: boolean;
    totalSessions: number;
    markedSessions: number;
    isPending: boolean;
}

export default function StaffSchedulePage() {
    const router = useRouter();
    const { data: schedules = [], isLoading } = useQuery<Schedule[]>({
        queryKey: ["staff-schedules"],
        queryFn: async () => {
            const res = await api.get("/crt/schedule/faculty");
            return res.data.schedules || [];
        }
    });

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    My Training Schedules
                </h2>
                <p className="text-muted-foreground">View your assigned training schedules and mark attendance.</p>
            </div>

            <Card className="border-t-4 border-t-purple-600 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-purple-600" />
                        Assigned Schedules
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Training Name</TableHead>
                                <TableHead>Scope</TableHead>
                                <TableHead>Room</TableHead>
                                <TableHead>Dates</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Attendance</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">Loading your schedules...</TableCell>
                                </TableRow>
                            ) : schedules.length > 0 ? (
                                schedules.map((schedule: Schedule) => {
                                    const start = new Date(schedule.start_date);
                                    const end = new Date(schedule.end_date);
                                    const now = new Date();
                                    const isActive = start <= now && end >= now;
                                    const isLate = end < now && !schedule.attendance_completed;

                                    return (
                                        <TableRow key={schedule.id} className="hover:bg-gray-50 transition-colors">
                                            <TableCell className="font-semibold text-gray-800">
                                                {schedule.name}
                                                <div className="text-xs text-muted-foreground mt-0.5">{schedule.academic_year}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {schedule.type}
                                                    {schedule.branch && ` - ${schedule.branch}`}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{schedule.room_no}</TableCell>
                                            <TableCell className="text-sm">
                                                {start.toLocaleDateString()} - {end.toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold w-fit ${isActive ? 'bg-green-100 text-green-700' :
                                                        (end < now) ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {isActive ? 'Active' : (end < now ? 'Completed' : 'Upcoming')}
                                                    </span>
                                                    {isLate && (
                                                        <span className="text-[10px] text-red-500 font-medium flex items-center gap-1">
                                                            <AlertCircle className="w-3 h-3" />
                                                            Deadline Passed
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-24 bg-gray-100 rounded-full h-1.5">
                                                            <div
                                                                className={`h-1.5 rounded-full ${schedule.attendance_completed ? 'bg-green-500' : 'bg-orange-400'}`}
                                                                style={{ width: `${(schedule.markedSessions / schedule.totalSessions) * 100}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                                                            {schedule.markedSessions}/{schedule.totalSessions}
                                                        </span>
                                                    </div>
                                                    {schedule.isPending ? (
                                                        <Badge variant="secondary" className="bg-orange-50 text-orange-600 border-orange-100 text-[10px] font-medium animate-pulse">
                                                            ⚠ Pending
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="bg-green-50 text-green-600 border-green-100 text-[10px] font-medium flex items-center gap-1">
                                                            <CheckCircle className="w-3 h-3" />
                                                            Completed
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => router.push(`/staff/schedule/${schedule.id}`)}
                                                    >
                                                        Details
                                                    </Button>

                                                    {schedule.attendance_completed ? (
                                                        <Button size="sm" disabled className="bg-green-50 text-green-600 border border-green-200">
                                                            <CheckCircle className="w-4 h-4 mr-1" />
                                                            Marked
                                                        </Button>
                                                    ) : (
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button
                                                                    size="sm"
                                                                    className={`${isActive || isLate ? "bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-100" : ""}`}
                                                                    disabled={!isActive && !isLate}
                                                                >
                                                                    <CheckSquare className="w-4 h-4 mr-1" />
                                                                    Mark
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Mark Attendance?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Attendance for this schedule is still pending ({schedule.markedSessions}/{schedule.totalSessions} sessions marked).
                                                                        Please ensure you complete attendance for all sessions soon.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        className="bg-purple-600 hover:bg-purple-700"
                                                                        onClick={() => router.push(`/staff/schedule/${schedule.id}/attendance`)}
                                                                    >
                                                                        Continue
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                        No schedules assigned to you yet.
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
