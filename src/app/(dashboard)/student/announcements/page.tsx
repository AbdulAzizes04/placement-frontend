"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Briefcase, Calendar, GraduationCap, X } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Announcement } from "@/types";

export default function StudentAnnouncements() {
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    useAuth(); // Ensure auth context is consumed (token handled via api interceptor)

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async (search: string = "") => {
        setIsLoading(true);
        try {
            const params: Record<string, string> = {};
            if (search) params.search = search;

            const response = await api.get('/announcements', { params });
            setAnnouncements(response.data.announcements || []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load announcements");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchAnnouncements(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleApply = async () => {
        if (!selectedAnnouncement) return;
        try {
            await api.post('/applications/apply', {
                announcement_id: selectedAnnouncement.id
            });
            toast.success("Applied successfully!");
            setSelectedAnnouncement(null);
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { error?: string } } };
            toast.error(axiosError.response?.data?.error || "Failed to apply");
        }
    };

    // Data is already filtered by backend
    const filteredAnnouncements = announcements;

    // Helper to check if announcement is new (within 48 hours)
    const isNew = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
        return diffHours <= 48;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Announcements</h2>
                    <p className="text-muted-foreground">Apply to the latest placement drives.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search companies..."
                            className="pl-8 bg-white border-gray-200"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" className="border-gray-200">Filter</Button>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-10">Loading...</div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredAnnouncements.map((item) => (
                        <Card key={item.id} className={`flex flex-col shadow-md hover:shadow-xl transition-all duration-200 bg-white cursor-pointer group relative ${isNew(item.created_at) ? 'border-l-4 border-l-red-500' : 'border-none'}`} onClick={() => setSelectedAnnouncement(item)}>
                            {isNew(item.created_at) && (
                                <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10 animate-bounce">
                                    NEW
                                </div>
                            )}
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        {item.company_name.charAt(0)}
                                    </div>
                                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-medium">Open</span>
                                </div>
                                <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                                    {item.company_name}
                                </CardTitle>
                                <p className="text-sm font-semibold text-gray-600">{item.job_role}</p>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-4">
                                <div className="text-sm text-gray-500 line-clamp-2">
                                    {item.description}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Briefcase className="w-4 h-4 text-blue-500" />
                                        N/A
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <GraduationCap className="w-4 h-4 text-purple-500" />
                                        {item.required_cgpa || 0} CGPA
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600 col-span-2">
                                        <Calendar className="w-4 h-4 text-red-500" />
                                        Deadline: {new Date(item.deadline).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {item.required_skills?.map((skill: string) => (
                                        <span key={skill} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded border border-gray-200">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 border-t bg-gray-50/50">
                                <Button className="w-full bg-blue-600 hover:bg-blue-700 font-semibold shadow-lg shadow-blue-500/20 text-white">
                                    View Details
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            {selectedAnnouncement && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setSelectedAnnouncement(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-linear-to-r from-blue-600 to-indigo-700 p-6 text-white">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold">{selectedAnnouncement.company_name}</h2>
                                    <p className="text-blue-100 font-medium text-lg">Placement Drive</p>
                                </div>
                                <button onClick={() => setSelectedAnnouncement(null)} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors absolute top-4 right-4">
                                    <span className="sr-only">Close</span>
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <p className="text-sm text-blue-600 font-medium">Package (CTC)</p>
                                    <p className="text-xl font-bold text-gray-900">N/A</p>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-lg">
                                    <p className="text-sm text-purple-600 font-medium">Eligibility</p>
                                    <p className="text-xl font-bold text-gray-900">{selectedAnnouncement.required_cgpa} CGPA</p>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Job Description</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    {selectedAnnouncement.description}
                                </p>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Required Skills</h3>
                                <div className="flex flex-wrap gap-2">
                                    {selectedAnnouncement.required_skills?.map((skill: string) => (
                                        <span key={skill} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium border border-gray-200">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                <div className="text-sm text-gray-500">
                                    Apply before <span className="font-semibold text-red-600">{new Date(selectedAnnouncement.deadline).toLocaleDateString()}</span>
                                </div>
                                <div className="flex gap-3">
                                    <Button variant="outline" onClick={() => setSelectedAnnouncement(null)}>Cancel</Button>
                                    <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8" onClick={() => {
                                        if (selectedAnnouncement.application_link) {
                                            window.open(selectedAnnouncement.application_link, '_blank');
                                        } else {
                                            handleApply();
                                        }
                                    }}>
                                        {selectedAnnouncement.application_link ? "Apply Link" : "Apply Now"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
