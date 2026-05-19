import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import { PlacementProvider } from "@/contexts/PlacementContext";
import { QueryProvider } from "@/providers/QueryProvider";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Placement Management System",
  description: "Efficiently manage campus placements",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <AuthProvider>
            <PlacementProvider>
              {children}
              <Toaster position="top-right" richColors />
            </PlacementProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
