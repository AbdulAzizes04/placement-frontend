"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download } from "lucide-react";
import { usePlacement } from "@/contexts/PlacementContext";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function AdminPlacements() {
    const {
        placements,
        placementPagination,
        getPaginatedPlacements
    } = usePlacement();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBranch, setSelectedBranch] = useState("All");
    const [currentPage, setCurrentPage] = useState(1);
    const [limit, setLimit] = useState(50);

    const branches = ["CSE", "ECE", "EEE", "MECH", "CIVIL", "AIML", "AI&DS", "CS-DS", "CS-AI"];

    // Initial and conditional fetch
    useEffect(() => {
        const filters: Record<string, unknown> = {};
        if (searchQuery) filters.search = searchQuery;
        if (selectedBranch !== "All") filters.branch = selectedBranch;

        getPaginatedPlacements(currentPage, limit, filters);
    }, [currentPage, limit, searchQuery, selectedBranch]);

    const filteredPlacements = placements;

    const totalPlaced = placementPagination.total;
    const avgPackage = "0"; // Aggregate stats need separate endpoint for global precision
    const highestPackage = 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Placement Records</h2>
                    <p className="text-muted-foreground">View placement history and statistics.</p>
                </div>
                <Button variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100">
                    <Download className="w-4 h-4 mr-2" />
                    Export Report
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-white shadow border-none">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Total Placed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalPlaced}</div>
                    </CardContent>
                </Card>
                <Card className="bg-white shadow border-none">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Avg. Package</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgPackage} LPA</div>
                    </CardContent>
                </Card>
                <Card className="bg-white shadow border-none">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Highest Package</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{highestPackage} LPA</div>
                    </CardContent>
                </Card>
                <Card className="bg-white shadow border-none">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Total Offers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalPlaced + 5}</div> {/* Mocked +5 for demo */}
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="relative w-72">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search records..."
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <select
                        className="flex h-10 w-[180px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                    >
                        <option value="All">All Branches</option>
                        {branches.map(branch => (
                            <option key={branch} value={branch}>{branch}</option>
                        ))}
                    </select>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Roll Number</TableHead>
                                <TableHead>Student Name</TableHead>
                                <TableHead>Branch</TableHead>
                                <TableHead>Year</TableHead>
                                <TableHead>CGPA</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPlacements.map((record) => (
                                <TableRow key={record.id}>
                                    <TableCell className="font-medium">{record.roll_number || "N/A"}</TableCell>
                                    <TableCell>
                                        <Link
                                            href={`/admin/students/${record.studentId}`}
                                            className="font-medium text-blue-600 hover:underline cursor-pointer"
                                        >
                                            {record.studentName}
                                        </Link>
                                    </TableCell>
                                    <TableCell>{record.branch}</TableCell>
                                    <TableCell>{record.year}</TableCell>
                                    <TableCell>{record.cgpa}</TableCell>
                                    <TableCell>{record.contact || "N/A"}</TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            {record.status || "Placed"}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <div className="flex items-center justify-between mt-4 px-2">
                        <p className="text-sm text-muted-foreground">
                            Showing page {placementPagination.page} of {placementPagination.totalPages} ({placementPagination.total} total records)
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(placementPagination.totalPages, prev + 1))}
                                disabled={currentPage === placementPagination.totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
