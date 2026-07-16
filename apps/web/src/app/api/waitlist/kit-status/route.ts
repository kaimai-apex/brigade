import { NextResponse } from "next/server";

/**
 * Diagnostic: which Kit account + form production is wired to.
 * Open /api/waitlist/kit-status after setting KIT_API_KEY + KIT_FORM_ID.
 */
export async function GET() {
  const apiKey =
    process.env.KIT_API_KEY?.trim() ||
    process.env.CONVERTKIT_API_KEY?.trim() ||
    "";
  const formId = process.env.KIT_FORM_ID?.trim() || "9691589";

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: "KIT_API_KEY is not set on this deployment",
      formId,
    });
  }

  try {
    const [accountRes, formRes, formsRes, subsRes] = await Promise.all([
      fetch(`https://api.convertkit.com/v3/account?api_key=${encodeURIComponent(apiKey)}`),
      fetch(
        `https://api.convertkit.com/v3/forms/${formId}?api_key=${encodeURIComponent(apiKey)}`,
      ),
      fetch(`https://api.convertkit.com/v3/forms?api_key=${encodeURIComponent(apiKey)}`),
      fetch(
        `https://api.convertkit.com/v3/forms/${formId}/subscriptions?api_key=${encodeURIComponent(apiKey)}&sort_order=desc`,
      ),
    ]);

    const account = (await accountRes.json().catch(() => ({}))) as {
      name?: string;
      primary_email_address?: string;
      error?: string;
    };
    const formBody = (await formRes.json().catch(() => ({}))) as {
      form?: { id?: number; name?: string };
      error?: string;
    };
    const formsBody = (await formsRes.json().catch(() => ({}))) as {
      forms?: Array<{ id: number; name: string }>;
    };
    const subsBody = (await subsRes.json().catch(() => ({}))) as {
      total_subscriptions?: number;
      subscriptions?: Array<{
        subscriber?: { email_address?: string; state?: string };
      }>;
      error?: string;
    };

    const recent = (subsBody.subscriptions ?? []).slice(0, 5).map((s) => ({
      email: s.subscriber?.email_address ?? null,
      state: s.subscriber?.state ?? null,
    }));

    return NextResponse.json({
      ok: accountRes.ok && formRes.ok,
      account: {
        name: account.name ?? null,
        email: account.primary_email_address ?? null,
        http: accountRes.status,
        error: account.error ?? null,
      },
      configuredFormId: formId,
      form: {
        http: formRes.status,
        id: formBody.form?.id ?? null,
        name: formBody.form?.name ?? null,
        error: formBody.error ?? null,
      },
      allForms: (formsBody.forms ?? []).map((f) => ({
        id: f.id,
        name: f.name,
      })),
      subscriptions: {
        http: subsRes.status,
        total: subsBody.total_subscriptions ?? null,
        recent,
        error: subsBody.error ?? null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { ok: false, error: message, formId },
      { status: 500 },
    );
  }
}
