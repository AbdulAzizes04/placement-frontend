"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Bell, Search, User, ChevronDown, UserCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";

export function Header() {
    const { logout, user } = useAuth();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const handleLogout = () => {
        logout();
        toast.info("Logged out successfully");
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <header className="h-16 border-b bg-white flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm">
            <div className="flex items-center w-96 gap-2">
                
            </div>

            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="relative text-gray-500 hover:text-blue-600">
                    <Bell className="w-6 h-6" />
                    {/* <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span> */}
                </Button>

                <div className="relative pl-4 border-l" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded-lg transition-colors outline-none"
                    >
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm ring-2 ring-transparent hover:ring-blue-100 transition-all">
                            {user?.name?.charAt(0) || <User className="w-4 h-4" />}
                        </div>
                        <div className="hidden md:block text-left">
                            <p className="text-sm font-medium text-gray-700 leading-none">{user?.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{user?.role}</p>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isDropdownOpen && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                            <div className="px-4 py-2 border-b border-gray-100">
                                <p className="text-sm font-medium text-gray-900">Signed in as</p>
                                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                            </div>

                            <div className="py-1">
                                {user?.role === 'STUDENT' && (
                                    <Link
                                        href="/student/profile"
                                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                                        onClick={() => setIsDropdownOpen(false)}
                                    >
                                        <UserCircle className="w-4 h-4" />
                                        My Profile
                                    </Link>
                                )}
                                <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 text-left">
                                    <Bell className="w-6 h-6" />
                                    Notifications
                                </button>
                            </div>

                            <div className="py-1 border-t border-gray-100">
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
