import { createClient } from "@/lib/supabase/server";
import {
  hasDisplayName,
  namesFromMetadata,
} from "@/lib/profile/names";
import type { User } from "@supabase/supabase-js";

export async function syncProfileNamesFromAuth(user: User) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();

  if (hasDisplayName(profile?.first_name, profile?.last_name)) {
    return;
  }

  const names = namesFromMetadata(user.user_metadata);
  if (!hasDisplayName(names.first_name, names.last_name)) {
    return;
  }

  await supabase.from("profiles").update(names).eq("id", user.id);
}
