"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";
import { Loader2, Upload, Download, Calculator, CheckCircle, Users } from "lucide-react";
import Papa from "papaparse";

export default function BatchesPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("create"); // 'create' | 'import' | 'list'

    // --- Import State ---
    const [isImporting, setIsImporting] = useState(false);

    // --- Create Batch State ---
    const [step, setStep] = useState(1); // 1: Criteria, 2: Allocation
    const [criteria, setCriteria] = useState({ minMarks: 60, maxMarks: 100 });
    const [previewStats, setPreviewStats] = useState<{ branches: Record<string, number>, total: number } | null>(null);
    const [batchForm, setBatchForm] = useState({ name: "", totalStrength: 0 });
    const [allocations, setAllocations] = useState<Record<string, number>>({});
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [isAllocating, setIsAllocating] = useState(false);

    // --- Helper Functions ---
    const fetchPreview = async () => {
        setIsPreviewLoading(true);
        try {
            const res = await api.post("/crt/preview", criteria);
            setPreviewStats(res.data);
            // Initialize allocations with 0
            const initialAllocations: Record<string, number> = {};
            Object.keys(res.data.branches).forEach(branch => {
                initialAllocations[branch] = 0;
            });
            setAllocations(initialAllocations);
            setStep(2);
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to fetch preview stats");
        } finally {
            setIsPreviewLoading(false);
        }
    };

    const handleAllocationChange = (branch: string, value: string) => {
        const val = parseInt(value) || 0;
        const max = previewStats?.branches[branch] || 0;

        if (val < 0) return;
        if (val > max) {
            toast.error(`Cannot allocate more than ${max} students for ${branch}`);
            return;
        }

        setAllocations(prev => ({ ...prev, [branch]: val }));
    };

    const currentAllocationSum = Object.values(allocations).reduce((a, b) => a + b, 0);

    const handleCreateBatch = async () => {
        if (!batchForm.name || !batchForm.totalStrength) {
            toast.error("Please fill in batch details");
            return;
        }
        if (currentAllocationSum !== parseInt(batchForm.totalStrength.toString())) {
            toast.error(`Allocation sum (${currentAllocationSum}) must match Total Strength (${batchForm.totalStrength})`);
            return;
        }

        setIsAllocating(true);
        try {
            await api.post("/crt/allocate", {
                batchName: batchForm.name,
                totalStrength: batchForm.totalStrength,
                allocations,
                minMarks: criteria.minMarks,
                maxMarks: criteria.maxMarks
            });
            toast.success("Batch created and students allocated successfully!");
            router.push("/admin/dashboard"); // Or stay and reset
            setStep(1);
            setBatchForm({ name: "", totalStrength: 0 });
            setAllocations({});
            setPreviewStats(null);
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to create batch");
        } finally {
            setIsAllocating(false);
        }
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const data = results.data;
                // Validation: Need 'Roll No' and 'Marks'
                const validRows = data.map((row: any) => ({
                    roll_no: row['Roll No'] || row['RollNo'],
                    marks: row['Marks'] || row['Score'] || row['CRT Marks']
                })).filter((r: any) => r.roll_no && r.marks);

                if (validRows.length === 0) {
                    toast.error("No valid rows found. Check headers: Roll No, Marks");
                    return;
                }

                setIsImporting(true);
                try {
                    const res = await api.post("/crt/import", { students: validRows });
                    toast.success(`Imported marks for ${res.data.success} students. Failed: ${res.data.failed}`);
                } catch (error: any) {
                    toast.error(error.response?.data?.error || "Import failed");
                } finally {
                    setIsImporting(false);
                }
            }
        });
    };


    const handleDownloadTemplate = () => {
        const headers = ["Roll No,Marks"];
        const exampleRow = ["123456,85.5"];
        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...exampleRow].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "marks_upload_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-8 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Batch Management</h2>
                    <p className="text-muted-foreground">Create batches, allocate students, and manage CRT groups.</p>
                </div>
                <div className="flex gap-2">
                    {activeTab === 'import' && (
                        <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
                            <Download className="mr-2 h-4 w-4" /> Download Template
                        </Button>
                    )}
                    <Button
                        variant={activeTab === 'import' ? "default" : "outline"}
                        onClick={() => setActiveTab(activeTab === 'import' ? 'create' : 'import')}
                    >
                        {activeTab === 'import' ? "Back to Create" : "Import Marks"}
                    </Button>
                </div>
            </div>

            {activeTab === 'import' ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Import Student Marks</CardTitle>
                        <CardDescription>Upload a CSV file to update student marks for allocation eligibility.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="border-2 border-dashed border-gray-200 rounded-lg p-10 flex flex-col items-center justify-center gap-4 hover:bg-gray-50 transition-colors">
                            <Upload className="h-10 w-10 text-gray-400" />
                            <div className="text-center">
                                <p className="text-sm font-medium">Click to upload or drag and drop</p>
                                <p className="text-xs text-gray-500">CSV file with 'Roll No' and 'Marks' headers</p>
                            </div>
                            <Input
                                type="file"
                                accept=".csv"
                                className="hidden"
                                id="csv-upload"
                                onChange={handleImport}
                                disabled={isImporting}
                            />
                            <Label htmlFor="csv-upload">
                                <Button variant="secondary" disabled={isImporting} type="button" className="cursor-pointer">
                                    {isImporting ? <Loader2 className="animate-spin mr-2" /> : "Select File"}
                                </Button>
                            </Label>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-700">
                            <strong>Note:</strong> This will update the 'CRT Marks' field for existing students. It matches students by Roll Number.
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Input / Wizard */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>1. Filter Criteria</CardTitle>
                                <CardDescription>Define the pool of eligible students.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Min Marks</Label>
                                        <Input
                                            type="number"
                                            value={criteria.minMarks}
                                            onChange={(e) => setCriteria({ ...criteria, minMarks: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Max Marks</Label>
                                        <Input
                                            type="number"
                                            value={criteria.maxMarks}
                                            onChange={(e) => setCriteria({ ...criteria, maxMarks: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <Button className="w-full" onClick={fetchPreview} disabled={isPreviewLoading}>
                                    {isPreviewLoading ? <Loader2 className="animate-spin mr-2" /> : <Calculator className="mr-2 h-4 w-4" />}
                                    Check Availability
                                </Button>
                            </CardContent>
                        </Card>

                        {step === 2 && (
                            <Card className="border-blue-200 bg-blue-50/20">
                                <CardHeader>
                                    <CardTitle>3. Batch Details</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Batch Name</Label>
                                        <Input
                                            placeholder="e.g. Elite Batch 2024"
                                            value={batchForm.name}
                                            onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Total Strength</Label>
                                        <Input
                                            type="number"
                                            placeholder="e.g. 60"
                                            value={batchForm.totalStrength || ''}
                                            onChange={(e) => setBatchForm({ ...batchForm, totalStrength: parseInt(e.target.value) })}
                                        />
                                    </div>

                                    <div className={`p-4 rounded-md text-sm font-medium flex justify-between items-center ${currentAllocationSum === batchForm.totalStrength ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'}`}>
                                        <span>Allocated: {currentAllocationSum} / {batchForm.totalStrength || 0}</span>
                                        {currentAllocationSum === batchForm.totalStrength && <CheckCircle className="h-4 w-4" />}
                                    </div>

                                    <Button
                                        className="w-full bg-blue-600 hover:bg-blue-700"
                                        onClick={handleCreateBatch}
                                        disabled={isAllocating || currentAllocationSum !== batchForm.totalStrength || !batchForm.name}
                                    >
                                        {isAllocating ? <Loader2 className="animate-spin mr-2" /> : "Create & Allocate"}
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Right Column: Stats & Allocation */}
                    <div className="lg:col-span-2">
                        {previewStats ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle>2. Allocate Students</CardTitle>
                                    <CardDescription>
                                        Total Eligible: <span className="font-bold text-gray-900">{previewStats.total}</span> (Unallocated)
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Branch</TableHead>
                                                <TableHead>Available</TableHead>
                                                <TableHead>Allocate</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(previewStats.branches).map(([branch, count]) => (
                                                <TableRow key={branch}>
                                                    <TableCell className="font-medium">{branch}</TableCell>
                                                    <TableCell>{count}</TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            max={count}
                                                            className="w-24"
                                                            value={allocations[branch] || 0}
                                                            onChange={(e) => handleAllocationChange(branch, e.target.value)}
                                                            disabled={step !== 2}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow className="bg-gray-50 font-bold">
                                                <TableCell>Total</TableCell>
                                                <TableCell>{previewStats.total}</TableCell>
                                                <TableCell>{currentAllocationSum}</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-10 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
                                <Users className="h-16 w-16 mb-4 opacity-20" />
                                <p>Set filters and click "Check Availability" to begin</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
