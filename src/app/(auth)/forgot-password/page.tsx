"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, Info, Eye, EyeOff, ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import Link from "next/link";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [identifier, setIdentifier] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsSubmitting(true);

        if (!identifier || !newPassword || !confirmPassword) {
            setError("All fields are required");
            setIsSubmitting(false);
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            setIsSubmitting(false);
            return;
        }

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters long");
            setIsSubmitting(false);
            return;
        }

        try {
            await api.post('/auth/reset-password', { identifier, newPassword });
            toast.success("Password reset successfully. You can now log in.");
            router.push("/login");
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.message || "Failed to reset password. Please check your User ID.";
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
                    <p className="mt-2 text-gray-600">Reset your password</p>
                </div>

                <Card className="border-0 shadow-xl ring-1 ring-gray-200/50 backdrop-blur-sm bg-white/90">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-center">Forgot Password</CardTitle>
                        <CardDescription className="text-center">
                            Enter your User ID and a new password
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none" htmlFor="identifier">
                                    User ID / Email
                                </label>
                                <Input
                                    id="identifier"
                                    type="text"
                                    placeholder="Enter User ID or Email"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    required
                                    className="bg-gray-50/50 border-gray-300 focus:bg-white transition-all focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none" htmlFor="newPassword">
                                    New Password
                                </label>
                                <div className="relative">
                                    <Input
                                        id="newPassword"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter new password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        className="bg-gray-50/50 border-gray-300 focus:bg-white transition-all focus:ring-2 focus:ring-blue-500/20 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600 transition-all duration-200 hover:scale-110 p-1"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none" htmlFor="confirmPassword">
                                    Confirm New Password
                                </label>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="Confirm new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className="bg-gray-50/50 border-gray-300 focus:bg-white transition-all focus:ring-2 focus:ring-blue-500/20 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600 transition-all duration-200 hover:scale-110 p-1"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Resetting..." : "Reset Password"}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="justify-center border-t pt-6 pb-6">
                        <Link href="/login" className="text-sm text-blue-600 hover:text-blue-500 flex items-center gap-1 font-medium">
                            <ArrowLeft className="w-4 h-4" /> Back to Login
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
