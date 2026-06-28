import type { Metadata } from "next";
import Link from "next/link";
import { getInquiriesForChef, getLiveChefs, getChefBySlug } from "@/lib/store";
import type { InquiryStatus } from "@/lib/types";
import { InboxItem } from "@/components/InboxItem";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";

export const metadata: Metadata = {
  title: "Chef dashboard",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const DEFAULT_CHEF = "jordan-lee";
const STATUSES: InquiryStatus[] = ["new", "quoted", "booked", "completed", "declined"];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ chef?: string; status?: string }>;
}) {
  const { chef: chefParam, status } = await searchParams;
  const chef =
    (await getChefBySlug(chefParam ?? DEFAULT_CHEF)) ??
    (await getChefBySlug(DEFAULT_CHEF))!;

  const allInquiries = await getInquiriesForChef(chef.slug);
  const filtered = status
    ? allInquiries.filter((i) => i.status === status)
    : allInquiries;

  const counts = STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: allInquiries.filter((i) => i.status === s).length }),
    {} as Record<InquiryStatus, number>,
  );

  // Chefs that have an inbox to demo (mock "logged-in" account switcher).
  const switchable = (await getLiveChefs()).filter((c) => c.pro || c.slug === DEFAULT_CHEF);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-sm text-stone-500">Signed in as</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            {chef.name}
            {chef.pro && (
              <span className="text-xs rounded-full bg-copper text-white px-2 py-0.5">Pro</span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-stone-500">Demo account:</span>
          <form method="get" className="flex gap-2">
            <select
              name="chef"
              defaultValue={chef.slug}
              className="rounded-md border border-stone-300 px-2 py-1.5"
            >
              {switchable.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
            <button className="btn btn-primary px-4 py-1.5">Switch</button>
          </form>
        </div>
      </header>

      {/* North-star: bookings run THROUGH Brigade tools (docs/01). */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/dashboard?chef=${chef.slug}${status === s ? "" : `&status=${s}`}`}
            className={`rounded-xl border p-3 text-center transition ${
              status === s
                ? "border-copper bg-copper-soft"
                : "border-stone-200 bg-paper hover:border-stone-300"
            }`}
          >
            <div className="text-2xl font-bold">{counts[s]}</div>
            <div className="text-xs text-stone-500 capitalize">{s}</div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-8">
        <section className="lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">
              Inquiry inbox{status ? ` · ${status}` : ""}
            </h2>
            {status && (
              <Link href={`/dashboard?chef=${chef.slug}`} className="text-sm text-copper hover:underline">
                Show all
              </Link>
            )}
          </div>
          {filtered.length === 0 ? (
            <p className="text-stone-500 text-sm py-8 text-center border border-dashed border-stone-200 rounded-xl">
              No inquiries here yet.
            </p>
          ) : (
            <div className="space-y-3">
              {filtered.map((i) => (
                <InboxItem key={i.id} inquiry={i} />
              ))}
            </div>
          )}
        </section>

        <section className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-3">Availability</h2>
          <AvailabilityCalendar inquiries={allInquiries} />
        </section>
      </div>
    </div>
  );
}
