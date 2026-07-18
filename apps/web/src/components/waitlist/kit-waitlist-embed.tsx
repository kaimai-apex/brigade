"use client";

const KIT_FORM_ID = "9691589";
const KIT_UID = "a655181cc5";
const KIT_SCRIPT_SRC = "https://f.convertkit.com/ckjs/ck.5.js";

let kitScriptPromise: Promise<void> | null = null;

/** Load ConvertKit JS only when submitting — avoids Safari history pollution on page view. */
function ensureKitScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (kitScriptPromise) return kitScriptPromise;

  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${KIT_SCRIPT_SRC}"]`,
  );
  if (existing) {
    kitScriptPromise = Promise.resolve();
    return kitScriptPromise;
  }

  kitScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = KIT_SCRIPT_SRC;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Kit script"));
    document.body.appendChild(script);
  });

  return kitScriptPromise;
}

/**
 * Hidden Kit form + iframe target.
 * Cofounder embed (form 9691589). Submitted from WaitlistForm after our API succeeds.
 * Posts into a hidden iframe so the page doesn't navigate away.
 */
export function KitWaitlistBridge() {
  return (
    <>
      <iframe
        name="kit-waitlist-frame"
        title="Kit waitlist"
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        tabIndex={-1}
      />
      <form
        id="kit-waitlist-bridge"
        action={`https://app.kit.com/forms/${KIT_FORM_ID}/subscriptions`}
        className="seva-form formkit-form sr-only"
        method="post"
        target="kit-waitlist-frame"
        data-sv-form={KIT_FORM_ID}
        data-uid={KIT_UID}
        data-format="inline"
        data-version="5"
        aria-hidden
        tabIndex={-1}
      >
        <div data-element="fields" className="formkit-fields">
          <input
            className="formkit-input"
            name="fields[first_name]"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
          <input
            className="formkit-input"
            name="email_address"
            type="email"
            tabIndex={-1}
            autoComplete="off"
          />
          <input
            className="formkit-input"
            name="fields[phone_number]"
            type="tel"
            tabIndex={-1}
            autoComplete="off"
          />
          <button type="submit" className="formkit-submit" tabIndex={-1}>
            <span>Join</span>
          </button>
        </div>
      </form>
    </>
  );
}

/** Push a signup through the Kit bridge (call after our waitlist API succeeds). */
export function submitToKitBridge(input: {
  email: string;
  name: string;
  phone: string;
}): boolean {
  const form = document.getElementById(
    "kit-waitlist-bridge",
  ) as HTMLFormElement | null;
  if (!form) return false;

  const firstName = input.name.trim().split(/\s+/)[0] ?? "";
  const set = (name: string, value: string) => {
    const el = form.elements.namedItem(name);
    if (el instanceof HTMLInputElement) el.value = value;
  };

  set("fields[first_name]", firstName);
  set("email_address", input.email);
  set("fields[phone_number]", input.phone);

  void ensureKitScript()
    .then(() => {
      // requestSubmit fires the submit event so Kit's ckjs can run (form.submit() skips it).
      // target=iframe keeps any native fallback from navigating this page away.
      if (typeof form.requestSubmit === "function") {
        form.requestSubmit();
      } else {
        form.submit();
      }
    })
    .catch(() => {
      // Fallback: native iframe post without Kit JS enhancement.
      form.submit();
    });

  return true;
}
