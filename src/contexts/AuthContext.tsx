"use client";

import React, { createContext, useContext, useState } from "react";
import { User } from "@/types";
import { useRouter } from "next/navigation";
import Cookies from 'js-cookie';

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(() => {
        if (typeof window !== "undefined") {
            try {
                const storedUser = localStorage.getItem("user");
                if (storedUser) return JSON.parse(storedUser);
            } catch (error) {
                console.error("Failed to parse user data", error);
                localStorage.removeItem("user");
            }
        }
        return null;
    });

    const [token, setToken] = useState<string | null>(() => {
        if (typeof window !== "undefined") {
            return Cookies.get("token") || null;
        }
        return null;
    });

    const [isLoading] = useState(false);
    const router = useRouter();

    const login = (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        Cookies.set("token", newToken, { expires: 7 });
        localStorage.setItem("user", JSON.stringify(newUser));

        // Security: Force Password Change if required
        if (newUser.mustChangePassword) {
            router.push("/change-password");
            return;
        }

        const dashboardRoutes: Record<string, string> = {
            STUDENT: "/student/dashboard",
            STAFF: "/staff/dashboard",
            TPO: "/admin/dashboard",
            ADMIN: "/admin/dashboard"
        };

        if (newUser.role === 'TPO') {
            router.push('/admin/dashboard');
        } else {
            router.push(dashboardRoutes[newUser.role] || "/");
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        Cookies.remove("token");
        localStorage.removeItem("user");
        router.push("/login");
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
