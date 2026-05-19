"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Mail, Phone, MoreHorizontal, Download, Upload, MessageSquare, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { QuestionsModal } from "@/components/questions-modal";
import { usePlacement } from "@/contexts/PlacementContext";
import { useAuth } from "@/contexts/AuthContext";
import Papa from "papaparse";
import api from "@/lib/api";
import { toast } from "sonner";
import { Student } from "@/types";

export default function AdminStudents() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const {
        currentBatch,
        setBatch,
        batches,
        questions,
        deleteStudent,
        bulkDeleteStudents,
        stats,
        refreshData
    } = usePlacement();

    const { user } = useAuth(); // Restored user context

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBranch, setSelectedBranch] = useState("All");
    const [selectedStatus, setSelectedStatus] = useState("All");
    const [selectedCrt, setSelectedCrt] = useState(() => {
        return searchParams?.get('crt') === 'true' ? 'CRT' : 'All';
    });
    const [minCgpa, setMinCgpa] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [limit, setLimit] = useState(50);

    const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
    const [isQuestionsOpen, setIsQuestionsOpen] = useState(false);

    // Delete Confirmation State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState<{ id: string, name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Bulk Delete State
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [importErrors, setImportErrors] = useState<{ row: number; reason: string }[]>([]);
    const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    // Import Progress State
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0, visible: false });

    const branches = ["CSE", "ECE", "EEE", "MECH", "CIVIL", "AIML", "AI&DS", "CS-DS", "CS-AI"];

    const { data, refetch: refetchStudents, isLoading } = useQuery({
        queryKey: ['admin-students', currentPage, limit, searchQuery, selectedBranch, selectedStatus, selectedCrt, currentBatch, minCgpa],
        queryFn: async () => {
            const filters: Record<string, unknown> = {};
            if (searchQuery) filters.search = searchQuery;
            if (selectedBranch !== "All") filters.branch = selectedBranch;
            if (selectedStatus !== "All") filters.status = selectedStatus;
            if (selectedCrt !== "All") filters.is_crt = selectedCrt === "CRT";
            if (currentBatch !== "All") filters.batch = currentBatch;
            if (minCgpa) filters.min_cgpa = parseFloat(minCgpa);

            const res = await api.get('/students', { params: { page: currentPage, limit, ...filters } });
            return res.data;
        }
    });

    const filteredStudents = data?.data || [];
    const studentPagination = data?.meta || { total: 0, page: 1, limit: 50, totalPages: 1 };

    // Use global stats so counts match the Dashboard (don't calculate from paginated subset)
    const totalCount = Number(stats?.total) || studentPagination.total || 0;
    const placedCount = Number(stats?.placed) || 0;
    const unplacedCount = Math.max(0, totalCount - placedCount);
    const crtCount = Number(stats?.crt) || 0;
    const nonCrtCount = Math.max(0, totalCount - crtCount);
    const placementPercentage = totalCount > 0 ? ((placedCount / totalCount) * 100).toFixed(1) : "0.0";

    const handleDownloadTemplate = () => {
        const headers = ["Name,Roll No,Branch,Year,Batch,CGPA,Contact,Status,Email,CRT"];
        const exampleRow = ["John Doe,123456,CSE,4,2022-2026,8.5,9876543210,Unplaced,john@example.com,Yes"];
        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...exampleRow].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "student_import_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const data: Record<string, string>[] = results.data as Record<string, string>[];
                console.log("Raw CSV Data (First Row):", data[0]);

                if (data.length === 0) {
                    toast.error("CSV is empty");
                    return;
                }

                // Helper to loosely find keys
                // We typically look for "Name", "Roll No", "Branch", "Year", "Batch", "CGPA"
                const findKey = (row: Record<string, string>, candidates: string[]) => {
                    const keys = Object.keys(row);
                    const match = keys.find(k => candidates.some(c => k.toLowerCase().replace(/[^a-z0-9]/g, '') === c.toLowerCase().replace(/[^a-z0-9]/g, '')));
                    return match;
                };

                // Explicit Mapping & Validation (Strict but smart)
                const validStudents = data.map((row: Record<string, string>, index) => {
                    // Normalize keys
                    const nameKey = findKey(row, ["Name", "Student Name"]);
                    const rollKey = findKey(row, ["Roll No", "RollNo", "Roll Number", "ID"]);
                    const branchKey = findKey(row, ["Branch", "Department"]);
                    const yearKey = findKey(row, ["Year", "Current Year"]);
                    const batchKey = findKey(row, ["Batch", "Class"]);
                    const cgpaKey = findKey(row, ["CGPA", "GPA", "Score"]);
                    const contactKey = findKey(row, ["Contact", "Phone", "Mobile"]);
                    const emailKey = findKey(row, ["Email", "Mail"]);
                    const statusKey = findKey(row, ["Status", "Placement Status"]);
                    const crtKey = findKey(row, ["CRT", "Training", "CRT Status"]);

                    // Handle Phone Scientific Notation if present (e.g., 7.32E+09)
                    let phone = contactKey ? row[contactKey]?.trim() : undefined;
                    if (phone && phone.includes('E+')) {
                        try {
                            phone = Number(phone).toLocaleString('fullwide', { useGrouping: false });
                        } catch (e) { /* ignore */ }
                    }

                    // Normalize Status
                    let status = statusKey ? row[statusKey]?.trim() : undefined;
                    if (status) {
                        status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
                    }

                    // Normalize CRT
                    const crtRaw = crtKey ? row[crtKey]?.trim().toLowerCase() : "";
                    const is_crt = crtRaw === "yes" || crtRaw === "true";

                    // Values
                    const name = nameKey ? row[nameKey]?.trim() : undefined;
                    const roll_no = rollKey ? row[rollKey]?.trim() : undefined;
                    const branch = branchKey ? row[branchKey]?.trim() : undefined;
                    const batch = batchKey ? row[batchKey]?.trim() : undefined;

                    const yearString = yearKey ? row[yearKey] : undefined;
                    let year = 0;
                    if (yearString) {
                        const match = String(yearString).match(/\d+/);
                        if (match) year = parseInt(match[0]);
                    }

                    let cgpa = 0;
                    if (cgpaKey && row[cgpaKey]) {
                        cgpa = parseFloat(row[cgpaKey]);
                    }

                    const isValid = name && roll_no && branch && year > 0 && batch && !isNaN(cgpa);

                    if (!isValid && index < 3) {
                        console.warn(`Row ${index + 1} Invalid. Check Fields:`, { name, roll_no, branch, year, batch, cgpa });
                    }

                    if (!isValid) return null;

                    return {
                        name,
                        roll_no,
                        branch,
                        year,
                        batch,
                        cgpa,
                        phone: phone || undefined,
                        email: emailKey ? row[emailKey]?.trim() : undefined,
                        status: status || undefined,
                        is_crt
                    };
                }).filter((s): s is NonNullable<typeof s> => s !== null);

                if (validStudents.length === 0) {
                    toast.error("No valid student records found. Check console for details.");
                    console.error("Debug: Keys available in first row:", Object.keys(data[0] || {}));
                    return;
                }

                // Chunking logic (500 records per chunk)
                const chunkSize = 500;
                const chunks = [];
                for (let i = 0; i < validStudents.length; i += chunkSize) {
                    chunks.push(validStudents.slice(i, i + chunkSize));
                }

                try {
                    setImportProgress({ current: 0, total: chunks.length, visible: true });
                    toast.loading(`Importing ${validStudents.length} students in ${chunks.length} batches...`);

                    let totalInserted = 0;
                    let totalUpdated = 0;
                    let totalSkipped = 0;
                    let totalFailed = 0;
                    let allErrors: { row: number; reason: string }[] = [];

                    for (let i = 0; i < chunks.length; i++) {
                        const chunk = chunks[i];
                        console.log(`Sending chunk size: ${chunk.length}`);
                        const res = await api.post("/students/bulk", { students: chunk });
                        const { inserted, updated, skipped, failed, errors } = res.data;
                        totalInserted += inserted;
                        totalUpdated += (updated || 0);
                        totalSkipped += skipped;
                        totalFailed += failed;
                        if (errors) allErrors = [...allErrors, ...errors];

                        setImportProgress({ current: i + 1, total: chunks.length, visible: true });
                    }

                    toast.dismiss();
                    toast.success(`Import Complete! Added: ${totalInserted}, Updated: ${totalUpdated}, Skipped: ${totalSkipped}, Failed: ${totalFailed}`);

                    if (allErrors.length > 0) {
                        console.error("Import Errors:", allErrors);
                        setImportErrors(allErrors);
                        setIsErrorModalOpen(true);
                        toast.warning(`Check the error report for ${allErrors.length} failed rows.`);
                    }

                    if (refreshData) {
                        await refreshData();
                    } else {
                        window.location.reload();
                    }

                } catch (error: unknown) {
                    toast.dismiss();
                    const axErr = error as { response?: { data?: { error?: string } } };
                    console.error("Import failed:", error);
                    toast.error(axErr.response?.data?.error || "Import failed during batch processing");
                } finally {
                    setTimeout(() => setImportProgress(prev => ({ ...prev, visible: false })), 2000);
                }
            },
            error: (err) => {
                console.error("CSV parse error:", err);
                toast.error("Failed to parse CSV file");
            }
        });

        // Reset input
        event.target.value = "";
    };

    const handleExport = () => {
        const esc = (val: unknown) => `"${String(val ?? '').replace(/"/g, '""')}"`;
        const headers = ["ID", "Name", "Email", "Branch", "Year", "Batch", "CGPA", "Status", "Companies"].map(esc).join(",");
        const rows = filteredStudents.map((s: Student) => {
            const companies = (s.placedCompanies ?? []).join(" | ") || "";
            return [s.id, s.name, s.email, s.branch, s.year, s.batch, s.cgpa, s.status, companies].map(esc).join(",");
        });
        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `students_${currentBatch}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDeleteClick = (e: React.MouseEvent, student: { id: string, name: string }) => {
        e.stopPropagation(); // Prevent row click
        setStudentToDelete(student);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!studentToDelete) return;

        setIsDeleting(true);
        try {
            // Note: student.id in context is typically mapped to user_id or profile_id.
            // Backend expects ID (usually profile_id in REST, or logic handles it).
            // Context `deleteStudent` passes the ID.
            await deleteStudent(studentToDelete.id);
            toast.success("Student deleted successfully");
            setIsDeleteModalOpen(false);
            setStudentToDelete(null);
            await refetchStudents();
        } catch (error: unknown) {
            console.error("Delete failed:", error);
            const axErr = error as { response?: { status?: number; data?: { error?: string } } };
            if (axErr.response?.status === 403) {
                toast.error("Only Admins can delete students");
            } else {
                toast.error(axErr.response?.data?.error || "Failed to delete student");
            }
        } finally {
            setIsDeleting(false);
        }
    };
    const handleBulkDelete = async () => {
        if (selectedStudents.length === 0) return;

        setIsBulkDeleting(true);
        try {
            await bulkDeleteStudents(selectedStudents);
            toast.success(`Successfully deleted ${selectedStudents.length} students`);
            setSelectedStudents([]); // Clear selection
            setIsBulkDeleteModalOpen(false);
            await refreshData();
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete selected students");
        } finally {
            setIsBulkDeleting(false);
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            // Only select visible/filtered students
            setSelectedStudents(filteredStudents.map((s: Student) => s.id));
        } else {
            setSelectedStudents([]);
        }
    };

    const handleSelectRow = (studentId: string, checked: boolean) => {
        if (checked) {
            setSelectedStudents(prev => [...prev, studentId]);
        } else {
            setSelectedStudents(prev => prev.filter(id => id !== studentId));
        }
    };

    // Delete All State
    const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
    const [adminPassword, setAdminPassword] = useState("");
    const [isDeletingAll, setIsDeletingAll] = useState(false);

    const handleDeleteAll = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adminPassword) return;

        setIsDeletingAll(true);
        try {
            await api.delete('/students/all', { data: { password: adminPassword } });
            toast.success("All students deleted successfully");
            setIsDeleteAllModalOpen(false);
            setAdminPassword("");
            if (refreshData) await refreshData();
        } catch (error: unknown) {
            console.error(error);
            const axErr = error as { response?: { data?: { error?: string } } };
            toast.error(axErr.response?.data?.error || "Failed to delete all students");
        } finally {
            setIsDeletingAll(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Bulk Action Bar */}
            {selectedStudents.length > 0 && user?.role === 'ADMIN' && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-50 border border-red-200 shadow-lg rounded-full px-6 py-3 flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
                    <span className="font-semibold text-red-700">{selectedStudents.length} Students Selected</span>
                    <div className="h-4 w-px bg-red-200"></div>
                    <Button
                        size="sm"
                        variant="default"
                        onClick={() => setIsBulkDeleteModalOpen(true)}
                        className="bg-red-600 hover:bg-red-700 text-white border-0 shadow-sm"
                    >
                        Delete Selected
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedStudents([])}
                        className="text-red-600 hover:text-red-700 hover:bg-red-100"
                    >
                        Cancel
                    </Button>
                </div>
            )}

            {/* Import Progress Bar */}
            {importProgress.visible && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-white border border-blue-200 shadow-lg rounded-lg p-4 w-96 animate-in fade-in slide-in-from-top-4">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-blue-800">Importing Data...</span>
                        <span className="text-xs font-medium text-blue-600">
                            {(() => {
                                const pct = importProgress.total > 0
                                    ? Math.round((importProgress.current / importProgress.total) * 100)
                                    : 0;
                                return `Batch ${importProgress.current} of ${importProgress.total} (${pct}%)`;
                            })()}
                        </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                            style={{ width: `${importProgress.total > 0 ? Math.round((importProgress.current / importProgress.total) * 100) : 0}%` }}
                        ></div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Manage Students</h2>
                    <p className="text-muted-foreground">View and manage student records.</p>
                </div>
                <div className="flex gap-2">
                    {user?.role === 'ADMIN' && (
                        <Button variant="destructive" onClick={() => setIsDeleteAllModalOpen(true)} className="bg-red-600 hover:bg-red-700">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete All
                        </Button>
                    )}
                    <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
                        <Download className="w-4 h-4" />
                        Template
                    </Button>
                    <div className="relative">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleImport}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Button variant="outline" className="gap-2">
                            <Upload className="w-4 h-4 mr-2" />
                            Import CSV
                        </Button>
                    </div>
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                    </Button>
                    <Button variant="outline" onClick={() => setIsQuestionsOpen(true)} className="gap-2 border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 hover:text-orange-900 border-dashed">
                        <MessageSquare className="w-4 h-4" />
                        Inquiries ({questions.filter(q => !q.answer).length})
                    </Button>
                    <Button className="bg-blue-600" onClick={() => setIsAddStudentOpen(true)}>Add Student</Button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card className="border-none shadow-md">
                    <CardContent className="pt-6">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-500">Total Students</p>
                            {isLoading ? <Skeleton className="h-9 w-16" /> : <p className="text-3xl font-bold text-gray-900">{totalCount}</p>}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-linear-to-br from-indigo-50 to-indigo-100">
                    <CardContent className="pt-6">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-indigo-700">CRT Registered</p>
                            {isLoading ? <Skeleton className="h-9 w-16" /> : <p className="text-3xl font-bold text-indigo-900">{crtCount}</p>}
                            <p className="text-xs text-indigo-600">{totalCount > 0 ? ((crtCount / totalCount) * 100).toFixed(1) : '0'}% of total</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-linear-to-br from-gray-50 to-gray-200">
                    <CardContent className="pt-6">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">Non-CRT</p>
                            {isLoading ? <Skeleton className="h-9 w-16" /> : <p className="text-3xl font-bold text-gray-900">{nonCrtCount}</p>}
                            <p className="text-xs text-gray-600">{totalCount > 0 ? ((nonCrtCount / totalCount) * 100).toFixed(1) : '0'}% of total</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-linear-to-br from-green-50 to-green-100">
                    <CardContent className="pt-6">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-green-700">Placed</p>
                            {isLoading ? <Skeleton className="h-9 w-16" /> : <p className="text-3xl font-bold text-green-900">{placedCount}</p>}
                            <p className="text-xs text-green-600">{placementPercentage}% of total</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-linear-to-br from-blue-50 to-blue-100">
                    <CardContent className="pt-6">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-blue-700">Unplaced</p>
                            {isLoading ? <Skeleton className="h-9 w-16" /> : <p className="text-3xl font-bold text-blue-900">{unplacedCount}</p>}
                            <p className="text-xs text-blue-600">{totalCount > 0 ? ((unplacedCount / totalCount) * 100).toFixed(1) : 0}% of total</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-linear-to-br from-purple-50 to-purple-100">
                    <CardContent className="pt-6">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-purple-700">Placement Rate</p>
                            {isLoading ? <Skeleton className="h-9 w-16" /> : <p className="text-3xl font-bold text-purple-900">{placementPercentage}%</p>}
                            <p className="text-xs text-purple-600">Success rate</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="relative w-72">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search by name or email..."
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 items-center">

                        <select
                            className="flex h-10 w-[130px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                        >
                            <option value="All">All Status</option>
                            <option value="Placed">Placed</option>
                            <option value="Unplaced">Unplaced</option>
                        </select>
                        <select
                            className="flex h-10 w-[130px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={currentBatch}
                            onChange={(e) => setBatch(e.target.value)}
                        >
                            {batches.map((batch) => (
                                <option key={batch} value={batch}>{batch}</option>
                            ))}
                        </select>
                        <select
                            className="flex h-10 w-[130px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                        >
                            <option value="All">All Branches</option>
                            {branches.map(branch => (
                                <option key={branch} value={branch}>{branch}</option>
                            ))}

                        </select>
                        <select
                            className="flex h-10 w-[110px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={selectedCrt}
                            onChange={(e) => setSelectedCrt(e.target.value)}
                        >
                            <option value="All">All CRT</option>
                            <option value="CRT">CRT</option>
                            <option value="Non-CRT">Non-CRT</option>
                        </select>
                        <Input
                            type="number"
                            placeholder="Min CGPA"
                            className="w-[90px]"
                            value={minCgpa}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (val > 10) return;
                                setMinCgpa(e.target.value);
                            }}
                            onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                            min="0"
                            max="10"
                            step="0.1"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    {user?.role === 'ADMIN' && (
                                        <Checkbox
                                            checked={filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length}
                                            onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                            aria-label="Select all"
                                        />
                                    )}
                                </TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Roll No</TableHead>
                                <TableHead>Branch</TableHead>
                                <TableHead>Year</TableHead>
                                <TableHead>CGPA</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Batch</TableHead>
                                <TableHead>CRT</TableHead>
                                <TableHead>Status</TableHead>

                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStudents.length > 0 ? (
                                filteredStudents.map((student: Student) => (
                                    <TableRow
                                        key={student.id}
                                        className="hover:bg-gray-50 group"
                                    >
                                        <TableCell>
                                            {user?.role === 'ADMIN' && (
                                                <Checkbox
                                                    checked={selectedStudents.includes(student.id)}
                                                    onCheckedChange={(checked) => handleSelectRow(student.id, checked as boolean)}
                                                    aria-label={`Select ${student.name}`}
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div
                                                onClick={() => router.push(`/admin/students/${student.id}`)}
                                                className="cursor-pointer"
                                            >
                                                <p className="font-medium text-blue-600 group-hover:underline">{student.name}</p>
                                                {student.shortlistCounts && student.shortlistCounts.length > 0 && (
                                                    <div className="mt-1 text-xs text-gray-600 space-y-0.5">
                                                        {(student.shortlistCounts as { company: string; count: number }[] | undefined)?.map((sc) => (
                                                            <div key={sc.company} className="inline-block mr-3">
                                                                <span className="font-medium text-[11px] text-gray-700">{sc.company}</span>
                                                                <span className="ml-1 text-xs text-gray-500">({sc.count})</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{student.rollNumber || "N/A"}</TableCell>
                                        <TableCell>{student.branch}</TableCell>
                                        <TableCell>{student.year}</TableCell>
                                        <TableCell>{student.cgpa}</TableCell>
                                        <TableCell>
                                            {student.phone ? (
                                                <a
                                                    href={`tel:${student.phone}`}
                                                    className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                                                    title={`Call ${student.phone}`}
                                                    aria-label={`Call ${student.name}`}
                                                >
                                                    <Phone className="w-4 h-4" />
                                                </a>
                                            ) : (
                                                <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 text-gray-400 cursor-not-allowed opacity-50">
                                                    <Phone className="w-4 h-4" />
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {student.email ? (
                                                <a
                                                    href={`mailto:${student.email}`}
                                                    className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                                    title={`Email ${student.email}`}
                                                    aria-label={`Email ${student.name}`}
                                                >
                                                    <Mail className="w-4 h-4" />
                                                </a>
                                            ) : (
                                                <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 text-gray-400 cursor-not-allowed opacity-50">
                                                    <Mail className="w-4 h-4" />
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>{student.batch}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${student.is_crt ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                {student.is_crt ? 'Yes' : 'No'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1 items-start">
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${student.status === 'Placed' ? 'bg-green-100 text-green-700' :
                                                    student.status === 'Inactive' ? 'bg-red-100 text-red-700' :
                                                        'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {student.status}
                                                </span>
                                                {student.status === 'Placed' && student.placedCompanies && student.placedCompanies.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1 max-w-[150px]">
                                                        {student.placedCompanies.map((comp: string) => (
                                                            <span key={comp} className="text-[10px] bg-green-50 border border-green-200 text-green-800 px-1.5 py-0.5 rounded shadow-sm">
                                                                {comp}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>

                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={user?.role === 'ADMIN' ? 11 : 10} className="h-24 text-center">
                                        No students found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    <div className="flex items-center justify-between mt-4 px-2">
                        <p className="text-sm text-muted-foreground">
                            Showing page {studentPagination.page} of {studentPagination.totalPages} ({studentPagination.total} total students)
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(studentPagination.totalPages, prev + 1))}
                                disabled={currentPage === studentPagination.totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Modal
                isOpen={isAddStudentOpen}
                onClose={() => setIsAddStudentOpen(false)}
                title="Add New Student"
            >
                <form className="space-y-4" onSubmit={(e) => {
                    e.preventDefault();
                    // Handle form submission here
                    alert("Student added!");
                    setIsAddStudentOpen(false);
                }}>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Full Name</label>
                            <Input placeholder="John Doe" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Roll Number</label>
                            <Input placeholder="12345678" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <Input type="email" placeholder="john@example.com" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Phone</label>
                            <Input placeholder="9876543210" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Branch</label>
                            <select className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                {branches.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Year</label>
                            <select className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                <option value="1">1st Year</option>
                                <option value="2">2nd Year</option>
                                <option value="3">3rd Year</option>
                                <option value="4">4th Year</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">CGPA</label>
                            <Input type="number" step="0.01" min="0" max="10" placeholder="8.5" required />
                        </div>

                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsAddStudentOpen(false)}>Cancel</Button>
                        <Button type="submit" className="bg-blue-600">Add Student</Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => { if (!isDeleting) setIsDeleteModalOpen(false); }}
                title="Delete Student"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                        Are you sure you want to delete <strong>{studentToDelete?.name}</strong>?
                        This action will remove all related records (placements, profile, etc.) and cannot be undone.
                    </p>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteModalOpen(false)}
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={confirmDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? "Deleting..." : "Confirm Delete"}
                        </Button>
                    </div>
                </div>
            </Modal>

            <QuestionsModal isOpen={isQuestionsOpen} onClose={() => setIsQuestionsOpen(false)} />
            {/* Bulk Delete Modal */}
            <Modal
                isOpen={isBulkDeleteModalOpen}
                onClose={() => setIsBulkDeleteModalOpen(false)}
                title="Delete Selected Students"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                        Are you sure you want to delete <span className="font-bold text-red-600">{selectedStudents.length}</span> students?
                        This action allows no undo and will permanently remove their application and attendance records.
                    </p>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsBulkDeleteModalOpen(false)} disabled={isBulkDeleting}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleBulkDelete} disabled={isBulkDeleting} className="bg-red-600 hover:bg-red-700">
                            {isBulkDeleting ? "Deleting..." : "Confirm Delete"}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete All Modal */}
            <Modal
                isOpen={isDeleteAllModalOpen}
                onClose={() => setIsDeleteAllModalOpen(false)}
                title="Danger: Delete ALL Students"
            >
                <form onSubmit={handleDeleteAll} className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
                        <p className="font-bold">Warning: This action is irreversible!</p>
                        <p>This will permanently delete ALL student data, including:</p>
                        <ul className="list-disc ml-5 mt-1">
                            <li>All Student Profiles</li>
                            <li>All User Accounts (Students)</li>
                            <li>All Application Records</li>
                            <li>All Attendance Records</li>
                        </ul>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Verify Admin Password</label>
                        <Input
                            type="password"
                            required
                            placeholder="Enter your admin password"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsDeleteAllModalOpen(false)} disabled={isDeletingAll}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="destructive" disabled={isDeletingAll} className="bg-red-600 hover:bg-red-700">
                            {isDeletingAll ? "DELETING ALL..." : "I Understand, Delete Everything"}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Import Error Report Modal */}
            <Modal
                isOpen={isErrorModalOpen}
                onClose={() => setIsErrorModalOpen(false)}
                title="Import Issues Report"
            >
                <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
                        The following rows could not be imported. Please review the reasons below.
                    </div>
                    <div className="max-h-[400px] overflow-y-auto border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">Row</TableHead>
                                    <TableHead>Reason</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {importErrors.map((err, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell className="font-medium">{err.row}</TableCell>
                                        <TableCell className="text-red-600">{err.reason}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={() => setIsErrorModalOpen(false)}>Close</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
