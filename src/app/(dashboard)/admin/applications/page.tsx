"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Filter, FileText, CheckCircle2, Briefcase, ArrowLeft, Building2, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useState, useEffect, Suspense } from "react";
import { Modal } from "@/components/ui/modal";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import Papa from "papaparse";
import { toast } from "sonner";
import { usePlacement } from "@/contexts/PlacementContext";
import { useAuth } from "@/contexts/AuthContext";

// Define the Application interface
interface Application {
    id: number;
    student: string;
    studentId: string;
    company: string;
    role: string;
    status: "APPLIED" | "SHORTLISTED" | "REJECTED" | "PLACED";
    cgpa: number;
    branch: string;
    appliedDate: string;
    notes?: string;
}

function AdminApplicationsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const companyParam = searchParams?.get('company');
    const statusParam = searchParams?.get('status'); // [NEW] Read status param
    const [viewMode, setViewMode] = useState<'REGISTERED' | 'NOT_REGISTERED'>('REGISTERED');

    const {
        applications: contextApplications,
        applicationPagination,
        students: contextStudents,
        getPaginatedApplications,
        refreshData
    } = usePlacement();
    const { user } = useAuth();
    const [applications, setApplications] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [limit, setLimit] = useState(50);

    const isStaff = user?.role === 'STAFF';
    const isTPO = user?.role === 'TPO';
    const isAdmin = user?.role === 'ADMIN';

    // Staff and TPO roles are restricted by branch if managedBranch is set
    const isBranchRestricted = (isStaff || isTPO) && !isAdmin;
    const managedBranch = user?.managedBranch || "";

    const [selectedCompany, setSelectedCompany] = useState<string | null>(companyParam || null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [selectedBranch, setSelectedBranch] = useState(isBranchRestricted && managedBranch ? managedBranch : "All");
    const [minCgpa, setMinCgpa] = useState("");

    const [importModalOpen, setImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importLoading, setImportLoading] = useState(false);

    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                const response = await api.get('/announcements');
                setAnnouncements(response.data.announcements || []);
            } catch (error) {
                console.error("Failed to fetch announcements", error);
            }
        };
        fetchAnnouncements();
    }, []);

    // Server-side fetching effect
    useEffect(() => {
        const filters: any = {};
        if (selectedCompany) filters.company = selectedCompany;
        if (searchQuery) filters.search = searchQuery;
        if (statusFilter !== "ALL") filters.status = statusFilter;
        if (selectedBranch !== "All") filters.branch = selectedBranch;
        if (minCgpa) filters.min_cgpa = parseFloat(minCgpa);

        getPaginatedApplications(currentPage, limit, filters);
    }, [currentPage, limit, selectedCompany, searchQuery, statusFilter, selectedBranch, minCgpa]);

    useEffect(() => {
        // Map Context Data to UI Data
        const mappedApps = (contextApplications || []).map((app: any) => {
            const rawApp = app;
            const student = contextStudents.find(s => s.profileId === rawApp.student_id || s.id === rawApp.student_id);

            const studentName = student?.name || rawApp.student?.user?.name || "Unknown Student";
            const studentRoll = student?.rollNumber || rawApp.student?.roll_no || "N/A";
            const studentBranch = student?.branch || rawApp.student?.branch || "N/A";
            const studentCgpa = student?.cgpa !== undefined ? student.cgpa : (rawApp.student?.cgpa || 0);

            const dateStr = rawApp.applied_at || rawApp.appliedAt || rawApp.created_at;
            let formattedDate = "Invalid Date";
            if (dateStr) {
                formattedDate = new Date(dateStr).toLocaleDateString();
            }

            return {
                id: rawApp.id,
                student: studentName,
                studentId: studentRoll,
                studentInternalId: student?.id,
                branch: studentBranch,
                company: rawApp.announcement?.company_name || rawApp.company_name || "Unknown Company",
                role: rawApp.announcement?.job_role || rawApp.announcement?.title || rawApp.role || "Applicant",
                status: rawApp.status,
                cgpa: studentCgpa,
                appliedDate: formattedDate,
                notes: "",
                isDemo: rawApp.isDemo
            };
        });
        setApplications(mappedApps);
        setIsLoading(false);
    }, [contextApplications, contextStudents]);

    // Derived Companies list
    const companies = Array.from(new Set([
        ...applications.map(app => app.company),
        ...announcements.map(a => a.company_name) // Include companies from announcements
    ])).filter(Boolean).map(companyName => {
        const companyApps = applications.filter(app => app.company === companyName);
        return {
            name: companyName,
            total: companyApps.length,
            placed: companyApps.filter(app => app.status === 'PLACED').length,
            shortlisted: companyApps.filter(app => app.status === 'SHORTLISTED').length,
            pending: companyApps.filter(app => app.status === 'APPLIED').length
        };
    });

    const totalStudentsForDisplay = isStaff ? contextStudents.filter(s => s.branch === managedBranch).length : contextStudents.length;

    // Sync with URL param
    useEffect(() => {
        setSelectedCompany(companyParam || null);
        if (statusParam) {
            setStatusFilter(statusParam);
        } else {
            // Reset to ALL if no param, or keep existing? Better to reset if navigating back?
            // If we just clicked a company without status, default to ALL.
            setStatusFilter("ALL");
        }
    }, [companyParam, statusParam]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedApp, setSelectedApp] = useState<any>(null);
    const [isUnregistered, setIsUnregistered] = useState(false);

    const branches = ["CSE", "ECE", "EEE", "MECH", "CIVIL", "AIML", "AI&DS", "CS-DS", "CS-AI"];

    // Edit Form State
    const [editStatus, setEditStatus] = useState<any>("APPLIED");
    const [editNotes, setEditNotes] = useState("");

    const handleManageClick = (app: any, unregistered: boolean = false) => {
        setSelectedApp(app);
        setIsUnregistered(unregistered);
        setEditStatus(app.status || "APPLIED");
        setEditNotes(app.notes || "");
        setIsModalOpen(true);
    };

    const handleSaveChanges = async () => {
        if (!selectedApp) return;

        try {
            if (isUnregistered) {
                // For unregistered students, we use the bulk update endpoint to create the application
                if (!selectedCompany) {
                    toast.error("Company not selected");
                    return;
                }

                // Demo mode delay
                if (selectedApp.isDemo) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                } else {
                    const response = await api.post('/applications/bulk-update', {
                        company_name: selectedCompany,
                        updates: [{ roll_no: selectedApp.studentId || selectedApp.rollNumber, status: editStatus }]
                    });

                    if (!response.data.success) {
                        throw new Error("Failed to update status");
                    }
                }

                toast.success(selectedApp.isDemo ? "Status updated (Demo Mode)" : "Application created and status updated");
                setIsModalOpen(false);
                refreshData(); // Refresh to move student from Pending to Registered
                getPaginatedApplications(currentPage, limit, { company: selectedCompany, status: statusFilter !== "ALL" ? statusFilter : undefined, branch: selectedBranch !== "All" ? selectedBranch : undefined, search: searchQuery, min_cgpa: minCgpa });
                return;
            }

            if (!selectedApp.isDemo) {
                await api.put(`/applications/${selectedApp.id}/status`, { status: editStatus });
            } else {
                // Simulate network delay for demo
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            toast.success(selectedApp.isDemo ? "Status updated (Demo Mode)" : "Status updated successfully");

            // Update local state
            const updatedApplications = applications.map(app =>
                app.id === selectedApp.id
                    ? { ...app, status: editStatus, notes: editNotes }
                    : app
            );
            setApplications(updatedApplications);
            setIsModalOpen(false);
            refreshData(); // Refresh to ensure everything stays in sync
            getPaginatedApplications(currentPage, limit, { company: selectedCompany, status: statusFilter !== "ALL" ? statusFilter : undefined, branch: selectedBranch !== "All" ? selectedBranch : undefined, search: searchQuery, min_cgpa: minCgpa });
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'PLACED': return 'success';
            case 'SHORTLISTED': return 'info';
            case 'REJECTED': return 'destructive';
            default: return 'secondary'; // APPLIED
        }
    };

    const handleCompanyClick = (companyName: string, status?: string) => {
        const params = new URLSearchParams();
        params.set('company', companyName);
        if (status) {
            params.set('status', status);
        }
        router.push(`/admin/applications?${params.toString()}`);
    };

    const handleBackToCompanies = () => {
        router.push(`/admin/applications`);
    };

    // Filter Logic - Now server-side, but keep name for compatibility if needed
    const filteredApplications = applications;

    const unregisteredStudents = selectedCompany ? (isBranchRestricted && managedBranch ? contextStudents.filter(s => s.branch === managedBranch) : contextStudents).filter(student => {
        const hasApplied = applications.some(app => app.company === selectedCompany && (app.studentInternalId === student.id || app.studentId === student.rollNumber));

        const matchesSearch = (student.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (student.rollNumber || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchesBranch = selectedBranch === "All" ||
            student.branch === selectedBranch;
        const matchesCgpa = minCgpa === "" || (student.cgpa || 0) >= parseFloat(minCgpa);

        return !hasApplied && matchesSearch && matchesBranch && matchesCgpa;
    }) : [];

    // View: Company List
    if (!selectedCompany) {
        return (
            <div className="space-y-6 p-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Applications by Company</h2>
                    <p className="text-muted-foreground mt-1">Select a company to manage student applications.</p>
                </div>

                {isLoading ? <div>Loading...</div> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {companies.map((company) => (
                            <Card
                                key={company.name}
                                className="transition-all border-l-4 border-l-blue-500 hover:border-l-blue-600 group"
                            >
                                <CardHeader className="pb-2 cursor-pointer" onClick={() => handleCompanyClick(company.name)}>
                                    <CardTitle className="text-xl flex items-center justify-between">
                                        {company.name}
                                        <Building2 className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        {/* Total Students - Not Clickable */}
                                        <div className="bg-gray-50 p-2 rounded border border-gray-100">
                                            <div className="text-gray-500 text-xs mb-1">Total App</div>
                                            <div className="font-bold text-gray-900 text-lg">{company.total}</div>
                                        </div>

                                        {/* Shortlisted - Clickable */}
                                        <div
                                            className="bg-indigo-50 p-2 rounded border border-indigo-100 cursor-pointer hover:bg-indigo-100 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCompanyClick(company.name, 'SHORTLISTED');
                                            }}
                                        >
                                            <div className="text-indigo-600 text-xs mb-1">Shortlist</div>
                                            <div className="font-bold text-indigo-700 text-lg">{company.shortlisted}</div>
                                        </div>

                                        {/* Placed - Clickable */}
                                        <div
                                            className="bg-green-50 p-2 rounded border border-green-100 cursor-pointer hover:bg-green-100 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCompanyClick(company.name, 'PLACED');
                                            }}
                                        >
                                            <div className="text-green-600 text-xs mb-1">Placed</div>
                                            <div className="font-bold text-green-700 text-lg">{company.placed}</div>
                                        </div>
                                    </div>

                                    <div className="mt-4 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min((company.total / Math.max(isStaff ? contextStudents.filter(s => s.branch === managedBranch).length : contextStudents.length, 1)) * 100, 100)}%` }}
                                        ></div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    const downloadCSV = () => {
        const dataToDownload = viewMode === 'REGISTERED' ? filteredApplications : unregisteredStudents;
        const filename = `${selectedCompany}_${viewMode}_Students.csv`;

        if (dataToDownload.length === 0) {
            toast.error("No data to download");
            return;
        }

        const headers = viewMode === 'REGISTERED'
            ? ["Student Name", "Roll No", "Branch", "CGPA", "Role", "Status", "Applied Date"]
            : ["Student Name", "Roll No", "Branch", "CGPA", "Status"];

        const rows = dataToDownload.map((item: any) => {
            if (viewMode === 'REGISTERED') {
                return [
                    item.student,
                    item.studentId,
                    item.branch,
                    item.cgpa,
                    item.role,
                    item.status,
                    item.appliedDate
                ];
            } else {
                return [
                    item.name,
                    item.rollNumber,
                    item.branch,
                    item.cgpa,
                    "Not Applied"
                ];
            }
        });

        const csvContent = [headers, ...rows]
            .map(e => e.join(","))
            .join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportCSV = () => {
        if (!importFile || !selectedCompany) return;

        setImportLoading(true);

        Papa.parse(importFile, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const validUpdates = results.data.map((row: any) => {
                        const rollNo = row["Roll No"];
                        const statusObj = row["Status"];

                        const rawStatus = typeof statusObj === 'string' ? statusObj.trim() : "";

                        return {
                            roll_no: rollNo,
                            status: rawStatus
                        };
                    }).filter(item => {
                        if (!item.roll_no || !item.status) return false;

                        const uppercaseStatus = item.status.toUpperCase();
                        if (uppercaseStatus === 'NOT APPLIED' || item.status === 'Not Applied') return true;

                        return ['APPLIED', 'SHORTLISTED', 'REJECTED', 'PLACED'].includes(uppercaseStatus);
                    });

                    if (validUpdates.length === 0) {
                        toast.error("No valid applications to update in the CSV.");
                        setImportLoading(false);
                        return;
                    }

                    const payloadUpdates = validUpdates.map(item => {
                        let finalStatus = item.status.toUpperCase();
                        if (finalStatus === 'NOT APPLIED') finalStatus = 'Not Applied';
                        return { roll_no: item.roll_no, status: finalStatus };
                    });

                    const response = await api.post('/applications/bulk-update', {
                        company_name: selectedCompany,
                        updates: payloadUpdates
                    });

                    if (response.data.success) {
                        toast.success(`Successfully updated ${response.data.successCount} applications.`);
                        setImportModalOpen(false);
                        setImportFile(null);
                        refreshData();
                        getPaginatedApplications(currentPage, limit, { company: selectedCompany, status: statusFilter !== "ALL" ? statusFilter : undefined, branch: selectedBranch !== "All" ? selectedBranch : undefined, search: searchQuery, min_cgpa: minCgpa });
                    } else {
                        toast.error("Bulk update completed with some errors.");
                    }
                } catch (error: any) {
                    console.error("Import Error:", error);
                    toast.error(error.response?.data?.error || "Failed to process CSV import");
                } finally {
                    setImportLoading(false);
                }
            }
        });
    };

    // View: Application List for Specific Company
    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-4">
                <Button variant="ghost" className="w-fit -ml-2 text-gray-600" onClick={handleBackToCompanies}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Companies
                </Button>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-3xl font-bold tracking-tight text-gray-900">{selectedCompany} Applications</h2>
                            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">{filteredApplications.length}</span>
                        </div>
                        <p className="text-muted-foreground mt-1">Manage applications for {selectedCompany}.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => setImportModalOpen(true)} variant="outline" className="gap-2">
                            <FileText className="w-4 h-4" />
                            Import CSV
                        </Button>
                        <Button onClick={downloadCSV} variant="outline" className="gap-2">
                            <FileText className="w-4 h-4" />
                            Download CSV
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                        <Users className="h-4 w-4 text-gray-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold mb-2">{totalStudentsForDisplay}</div>
                        <div className="flex space-x-2 text-xs">
                            <span
                                className={`cursor-pointer hover:underline ${viewMode === 'REGISTERED' ? 'text-blue-600 font-bold' : 'text-blue-500'}`}
                                onClick={() => setViewMode('REGISTERED')}
                            >
                                Registered
                            </span>
                            <span className="text-gray-300">|</span>
                            <span
                                className={`cursor-pointer hover:underline ${viewMode === 'NOT_REGISTERED' ? 'text-orange-600 font-bold' : 'text-orange-500'}`}
                                onClick={() => setViewMode('NOT_REGISTERED')}
                            >
                                Pending
                            </span>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Shortlisted</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{applications.filter(a => a.company === selectedCompany && a.status === 'SHORTLISTED').length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Placed</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{applications.filter(a => a.company === selectedCompany && a.status === 'PLACED').length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending</CardTitle>
                        <Briefcase className="h-4 w-4 text-gray-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{applications.filter(a => a.company === selectedCompany && a.status === 'APPLIED').length}</div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border shadow-sm">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-4">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search student..."
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <select
                        className="flex h-10 w-[120px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        disabled={isBranchRestricted}
                    >
                        {isBranchRestricted ? (
                            <option value={managedBranch}>{managedBranch}</option>
                        ) : (
                            <>
                                <option value="All">Branch</option>
                                {branches.map(branch => (
                                    <option key={branch} value={branch}>{branch}</option>
                                ))}
                            </>
                        )}
                    </select>
                    <Input
                        type="number"
                        placeholder="CGPA"
                        className="w-[80px]"
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
                    <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                        {["ALL", "APPLIED", "SHORTLISTED", "PLACED", "REJECTED"].map((status) => (
                            <Button
                                key={status}
                                variant={statusFilter === status ? "default" : "outline"}
                                size="sm"
                                onClick={() => setStatusFilter(status)}
                                className={cn("text-xs", statusFilter === status ? "bg-primary" : "text-muted-foreground")}
                            >
                                {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
                            </Button>
                        ))}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        {viewMode === 'REGISTERED' ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">Loading...</TableCell>
                                        </TableRow>
                                    ) : filteredApplications.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                No applications found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredApplications.map((app) => (
                                            <TableRow key={app.id}>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <Link href={`/admin/students/${app.studentInternalId}`} className="font-medium text-blue-600 hover:underline">
                                                            {app.student}
                                                        </Link>
                                                        <span className="text-xs text-muted-foreground">{app.studentId} • {app.branch} • CGPA: {app.cgpa}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-gray-900">{app.role}</TableCell>
                                                <TableCell className="text-muted-foreground">{app.appliedDate}</TableCell>
                                                <TableCell>
                                                    <Badge variant={getStatusBadgeVariant(app.status)}>
                                                        {app.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleManageClick(app)}
                                                        className="text-blue-600 border-blue-200 bg-blue-50 hover:text-blue-800 hover:bg-blue-100"
                                                    >
                                                        Manage
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Branch</TableHead>
                                        <TableHead>CGPA</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {unregisteredStudents.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                No unregistered students found matching criteria.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        unregisteredStudents.map((student) => (
                                            <TableRow key={student.id}>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-900">{student.name}</span>
                                                        <span className="text-xs text-muted-foreground">{student.rollNumber}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{student.branch}</TableCell>
                                                <TableCell>{student.cgpa}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-gray-500 bg-gray-50">
                                                        Not Applied
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleManageClick({
                                                            student: student.name || "Unknown",
                                                            studentId: student.rollNumber || "N/A",
                                                            company: selectedCompany || "Unknown",
                                                            role: "Applicant",
                                                            status: "Not Applied"
                                                        }, true)}
                                                        className="text-blue-600 border-blue-200 bg-blue-50 hover:text-blue-800 hover:bg-blue-100"
                                                    >
                                                        Manage
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                    <div className="flex items-center justify-between mt-4 px-2">
                        <p className="text-sm text-muted-foreground">
                            Showing page {applicationPagination.page} of {applicationPagination.totalPages} ({applicationPagination.total} total applications)
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
                                onClick={() => setCurrentPage(prev => Math.min(applicationPagination.totalPages, prev + 1))}
                                disabled={currentPage === applicationPagination.totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Manage Application"
            >
                {selectedApp && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                            <div>
                                <p className="text-sm text-gray-500">Student</p>
                                <p className="font-medium">{selectedApp.student}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Company</p>
                                <p className="font-medium">{selectedApp.company}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Role</p>
                                <p className="font-medium">{selectedApp.role}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Applied Date</p>
                                <p className="font-medium">{selectedApp.appliedDate}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Application Status</label>
                            <div className="flex flex-wrap gap-2">
                                {["APPLIED", "SHORTLISTED", "PLACED", "REJECTED"].map((status) => (
                                    <div
                                        key={status}
                                        onClick={() => setEditStatus(status)}
                                        className={cn(
                                            "cursor-pointer px-4 py-2 rounded-md border text-sm font-medium transition-all",
                                            editStatus === status
                                                ? "bg-primary text-primary-foreground border-primary ring-2 ring-primary/20"
                                                : "bg-white text-gray-600 hover:bg-gray-50 border-gray-200"
                                        )}
                                    >
                                        {status}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Notes / Feedback</label>
                            <textarea
                                className="w-full min-h-[100px] p-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder="Add notes about the application..."
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleSaveChanges}>Save Changes</Button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={importModalOpen}
                onClose={() => {
                    setImportModalOpen(false);
                    setImportFile(null);
                }}
                title={`Import Application Statuses for ${selectedCompany}`}
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                        Upload a CSV file to bulk update application statuses for {selectedCompany}. Ensure the CSV has "Roll No" and "Status" columns.
                    </p>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Select CSV File</label>
                        <Input
                            type="file"
                            accept=".csv"
                            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                        />
                    </div>
                    {importFile && (
                        <p className="text-sm font-medium text-blue-600">
                            Selected file: {importFile.name}
                        </p>
                    )}
                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setImportModalOpen(false);
                                setImportFile(null);
                            }}
                            disabled={importLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleImportCSV}
                            disabled={!importFile || importLoading}
                        >
                            {importLoading ? "Importing..." : "Import"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

// Wrap in Suspense for useSearchParams
export default function AdminApplications() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AdminApplicationsContent />
        </Suspense>
    );
}
