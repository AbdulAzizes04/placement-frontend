"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePlacement } from "@/contexts/PlacementContext";
import { Users, FileCheck, CalendarCheck, Download } from "lucide-react";
import { AttendanceModal } from "@/components/attendance-modal";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function StaffDashboard() {
    const { user } = useAuth();
    const { students, batches, currentBatch, setBatch, stats, announcements, getStatistics } = usePlacement();
    const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        getStatistics({ batch: currentBatch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentBatch, getStatistics]);

    // Filter students by staff's managed branch
    const staffBranch = user?.managedBranch || "CSE"; // Fallback for dev/demo if not set
    const branchStudents = students.filter(s =>
        s.branch === staffBranch &&
        (currentBatch === "All" || s.batch === currentBatch)
    );

    // Get true metrics from global stats instead of paginated array
    const branchStatItem = (stats?.branchDistribution as { branch: string; total: number; placed: number }[] | undefined)?.find((b) => b.branch === staffBranch);
    const totalStudents = branchStatItem?.total || 0;
    const placedStudents = branchStatItem?.placed || 0;
    const placementPercentage = totalStudents > 0 ? ((placedStudents / totalStudents) * 100).toFixed(1) : "0";

    // Calculate total companies announced for this branch
    const companiesAnnounced = announcements?.filter(a =>
        (a.allowed_branches.includes("All") || a.allowed_branches.includes(staffBranch))
    ).length || 0;

    const handleSaveAttendance = (date: string, subject: string, presentIds: string[]) => {
        // In a real app, this would be an API call
        console.log(`Saving attendance for ${date} - ${subject}`, presentIds);

        // Mock update local state if we had one for attendance, or just toast
        toast.success("Attendance Saved", {
            description: `Marked ${presentIds.length} / ${totalStudents} students present for ${subject}.`
        });
        setIsAttendanceOpen(false);
    };

    const handleExport = () => {
        toast.info("Downloading Report...");
        // Mock CSV export
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Staff Dashboard ({staffBranch})</h2>
                    <p className="text-muted-foreground">Manage your branch students and attendance.</p>
                </div>
                <div className="flex gap-2">
                    <select
                        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        value={currentBatch}
                        onChange={(e) => setBatch(e.target.value)}
                    >
                        {batches.map(batch => (
                            <option key={batch} value={batch}>{batch}</option>
                        ))}
                    </select>
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="w-4 h-4 mr-2" />
                        Export Report
                    </Button>
                    <Button className="bg-blue-600" onClick={() => setIsAttendanceOpen(true)}>
                        <CalendarCheck className="w-4 h-4 mr-2" />
                        Mark Attendance
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalStudents}</div>
                        <p className="text-xs text-muted-foreground">{staffBranch} Branch</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Placed</CardTitle>
                        <FileCheck className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{placedStudents}</div>
                        <p className="text-xs text-muted-foreground">{placementPercentage}% Placement Rate</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Companies Announced</CardTitle>
                        <CalendarCheck className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{companiesAnnounced}</div>
                        <p className="text-xs text-muted-foreground">Eligible for {staffBranch}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="rounded-md border bg-white p-4">
                <h3 className="text-lg font-semibold mb-4">Recent {staffBranch} Students</h3>
                {/* Re-using a simplified list or the same Table from Admin can go here, 
                    but for brevity, just a summary list */}
                <div className="space-y-2">
                    {branchStudents.slice(0, 5).map(s => (
                        <div key={s.id} onClick={() => router.push(`/staff/students/${s.id}`)} className="cursor-pointer flex justify-between items-center p-2 hover:bg-slate-50 rounded border-b last:border-0 transition-colors">
                            <div>
                                <p className="font-medium">{s.name}</p>
                                <p className="text-xs text-gray-500">{s.email}</p>
                            </div>
                            <div className="text-right">
                                <span className={`text-xs px-2 py-1 rounded-full ${s.status === 'Placed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                    {s.status}
                                </span>
                            </div>
                        </div>
                    ))}
                    {branchStudents.length === 0 && <p className="text-gray-500 text-sm">No students found.</p>}
                </div>
            </div>

            <AttendanceModal
                isOpen={isAttendanceOpen}
                onClose={() => setIsAttendanceOpen(false)}
                students={branchStudents}
                branch={staffBranch}
                onSave={handleSaveAttendance}
            />


        </div>
    );
}
