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
        body: JSON.stringify({
          api_key: key,
          email: input.email,
          first_name: firstName || undefined,
          fields: input.phone ? { phone_number: input.phone } : undefined,
        }),
        signal: AbortSignal.timeout(8_000),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        "[waitlist/kit:api]",
        res.status,
        text.slice(0, 300) || res.statusText,
      );
      return { ok: false, status: res.status, via: "api" };
    }

    return { ok: true, status: res.status, via: "api" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[waitlist/kit:api]", message);
    return { ok: false, via: "api" };
  }
}
