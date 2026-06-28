"use server";

import { revalidatePath } from "next/cache";
import {
  addWaitlist,
  createInquiry,
  setChefApproval,
  updateInquiryStatus,
} from "./store";
import type { InquiryStatus } from "./types";

export interface ActionResult {
  ok: boolean;
  message: string;
}

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

export async function submitInquiry(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const chefSlug = str(form, "chefSlug");
  const contactName = str(form, "contactName");
  const contactEmail = str(form, "contactEmail");
  const eventDate = str(form, "eventDate");
  const guests = Number(str(form, "guests"));
  const location = str(form, "location");
  const budgetRaw = str(form, "budget");
  const message = str(form, "message");

  if (!chefSlug || !contactName || !contactEmail || !eventDate || !location) {
    return { ok: false, message: "Please fill in name, email, date and location." };
  }
  if (!/.+@.+\..+/.test(contactEmail)) {
    return { ok: false, message: "Please enter a valid email address." };
  }

  await createInquiry({
    chefSlug,
    contactName,
    contactEmail,
    eventDate,
    guests: Number.isFinite(guests) && guests > 0 ? guests : 1,
    location,
    budget: budgetRaw ? Number(budgetRaw) : undefined,
    message,
    source: "public-form",
  });

  revalidatePath(`/c/${chefSlug}`);
  revalidatePath("/dashboard");
  return {
    ok: true,
    message: "Inquiry sent — the chef will see it in their Brigade inbox.",
  };
}

export async function joinWaitlist(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const name = str(form, "name");
  const email = str(form, "email");
  const city = str(form, "city") || "London";
  const role = (str(form, "role") as "chef" | "buyer") || "chef";

  if (!name || !email) {
    return { ok: false, message: "Name and email are required." };
  }
  if (!/.+@.+\..+/.test(email)) {
    return { ok: false, message: "Please enter a valid email address." };
  }

  await addWaitlist({ name, email, city, role });
  revalidatePath("/admin");
  return {
    ok: true,
    message:
      role === "chef"
        ? "You're on the founding-chef list. We'll be in touch to build your profile."
        : "You're on the buyer early-access list. We'll notify you at launch.",
  };
}

export async function changeInquiryStatus(id: string, status: InquiryStatus) {
  await updateInquiryStatus(id, status);
  revalidatePath("/dashboard");
}

export async function approveChef(slug: string) {
  await setChefApproval(slug, true);
  revalidatePath("/admin");
  revalidatePath("/chefs");
}

export async function unapproveChef(slug: string) {
  await setChefApproval(slug, false);
  revalidatePath("/admin");
  revalidatePath("/chefs");
}
