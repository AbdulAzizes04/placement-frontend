"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Mail, Phone, Download, Upload, Pencil, MessageSquare } from "lucide-react";
import { QuestionsModal } from "@/components/questions-modal";
import { usePlacement } from "@/contexts/PlacementContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { EditStudentModal } from "@/components/edit-student-modal";
import { Student } from "@/types";

export default function StaffStudents() {
    const router = useRouter();
    const { user } = useAuth();
    const { students, batches, currentBatch, setBatch, questions, getPaginatedStudents } = usePlacement();

    const [searchQuery, setSearchQuery] = useState("");
    const [isQuestionsOpen, setIsQuestionsOpen] = useState(false);
    const [minCgpa, setMinCgpa] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("All");

    const limit = 50;

    // Edit Modal State
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

    const handleEditClick = (student: Student) => {
        setSelectedStudent(student);
        setIsEditOpen(true);
    };

    const handleEditSave = (updatedStudent: Student) => {
        // In a real app, call API to update context
        console.log("Saving Student:", updatedStudent);
        toast.success("Student Updated", {
            description: `${updatedStudent.name} is now ${updatedStudent.status}`
        });
        // Here we would typically update the local 'students' list via context function
        // For now, since it's mock context, the toast confirms functionality.
        setIsEditOpen(false);
    };

    const staffBranch = user?.managedBranch || "CSE";

    // Fetch from backend matching staff branch and filters
    useEffect(() => {
        const filters: Record<string, unknown> = {};
        if (searchQuery) filters.search = searchQuery;
        if (staffBranch) filters.branch = staffBranch;
        if (selectedStatus !== "All") filters.status = selectedStatus;
        if (currentBatch !== "All") filters.batch = currentBatch;
        if (minCgpa) filters.min_cgpa = parseFloat(minCgpa);

        getPaginatedStudents(1, limit, filters);
    }, [limit, searchQuery, staffBranch, selectedStatus, currentBatch, minCgpa]);

    const filteredStudents = students;

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            toast.success(`Imported ${file.name}`);
        }
    };

    const handleExport = () => {
        toast.info("Exporting CSV...");
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Manage {staffBranch} Students</h2>
                    <p className="text-muted-foreground">View and manage student records for {currentBatch}.</p>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <input
                            type="file"
                            accept=".csv"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleImport}
                        />
                        <Button variant="outline">
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
                </div>
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
                            className="flex h-10 w-[140px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                        >
                            <option value="All">All Status</option>
                            <option value="Placed">Placed</option>
                            <option value="Unplaced">Unplaced</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                        <select
                            className="flex h-10 w-[140px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={currentBatch}
                            onChange={(e) => setBatch(e.target.value)}
                        >
                            {batches.map(batch => (
                                <option key={batch} value={batch}>{batch}</option>
                            ))}
                        </select>
                        <Input
                            type="number"
                            placeholder="Min CGPA"
                            className="w-[100px]"
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
                                <TableHead>Name</TableHead>
                                <TableHead>Year</TableHead>
                                <TableHead>Batch</TableHead>
                                <TableHead>CGPA</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStudents.length > 0 ? (
                                filteredStudents.map((student) => (
                                    <TableRow
                                        key={student.id}
                                        className="cursor-pointer hover:bg-gray-50"
                                        onClick={() => router.push(`/admin/students/${student.id}`)}
                                    >
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{student.name}</p>
                                                <p className="text-xs text-gray-500">{student.email}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>{student.year}</TableCell>
                                        <TableCell>{student.batch}</TableCell>
                                        <TableCell>{student.cgpa}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                                <Button variant="outline" size="icon" className="h-8 w-8 text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:text-blue-700" title="Email Student">
                                                    <Mail className="w-4 h-4" />
                                                </Button>
                                                <Button variant="outline" size="icon" className="h-8 w-8 text-green-600 border-green-200 bg-green-50 hover:bg-green-100 hover:text-green-700" title="Call Student">
                                                    <Phone className="w-4 h-4" />
                                                </Button>
                                            </div>
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
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="icon" className="h-8 w-8 border-blue-300 text-blue-700 hover:bg-blue-100 hover:text-blue-900 bg-blue-50" onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditClick(student);
                                            }}>
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        No students found in batch {currentBatch} for branch {staffBranch}.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>



            <EditStudentModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                student={selectedStudent}
                onSave={handleEditSave}
            />

            <QuestionsModal isOpen={isQuestionsOpen} onClose={() => setIsQuestionsOpen(false)} />
        </div>
    );
}
