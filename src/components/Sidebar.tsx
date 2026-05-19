"use client";

import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Megaphone, FileText, Users, GraduationCap, Building2, User, Calendar, Layers } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar() {
    const { user } = useAuth();
    const pathname = usePathname();

    if (!user) return null;

    const routes = [

        {
            label: "Dashboard",
            icon: LayoutDashboard,
            href: `/${user.role.toLowerCase()}/dashboard`,
            roles: ["STUDENT", "ADMIN", "STAFF", "TPO"], // Redirect handles path but link needs to be correct
        },
        {
            label: "Announcements",
            icon: Megaphone,
            href: user.role === 'STUDENT' ? '/student/announcements' : '/admin/announcements',
            roles: ["STUDENT", "ADMIN", "STAFF", "TPO"]
        },
        {
            label: "Applications",
            icon: FileText,
            href: user.role === 'STUDENT' ? '/student/applications' : '/admin/applications',
            roles: ["STUDENT", "ADMIN", "STAFF", "TPO"]
        },
        {
            label: "Students",
            icon: Users,
            href: user.role === 'STAFF' ? '/staff/students' : '/admin/students',
            roles: ["ADMIN", "TPO", "STAFF"]
        },
        {
            label: "Placements",
            icon: GraduationCap,
            href: "/admin/placements",
            roles: ["ADMIN", "TPO"]
        },
        {
            label: "Batches",
            icon: Layers,
            href: "/admin/batches",
            roles: ["ADMIN", "TPO"]
        },
        {
            label: "Schedule",
            icon: Calendar,
            href: user.role === 'STUDENT' ? '/student/schedule' : user.role === 'STAFF' ? '/staff/schedule' : '/admin/schedule',
            roles: ["ADMIN", "STAFF", "STUDENT", "TPO"]
        },
        {
            label: "Faculty",
            icon: Users, // Using Users icon as placeholder, or could use another if available
            href: "/admin/faculty",
            roles: ["ADMIN", "TPO"]
        },
        {
            label: "My Profile",
            icon: User, // Importing User icon is required
            href: "/student/profile",
            roles: ["STUDENT"]
        }
    ];

    // Filter routes based on role
    const userRole = user.role.toUpperCase();

    const filteredRoutes = routes.filter(route => {
        return route.roles.includes(userRole) || (userRole === 'TPO' && route.roles.includes('ADMIN'));
    });

    return (
        <div className="flex bg-slate-900 text-white w-64 flex-col fixed h-full transition-all duration-300">
            <div className="p-6 flex items-center gap-2 border-b border-slate-800">
                <div className="bg-blue-600 p-2 rounded-lg">
                    <Building2 className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-xl font-bold tracking-wider">PMS</h1>
            </div>
            <div className="flex-1 py-6 flex flex-col gap-1 px-3">
                {filteredRoutes.map((route) => (
                    <Link
                        key={route.href}
                        href={route.href}
                        className={cn(
                            "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                            pathname === route.href
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                : "text-slate-400 hover:text-white hover:bg-slate-800"
                        )}
                    >
                        <route.icon className="w-5 h-5" />
                        {route.label}
                    </Link>
                ))}
            </div>
            <div className="p-4 border-t border-slate-800">
                <div className="bg-slate-800 rounded-lg p-3">
                    <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Logged in as</p>
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <span className="text-xs text-blue-400 block mt-0.5">{user.role}</span>
                </div>
            </div>
        </div>
    );
}
