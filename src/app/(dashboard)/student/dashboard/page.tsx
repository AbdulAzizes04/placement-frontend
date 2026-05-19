"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Announcement } from "@/types";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BadgeCheck, Clock, FileText, XCircle } from "lucide-react";
import { usePlacement } from "@/contexts/PlacementContext";

export default function StudentDashboard() {
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
    const { applications, announcements } = usePlacement();

    const stats = [
        { label: "Total Applications", value: applications.length, icon: FileText, color: "text-blue-600", bg: "bg-blue-100" },
        { label: "Shortlisted", value: applications.filter(a => a.status === 'SHORTLISTED').length, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-100" },
        { label: "Placed", value: applications.filter(a => a.status === 'PLACED').length, icon: BadgeCheck, color: "text-green-600", bg: "bg-green-100" },
        { label: "Rejected", value: applications.filter(a => a.status === 'REJECTED').length, icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Student Dashboard</h2>
                    <p className="text-muted-foreground">Welcome back! Here&apos;s an overview of your placement journey.</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">Eligible for {announcements.length} Drives</span>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, index) => (
                    <Card key={index} className="border-none shadow-md hover:shadow-lg transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">
                                {stat.label}
                            </CardTitle>
                            <div className={`p-2 rounded-lg ${stat.bg}`}>
                                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                +2 from last week
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4">
                <Card className="border-none shadow-md">
                    <CardHeader>
                        <CardTitle>Recent Announcements</CardTitle>
                        <CardDescription>
                            New placement drives you are eligible for. Click on an announcement to view details.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {announcements.length > 0 ? announcements.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedAnnouncement(item)}
                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-blue-200"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold uppercase">
                                            {item.company_name?.charAt(0) || "C"}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900">{item.company_name}</h4>
                                            <p className="text-sm text-gray-500">{item.job_role} • {item.package ?? 'Package TBD'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-medium text-blue-600">Placement Drive</div>
                                        <div className="text-xs text-gray-500">Ends {new Date(item.deadline).toLocaleDateString()}</div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-sm text-gray-500 text-center py-4">No active announcements available.</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Modal
                isOpen={!!selectedAnnouncement}
                onClose={() => setSelectedAnnouncement(null)}
                title={selectedAnnouncement?.company_name || "Announcement Details"}
            >
                {selectedAnnouncement && (
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">{selectedAnnouncement.job_role}</h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">Placement Drive</span>
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-medium">{selectedAnnouncement.package ?? 'Package TBD'}</span>
                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-medium">Deadline: {new Date(selectedAnnouncement.deadline).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg border">
                            <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                                {selectedAnnouncement.description}
                            </p>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => setSelectedAnnouncement(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
