/**
 * Sync waitlist signups to Kit (ConvertKit) form 9691589.
 *
 * Prefer KIT_API_KEY (or CONVERTKIT_API_KEY) — the public HTML form endpoint
 * bot-protects server posts (`status: quarantined`). Client embed handles that;
 * API key is the reliable server path.
 *
 * Phone: send as fields.phone_number — rematch that custom field in Kit
 * (the shared embed had phone incorrectly tagged as fields[first_name]).
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
  via?: "api" | "form" | "skipped";
}> {
  const firstName = input.name.trim().split(/\s+/)[0] ?? "";
  const key = apiKey();

  if (!key) {
    console.error(
      "[waitlist/kit] KIT_API_KEY missing — set V3 API Key in Vercel env and redeploy",
    );
    return { ok: false, via: "skipped" };
  }

  if (key) {
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
            fields: input.phone
              ? { phone_number: input.phone }
              : undefined,
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

  // Fallback: public form endpoint (often quarantined without Kit's browser JS)
  try {
    const body = new URLSearchParams();
    body.set("email_address", input.email);
    if (firstName) body.set("fields[first_name]", firstName);
    if (input.phone) body.set("fields[phone_number]", input.phone);

    const res = await fetch(
      `https://app.kit.com/forms/${formId()}/subscriptions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: body.toString(),
        signal: AbortSignal.timeout(8_000),
      },
    );

    const text = await res.text().catch(() => "");
    let quarantined = false;
    try {
      const json = JSON.parse(text) as { status?: string };
      quarantined = json.status === "quarantined";
    } catch {
      /* ignore */
    }

    if (!res.ok || quarantined) {
      console.error(
        "[waitlist/kit:form]",
        quarantined ? "quarantined (set KIT_API_KEY or use client embed)" : res.status,
        text.slice(0, 300),
      );
      return { ok: false, status: res.status, via: "form" };
    }

    return { ok: true, status: res.status, via: "form" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[waitlist/kit:form]", message);
    return { ok: false, via: "form" };
  }
}
