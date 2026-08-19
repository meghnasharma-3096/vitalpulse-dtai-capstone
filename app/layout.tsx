import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth-server";
import { CurrentUserProvider } from "@/lib/auth";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/shared/app-shell";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "VitalPulse — Corporate Wellness Intelligence Platform",
  description:
    "VitalPulse matches employees to wellness interventions, predicts individual disengagement and team-level burnout risk, and quantifies ROI in real dollars.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <CurrentUserProvider user={user}>
          <TooltipProvider>{user ? <AppShell user={user}>{children}</AppShell> : children}</TooltipProvider>
        </CurrentUserProvider>
      </body>
    </html>
  );
}
