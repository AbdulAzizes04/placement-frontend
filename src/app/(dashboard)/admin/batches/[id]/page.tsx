"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Download,
    Users,
    GraduationCap,
    MoreHorizontal,
    Trash2,
    Search,
    Filter,
    ArrowLeft
} from 'lucide-react';
import api from '@/lib/api';
import Papa from 'papaparse';
import { toast } from 'sonner';
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

export default function BatchDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { id } = params;

    const [batch, setBatch] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [branchFilter, setBranchFilter] = useState("All");

    // --- Unassign State ---
    const [studentToUnassign, setStudentToUnassign] = useState<any | null>(null);
    const [unassigning, setUnassigning] = useState(false);

    useEffect(() => {
        if (id) {
            fetchBatchDetails();
        }
    }, [id]);

    const fetchBatchDetails = async () => {
        try {
            const res = await api.get(`/batches/${id}`);
            setBatch(res.data);
        } catch (error) {
            toast.error("Failed to fetch batch details");
            router.push('/admin/batches');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!batch) return;
        try {
            const res = await api.get(`/batches/${id}/export`);
            const data = res.data;
            const csv = Papa.unparse(data);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `batch_${batch.batch_name}_${batch.academic_year}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Batch Downloaded Successfully");
        } catch (error) {
            toast.error("Failed to download batch");
        }
    };

    const handleUnassign = async () => {
        if (!studentToUnassign) return;
        setUnassigning(true);
        try {
            await api.post('/batches/unassign', { studentId: studentToUnassign.id });
            toast.success("Student unassigned successfully");
            fetchBatchDetails();
            setStudentToUnassign(null);
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to unassign student");
        } finally {
            setUnassigning(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading batch details...</div>;
    }

    if (!batch) {
        return <div className="p-8 text-center text-slate-500">Batch not found</div>;
    }

    // Filter Logic
    const filteredStudents = batch.students.filter((student: any) => {
        const matchesSearch =
            student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.roll_no.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesBranch = branchFilter === "All" || student.branch === branchFilter;

        return matchesSearch && matchesBranch;
    });

    const branches = ["All", ...Array.from(new Set(batch.students.map((s: any) => s.branch))) as string[]];

    return (
        <div className="min-h-screen bg-white text-slate-900 p-8 pb-32">
            {/* Header */}
            <div className="mb-8">
                <Button
                    variant="ghost"
                    className="mb-4 text-slate-500 hover:text-slate-900 pl-0"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Batches
                </Button>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{batch.batch_name}</h1>
                        <p className="text-slate-500 mt-1 flex items-center gap-2">
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-sm font-medium">{batch.academic_year}</span>
                            <span className="text-slate-300">•</span>
                            <span>Created on {new Date(batch.created_at).toLocaleDateString()}</span>
                        </p>
                    </div>
                    <Button variant="outline" onClick={handleDownload}>
                        <Download className="w-4 h-4 mr-2" />
                        Download CSV
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Students</CardTitle>
                        <Users className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{batch.total_students}</div>
                    </CardContent>
                </Card>
                {/* Add more stats if needed, or placeholder for future */}
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Placed</CardTitle>
                        <GraduationCap className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">
                            {batch.students.filter((s: any) => s.status === 'Placed').length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Student List */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <CardTitle className="text-lg">Students List</CardTitle>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search student..."
                                    className="pl-9 bg-slate-50 border-slate-200"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <select
                                className="h-10 px-3 rounded-md border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                value={branchFilter}
                                onChange={(e) => setBranchFilter(e.target.value)}
                            >
                                {branches.map(b => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Name / Roll No</th>
                                    <th className="px-4 py-3 font-medium">Branch</th>
                                    <th className="px-4 py-3 font-medium">CGPA</th>
                                    <th className="px-4 py-3 font-medium">CRT Marks</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                                            No students found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStudents.map((student: any) => (
                                        <tr key={student.id} className="hover:bg-slate-50/50 group transition-colors">
                                            <td className="px-4 py-3">
                                                <div
                                                    className="font-medium text-blue-600 cursor-pointer hover:underline"
                                                    onClick={() => router.push(`/admin/students/${student.id}`)}
                                                >
                                                    {student.name}
                                                </div>
                                                <div className="text-xs text-slate-500">{student.roll_no}</div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">{student.branch}</td>
                                            <td className="px-4 py-3 text-slate-600">{student.cgpa}</td>
                                            <td className="px-4 py-3 text-slate-600 font-medium">{student.marks}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium 
                                                    ${student.status === 'Placed' ? 'bg-green-100 text-green-700' :
                                                        student.status === 'Interested' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                                    {student.status || 'Not Set'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                        onClick={() => setStudentToUnassign(student)}
                                                        title="Remove from batch"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 text-xs text-slate-400 text-center">
                        Showing {filteredStudents.length} of {batch.total_students} students
                    </div>
                </CardContent>
            </Card>

            {/* Unassign Confirmation Modal */}
            <AlertDialog open={!!studentToUnassign} onOpenChange={() => setStudentToUnassign(null)}>
                <AlertDialogContent className="bg-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove student from batch?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove <strong>{studentToUnassign?.name}</strong> ({studentToUnassign?.roll_no}) from this batch?
                            The student record will <strong>NOT</strong> be deleted, but they will be available for re-allocation.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-slate-100 hover:bg-slate-200 text-slate-700">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleUnassign}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={unassigning}
                        >
                            {unassigning ? "Removing..." : "Remove Student"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
