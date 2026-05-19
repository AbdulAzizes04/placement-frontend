
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const changePasswordSchema = z
    .object({
        oldPassword: z.string().min(1, "Old password is required"),
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
        confirmPassword: z.string().min(8, "Confirm password is required"),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
    });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

const ChangePasswordPage = () => {
    const router = useRouter();
    const { toast } = useToast();
    const { logout } = useAuth();
    const [loading, setLoading] = useState(false);

    const form = useForm<ChangePasswordFormValues>({
        resolver: zodResolver(changePasswordSchema),
    });

    const { register, handleSubmit, formState: { errors } } = form;

    const onSubmit = async (data: ChangePasswordFormValues) => {
        setLoading(true);
        try {
            await api.post(
                '/auth/change-password',
                {
                    oldPassword: data.oldPassword,
                    newPassword: data.newPassword
                }
            );

            toast({
                title: "Success",
                description: "Password updated successfully. Redirecting to login...",
            });

            // Logout clears everything and redirects to login
            logout();

        } catch (error: any) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error",
                description: error.response?.data?.error || error.response?.data?.message || "Failed to update password",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <KeyRound className="h-6 w-6 text-primary" />
                        <CardTitle>Change Password</CardTitle>
                    </div>
                    <CardDescription>
                        For security reasons, you must change your password to continue.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                        <div className="space-y-2">
                            <Label htmlFor="oldPassword">Old Password</Label>
                            <Input
                                id="oldPassword"
                                type="password"
                                placeholder="Current password"
                                {...register("oldPassword")}
                            />
                            {errors.oldPassword && (
                                <p className="text-sm text-red-500">{errors.oldPassword.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                                id="newPassword"
                                type="password"
                                placeholder="New password (min 8 chars)"
                                {...register("newPassword")}
                            />
                            {errors.newPassword && (
                                <p className="text-sm text-red-500">{errors.newPassword.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="Confirm new password"
                                {...register("confirmPassword")}
                            />
                            {errors.confirmPassword && (
                                <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
                            )}
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                "Update Password"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default ChangePasswordPage;

