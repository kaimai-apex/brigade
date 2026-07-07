import type { Metadata } from "next";
import { Fraunces, Archivo } from "next/font/google";
import { ReduxProvider } from "@/lib/store";
import { AuthProvider } from "@/components/auth/auth-provider";
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

export const metadata: Metadata = {
  title: "Brigade — Hospitality Talent Network",
  description:
    "The professional network for chefs, private chefs, and hospitality professionals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${archivo.variable} min-h-screen`}>
        <ReduxProvider>
          <AuthProvider>{children}</AuthProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
