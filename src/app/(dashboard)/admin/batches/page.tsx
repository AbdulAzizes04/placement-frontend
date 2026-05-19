"use client";

import React, { useState, useEffect } from 'react';
import { usePlacement } from '@/contexts/PlacementContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Users,
    Upload,
    FileDown,
    Filter,
    Plus,
    Trash2,
    Eye,
    Download,
    AlertTriangle
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { useRouter } from 'next/navigation';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// --- Types ---
import { CRTBatch } from '@/types';

interface Criteria {
    branch: string;
    count: number;
    min_marks: number;
    max_marks: number;
}

interface BatchAllocRequest {
    batch_name: string;
    academic_year: string;
    criteria: Criteria[];
}

interface BranchDetail {
    branch: string;
    available: number;
}

export default function BatchesPage() {
    // --- Global State ---
    const { crtBatches, refreshData } = usePlacement();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // --- Filters ---
    const [selectedYear, setSelectedYear] = useState("2024-2028");
    const academicYears = ["2022-2026", "2023-2027", "2024-2028", "2025-2029"];

    // --- Create Batch State ---
    const [batchName, setBatchName] = useState("");
    const [globalMinMarks, setGlobalMinMarks] = useState(60);
    const [globalMaxMarks, setGlobalMaxMarks] = useState(100);
    const [availability, setAvailability] = useState<Record<string, number> | null>(null);
    const [criteriaList, setCriteriaList] = useState<Criteria[]>([]);

    // --- Import State ---
    const [importing, setImporting] = useState(false);

    // --- Manual Import Batch State ---
    const [importBatchModalOpen, setImportBatchModalOpen] = useState(false);
    const [importBatchName, setImportBatchName] = useState("");
    const [importBatchFile, setImportBatchFile] = useState<File | null>(null);
    const [importBatchLoading, setImportBatchLoading] = useState(false);

    // --- Delete State ---
    const [batchToDelete, setBatchToDelete] = useState<CRTBatch | null>(null);
    const [deleting, setDeleting] = useState(false);

    // --- Effects ---
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        // 1. Check URL first (priority)
        const params = new URLSearchParams(window.location.search);
        const urlYear = params.get("year");

        if (urlYear && academicYears.includes(urlYear)) {
            setSelectedYear(urlYear);
        } else {
            // 2. Check localStorage if no URL param
            const savedYear = localStorage.getItem("batch_selected_year");
            if (savedYear && academicYears.includes(savedYear)) {
                setSelectedYear(savedYear);
            }
        }
        setIsHydrated(true);
    }, []);

    useEffect(() => {
        if (!isHydrated) return; // Prevent overwriting during initialization

        // Update URL when filter changes
        const url = new URL(window.location.href);
        url.searchParams.set("year", selectedYear);
        window.history.replaceState({}, "", url.toString());

        // Update LocalStorage
        localStorage.setItem("batch_selected_year", selectedYear);

        // Trigger generic data refresh (could be optimized to fetch by year)
        // ideally refreshData() in context should accept params, but for now we filter client-side or assume context updates.
    }, [selectedYear, isHydrated]);

    // --- Invalidate availability when filters change ---
    useEffect(() => {
        setAvailability(null);
        setCriteriaList([]);
    }, [globalMinMarks, globalMaxMarks, selectedYear]);

    // --- Actions ---

    const handleCheckAvailability = async () => {
        // Validation
        if (Number(globalMinMarks) < 0 || Number(globalMaxMarks) > 100) {
            toast.error("Marks must be between 0 and 100");
            return;
        }
        if (Number(globalMinMarks) > Number(globalMaxMarks)) {
            toast.error("Min Marks cannot be greater than Max Marks");
            return;
        }
        if (globalMinMarks === undefined || globalMaxMarks === undefined || String(globalMinMarks) === '' || String(globalMaxMarks) === '') {
            toast.error("Both Min and Max marks are required");
            return;
        }


        setLoading(true);
        try {
            const res = await api.post('/batches/availability', {
                min_marks: globalMinMarks,
                max_marks: globalMaxMarks,
                academic_year: selectedYear
            });
            setAvailability(res.data);

            // Auto-populate criteria based on availability
            const newCriteria = Object.entries(res.data).map(([branch, count]) => ({
                branch,
                count: 0, // Default to 0 as per user request
                min_marks: globalMinMarks,
                max_marks: globalMaxMarks
            }));
            setCriteriaList(newCriteria);

            toast.success("Availability Checked", { description: "Review branch-wise counts below." });
        } catch (error) {
            toast.error("Failed to check availability");
        } finally {
            setLoading(false);
        }
    };

    const handleAllocate = async () => {
        if (!batchName) {
            toast.error("Batch Name is required");
            return;
        }

        setLoading(true);
        try {
            const payload: BatchAllocRequest = {
                batch_name: batchName,
                academic_year: selectedYear,
                criteria: criteriaList
            };

            await api.post('/batches/allocate', { batches: [payload] });
            toast.success("Batch Created Successfully");

            // Reset UI
            setBatchName("");
            setAvailability(null);
            setCriteriaList([]);
            refreshData();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string } } };
            toast.error(err.response?.data?.error || "Allocation failed");
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    // Clean data: Trim all string values and keys
                    const rawData = results.data as Record<string, unknown>[];
                    const students = rawData.map(row => {
                        const cleaned: Record<string, unknown> = {};
                        Object.keys(row).forEach(key => {
                            const val = row[key];
                            cleaned[key.trim()] = typeof val === 'string' ? val.trim() : val;
                        });
                        return cleaned;
                    });

                    await api.post('/batches/import', {
                        students,
                        academic_year: selectedYear
                    });
                    toast.success("Import Successful", { description: "Students tagged with " + selectedYear });
                    refreshData();
                } catch (error) {
                    toast.error("Import Failed");
                } finally {
                    setImporting(false);
                }
            }
        });
    };

    const handleImportBatchSubmit = () => {
        if (!importBatchName) {
            toast.error("Batch Name is required");
            return;
        }
        if (!importBatchFile) {
            toast.error("Please upload a CSV file");
            return;
        }

        setImportBatchLoading(true);
        Papa.parse(importBatchFile, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const rawData = results.data as Record<string, unknown>[];
                    const students = rawData.map(row => {
                        const cleaned: Record<string, unknown> = {};
                        Object.keys(row).forEach(key => {
                            const val = row[key];
                            cleaned[key.trim()] = typeof val === 'string' ? val.trim() : val;
                        });
                        return cleaned;
                    });

                    await api.post('/batches/create-from-csv', {
                        batch_name: importBatchName,
                        students,
                        academic_year: selectedYear
                    });

                    toast.success("Batch Imported Successfully");
                    setImportBatchModalOpen(false);
                    setImportBatchName("");
                    setImportBatchFile(null);
                    refreshData();
                } catch (error: unknown) {
                    const err = error as { response?: { data?: { error?: string } } };
                    toast.error(err.response?.data?.error || "Failed to import batch");
                } finally {
                    setImportBatchLoading(false);
                }
            }
        });
    };

    const handleDownload = async (batch: CRTBatch) => {
        try {
            const res = await api.get(`/batches/${batch.id}/export`);
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

    const handleDelete = async () => {
        if (!batchToDelete) return;

        setDeleting(true);
        try {
            await api.delete(`/batches/${batchToDelete.id}`);
            toast.success("Batch Deleted Successfully");
            refreshData();
        } catch (error) {
            toast.error("Failed to delete batch");
        } finally {
            setDeleting(false);
            setBatchToDelete(null);
        }
    };


    const handleDownloadTemplate = () => {
        const csvContent = "Name,Roll No,Branch,Batch,CGPA,Email,Marks";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'student_import_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Filter batches for display
    const filteredBatches = crtBatches.filter((b: CRTBatch) =>
        b.academic_year === selectedYear ||
        (!b.academic_year && selectedYear === '2024-2025') // Handle legacy/default
    );

    return (
        <div className="min-h-screen bg-white text-slate-900 p-8 pb-32">
            {/* --- Header --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Batch Management</h1>
                    <p className="text-slate-500 mt-1">Create and manage CRT batches for specific academic years.</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Academic Year Filter */}
                    <div className="relative">
                        <select
                            className="h-10 pl-3 pr-8 rounded-md border border-slate-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-400"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                        >
                            {academicYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>

                    {/* Download Template Button */}
                    <Button
                        variant="outline"
                        onClick={handleDownloadTemplate}
                        className="border-slate-300 text-slate-700 hover:bg-slate-50"
                        title="Download CSV Template"
                    >
                        <FileDown className="w-4 h-4 mr-2" />
                        Template
                    </Button>

                    {/* Remove Batches Button */}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="destructive"
                                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                                title={`Delete All ${selectedYear} Batches`}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Batches
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-white">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-red-600 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5" />
                                    Delete {selectedYear} Batches
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-slate-600">
                                    <span>This will permanently delete <strong>all batches</strong> created for the academic year <strong>{selectedYear}</strong>. Students will simply be unassigned and returned to the unallocated pool. Student records themselves will <strong>not</strong> be deleted.</span>
                                    <span className="block mt-4 mb-2">Please enter your admin password to confirm:</span>
                                </AlertDialogDescription>
                                <div className="mt-2 text-slate-600">
                                    <Input
                                        type="password"
                                        placeholder="Admin Password"
                                        id="admin-delete-password"
                                        className="bg-white"
                                    />
                                </div>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="bg-slate-100 hover:bg-slate-200 text-slate-700">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={async () => {
                                        const passwordInput = document.getElementById("admin-delete-password") as HTMLInputElement;
                                        if (!passwordInput || !passwordInput.value) {
                                            toast.error("Password is required to delete batches");
                                            return;
                                        }
                                        setLoading(true);
                                        try {
                                            await api.post('/batches/delete-all', {
                                                password: passwordInput.value,
                                                batch_year: selectedYear
                                            });
                                            toast.success(`Batches for ${selectedYear} deleted successfully`);
                                            refreshData();
                                        } catch (e: unknown) {
                                            const err = e as { response?: { data?: { error?: string } } };
                                            toast.error(err.response?.data?.error || "Failed to delete batches");
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                    disabled={loading}
                                >
                                    {loading ? "Deleting..." : "Yes, Delete Batches"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    {/* Import Button */}
                    <div className="relative">
                        <input
                            type="file"
                            accept=".csv"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleFileUpload}
                            disabled={importing}
                        />
                        <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50" disabled={importing}>
                            {importing ? "Importing..." : (
                                <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Import CSV
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* --- Create Batch Section --- */}
            <Card className="border-slate-200 shadow-sm mb-10 bg-slate-50/50">
                <CardHeader>
                    <CardTitle className="text-xl text-slate-800">Create New Batch</CardTitle>
                    <CardDescription>Define criteria to auto-select students from the <strong>{selectedYear}</strong> pool.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Step 1: Config */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="col-span-1 md:col-span-1 space-y-2">
                            <label className="text-sm font-medium text-slate-700">Batch Name</label>
                            <Input
                                placeholder="e.g. Elite Coders"
                                value={batchName}
                                onChange={(e) => setBatchName(e.target.value)}
                                className="bg-white border-slate-300"
                            />
                        </div>
                        <div className="col-span-1 space-y-2">
                            <label className="text-sm font-medium text-slate-700">Min CRT Marks</label>
                            <Input
                                type="number"
                                value={globalMinMarks}
                                onChange={(e) => setGlobalMinMarks(Number(e.target.value))}
                                className="bg-white border-slate-300"
                                min={0}
                                max={100}
                            />
                        </div>
                        <div className="col-span-1 space-y-2">
                            <label className="text-sm font-medium text-slate-700">Max CRT Marks</label>
                            <Input
                                type="number"
                                value={globalMaxMarks}
                                onChange={(e) => setGlobalMaxMarks(Number(e.target.value))}
                                className="bg-white border-slate-300"
                                min={0}
                                max={100}
                            />
                        </div>
                        <div className="col-span-1 space-y-2">
                            <Button
                                onClick={handleCheckAvailability}
                                disabled={loading}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                            >
                                {loading ? "Checking..." : "Check Availability"}
                            </Button>
                        </div>
                    </div>

                    {/* Step 2: Allocation Preview */}
                    {availability && (
                        <div className="bg-white p-4 rounded-lg border border-slate-200 animate-in fade-in slide-in-from-top-4 duration-300">
                            <h3 className="text-sm font-semibold text-slate-900 mb-1 flex items-center gap-2">
                                <Users className="w-4 h-4 text-blue-600" />
                                Branch-wise Availability
                            </h3>
                            <p className="text-sm text-slate-500 mb-4 ml-6">
                                Showing students with marks between <strong>{globalMinMarks}</strong> and <strong>{globalMaxMarks}</strong> in <strong>{selectedYear}</strong>.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                                {Object.keys(availability).length === 0 ? (
                                    <div className="col-span-full p-4 text-center text-slate-500 bg-slate-50 rounded-md border border-dashed border-slate-300">
                                        No eligible students found matching these marks in {selectedYear}.
                                    </div>
                                ) : (
                                    criteriaList.map((criteria, idx) => (
                                        <div key={criteria.branch} className="flex items-center justify-between p-3 border border-slate-200 rounded-md bg-slate-50">
                                            <div>
                                                <div className="font-semibold text-slate-800">{criteria.branch}</div>
                                                <div className="text-xs text-slate-500">Available: {availability[criteria.branch]}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs text-slate-500">Allocate:</label>
                                                <Input
                                                    type="number"
                                                    className="w-20 h-8 bg-white text-right"
                                                    value={criteria.count}
                                                    max={availability[criteria.branch]}
                                                    min={0}
                                                    onChange={(e) => {
                                                        const val = Math.min(Number(e.target.value), availability[criteria.branch]);
                                                        const newList = [...criteriaList];
                                                        newList[idx].count = val;
                                                        setCriteriaList(newList);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="flex justify-end border-t border-slate-100 pt-4">
                                <Button
                                    onClick={handleAllocate}
                                    disabled={loading || criteriaList.every(c => c.count === 0)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                                >
                                    Confirm & Create Batch
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* --- Batch List Section --- */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900">Existing Batches ({selectedYear})</h2>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {/* Import Batch Card */}
                    <Card
                        className="border-dashed border-2 border-slate-300 shadow-none hover:border-slate-400 hover:bg-slate-50 transition-colors bg-slate-50/50 cursor-pointer flex flex-col items-center justify-center min-h-[200px]"
                        onClick={() => setImportBatchModalOpen(true)}
                    >
                        <CardContent className="flex flex-col items-center justify-center p-6 text-slate-500 pt-10">
                            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
                                <Plus className="h-6 w-6" />
                            </div>
                            <h3 className="font-medium text-slate-900 mb-1">Import Batch</h3>
                            <p className="text-sm text-center">Create a batch from a CSV list of students</p>
                        </CardContent>
                    </Card>

                    {filteredBatches.map((batch: CRTBatch) => (
                        <Card key={batch.id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white group flex flex-col">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg font-bold text-slate-900">{batch.batch_name}</CardTitle>
                                        <CardDescription className="text-slate-500">
                                            {new Date(batch.created_at).toLocaleDateString()}
                                        </CardDescription>
                                    </div>
                                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                        <Users className="h-4 w-4" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col">
                                <div className="flex justify-between items-center mb-6">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-slate-900">{batch.total_students}</div>
                                        <div className="text-xs text-slate-500 uppercase tracking-wide">Total</div>
                                    </div>
                                    <div className="h-8 w-px bg-slate-200"></div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-600">{batch.placed_students}</div>
                                        <div className="text-xs text-slate-500 uppercase tracking-wide">Placed</div>
                                    </div>
                                    <div className="h-8 w-px bg-slate-200"></div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-amber-600">{batch.unplaced_students}</div>
                                        <div className="text-xs text-slate-500 uppercase tracking-wide">Unplaced</div>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-4 flex-1">
                                    {batch.branch_breakdown && Object.entries(batch.branch_breakdown).slice(0, 3).map(([br, count]) => (
                                        <div key={br} className="flex justify-between text-sm">
                                            <span className="text-slate-600 font-medium">{br}</span>
                                            <span className="text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full text-xs border border-slate-100">{count}</span>
                                        </div>
                                    ))}
                                    {batch.branch_breakdown && Object.keys(batch.branch_breakdown).length > 3 && (
                                        <div className="text-xs text-slate-400 text-center pt-1">+ others</div>
                                    )}
                                </div>

                                <div className="flex gap-2 pt-4 border-t border-slate-100 mt-auto">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        onClick={() => router.push(`/admin/batches/${batch.id}`)}
                                    >
                                        <Eye className="w-4 h-4 mr-2" />
                                        View
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9 px-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                                        onClick={() => handleDownload(batch)}
                                        title="Download CSV"
                                    >
                                        <Download className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9 px-2 border-slate-200 text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-100"
                                        onClick={() => setBatchToDelete(batch)}
                                        title="Delete Batch"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {filteredBatches.length === 0 && (
                        <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                            <div className="mx-auto h-12 w-12 text-slate-300 mb-3">
                                <Filter className="h-full w-full" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">No batches found</h3>
                            <p className="text-slate-500 max-w-sm mx-auto mt-2">
                                There are no batches for the academic year <strong>{selectedYear}</strong>.
                                Create one above or import data.
                            </p>
                        </div>
                    )}
                </div>

                {/* Delete Confirmation Modal */}
                <AlertDialog open={!!batchToDelete} onOpenChange={() => setBatchToDelete(null)}>
                    <AlertDialogContent className="bg-white">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will delete the batch <strong>{batchToDelete?.batch_name}</strong> and unassign all {batchToDelete?.total_students} students from it.
                                Student records will <strong>NOT</strong> be deleted.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="bg-slate-100 hover:bg-slate-200 text-slate-700">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                className="bg-red-600 hover:bg-red-700 text-white"
                                disabled={deleting}
                            >
                                {deleting ? "Deleting..." : "Delete Batch"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Import Batch Modal */}
                <AlertDialog open={importBatchModalOpen} onOpenChange={setImportBatchModalOpen}>
                    <AlertDialogContent className="bg-white">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Import Manual Batch</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-600">
                                Provide a name and upload a CSV of students to instantly create an assorted batch.
                            </AlertDialogDescription>
                            <div className="space-y-4 text-slate-600 mt-4">
                                <div className="space-y-2 text-left">
                                    <label className="text-sm font-medium text-slate-700">Batch Name</label>
                                    <Input
                                        placeholder="e.g. Special Focus Batch"
                                        value={importBatchName}
                                        onChange={(e) => setImportBatchName(e.target.value)}
                                        className="bg-white border-slate-300"
                                    />
                                </div>
                                <div className="space-y-2 text-left">
                                    <label className="text-sm font-medium text-slate-700">CSV File</label>
                                    <Input
                                        type="file"
                                        accept=".csv"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files.length > 0) {
                                                setImportBatchFile(e.target.files[0]);
                                            } else {
                                                setImportBatchFile(null);
                                            }
                                        }}
                                        className="bg-white border-slate-300"
                                        disabled={importBatchLoading}
                                    />
                                </div>
                            </div>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="bg-slate-100 hover:bg-slate-200 text-slate-700" onClick={() => {
                                setImportBatchName("");
                                setImportBatchFile(null);
                            }}>Cancel</AlertDialogCancel>
                            <Button
                                onClick={handleImportBatchSubmit}
                                disabled={importBatchLoading || !importBatchName || !importBatchFile}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {importBatchLoading ? "Importing..." : "Import Batch"}
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

            </div>
        </div>
    );
}
