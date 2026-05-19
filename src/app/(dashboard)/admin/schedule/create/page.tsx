"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Calendar as CalendarIcon, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import api from "@/lib/api"; // Updated import
import { toast } from "sonner";

// Types
interface Batch {
    id: string;
    batch_name: string;
    academic_year: string;
}

interface Faculty {
    user_id: string;
    id: string; // Faculty Profile ID
    name: string;
    assignedBranches: string[];
    user?: {
        name: string;
        email: string;
    };
}

export default function CreateSchedulePage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        academic_year: "",
        is_batch_based: false, // "Do you want to link...?"
        type: "BRANCH" as "BATCH" | "BRANCH",
        batch_ids: [] as string[],
        branch: "",
        name: "",
        start_date: "",
        end_date: "",
        room_no: "",
        faculty_ids: [] as string[]
    });

    // Data State
    const [batches, setBatches] = useState<Batch[]>([]);
    const [facultyList, setFacultyList] = useState<Faculty[]>([]);

    // Fetch Logic
    useEffect(() => {
        fetchBatches();
        fetchFaculty();
    }, []);

    const fetchBatches = async () => {
        try {
            const res = await api.get("/crt/batch");
            setBatches(res.data);
        } catch (error) {
            console.error("Failed to fetch batches", error);
        }
    };

    const fetchFaculty = async () => {
        try {
            const res = await api.get("/faculty");
            // Need to ensure this endpoint returns FacultyProfile[] with user info
            // If not, I might need to adjust endpoint or response mapping
            setFacultyList(res.data);
        } catch (error) {
            console.error("Failed to fetch faculty", error);
        }
    };
    // Step 1: Year & Type
    const handleYearSelect = (year: string) => {
        setFormData({ ...formData, academic_year: year });
    };

    // Handlers
    const handleNext = () => {
        // Validation
        if (step === 1) {
            if (!formData.academic_year) return toast.error("Please select an academic year");
        }
        if (step === 2) {
            if (formData.is_batch_based) {
                if (formData.batch_ids.length === 0) return toast.error("Please select at least one batch");
            } else {
                if (!formData.branch) return toast.error("Please select a branch");
            }
        }
        setStep(step + 1);
    };

    const handleBack = () => setStep(step - 1);

    const handleSubmit = async () => {
        // Final Validation
        if (!formData.name || !formData.start_date || !formData.end_date || !formData.room_no) {
            return toast.error("Please fill in all schedule details");
        }
        if (formData.faculty_ids.length === 0) {
            return toast.error("Please assign at least one faculty member");
        }

        setIsLoading(true);
        try {
            const payload = {
                type: formData.is_batch_based ? "BATCH" : "BRANCH",
                academic_year: formData.academic_year,
                name: formData.name,
                start_date: formData.start_date,
                end_date: formData.end_date,
                room_no: formData.room_no,
                branch: formData.is_batch_based ? undefined : formData.branch,
                batch_ids: formData.is_batch_based ? formData.batch_ids : undefined,
                faculty_ids: formData.faculty_ids
            };

            await api.post("/crt/schedule", payload);
            toast.success("Schedule created successfully!");
            router.push("/admin/schedule");
        } catch (error: unknown) {
            const err = error as { response?: { status?: number; data?: { error?: string } } };
            // Error handling is partly done by interceptor, but we catch specific API errors here
            // The interceptor might have already handled 401/500, but for form errors (400) we want to show toast
            const msg = err.response?.data?.error || "Failed to create schedule";
            // Check if interceptor didn't handle it (e.g. not 401)
            if (err.response?.status !== 401) {
                toast.error(msg);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Create New Schedule
                </h1>
            </div>

            {/* Progress Steps */}
            <div className="flex justify-between items-center px-10">
                {[1, 2, 3].map((s) => (
                    <div key={s} className="flex flex-col items-center gap-2">
                        <div className={`
              w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
              ${step >= s ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"}
            `}>
                            {s}
                        </div>
                        <span className="text-xs font-medium text-gray-500">
                            {s === 1 ? "Year & Type" : s === 2 ? "Scope" : "Details"}
                        </span>
                    </div>
                ))}
            </div>

            <Card className="border-t-4 border-t-blue-600 shadow-lg">
                <CardContent className="p-6 pt-6">

                    {/* STEP 1: Academic Year & Link Option */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <Label className="text-lg">Select Academic Year</Label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {["2022-2026", "2023-2027", "2024-2028"].map((year) => (
                                        <div
                                            key={year}
                                            onClick={() => handleYearSelect(year)}
                                            className={`
                        cursor-pointer p-4 rounded-xl border-2 transition-all hover:border-blue-400
                        ${formData.academic_year === year
                                                    ? "border-blue-600 bg-blue-50 text-blue-700"
                                                    : "border-gray-200 hover:bg-gray-50"}
                      `}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold text-lg">{year}</span>
                                                {formData.academic_year === year && <Check className="h-5 w-5 text-blue-600" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {formData.academic_year && (
                                <div className="space-y-4 pt-4 border-t">
                                    <Label className="text-lg">
                                        Do you want to link this schedule to existing batches of {formData.academic_year}?
                                    </Label>
                                    <div className="flex gap-6">
                                        <div
                                            className={`
                        flex-1 cursor-pointer p-4 rounded-xl border-2 transition-all
                        ${formData.is_batch_based
                                                    ? "border-blue-600 bg-blue-50"
                                                    : "border-gray-200 hover:bg-gray-50"}
                      `}
                                            onClick={() => setFormData({ ...formData, is_batch_based: true })}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${formData.is_batch_based ? "border-blue-600 bg-blue-600" : "border-gray-400"}`}>
                                                    {formData.is_batch_based && <Check className="h-3 w-3 text-white" />}
                                                </div>
                                                <span className="font-medium">Yes, Link Batches</span>
                                            </div>
                                        </div>

                                        <div
                                            className={`
                        flex-1 cursor-pointer p-4 rounded-xl border-2 transition-all
                        ${!formData.is_batch_based && formData.academic_year // Selected No
                                                    ? "border-blue-600 bg-blue-50"
                                                    : "border-gray-200 hover:bg-gray-50"}
                      `}
                                            onClick={() => setFormData({ ...formData, is_batch_based: false })}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${!formData.is_batch_based ? "border-blue-600 bg-blue-600" : "border-gray-400"}`}>
                                                    {!formData.is_batch_based && <Check className="h-3 w-3 text-white" />}
                                                </div>
                                                <span className="font-medium">No, Select Branch Manually</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 2: Batch Selection OR Branch Selection */}
                    {step === 2 && (
                        <div className="space-y-6">
                            {formData.is_batch_based ? (
                                // BATCH SELECTION
                                <div className="space-y-4">
                                    <Label className="text-lg">Select Batches ({formData.academic_year})</Label>
                                    {batches.filter(b => b.academic_year === formData.academic_year).length === 0 ? (
                                        <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg">
                                            No batches found for {formData.academic_year}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {batches
                                                .filter(b => b.academic_year === formData.academic_year)
                                                .map((batch) => (
                                                    <div
                                                        key={batch.id}
                                                        className={`
                            cursor-pointer p-4 rounded-lg border transition-all flex items-center space-x-3
                            ${formData.batch_ids.includes(batch.id) ? "border-blue-600 bg-blue-50" : "border-gray-200"}
                          `}
                                                        onClick={() => {
                                                            const ids = formData.batch_ids.includes(batch.id)
                                                                ? formData.batch_ids.filter(id => id !== batch.id)
                                                                : [...formData.batch_ids, batch.id];
                                                            setFormData({ ...formData, batch_ids: ids });
                                                        }}
                                                    >
                                                        <Checkbox checked={formData.batch_ids.includes(batch.id)} />
                                                        <span className="font-medium">{batch.batch_name}</span>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // BRANCH SELECTION
                                <div className="space-y-4">
                                    <Label className="text-lg">Select Branch</Label>
                                    <Select
                                        value={formData.branch}
                                        onValueChange={(val) => setFormData({ ...formData, branch: val })}
                                    >
                                        <SelectTrigger className="w-full md:w-1/2">
                                            <SelectValue placeholder="Select Branch" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {["CSE", "ECE", "EEE", "MECH", "CIVIL", "AI&DS", "IOT", "CS-DS", "CS_AI", "AIML"].map((branch) => (
                                                <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 3: Details & Faculty */}
                    {step === 3 && (
                        <div className="space-y-8">
                            {/* Schedule Details */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <CalendarIcon className="h-5 w-5 text-blue-600" />
                                    Schedule Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Training / Schedule Name</Label>
                                        <Input
                                            placeholder="e.g. CRT Phase 1 - Aptitude"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Room Number</Label>
                                        <Input
                                            placeholder="e.g. Seminar Hall 3"
                                            value={formData.room_no}
                                            onChange={(e) => setFormData({ ...formData, room_no: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Start Date</Label>
                                        <Input
                                            type="date"
                                            value={formData.start_date}
                                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>End Date</Label>
                                        <Input
                                            type="date"
                                            value={formData.end_date}
                                            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                            min={formData.start_date}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Schedule will remain active until 23:59 on this date.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Faculty Assignment */}
                            <div className="space-y-4 pt-6 border-t">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <Users className="h-5 w-5 text-blue-600" />
                                    Assign Faculty
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[300px] overflow-y-auto">
                                    {facultyList.map((faculty) => (
                                        <div
                                            key={faculty.id}
                                            className={`
                        cursor-pointer p-3 rounded-lg border flex items-start space-x-3 transition-all
                        ${formData.faculty_ids.includes(faculty.id)
                                                    ? "border-blue-600 bg-blue-50"
                                                    : "border-gray-200 hover:bg-gray-50"}
                      `}
                                            onClick={() => {
                                                const ids = formData.faculty_ids.includes(faculty.id)
                                                    ? formData.faculty_ids.filter(id => id !== faculty.id)
                                                    : [...formData.faculty_ids, faculty.id];
                                                setFormData({ ...formData, faculty_ids: ids });
                                            }}
                                        >
                                            <Checkbox
                                                checked={formData.faculty_ids.includes(faculty.id)}
                                                onCheckedChange={() => { /* Handled by parent click */ }}
                                                className="mt-1"
                                            />
                                            <div className="flex-1">
                                                <p className="font-medium text-sm text-gray-900">{faculty.user?.name || faculty.name}</p>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {(faculty.assignedBranches && faculty.assignedBranches.length > 0) ? (
                                                        faculty.assignedBranches.map(branch => (
                                                            <span key={branch} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded border border-gray-200">
                                                                {branch}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">No Branch Assigned</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between mt-8 pt-4 border-t">
                        {step > 1 ? (
                            <Button variant="outline" onClick={handleBack}>Back</Button>
                        ) : (
                            <div></div>
                        )}

                        {step < 3 ? (
                            <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700">
                                Next Step
                            </Button>
                        ) : (
                            <Button onClick={handleSubmit} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                                {isLoading ? "Creating..." : "Create Schedule"}
                            </Button>
                        )}
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}
