"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Student } from "@/types";

interface AttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    students: Student[];
    branch: string;
    onSave: (date: string, subject: string, presentStudentIds: string[]) => void;
}

export function AttendanceModal({ isOpen, onClose, students, branch, onSave }: AttendanceModalProps) {
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [subject, setSubject] = useState("");
    // Default all selected (Present)
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set(students.map(s => s.id)));

    const handleToggle = (id: string) => {
        const newSet = new Set(selectedStudentIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedStudentIds(newSet);
    };

    const handleSelectAll = () => {
        if (selectedStudentIds.size === students.length) {
            setSelectedStudentIds(new Set());
        } else {
            setSelectedStudentIds(new Set(students.map(s => s.id)));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(date, subject, Array.from(selectedStudentIds));
        onClose();
        // Reset form for next time? Maybe keep date/subject.
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Mark Attendance - ${branch}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Date</label>
                        <Input
                            type="date"
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Subject / Session</label>
                        <Input
                            placeholder="e.g. Java Lab, Placement Training"
                            required
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                        />
                    </div>
                </div>

                <div className="border rounded-md max-h-[400px] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    <input
                                        type="checkbox"
                                        checked={selectedStudentIds.size === students.length && students.length > 0}
                                        onChange={handleSelectAll}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Roll No</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {students.map((student) => (
                                <TableRow key={student.id} onClick={() => handleToggle(student.id)} className="cursor-pointer hover:bg-slate-50">
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={selectedStudentIds.has(student.id)}
                                            onChange={() => handleToggle(student.id)}
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium">{student.name}</TableCell>
                                    <TableCell>{student.rollNumber || "N/A"}</TableCell>
                                    <TableCell className="text-right">
                                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${selectedStudentIds.has(student.id) ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                            }`}>
                                            {selectedStudentIds.has(student.id) ? "Present" : "Absent"}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {students.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No students found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                    <Button type="submit" className="bg-blue-600">Save Attendance</Button>
                </div>
            </form>
        </Modal>
    );
}
