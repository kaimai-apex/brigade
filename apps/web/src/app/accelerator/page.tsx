import type { Metadata } from "next";
import { AcceleratorSection } from "@/components/home/accelerator";
import { FinalCta } from "@/components/home/final-cta";
import { MarketingHeader } from "@/components/layout/marketing-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ACCELERATOR_NAME } from "@/lib/accelerator";

export const metadata: Metadata = {
  title: `${ACCELERATOR_NAME} · Brigade`,
  description:
    "An 8-week cohort that takes restaurant chefs through the work of launching a private chef business. Coaches, assignments, and accountability.",
};

/**
 * Flagship product page. Public so it can be shared without an account.
 * Apply still requires signup.
 */
export default function AcceleratorPage() {
  return (
    <div className="adp-mk min-h-screen bg-white">
      <MarketingHeader />
      <div className="pt-[72px]">
        <AcceleratorSection />
      </div>
      <FinalCta />
      <SiteFooter />
    </div>
  );
}
