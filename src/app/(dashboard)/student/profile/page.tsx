"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { User, Phone, MapPin, GraduationCap, Award, Edit, Plus, X, HelpCircle, Send } from "lucide-react";
import { usePlacement } from "@/contexts/PlacementContext";
import { toast } from "sonner";
import { Student, Certification } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";

export default function StudentProfile() {
    const { user } = useAuth();
    const { students, updateStudentProfile, questions, askQuestion } = usePlacement();

    // Use logged-in user's ID for matching profiles

    // Find the student profile that matches the logged-in user
    // For students, the context might return a list containing just their profile, 
    // or we might need to match by user_id if the list contains profiles.
    // Based on PlacementContext, for students, 'students' array is empty!
    // Wait, PlacementContext says: 
    // "--- STUDENT VIEW --- ... setStudents([]);"
    // So for students, the 'students' array is EMPTY.
    // We should probably fetch the single profile or use useAuth()'s user data + a separate fetchProfile call.

    // However, looking at the component, it expects a full 'Student' object.
    // Let's rely on a new useEffect to fetch the profile if not in the list.

    const [student, setStudent] = useState<Student | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProfile = async () => {
            if (!user) return;
            try {
                // Try to find in existing list first
                const found = students.find(s => String(s.id) === String(user.id) || String(s.profileId) === String(user.id));
                if (found) {
                    setStudent(found);
                } else {
                    // Fetch directly if not found (e.g. Student View)
                    const res = await api.get('/students/profile'); // Assuming this endpoint exists based on controller
                    // Controller has getProfile at /profile or similar?
                    // StudentController.getProfile is at GET /students/profile (we need to verify route)
                    // The controller method is `getProfile` mapped to `authService.getProfile`.
                    // Wait, StudentController.getProfile uses `studentService.getProfile`.

                    // Let's assume GET /api/students/profile works for now as standard.
                    // If not, we might need to fix the route too.

                    // Response structure from existing code:
                    // res.json(profile);

                    const profileData = res.data;
                    if (profileData) {
                        setStudent({
                            id: user.id,
                            profileId: profileData.id,
                            name: user.name,
                            email: user.email,
                            branch: profileData.branch,
                            year: profileData.year?.toString(),
                            batch: profileData.batch,
                            cgpa: profileData.cgpa,
                            status: profileData.status || "Unplaced",
                            rollNumber: profileData.roll_no, // It might be decrypted now
                            skills: profileData.skills || [],
                            certifications: profileData.certifications || [], // If any
                            phone: user.phone
                        } as Student);
                    }
                }
            } catch (err) {
                console.error("Failed to load profile", err);
                toast.error("Could not load profile data");
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, [user, students]);

    const [isEditing, setIsEditing] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Student>(student || {} as Student);
    const [newSkill, setNewSkill] = useState("");
    const [newCert, setNewCert] = useState<Certification>({ name: "", issuer: "", date: "" });

    // Help State
    const [newQuestion, setNewQuestion] = useState("");

    // Sync formData with student when student changes (e.g. after save)
    useEffect(() => {
        if (student) {
            setFormData(student);
        }
    }, [student]);

    if (loading) return <div>Loading Profile...</div>;
    if (!student) return <div>Profile not found. Please contact admin.</div>;

    const handleEditClick = () => {
        setFormData(student);
        setIsEditing(true);
    };

    const handleSave = () => {
        updateStudentProfile(student.id, {
            cgpa: formData.cgpa,
            skills: formData.skills,
            certifications: formData.certifications
        });
        toast.success("Profile Updated Successfully");
        setIsEditing(false);
    };

    const handleAddSkill = () => {
        if (newSkill.trim()) {
            setFormData({ ...formData, skills: [...(formData.skills || []), newSkill.trim()] });
            setNewSkill("");
        }
    };

    const handleRemoveSkill = (skillToRemove: string) => {
        setFormData({ ...formData, skills: (formData.skills || []).filter(s => s !== skillToRemove) });
    };

    const handleAddCert = () => {
        if (newCert.name && newCert.issuer) {
            setFormData({ ...formData, certifications: [...(formData.certifications || []), newCert] });
            setNewCert({ name: "", issuer: "", date: "" });
        }
    };

    const handleRemoveCert = (index: number) => {
        setFormData({ ...formData, certifications: (formData.certifications || []).filter((_, i) => i !== index) });
    };

    const handleAskQuestion = () => {
        if (!newQuestion.trim()) return;
        askQuestion(newQuestion, student.id, student.name || "Unknown");
        setNewQuestion("");
        toast.success("Question submitted to Admin/Staff");
    };

    // Filter questions for this student
    const myQuestions = questions.filter(q => q.studentId === student.id);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">My Profile</h2>
                    <p className="text-muted-foreground">Manage your personal and academic details.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsHelpOpen(true)} className="gap-2">
                        <HelpCircle className="w-4 h-4" /> Help & Q/A
                    </Button>
                    <Button onClick={handleEditClick} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Profile
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Personal Info Card */}
                <Card className="md:col-span-1 shadow-md border-none">
                    <CardContent className="pt-6 flex flex-col items-center text-center">
                        <div className="w-32 h-32 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-4xl font-bold mb-4 ring-4 ring-blue-50">
                            {(student.name || "U").charAt(0)}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">{student.name}</h3>
                        <p className="text-sm text-gray-500 mb-4">{student.email}</p>
                        <div className="w-full space-y-3 text-left">
                            <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                                <User className="w-4 h-4 text-blue-500" />
                                <span>{student.id}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                                <Phone className="w-4 h-4 text-green-500" />
                                <span>{student.phone || "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                                <MapPin className="w-4 h-4 text-red-500" />
                                <span>Hostel Block A</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Academic & Skills */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="shadow-md border-none">
                        <CardHeader>
                            <CardTitle>Academic Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white border rounded-lg p-4">
                                    <p className="text-sm text-muted-foreground">Branch</p>
                                    <p className="text-lg font-semibold text-gray-900">{student.branch}</p>
                                </div>
                                <div className="bg-white border rounded-lg p-4">
                                    <p className="text-sm text-muted-foreground">Year</p>
                                    <p className="text-lg font-semibold text-gray-900">{student.year}</p>
                                </div>
                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 col-span-2">
                                    <p className="text-sm text-blue-600 font-medium">CGPA</p>
                                    <div className="flex items-end gap-2">
                                        <p className="text-3xl font-bold text-blue-700">{student.cgpa}</p>
                                        <p className="text-sm text-blue-500 mb-1">/ 10.0</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-md border-none">
                        <CardHeader>
                            <CardTitle>Skills & Certifications</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Award className="w-4 h-4 text-yellow-500" />
                                    Technical Skills
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {student.skills?.map(skill => (
                                        <span key={skill} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium border border-gray-200">
                                            {skill}
                                        </span>
                                    ))}
                                    {(!student.skills || student.skills.length === 0) && <span className="text-sm text-gray-500 italic">No skills added.</span>}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <GraduationCap className="w-4 h-4 text-purple-500" />
                                    Certifications
                                </h4>
                                <div className="space-y-3">
                                    {student.certifications?.map((cert, i) => (
                                        <div key={i} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <div>
                                                <p className="font-medium text-gray-900">{cert.name}</p>
                                                <p className="text-xs text-gray-500">{cert.issuer}</p>
                                            </div>
                                            <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
                                                {cert.date}
                                            </span>
                                        </div>
                                    ))}
                                    {(!student.certifications || student.certifications.length === 0) && (
                                        <p className="text-sm text-gray-500 italic">No certifications added yet.</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Edit Profile Modal */}
            <Modal isOpen={isEditing} onClose={() => setIsEditing(false)} title="Edit Profile">
                <div className="space-y-6">
                    {/* CGPA Section */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none">CGPA</label>
                        <Input
                            type="number"
                            step="0.01"
                            max="10"
                            value={formData.cgpa}
                            onChange={(e) => setFormData({ ...formData, cgpa: parseFloat(e.target.value) })}
                        />
                    </div>

                    {/* Skills Section */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none">Skills</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {formData.skills?.map(skill => (
                                <span key={skill} className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm border">
                                    {skill}
                                    <button onClick={() => handleRemoveSkill(skill)} className="text-gray-400 hover:text-red-500">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Add a skill"
                                value={newSkill}
                                onChange={(e) => setNewSkill(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddSkill();
                                    }
                                }}
                            />
                            <Button type="button" onClick={handleAddSkill} variant="outline" size="icon">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Certifications Section */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none">Certifications</label>
                        <div className="space-y-2 mb-2">
                            {formData.certifications?.map((cert, index) => (
                                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded border text-sm">
                                    <div>
                                        <div className="font-medium">{cert.name}</div>
                                        <div className="text-xs text-gray-500">{cert.issuer}</div>
                                    </div>
                                    <button onClick={() => handleRemoveCert(index)} className="text-gray-400 hover:text-red-500">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-2 border p-3 rounded-md bg-gray-50/50">
                            <Input
                                placeholder="Certificate Name"
                                value={newCert.name}
                                onChange={(e) => setNewCert({ ...newCert, name: e.target.value })}
                            />
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Issuer"
                                    value={newCert.issuer}
                                    onChange={(e) => setNewCert({ ...newCert, issuer: e.target.value })}
                                />
                                <Input
                                    placeholder="Date (YYYY-MM)"
                                    value={newCert.date}
                                    onChange={(e) => setNewCert({ ...newCert, date: e.target.value })}
                                    className="w-32"
                                />
                            </div>
                            <Button type="button" onClick={handleAddCert} variant="outline" size="sm" className="w-full mt-2">
                                <Plus className="w-4 h-4 mr-2" /> Add Certification
                            </Button>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                        <Button onClick={handleSave}>Save Changes</Button>
                    </div>
                </div>
            </Modal>

            {/* Help & Q/A Modal */}
            <Modal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} title="Help & Support">
                <div className="flex flex-col h-[500px]">
                    <div className="flex-1 overflow-y-auto space-y-4 p-2">
                        {myQuestions.length === 0 && (
                            <div className="text-center text-gray-500 py-10">
                                <HelpCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                <p>No questions asked yet.</p>
                                <p className="text-xs">Ask the admin or staff about placement drives, eligibility, etc.</p>
                            </div>
                        )}
                        {myQuestions.map(q => (
                            <div key={q.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
                                <p className="font-medium text-gray-900">{q.question}</p>
                                <p className="text-xs text-gray-400" suppressHydrationWarning>{new Date(q.createdAt).toLocaleDateString()}</p>

                                {q.answer ? (
                                    <div className="bg-blue-50 p-2 rounded border border-blue-100 mt-2">
                                        <p className="text-sm text-blue-800 font-medium">Answered by {q.answeredBy}</p>
                                        <p className="text-sm text-gray-700 mt-1">{q.answer}</p>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded w-fit">
                                        <span>Waiting for response...</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="pt-4 border-t mt-2">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Ask a question..."
                                value={newQuestion}
                                onChange={(e) => setNewQuestion(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
                            />
                            <Button size="icon" onClick={handleAskQuestion}>
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
