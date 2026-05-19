"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import api from "@/lib/api";

const BRANCHES = [
    { value: "CSE", label: "Computer Science & Engineering" },
    { value: "ECE", label: "Electronics & Communication Engineering" },
    { value: "MECH", label: "Mechanical Engineering" },
    { value: "CIVIL", label: "Civil Engineering" },
    { value: "ELECTRICAL", label: "Electrical Engineering" },
    { value: "AI&DS", label: "Artificial Intelligence & Data Science" },
    { value: "AIML", label: "AI & Machine Learning" },
    { value: "CS-DS", label: "CS - Data Science" },
    { value: "CS-AI", label: "CS - Artificial Intelligence" },
];

interface AnnouncementItem {
    id: number;
    company_name: string;
    job_role: string;
    deadline: string;
    required_cgpa: number;
    description: string;
    application_link: string;
    package: string;
    required_skills: string[];
    is_crt_only: boolean;
    allowed_branches: string[];
    created_at: string;
}

export default function AdminAnnouncements() {
    // Force Re-render
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'Active' | 'Closed'>('ALL');
    const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const [editingId, setEditingId] = useState<number | null>(null);

    // Delete confirmation modal state
    const [deleteConfirm, setDeleteConfirm] = useState<{
        open: boolean;
        id: number | null;
        label: string;
        isBulk: boolean;
    }>({ open: false, id: null, label: "", isBulk: false });

    const [formData, setFormData] = useState({
        company: "",
        role: "",
        deadline: "",
        cgpa: "",
        description: "",
        link: "",
        package: "",
        skills: "",
        is_crt_only: false,
        allowedBranches: [] as string[]
    });

    const fetchAnnouncements = async (search: string = "") => {
        setIsLoading(true);
        try {
            const params: Record<string, string> = {};
            if (search) params.search = search;

            const response = await api.get('/announcements', { params });
            setAnnouncements(response.data.announcements || []);
        } catch (error) {
            toast.error("Failed to fetch announcements");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchAnnouncements(searchQuery);
        }, 500); // Debounce search

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Refresh function needs to know current search
    const refreshData = () => fetchAnnouncements(searchQuery);

    const handleEdit = (item: AnnouncementItem) => {
        setEditingId(item.id);
        const formattedDeadline = item.deadline ? new Date(item.deadline).toISOString().split('T')[0] : "";

        setFormData({
            company: item.company_name || "",
            role: item.job_role || "",
            deadline: formattedDeadline,
            cgpa: item.required_cgpa?.toString() || "",
            description: item.description || "",
            link: item.application_link || "",
            package: item.package || "N/A",
            skills: item.required_skills?.join(", ") || "",
            is_crt_only: item.is_crt_only || false,
            allowedBranches: item.allowed_branches || []
        });
        setIsCreateOpen(true);
    };

    const handleCreateOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                company_name: formData.company,
                job_role: formData.role,
                description: formData.description,
                application_link: formData.link, // Optional
                required_cgpa: parseFloat(formData.cgpa) || 0,
                required_skills: formData.skills.split(',').map(s => s.trim()).filter(s => s.length > 0),
                allowed_branches: formData.allowedBranches.length > 0 ? formData.allowedBranches : [],
                deadline: new Date(formData.deadline).toISOString(),
                package: formData.package || "N/A",
                is_crt_only: formData.is_crt_only
            };

            if (editingId) {
                await api.put(`/announcements/${editingId}`, payload);
                toast.success("Announcement updated successfully!");
            } else {
                await api.post('/announcements', payload);
                toast.success("Announcement created successfully!");
            }

            setIsCreateOpen(false);
            setEditingId(null);
            setFormData({
                company: "",
                role: "",
                deadline: "",
                cgpa: "",
                description: "",
                link: "",
                package: "",
                skills: "",
                is_crt_only: false,
                allowedBranches: []
            });
            refreshData();
        } catch (error) {
            console.error(error);
            toast.error(editingId ? "Failed to update announcement" : "Failed to create announcement");
        }
    };

    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(announcements.map(a => a.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id: number, checked: boolean) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
        }
    };

    const handleBulkDelete = () => {
        if (!selectedIds.length) return;
        setDeleteConfirm({
            open: true,
            id: null,
            label: `${selectedIds.length} selected announcement${selectedIds.length > 1 ? 's' : ''}`,
            isBulk: true,
        });
    };

    const handleDelete = (item: AnnouncementItem) => {
        setDeleteConfirm({
            open: true,
            id: item.id,
            label: `"${item.company_name} – ${item.job_role}"`,
            isBulk: false,
        });
    };

    const confirmDelete = async () => {
        try {
            if (deleteConfirm.isBulk) {
                await api.post('/announcements/bulk-delete', { ids: selectedIds });
                toast.success(`${selectedIds.length} announcements deleted`);
                setSelectedIds([]);
            } else if (deleteConfirm.id !== null) {
                await api.delete(`/announcements/${deleteConfirm.id}`);
                toast.success("Announcement deleted");
            }
            setDeleteConfirm({ open: false, id: null, label: "", isBulk: false });
            refreshData();
        } catch (error) {
            console.error(error);
            toast.error(deleteConfirm.isBulk ? "Failed to delete selected announcements" : "Failed to delete announcement");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Manage Announcements</h2>
                    <p className="text-muted-foreground">Create and manage placement drives.</p>
                </div>
                <div className="flex gap-2">
                    {selectedIds.length > 0 && (
                        <Button
                            variant="destructive"
                            onClick={handleBulkDelete}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Selected ({selectedIds.length})
                        </Button>
                    )}
                    <Button onClick={() => {
                        setEditingId(null);
                        setFormData({
                            company: "",
                            role: "",
                            deadline: "",
                            cgpa: "",
                            description: "",
                            link: "",
                            package: "",
                            skills: "",
                            is_crt_only: false,
                            allowedBranches: []
                        });
                        setIsCreateOpen(true);
                    }} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Announcement
                    </Button>
                </div>
            </div>

            <Card className="border-none shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="relative w-72">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search announcements..."
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant={filterStatus === 'ALL' ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilterStatus('ALL')}
                        >
                            All
                        </Button>
                        <Button
                            variant={filterStatus === 'Active' ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilterStatus(filterStatus === 'Active' ? 'ALL' : 'Active')}
                        >
                            Active
                        </Button>
                        <Button
                            variant={filterStatus === 'Closed' ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilterStatus(filterStatus === 'Closed' ? 'ALL' : 'Closed')}
                        >
                            Closed
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-10">Loading announcements...</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                        <Checkbox
                                            checked={announcements.length > 0 && selectedIds.length === announcements.length}
                                            onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                        />
                                    </TableHead>
                                    <TableHead>Company</TableHead>
                                    <TableHead>Skills</TableHead>
                                    <TableHead>Target Branches</TableHead>
                                    <TableHead>Posted</TableHead>
                                    <TableHead>Deadline</TableHead>
                                    <TableHead>CGPA</TableHead>
                                    <TableHead>Package</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {announcements
                                    .map(item => ({
                                        ...item,
                                        status: new Date(item.deadline) > new Date() ? 'Active' : 'Closed'
                                    }))
                                    .filter(item => {
                                        const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
                                        // Backend handles search, frontend handles status filter for now (or move status to backend too?)
                                        // Keeping status filter client-side as it's derived data
                                        return matchesStatus;
                                    })
                                    .map((item) => (
                                        <TableRow
                                            key={item.id}
                                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                                            onClick={() => window.location.href = `/admin/applications?company=${encodeURIComponent(item.company_name)}`}
                                        >
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <Checkbox
                                                    checked={selectedIds.includes(item.id)}
                                                    onCheckedChange={(checked) => handleSelectRow(item.id, checked as boolean)}
                                                />
                                            </TableCell>
                                            <TableCell className="font-semibold text-blue-600 hover:underline">
                                                {item.company_name || "N/A"}
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate text-gray-900" title={item.required_skills?.join(", ")}>
                                                {item.required_skills?.slice(0, 3).join(", ")}
                                                {item.required_skills?.length > 3 && "..."}
                                            </TableCell>
                                            <TableCell className="text-gray-900">
                                                {item.allowed_branches && item.allowed_branches.length > 0 ? (
                                                    item.allowed_branches.length <= 2 ? (
                                                        item.allowed_branches.map((b: string) => (
                                                            <span key={b} className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium mr-1 mb-1">
                                                                {b}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span key={item.id} className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium mr-1 mb-1" title={item.allowed_branches.join(", ")}>
                                                            {item.allowed_branches.length} Branches
                                                        </span>
                                                    )
                                                ) : (
                                                    <span className="text-gray-400 text-sm">All Branches</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-gray-900">{new Date(item.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-gray-900">{new Date(item.deadline).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-gray-900">{item.required_cgpa}</TableCell>
                                            <TableCell className="text-gray-900">{item.package || "N/A"}</TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {item.status}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-8 w-8 text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:text-blue-700"
                                                        title="Edit Announcement"
                                                        onClick={() => handleEdit(item)}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-600 border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-700"
                                                        title="Delete Announcement"
                                                        onClick={() => handleDelete(item)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title={editingId ? "Edit Announcement" : "Create New Announcement"}>
                <form onSubmit={handleCreateOrUpdate} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Company Name</label>
                            <Input
                                required
                                placeholder="e.g. Google"
                                value={formData.company}
                                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Job Role</label>
                            <Input
                                required
                                placeholder="e.g. Software Engineer"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Application Link</label>
                        <Input
                            placeholder="https://..."
                            value={formData.link}
                            onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Application Deadline</label>
                            <Input
                                type="date"
                                required
                                value={formData.deadline}
                                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Min CGPA</label>
                            <Input
                                type="number"
                                step="0.1"
                                placeholder="e.g. 7.5"
                                value={formData.cgpa}
                                onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Required Skills (comma separated)</label>
                        <Input
                            placeholder="e.g. Java, Python, React"
                            value={formData.skills}
                            onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Package (LPA)</label>
                        <Input
                            placeholder="e.g. 10 LPA or 1000000"
                            value={formData.package}
                            onChange={(e) => setFormData({ ...formData, package: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Allowed Branches (Visibility)</label>
                        <div className="grid grid-cols-2 gap-2 border p-3 rounded-md">
                            {BRANCHES.map((branch) => (
                                <div key={branch.value} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`branch-${branch.value}`}
                                        checked={formData.allowedBranches.includes(branch.value)}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                setFormData(prev => ({ ...prev, allowedBranches: [...prev.allowedBranches, branch.value] }));
                                            } else {
                                                setFormData(prev => ({ ...prev, allowedBranches: prev.allowedBranches.filter(b => b !== branch.value) }));
                                            }
                                        }}
                                    />
                                    <label
                                        htmlFor={`branch-${branch.value}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        {branch.label}
                                    </label>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">Leave all unchecked to allow ALL branches.</p>
                    </div>

                    <div className="flex items-center space-x-2 border p-3 rounded-md bg-blue-50/30">
                        <Checkbox
                            id="is_crt_only"
                            checked={formData.is_crt_only}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_crt_only: checked as boolean }))}
                        />
                        <div className="grid gap-1.5 leading-none">
                            <label
                                htmlFor="is_crt_only"
                                className="text-sm font-medium leading-none cursor-pointer"
                            >
                                Restricted to CRT Students Only
                            </label>
                            <p className="text-xs text-muted-foreground">
                                Only students registered for CRT will see this announcement.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <textarea
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Job description and requirements..."
                            required
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                            {editingId ? "Update Announcement" : "Create Announcement"}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={deleteConfirm.open}
                onClose={() => setDeleteConfirm({ open: false, id: null, label: "", isBulk: false })}
                title="Confirm Deletion"
            >
                <div className="space-y-5">
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-100">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                            <Trash2 className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-red-800">You are about to delete:</p>
                            <p className="text-sm text-red-700 mt-1 font-medium">{deleteConfirm.label}</p>
                            <p className="text-xs text-red-500 mt-2">This action cannot be undone.</p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteConfirm({ open: false, id: null, label: "", isBulk: false })}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={confirmDelete}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Yes, Delete
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
