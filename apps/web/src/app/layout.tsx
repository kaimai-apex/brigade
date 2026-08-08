import type { Metadata, Viewport } from "next";
import { Fraunces, Archivo, Caveat } from "next/font/google";
import { ReduxProvider } from "@/lib/store";
import { AuthProvider } from "@/components/auth/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CommandMenu } from "@/components/command-menu";
import { cn } from "@/lib/utils";
import "./globals.css";
import { THEME_COLOR } from "@/lib/design/tokens";

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
  title: "Brigade — Private Chef Mentorship",
  description:
    "Mentorship for chefs moving into private service. Learn from private chefs who have already done it.",
  icons: {
    icon: [
      {
        url: "/brand/brigade-B-forest-transparent.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/brand/brigade-B-forest-transparent.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    title: "Brigade — Private Chef Mentorship",
    description:
      "Mentorship for chefs moving into private service. Learn from private chefs who have already done it.",
    images: [
      {
        url: "/brand/brigade-B-forest-transparent.png",
        width: 512,
        height: 512,
        alt: "Brigade",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: THEME_COLOR,
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
