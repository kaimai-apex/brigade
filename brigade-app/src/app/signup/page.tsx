import type { Metadata } from "next";
import { WaitlistForm } from "@/components/WaitlistForm";

export const metadata: Metadata = {
  title: "Join as a private chef",
  description:
    "Claim your professional home on Brigade. A verified profile, an inquiry inbox, and the tools to run your private-chef business — and you keep 100% of what you earn.",
};

const PERKS = [
  ["A profile you're proud to send", "Verified, beautiful, SEO-discoverable. Send your own leads to it — they're free to you, and they discover the directory."],
  ["One inbox for every inquiry", "Inbound leads, quotes, and bookings in one place instead of Instagram DMs and your notes app."],
  ["Keep 100% of the meal", "We charge for your profile and tools — never a commission on your dinner. Nobody can cut us out, so we never sit between you and your client."],
  ["Founding-chef perk", "The first chefs in each city get Pro free and a hand-built profile. We help you look legit from day one."],
];

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="grid lg:grid-cols-2 gap-10 items-start">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">
            Your professional home, leveled up.
          </h1>
          <p className="text-stone-600 mt-3 text-lg">
            Get found, look legit, and run your whole business in one place. Built
            by people who respect the craft.
          </p>
          <ul className="mt-8 space-y-5">
            {PERKS.map(([title, body]) => (
              <li key={title} className="flex gap-3">
                <span className="mt-1 inline-grid place-items-center h-6 w-6 rounded-full bg-copper-soft text-copper text-sm shrink-0">
                  ✓
                </span>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-stone-600">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-paper p-6 lg:sticky lg:top-20">
          <h2 className="text-lg font-semibold">Join the founding chefs</h2>
          <p className="text-sm text-stone-600 mb-4">
            We&apos;re onboarding chefs city by city, starting in London. Add your
            details and we&apos;ll reach out to build your profile.
          </p>
          <WaitlistForm role="chef" cta="Claim my founding spot" />
        </div>
      </div>
    </div>
  );
}
