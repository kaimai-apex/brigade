/**
 * Sync waitlist signups to Kit (ConvertKit) form 9691589 via V3 Forms API.
 *
 * Requires KIT_API_KEY (V3 API Key from Kit → Developer settings).
 * Public HTML form posts are bot-quarantined without Kit's browser JS.
 *
 * Phone: fields.phone_number — custom field tag must match in Kit.
 */

const DEFAULT_FORM_ID = "9691589";

function formId() {
  return process.env.KIT_FORM_ID?.trim() || DEFAULT_FORM_ID;
}

function apiKey() {
  return (
    process.env.KIT_API_KEY?.trim() ||
    process.env.CONVERTKIT_API_KEY?.trim() ||
    ""
  );
}

export async function subscribeToKit(input: {
  email: string;
  name: string;
  phone?: string;
}): Promise<{
  ok: boolean;
  status?: number;
  via?: "api" | "skipped";
  subscriberState?: string | null;
  subscriptionId?: number | null;
}> {
  const firstName = input.name.trim().split(/\s+/)[0] ?? "";
  const key = apiKey();

  if (!key) {
    console.error(
      "[waitlist/kit] KIT_API_KEY missing — set V3 API Key in Vercel env and redeploy",
    );
    return { ok: false, via: "skipped" };
  }

  try {
    const res = await fetch(
      `https://api.convertkit.com/v3/forms/${formId()}/subscribe`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        // Keep payload minimal — unknown custom-field keys can break some accounts.
        // Name + email are enough to land in Kit; phone stays in our DB.
        body: JSON.stringify({
          api_key: key,
          email: input.email,
          first_name: firstName || undefined,
        }),
        signal: AbortSignal.timeout(8_000),
      },
    );

    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
      subscription?: {
        id?: number;
        state?: string;
        subscriber?: { state?: string; email_address?: string };
      };
    };

    if (!res.ok) {
      console.error(
        "[waitlist/kit:api]",
        res.status,
        body.error || body.message || res.statusText,
      );
      return { ok: false, status: res.status, via: "api" };
    }

    const subscriberState =
      body.subscription?.subscriber?.state ??
      body.subscription?.state ??
      null;

    return {
      ok: true,
      status: res.status,
      via: "api",
      subscriberState,
      subscriptionId: body.subscription?.id ?? null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[waitlist/kit:api]", message);
    return { ok: false, via: "api" };
  }
}
