"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
    ArrowLeft,
    Mail,
    Phone,
    BookOpen,
    Users,
    Layers,
    Calendar
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { toast } from 'sonner';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from 'recharts';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

// Types (reusing or could be shared)
interface FacultyDetail {
    id: string;
    name: string;
    email: string;
    phone: string;
    assignedBranches: string[];
    assignedBatches: string[];
    stats: {
        total_students: number;
        placed_students: number;
        branch_breakdown: Record<string, number>;
        batch_breakdown: Record<string, number>;
    };
    students: Array<{
        id: string;
        name: string;
        rollNo: string;
        email: string;
        branch: string;
        batch: string;
        status: string;
    }>;
}

export default function FacultyDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { facultyId } = params;
    const [faculty, setFaculty] = useState<FacultyDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState("2024-2025");

    useEffect(() => {
        if (facultyId) {
            fetchFacultyDetails();
        }
    }, [facultyId, selectedYear]);

    const fetchFacultyDetails = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/faculty/${facultyId}?academic_year=${selectedYear}`);
            setFaculty(res.data);
        } catch (error) {
            toast.error("Failed to fetch faculty details");
        } finally {
            setLoading(false);
        }
    };

    if (loading && !faculty) {
        return <div className="p-8 text-center text-slate-500">Loading details...</div>;
    }

    if (!faculty) {
        return <div className="p-8 text-center text-red-500">Faculty member not found.</div>;
    }

    return (
        <div className="p-8 space-y-6 min-h-screen bg-slate-50/50">
            {/* Header & Navigation */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{faculty.name}</h1>
                        <p className="text-slate-500 text-sm">Faculty Profile & Analytics</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[180px] bg-white">
                            <SelectValue placeholder="Select Year" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="2022-2026">2022-2026</SelectItem>
                            <SelectItem value="2023-2027">2023-2027</SelectItem>
                            <SelectItem value="2024-2028">2024-2028</SelectItem>
                            <SelectItem value="2024-2025">2024-2025 (Legacy)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardContent className="pt-6 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Total Students</p>
                            <h3 className="text-2xl font-bold text-slate-900">{faculty.stats?.total_students || 0}</h3>
                            <p className="text-xs text-slate-400">Assigned across branches</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6 flex items-center gap-4">
                        <div className="p-3 bg-green-100 text-green-600 rounded-full">
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Active Batches</p>
                            <h3 className="text-2xl font-bold text-slate-900">{faculty.assignedBatches.length}</h3>
                            <p className="text-xs text-slate-400">Directly assigned</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6 flex items-center gap-4">
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
                            <Layers className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Branches Managed</p>
                            <h3 className="text-2xl font-bold text-slate-900">{faculty.assignedBranches.length}</h3>
                            <p className="text-xs text-slate-400">{faculty.assignedBranches.join(", ")}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Details */}
                <Card className="lg:col-span-1 border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                            <Mail className="w-4 h-4 text-slate-500" />
                            <div className="text-sm text-slate-700">{faculty.email}</div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                            <Phone className="w-4 h-4 text-slate-500" />
                            <div className="text-sm text-slate-700">{faculty.phone || "N/A"}</div>
                        </div>

                        <div className="pt-4">
                            <h4 className="text-sm font-semibold text-slate-900 mb-2">Assigned Assignments</h4>
                            <div className="flex flex-wrap gap-2">
                                {faculty.assignedBranches.map(b => (
                                    <Badge key={b} variant="secondary">{b}</Badge>
                                ))}
                                {faculty.assignedBatches.map(b => (
                                    <Badge key={b} variant="outline">{b}</Badge>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Analytics / Breakdown */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-lg">Placement Analytics ({selectedYear})</CardTitle>
                            <CardDescription>Placement performance for assigned students.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={[
                                            {
                                                name: 'Students',
                                                Total: faculty.stats.total_students,
                                                Placed: faculty.stats.placed_students
                                            }
                                        ]}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Legend />
                                        <Bar dataKey="Total" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={50} />
                                        <Bar dataKey="Placed" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={50} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-lg">Student List ({selectedYear})</CardTitle>
                            <CardDescription>Students currently under this faculty&apos;s branches.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Roll No</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Branch</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {faculty.students && faculty.students.length > 0 ? (
                                            faculty.students.map((student) => (
                                                <TableRow key={student.id}>
                                                    <TableCell className="font-medium">{student.rollNo}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <Link href={`/admin/students/${student.id}`} className="hover:underline text-blue-600 font-medium cursor-pointer">
                                                                {student.name}
                                                            </Link>
                                                            <span className="text-xs text-muted-foreground">{student.email}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{student.branch}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={student.status === 'Placed' ? 'success' : 'secondary'}
                                                            className={student.status === 'Placed' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}>
                                                            {student.status || 'Unplaced'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center">
                                                    No students found for this filter.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
