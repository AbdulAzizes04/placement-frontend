"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Student } from "@/types";

interface EditStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: Student | null;
    onSave: (updatedStudent: Student) => void;
}

export function EditStudentModal({ isOpen, onClose, student, onSave }: EditStudentModalProps) {
    const [prevStudent, setPrevStudent] = useState<Student | null>(student);
    const [formData, setFormData] = useState<Partial<Student>>(student || {});
    const [companyName, setCompanyName] = useState("");

    if (student !== prevStudent) {
        setPrevStudent(student);
        setFormData(student || {});
        setCompanyName("");
    }

    const handleChange = (field: keyof Student, value: Student[keyof Student]) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!student) return;

        // Merge logic
        const updated = { ...student, ...formData } as Student;

        // If placed, we might want to do something with companyName (e.g. log it, or update a 'placedCompany' field if it existed)
        // For now, allow saving the status.

        onSave(updated);
        onClose();
    };

    if (!student) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Student Status">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                        value={formData.name || ""}
                        onChange={(e) => handleChange("name", e.target.value)}
                        disabled // Typically staff shouldn't rename students easily? Or maybe yes. Let's allow edit.
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                        value={formData.email || ""}
                        onChange={(e) => handleChange("email", e.target.value)}
                        type="email"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <select
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        value={formData.status || "Active"}
                        onChange={(e) => handleChange("status", e.target.value)}
                    >
                        <option value="Active">Active</option>
                        <option value="Placed">Placed</option>
                        <option value="Inactive">Inactive / Rejected</option>
                    </select>
                </div>

                {formData.status === 'Placed' && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Placed At (Company)</label>
                        <Input
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="e.g. Google"
                            required
                        />
                    </div>
                )}

                {formData.status === 'Inactive' && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Reason (Optional)</label>
                        <Input
                            placeholder="e.g. Opted out, Higher Studies"
                        />
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                    <Button type="submit" className="bg-blue-600">Save Changes</Button>
                </div>
            </form>
        </Modal>
    );
}
