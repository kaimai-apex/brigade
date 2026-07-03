"use server";

import { createClient } from "@/lib/supabase/server";
import type { FullProfile, OnboardingSlug, Profile } from "@/lib/types/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const STEP_INDEX: Record<OnboardingSlug, number> = {
  "basic-info": 0,
  experience: 1,
  education: 2,
  portfolio: 3,
  accolades: 4,
  availability: 5,
  review: 6,
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signup");
  return { supabase, user };
}

export async function updateOnboardingStep(step: OnboardingSlug) {
  const { supabase, user } = await requireUser();
  const stepIndex = STEP_INDEX[step];

  await supabase
    .from("profiles")
    .update({ onboarding_step: stepIndex })
    .eq("id", user.id);
}

export async function saveBasicInfo(formData: FormData) {
  const { supabase, user } = await requireUser();

  const profileImageUrl = formData.get("profile_image_url")?.toString() || null;

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: formData.get("first_name")?.toString() || null,
      last_name: formData.get("last_name")?.toString() || null,
      headline: formData.get("headline")?.toString() || null,
      bio: formData.get("bio")?.toString() || null,
      current_position: formData.get("current_position")?.toString() || null,
      city: formData.get("city")?.toString() || null,
      state: formData.get("state")?.toString() || null,
      country: formData.get("country")?.toString() || null,
      profile_image_url: profileImageUrl,
      onboarding_step: STEP_INDEX.experience,
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  redirect("/onboarding/experience");
}

export async function saveExperience(formData: FormData) {
  const { supabase, user } = await requireUser();

  const expertiseRaw = formData.getAll("expertise_areas").map(String);
  const yearsRaw = formData.get("years_experience")?.toString();
  const years = yearsRaw ? parseInt(yearsRaw, 10) : null;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      years_experience: years,
      current_employer: formData.get("current_employer")?.toString() || null,
      current_position: formData.get("current_position")?.toString() || null,
      expertise_areas: expertiseRaw,
      onboarding_step: STEP_INDEX.education,
    })
    .eq("id", user.id);

  if (profileError) throw new Error(profileError.message);

  await supabase.from("experiences").delete().eq("user_id", user.id);

  const previousEmployers = formData.getAll("previous_employer").map(String).filter(Boolean);
  const previousPositions = formData.getAll("previous_position").map(String);

  if (previousEmployers.length > 0) {
    const rows = previousEmployers.map((company, index) => ({
      user_id: user.id,
      company_name: company,
      position_title: previousPositions[index] || "Team Member",
      is_current: false,
    }));

    const { error } = await supabase.from("experiences").insert(rows);
    if (error) throw new Error(error.message);
  }

  const currentEmployer = formData.get("current_employer")?.toString();
  const currentPosition = formData.get("current_position")?.toString();
  if (currentEmployer && currentPosition) {
    await supabase.from("experiences").insert({
      user_id: user.id,
      company_name: currentEmployer,
      position_title: currentPosition,
      is_current: true,
    });
  }

  redirect("/onboarding/education");
}

export async function saveEducation(formData: FormData) {
  const { supabase, user } = await requireUser();

  await supabase.from("education").delete().eq("user_id", user.id);

  const schools = formData.getAll("school_name").map(String).filter(Boolean);
  const programs = formData.getAll("program_name").map(String);
  const years = formData.getAll("graduation_year").map(String);

  if (schools.length > 0) {
    const rows = schools.map((school, index) => ({
      user_id: user.id,
      school_name: school,
      program_name: programs[index] || null,
      graduation_year: years[index] ? parseInt(years[index], 10) : null,
    }));

    const { error } = await supabase.from("education").insert(rows);
    if (error) throw new Error(error.message);
  }

  await supabase
    .from("profiles")
    .update({ onboarding_step: STEP_INDEX.portfolio })
    .eq("id", user.id);

  redirect("/onboarding/portfolio");
}

export async function savePortfolio(formData: FormData) {
  const { supabase, user } = await requireUser();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      instagram_url: formData.get("instagram_url")?.toString() || null,
      website_url: formData.get("website_url")?.toString() || null,
      linkedin_url: formData.get("linkedin_url")?.toString() || null,
      resume_url: formData.get("resume_url")?.toString() || null,
      onboarding_step: STEP_INDEX.accolades,
    })
    .eq("id", user.id);

  if (profileError) throw new Error(profileError.message);

  await supabase.from("portfolio_links").delete().eq("user_id", user.id);

  const types = formData.getAll("link_type").map(String);
  const urls = formData.getAll("link_url").map(String);

  const rows = types
    .map((type, index) => ({
      user_id: user.id,
      type,
      url: urls[index]?.trim(),
    }))
    .filter((row) => row.url);

  if (rows.length > 0) {
    const { error } = await supabase.from("portfolio_links").insert(rows);
    if (error) throw new Error(error.message);
  }

  redirect("/onboarding/accolades");
}

export async function saveAccolades(formData: FormData) {
  const { supabase, user } = await requireUser();

  await supabase.from("accolades").delete().eq("user_id", user.id);

  const titles = formData.getAll("title").map(String).filter(Boolean);
  const organizations = formData.getAll("organization").map(String);
  const years = formData.getAll("year").map(String);
  const descriptions = formData.getAll("description").map(String);

  if (titles.length > 0) {
    const rows = titles.map((title, index) => ({
      user_id: user.id,
      title,
      organization: organizations[index] || null,
      year: years[index] ? parseInt(years[index], 10) : null,
      description: descriptions[index] || null,
    }));

    const { error } = await supabase.from("accolades").insert(rows);
    if (error) throw new Error(error.message);
  }

  await supabase
    .from("profiles")
    .update({ onboarding_step: STEP_INDEX.availability })
    .eq("id", user.id);

  redirect("/onboarding/availability");
}

export async function saveAvailability(formData: FormData) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("profiles")
    .update({
      open_to_opportunities: formData.get("open_to_opportunities") === "on",
      available_private_events: formData.get("available_private_events") === "on",
      available_contract_work: formData.get("available_contract_work") === "on",
      available_emergency_staffing: formData.get("available_emergency_staffing") === "on",
      onboarding_step: STEP_INDEX.review,
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  redirect("/onboarding/review");
}

export async function completeOnboarding() {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("profiles")
    .update({
      onboarding_completed: true,
      onboarding_step: STEP_INDEX.review,
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath(`/profile/${user.id}`);
  redirect(`/profile/${user.id}`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function getDirectoryProfiles(): Promise<Profile[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("onboarding_completed", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Profile[];
}

export async function getFullProfile(userId: string): Promise<FullProfile | null> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (!profile) return null;

  const [education, experiences, accolades, portfolio_links] = await Promise.all([
    supabase.from("education").select("*").eq("user_id", userId).order("graduation_year", {
      ascending: false,
    }),
    supabase.from("experiences").select("*").eq("user_id", userId).order("is_current", {
      ascending: false,
    }),
    supabase.from("accolades").select("*").eq("user_id", userId).order("year", {
      ascending: false,
    }),
    supabase.from("portfolio_links").select("*").eq("user_id", userId),
  ]);

  return {
    ...profile,
    education: education.data ?? [],
    experiences: experiences.data ?? [],
    accolades: accolades.data ?? [],
    portfolio_links: portfolio_links.data ?? [],
  };
}

export async function getCurrentUserProfile(): Promise<FullProfile | null> {
  const { user } = await requireUser();
  return getFullProfile(user.id);
}
