"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Users,
    Plus,
    Search,
    MoreHorizontal,
    Edit,
    Trash2,
    Eye,
    CheckCircle,
    XCircle
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Types
interface Faculty {
    id: string;
    name: string;
    email: string;
    phone: string;
    assignedBranches: string[];
    assignedBatches: string[];
    user?: {
        role: string;
    };
}

export default function FacultyPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [facultyList, setFacultyList] = useState<Faculty[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        password: "", // Only for creation
        assignedBranches: "", // Comma separated for input
        assignedBatches: ""   // Comma separated for input
    });

    const isTPO = user?.role === 'TPO';

    useEffect(() => {
        fetchFaculty();
    }, []);

    const fetchFaculty = async () => {
        try {
            const res = await api.get('/faculty');
            setFacultyList(res.data);
        } catch (error) {
            toast.error("Failed to fetch faculty list");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const filteredFaculty = facultyList.filter(f =>
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.assignedBranches.some(b => b.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Form Handlers
    const handleOpenModal = (faculty?: Faculty) => {
        if (faculty) {
            setEditingFaculty(faculty);
            setFormData({
                name: faculty.name,
                email: faculty.email,
                phone: faculty.phone || "",
                password: "",
                assignedBranches: faculty.assignedBranches.join(", "),
                assignedBatches: faculty.assignedBatches.join(", ")
            });
        } else {
            setEditingFaculty(null);
            setFormData({
                name: "",
                email: "",
                phone: "",
                password: "",
                assignedBranches: "",
                assignedBatches: ""
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                assignedBranches: formData.assignedBranches.split(',').map(s => s.trim()).filter(Boolean),
                assignedBatches: formData.assignedBatches.split(',').map(s => s.trim()).filter(Boolean)
            };

            if (editingFaculty) {
                // Determine what TPO can edit vs Admin
                const updatePayload: Partial<{ name: string; email: string; phone: string; assignedBranches: string[]; assignedBatches: string[] }> = {};
                if (!isTPO) {
                    updatePayload.name = payload.name;
                    updatePayload.email = payload.email;
                    updatePayload.phone = payload.phone;
                }
                updatePayload.assignedBranches = payload.assignedBranches;
                updatePayload.assignedBatches = payload.assignedBatches;

                await api.put(`/faculty/${editingFaculty.id}`, updatePayload);
                toast.success("Faculty Updated Successfully");
            } else {
                if (isTPO) {
                    toast.error("TPO cannot create faculty");
                    return;
                }
                await api.post('/faculty', payload);
                toast.success("Faculty Created Successfully");
            }

            setIsModalOpen(false);
            fetchFaculty();
        } catch (error: unknown) {
            const axErr = error as { response?: { data?: { error?: string } } };
            toast.error(axErr.response?.data?.error || "Operation failed");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this faculty member?")) return;
        try {
            await api.delete(`/faculty/${id}`);
            toast.success("Faculty Deleted");
            fetchFaculty();
        } catch (error) {
            toast.error("Failed to delete faculty");
        }
    };

    return (
        <div className="p-8 space-y-6 min-h-screen bg-slate-50/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Faculty Management</h1>
                    <p className="text-slate-500 mt-1">Manage faculty members, assignments, and permissions.</p>
                </div>
                {!isTPO && (
                    <Button onClick={() => handleOpenModal()} className="bg-slate-900 hover:bg-slate-800">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Faculty
                    </Button>
                )}
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg font-medium">All Faculty Members</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by name, email, or branch..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={handleSearch}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-slate-200 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="font-semibold text-slate-700">Name</TableHead>
                                    <TableHead className="font-semibold text-slate-700">Contact</TableHead>
                                    <TableHead className="font-semibold text-slate-700">Branches</TableHead>
                                    <TableHead className="font-semibold text-slate-700">Batches</TableHead>
                                    <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                                            Loading faculty data...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredFaculty.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                                            No faculty members found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredFaculty.map((faculty) => (
                                        <TableRow key={faculty.id} className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell>
                                                <div className="font-medium text-slate-900">
                                                    <Link href={`/admin/faculty/${faculty.id}`} className="hover:underline hover:text-blue-600">
                                                        {faculty.name}
                                                    </Link>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm text-slate-600">{faculty.email}</div>
                                                <div className="text-xs text-slate-400">{faculty.phone}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {faculty.assignedBranches.map((branch, i) => (
                                                        <Badge key={i} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100">
                                                            {branch}
                                                        </Badge>
                                                    ))}
                                                    {faculty.assignedBranches.length === 0 && <span className="text-slate-400 text-sm">-</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {faculty.assignedBatches.map((batch, i) => (
                                                        <Badge key={i} variant="outline" className="text-slate-600 border-slate-200">
                                                            {batch}
                                                        </Badge>
                                                    ))}
                                                    {faculty.assignedBatches.length === 0 && <span className="text-slate-400 text-sm">-</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/faculty/${faculty.id}`)}>
                                                        <Eye className="w-4 h-4 text-slate-500" />
                                                    </Button>

                                                    {(!isTPO || true) && ( // TPO can edit assignments
                                                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal(faculty)}>
                                                            <Edit className="w-4 h-4 text-blue-600" />
                                                        </Button>
                                                    )}

                                                    {!isTPO && (
                                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(faculty.id)}>
                                                            <Trash2 className="w-4 h-4 text-red-500" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingFaculty ? (isTPO ? "Edit Assignments" : "Edit Faculty") : "Add New Faculty"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isTPO && (
                        <>
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Dr. Jane Smith"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input
                                        required
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="jane@college.edu"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone</Label>
                                    <Input
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+91 9876543210"
                                    />
                                </div>
                            </div>
                            {!editingFaculty && (
                                <div className="space-y-2">
                                    <Label>Password</Label>
                                    <Input
                                        required
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="Min 6 characters"
                                    />
                                </div>
                            )}
                        </>
                    )}

                    <div className="space-y-3">
                        <Label>Assigned Branches</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 border rounded-lg bg-slate-50 max-h-[200px] overflow-y-auto">
                            {["CSE", "ECE", "EEE", "MECH", "CIVIL", "AI&DS", "IOT", "CS-DS", "CS_AI", "AIML"].map((branch) => (
                                <div key={branch} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id={`branch-${branch}`}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={formData.assignedBranches.split(',').map(s => s.trim()).includes(branch)}
                                        onChange={(e) => {
                                            const current = formData.assignedBranches ? formData.assignedBranches.split(',').map(s => s.trim()).filter(Boolean) : [];
                                            let updated = [];
                                            if (e.target.checked) {
                                                updated = [...current, branch];
                                            } else {
                                                updated = current.filter(b => b !== branch);
                                            }
                                            setFormData({ ...formData, assignedBranches: updated.join(', ') });
                                        }}
                                    />
                                    <label
                                        htmlFor={`branch-${branch}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                    >
                                        {branch}
                                    </label>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500">Select branches managed by this faculty member.</p>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                            {editingFaculty ? "Update Faculty" : "Create Faculty"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div >
    );
}
