import type { Metadata } from "next";
import { Fraunces, Archivo, Caveat } from "next/font/google";
import { ReduxProvider } from "@/lib/store";
import { AuthProvider } from "@/components/auth/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CommandMenu } from "@/components/command-menu";
import { cn } from "@/lib/utils";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Brigade — Hospitality Community",
  description:
    "A hospitality community for building your Brigade — relationships, collaboration, and career growth.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn('min-h-screen bg-white font-body text-ink antialiased', fraunces.variable, archivo.variable, caveat.variable)}
      >
        <ReduxProvider>
          <TooltipProvider delayDuration={200}>
            <AuthProvider>
              {children}
              <CommandMenu />
            </AuthProvider>
          </TooltipProvider>
          <Toaster position="bottom-right" />
        </ReduxProvider>
      </body>
    </html>
  );
}
