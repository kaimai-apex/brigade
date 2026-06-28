import type { Metadata } from "next";
import { Geist, Playfair_Display, EB_Garamond } from "next/font/google";
import "./globals.css";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});
const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://brigade.example"),
  title: {
    default: "Brigade — the professional home for private chefs",
    template: "%s · Brigade",
  },
  description:
    "Brigade is where private chefs build their reputation, run their business, and get found — the LinkedIn and the back-office for private hospitality. We never take a cut of the meal.",
  openGraph: {
    title: "Brigade — the professional home for private chefs",
    description:
      "Get found, look legit, run your whole business in one place — and keep 100% of what you earn.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${playfair.variable} ${ebGaramond.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
