"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Award, BookOpen, CalendarCheck, GraduationCap, HelpCircle, Send } from "lucide-react";
import { usePlacement } from "@/contexts/PlacementContext";
import { toast } from "sonner";
import api from "@/lib/api";
import { Student } from "@/types";

export default function StudentProfile() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { students, questions, answerQuestion } = usePlacement();

    const [student, setStudent] = useState<Student | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const found = students.find(s => String(s.id) === String(id) || String(s.profileId) === String(id));
        if (found) {
            setStudent(found);
            setIsLoading(false);
        } else if (id) {
            api.get('/students', { params: { user_id: id } })
                .then(res => {
                    const list = res.data?.data || res.data?.students || [];
                    const s = list.length > 0 ? list[0] : null;
                    if (s && Object.keys(s).length > 0) {
                        setStudent({
                            ...s,
                            id: s.id || id,
                            profileId: s.profileId,
                            name: s.name,
                            email: s.email,
                            branch: s.branch,
                            year: s.year?.toString() || "",
                            batch: s.batch,
                            cgpa: s.cgpa || 0,
                            status: s.status || "Unplaced",
                            rollNumber: s.rollNo || s.roll_no || s.rollNumber,
                            phone: s.phone,
                            skills: s.skills || [],
                            certifications: s.certifications || [],
                            is_crt: s.is_crt,
                            placedCompanies: s.placedCompanies || []
                        });
                    } else {
                        setStudent(null);
                    }
                })
                .catch(err => {
                    console.error("Failed to load student", err);
                    setStudent(null);
                })
                .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, [id, students]);

    const [replyText, setReplyText] = useState("");
    const [replyingTo, setReplyingTo] = useState<string | null>(null);

    const handleReply = (questionId: string) => {
        if (!replyText.trim()) return;
        answerQuestion(questionId, replyText, "Admin User"); // Mock staff name
        setReplyText("");
        setReplyingTo(null);
        toast.success("Response sent.");
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-700">Loading student details...</p>
            </div>
        );
    }

    if (!student) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <h2 className="text-4xl font-bold text-gray-700">Student Not Found</h2>
                <Button variant="link" onClick={() => router.back()}>Go Back</Button>
            </div>
        );
    }

    const studentQuestions = questions.filter(q => q.studentId === student.id);

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <Button variant="ghost" onClick={() => router.back()} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Students
            </Button>

            {/* Header Section */}
            <div className="flex items-start justify-between bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex gap-4">
                    <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">
                        {(student.name || "U").charAt(0)}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{student.name || "Unknown"}</h1>
                        <p className="text-gray-500">{student.email}</p>
                        <div className="flex gap-2 mt-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${student.status === 'Placed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                {student.status}
                            </span>
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                                Batch: {student.batch}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                        <Mail className="w-4 h-4 mr-2" /> Email
                    </Button>
                    <Button variant="outline" size="sm">
                        <Phone className="w-4 h-4 mr-2" /> Call
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Academic Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-blue-600" />
                            Academic Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Branch</p>
                                <p className="text-base font-semibold">{student.branch}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Current Year</p>
                                <p className="text-base font-semibold">{student.year}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">CGPA</p>
                                <p className="text-xl font-bold text-blue-600">{student.cgpa}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Roll Number</p>
                                <p className="text-base font-semibold">{student.rollNumber || "N/A"}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Placement Status */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-purple-600" />
                            Placement Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Status</p>
                                <p className="text-base font-semibold">{student.status}</p>
                            </div>
                            {student.status === 'Placed' && (
                                <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                                    <p className="font-semibold text-green-800">Placed</p>
                                    {student.placedCompanies && student.placedCompanies.length > 0 ? (
                                        <div className="mt-2 space-y-1">
                                            <p className="text-xs font-medium text-green-700 uppercase">Selected Companies:</p>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {student.placedCompanies.map((company: string) => (
                                                    <span key={company} className="px-2 py-1 bg-green-200 text-green-800 rounded-md text-xs font-bold shadow-sm">
                                                        {company}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-green-600">Refer to Placements data</p>
                                    )}
                                </div>
                            )}
                            {student.status !== 'Placed' && (
                                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                                    <p className="font-semibold text-yellow-800">Eligible for Drives</p>
                                    <p className="text-sm text-yellow-600">Active Applications: 0</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Skills & Certifications Row */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-yellow-500" />
                            Skills
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {student.skills?.map((skill: string) => (
                                <span key={skill} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium border border-gray-200">
                                    {skill}
                                </span>
                            ))}
                            {(!student.skills || student.skills.length === 0) && <span className="text-sm text-gray-500 italic">No skills listed.</span>}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <GraduationCap className="w-5 h-5 text-purple-500" />
                            Certifications
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
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
                                <p className="text-sm text-gray-500 italic">No certifications listed.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Q&A Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-indigo-600" />
                        Student Questions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {studentQuestions.length === 0 && <p className="text-sm text-gray-500">No questions from this student.</p>}
                        {studentQuestions.map(q => (
                            <div key={q.id} className="bg-gray-50 rounded-lg p-4 border">
                                <p className="font-semibold text-gray-800 mb-1">{q.question}</p>
                                <p className="text-xs text-gray-400 mb-3" suppressHydrationWarning>{new Date(q.createdAt).toLocaleString()}</p>

                                {q.answer ? (
                                    <div className="bg-green-50 p-3 rounded border border-green-100">
                                        <p className="text-sm font-medium text-green-800">Answered by {q.answeredBy}</p>
                                        <p className="text-sm text-gray-700 mt-1">{q.answer}</p>
                                    </div>
                                ) : (
                                    <div className="mt-2">
                                        {replyingTo === q.id ? (
                                            <div className="space-y-2">
                                                <Input
                                                    placeholder="Type your answer..."
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                />
                                                <div className="flex gap-2">
                                                    <Button size="sm" onClick={() => handleReply(q.id)}>Send Reply</Button>
                                                    <Button size="sm" variant="outline" onClick={() => setReplyingTo(null)}>Cancel</Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <Button size="sm" variant="outline" onClick={() => setReplyingTo(q.id)}>
                                                Reply to Question
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
