"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { Users, Megaphone, CheckCircle, TrendingUp, MessageSquare, FileText } from "lucide-react"; // Added MessageSquare, FileText
import { usePlacement } from "@/contexts/PlacementContext";
import { QuestionsModal } from "@/components/questions-modal"; // Import Modal
import dynamic from 'next/dynamic';

const AdminCharts = dynamic(() => import('./AdminCharts'), { ssr: false });

export default function AdminDashboard() {
    const { stats, currentBatch, setBatch, batches, questions, getStatistics } = usePlacement();

    useEffect(() => {
        getStatistics({ batch: currentBatch });
    }, [currentBatch]);
    const [isQuestionsOpen, setIsQuestionsOpen] = useState(false); // Modal State

    // Global Statistics from Context (Backend aggregated)
    const totalStudents = Number(stats?.total) || 0;
    const totalPlaced = Number(stats?.placed) || 0;
    const totalCrtStudents = Number(stats?.crt) || 0;
    const pendingQuestions = questions.filter(q => !q.answer).length;

    const statsCards = [
        {
            label: "Total Students",
            value: totalStudents.toString(),
            icon: Users,
            className: "bg-white text-gray-900 border border-gray-200 shadow-sm hover:shadow-md",
            iconClass: "bg-blue-50 text-blue-600",
            href: "/admin/students"
        },
        {
            label: "CRT Registered",
            value: totalCrtStudents.toString(),
            icon: FileText,
            className: "bg-white text-gray-900 border border-gray-200 shadow-sm hover:shadow-md",
            iconClass: "bg-purple-50 text-purple-600",
            href: "/admin/students?crt=true"
        },
        {
            label: "Active Announcements",
            value: (stats?.activeAnnouncements || 0).toString(),
            icon: Megaphone,
            className: "bg-white text-gray-900 border border-gray-200 shadow-sm hover:shadow-md",
            iconClass: "bg-orange-50 text-orange-600",
            href: "/admin/announcements"
        },
        {
            label: "Total Placed",
            value: totalPlaced.toString(),
            icon: CheckCircle,
            className: "bg-white text-gray-900 border border-gray-200 shadow-sm hover:shadow-md",
            iconClass: "bg-green-50 text-green-600",
            href: "/admin/placements"
        },
        {
            label: "Inquiries",
            value: pendingQuestions.toString(),
            icon: MessageSquare,
            className: "bg-white text-gray-900 border border-gray-200 shadow-sm hover:shadow-md",
            iconClass: "bg-red-50 text-red-600",
            onClick: () => setIsQuestionsOpen(true)
        },
    ];

    // Branch Data from Stats
    const branchData = (stats?.branchDistribution as any[]) || [];

    const statusData = [
        { name: 'Placed', value: totalPlaced },
        { name: 'Unplaced', value: Math.max(0, totalStudents - totalPlaced) },
    ];

    return (
        <div className="space-y-8 p-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Admin Dashboard</h2>
                    <p className="text-muted-foreground mt-1">Overview of college placement statistics and metrics.</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500">Academic Year</span>
                    <div className="h-4 w-px bg-gray-200"></div>
                    <select
                        value={currentBatch}
                        onChange={(e) => setBatch(e.target.value)}
                        className="font-bold text-gray-900 bg-transparent border-none focus:ring-0 cursor-pointer text-sm outline-none"
                    >
                        {batches.map(batch => (
                            <option key={batch} value={batch}>{batch}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                {statsCards.map((stat, index) => (
                    <div key={index} onClick={stat.onClick} className={`transform transition-all duration-200 hover:-translate-y-1 ${stat.onClick ? "cursor-pointer" : ""}`}>
                        {stat.href ? (
                            //@ts-ignore
                            <Link href={stat.href || "#"}>
                                <StatCard stat={stat} currentBatch={currentBatch} />
                            </Link>
                        ) : (
                            <StatCard stat={stat} currentBatch={currentBatch} />
                        )}
                    </div>
                ))}
            </div>

            <AdminCharts branchData={branchData} statusData={statusData} currentBatch={currentBatch} />

            <QuestionsModal isOpen={isQuestionsOpen} onClose={() => setIsQuestionsOpen(false)} />
        </div>
    );
}

// Extracted StatCard for cleaner conditional rendering
function StatCard({ stat, currentBatch }: { stat: any, currentBatch: string }) {
    return (
        <Card className={`border overflow-hidden relative ${stat.className} border-l-4`}>
            {/* Removed background blobs for cleaner light theme */}

            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-gray-600">
                    {stat.label}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.iconClass}`}>
                    <stat.icon className="h-5 w-5" />
                </div>
            </CardHeader>
            <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-gray-900 tracking-tight">{stat.value}</div>
                <p className="text-xs text-gray-500 mt-1 font-medium">
                    {stat.label === "Total Students" ? `Batch: ${currentBatch}` :
                        stat.label === "Inquiries" ? "Pending Actions" : "Updated just now"}
                </p>
            </CardContent>
        </Card>
    );
}
