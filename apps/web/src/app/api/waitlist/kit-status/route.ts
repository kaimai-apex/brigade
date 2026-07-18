import { NextResponse } from "next/server";

/**
 * Diagnostic: which Kit account + form production is wired to.
 * Open /api/waitlist/kit-status after setting KIT_API_KEY + KIT_FORM_ID.
 *
 * This route is public, so subscriber emails are masked (e.g. "ri***@domain").
 * Counts + states are enough to diagnose sync/opt-in; full addresses live in
 * the Kit dashboard and the waitlist_signups table.
 */
function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const head = local.slice(0, 2);
  return `${head}${local.length > 2 ? "***" : "*"}@${domain}`;
}

export async function GET() {
  const apiKey =
    process.env.KIT_API_KEY?.trim() ||
    process.env.CONVERTKIT_API_KEY?.trim() ||
    "";
  const apiSecret =
    process.env.KIT_API_SECRET?.trim() ||
    process.env.CONVERTKIT_API_SECRET?.trim() ||
    "";
  const formId = process.env.KIT_FORM_ID?.trim() || "9691589";

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: "KIT_API_KEY is not set on this deployment",
      formId,
      nextStep:
        "In Kit → Settings → API keys → copy V3 API Key into Vercel KIT_API_KEY, then redeploy.",
    });
  }

  try {
    const formsRes = await fetch(
      `https://api.convertkit.com/v3/forms?api_key=${encodeURIComponent(apiKey)}`,
    );
    const formsBody = (await formsRes.json().catch(() => ({}))) as {
      forms?: Array<{ id: number; name: string }>;
      error?: string;
    };
    const allForms = (formsBody.forms ?? []).map((f) => ({
      id: f.id,
      name: f.name,
    }));
    const matched = allForms.find((f) => String(f.id) === String(formId)) ?? null;

    // Subscriber listing requires API Secret (not the public API Key).
    let subscriptions: {
      http: number | null;
      total: number | null;
      recent: Array<{ email: string | null; state: string | null }>;
      error: string | null;
      note?: string;
    } = {
      http: null,
      total: null,
      recent: [],
      error: null,
      note: "Add KIT_API_SECRET (V3 API Secret) in Vercel to list recent subscribers here.",
    };

    let recentAccount: Array<{
      email: string | null;
      state: string | null;
    }> = [];
    let accountTotal: number | null = null;

    if (apiSecret) {
      const [subsRes, allSubsRes] = await Promise.all([
        fetch(
          `https://api.convertkit.com/v3/forms/${formId}/subscriptions?api_secret=${encodeURIComponent(apiSecret)}&sort_order=desc`,
        ),
        // Form "subscriptions" often omits inactive (unconfirmed). Account list includes them.
        fetch(
          `https://api.convertkit.com/v3/subscribers?api_secret=${encodeURIComponent(apiSecret)}&sort_order=desc&sort_field=created_at`,
        ),
      ]);
      const subsBody = (await subsRes.json().catch(() => ({}))) as {
        total_subscriptions?: number;
        subscriptions?: Array<{
          subscriber?: { email_address?: string; state?: string };
        }>;
        error?: string;
      };
      const allBody = (await allSubsRes.json().catch(() => ({}))) as {
        total_subscribers?: number;
        subscribers?: Array<{ email_address?: string; state?: string }>;
        error?: string;
      };
      subscriptions = {
        http: subsRes.status,
        total: subsBody.total_subscriptions ?? null,
        recent: (subsBody.subscriptions ?? []).slice(0, 5).map((s) => ({
          email: maskEmail(s.subscriber?.email_address),
          state: s.subscriber?.state ?? null,
        })),
        error: subsBody.error ?? null,
      };
      accountTotal = allBody.total_subscribers ?? null;
      recentAccount = (allBody.subscribers ?? []).slice(0, 8).map((s) => ({
        email: maskEmail(s.email_address),
        state: s.state ?? null,
      }));
    }

    return NextResponse.json({
      ok: formsRes.ok && Boolean(matched),
      configuredFormId: formId,
      formFound: Boolean(matched),
      form: matched,
      allForms,
      hasApiKey: true,
      hasApiSecret: Boolean(apiSecret),
      subscriptions,
      accountSubscribers: {
        total: accountTotal,
        recent: recentAccount,
      },
      whereToLookInKit:
        'Grow → Landing Pages & Forms → open form "Join the founding community" → Subscribers. Also check Subscribers with status = All / Inactive.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { ok: false, error: message, formId },
      { status: 500 },
    );
  }
}
