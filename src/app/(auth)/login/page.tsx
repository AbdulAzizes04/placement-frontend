"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, Info, Eye, EyeOff } from "lucide-react";
import { Role } from "@/types";
import api from "@/lib/api";
import Link from "next/link";

export default function LoginPage() {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const { login, isLoading } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // CSRF Token Seeding
    useEffect(() => {
        const seedCsrf = async () => {
            try {
                await api.get('/csrf-token');
                console.log("CSRF Token seeded");
            } catch (error) {
                console.error("Failed to seed CSRF token", error);
            }
        };
        seedCsrf();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsSubmitting(true);

        // Validation
        if (!identifier || !password) {
            setError("User ID and password are required");
            setIsSubmitting(false);
            return;
        }

        // Removed strict email regex to allow User IDs / Roll Numbers

        // Password length validation
        if (password.length < 6) {
            setError("Password must be at least 6 characters long");
            setIsSubmitting(false);
            return;
        }

        try {
            // Send identifier instead of email
            const response = await api.post('/auth/login', { identifier, password });

            if (response.data && response.data.token && response.data.user) {
                login(response.data.token, response.data.user);
            } else {
                setError("Invalid response from server. Please try again.");
            }

        } catch (err: unknown) {
            // Only log unexpected errors, valid 401s are expected user behavior
            const axErr = err as { response?: { status?: number; data?: { error?: string }; message?: string }; message?: string };
            if (axErr.response?.status !== 401) {
                console.error("Login error:", err);
            }
            const errorMessage = axErr.response?.data?.error || axErr.message || "Login failed. Please check your credentials.";
            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-indigo-100 via-purple-50 to-blue-100 p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white mb-4 shadow-lg ring-4 ring-blue-50">
                        <FolderKanban className="w-6 h-6" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Placement Portal</h1>
                    <p className="mt-2 text-gray-600">Enter your credentials to access the dashboard</p>
                </div>

                <Card className="border-0 shadow-xl ring-1 ring-gray-200/50 backdrop-blur-sm bg-white/90">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-center">Sign in</CardTitle>
                        <CardDescription className="text-center">
                            Use your User ID / Roll Number to login
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="identifier">
                                    User ID
                                </label>
                                <Input
                                    id="identifier"
                                    type="text"
                                    placeholder="Enter User ID or Roll Number"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    required
                                    autoComplete="username"
                                    suppressHydrationWarning
                                    className="bg-gray-50/50 border-gray-300 focus:bg-white transition-all focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="password">
                                        Password
                                    </label>
                                    <Link href="/forgot-password" className="text-xs text-blue-600 hover:text-blue-500 font-medium">Forgot password?</Link>
                                </div>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete="current-password"
                                        suppressHydrationWarning
                                        className="bg-gray-50/50 border-gray-300 focus:bg-white transition-all focus:ring-2 focus:ring-blue-500/20 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        suppressHydrationWarning
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600 transition-all duration-200 hover:scale-110 focus:outline-none p-1 rounded-full hover:bg-blue-50"
                                        title={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-4 h-4 animate-in fade-in zoom-in duration-200" />
                                        ) : (
                                            <Eye className="w-4 h-4 animate-in fade-in zoom-in duration-200" />
                                        )}
                                    </button>
                                </div>
                            </div>
                            {error && (
                                <div className="p-3 rounded-md bg-red-50 text-red-500 text-sm flex items-center gap-2">
                                    <Info className="w-4 h-4" />
                                    {error}
                                </div>
                            )}
                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]"
                                disabled={isSubmitting || isLoading}
                            >
                                {isSubmitting ? "Signing in..." : "Sign In"}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="justify-center border-t pt-6 pb-6">
                        <p className="text-xs text-center text-gray-500">
                            Protected by enterprise-grade security. <br />
                            Access is restricted to authorized personnel only.
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
