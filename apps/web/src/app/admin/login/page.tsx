import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/login-form";
import { BrandLink } from "@/components/brand/brand-mark";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminPortalSession } from "@/lib/admin/access";

export const metadata: Metadata = {
  title: "Admin · Brigade",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await getAdminPortalSession()) redirect("/admin");

  return (
    <div className="min-h-dvh bg-[var(--brand-paper-warm)] text-ink">
      <header className="flex h-12 items-center border-b border-[var(--brand-hairline)] bg-white/80 px-4 backdrop-blur-sm">
        <BrandLink markSize={28} />
      </header>
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-md items-center px-4 py-8">
        <Card className="w-full border-[var(--brand-hairline)] shadow-none">
          <CardHeader>
            <CardTitle>Admin</CardTitle>
            <CardDescription>
              Brigade staff only. Sign in with your Brigade email.
            </CardDescription>
          </CardHeader>
          <AdminLoginForm />
        </Card>
      </div>
    </div>
  );
}
