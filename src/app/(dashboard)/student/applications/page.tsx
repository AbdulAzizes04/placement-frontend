"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePlacement } from "@/contexts/PlacementContext";

export default function StudentApplications() {
    const { applications } = usePlacement();

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PLACED': return 'bg-green-100 text-green-700 hover:bg-green-200';
            case 'SHORTLISTED': return 'bg-blue-100 text-blue-700 hover:bg-blue-200';
            case 'REJECTED': return 'bg-red-100 text-red-700 hover:bg-red-200';
            default: return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">My Applications</h2>
                <p className="text-muted-foreground">Track the status of your submitted applications.</p>
            </div>

            <Card className="border-none shadow-md">
                <CardHeader>
                    <CardTitle>Application History</CardTitle>
                    <CardDescription>
                        You have applied to {applications.length} companies.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Company</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Applied Date</TableHead>
                                <TableHead>Package</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {applications.map((app) => (
                                <TableRow key={app.id}>
                                    <TableCell className="font-semibold text-gray-900">{app.announcement?.company_name || "Unknown"}</TableCell>
                                    <TableCell className="text-gray-900">{app.announcement?.job_role || "N/A"}</TableCell>
                                    <TableCell className="text-gray-900">{app.applied_at ? new Date(app.applied_at).toLocaleDateString() : "N/A"}</TableCell>
                                    <TableCell className="text-gray-900">{app.announcement?.package || "N/A"}</TableCell>
                                    <TableCell>
                                        <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold", getStatusColor(app.status))}>
                                            {app.status}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
