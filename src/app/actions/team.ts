"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { setTeamCookie } from "@/lib/team";
import { PHOTOS_BUCKET } from "@/lib/supabase/storage";

export interface CreateTeamState {
  error?: string;
}

/** Re-set the team cookie from a localStorage backup, if the team is real. */
export async function restoreTeam(teamId: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(teamId)) return false;
  const supabase = createServerClient();
  const { data } = await supabase
    .from("teams")
    .select("id")
    .eq("id", teamId)
    .maybeSingle();
  if (!data) return false;
  await setTeamCookie(data.id);
  return true;
}

async function uploadTeamPhoto(personId: string, file: File): Promise<void> {
  const supabase = createServerClient();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `people/${personId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type || "image/jpeg",
      upsert: true,
    });
  if (error) throw new Error(error.message);
  const { error: updateError } = await supabase
    .from("people")
    .update({ photo_path: path })
    .eq("id", personId);
  if (updateError) throw new Error(updateError.message);
}

export async function createTeam(
  _prev: CreateTeamState | null,
  formData: FormData,
): Promise<CreateTeamState> {
  const person1Id = String(formData.get("person1_id") ?? "");
  const person2Id = String(formData.get("person2_id") ?? "");
  if (!person1Id || !person2Id) {
    return { error: "Pick both teammates first" };
  }
  if (person1Id === person2Id) {
    return { error: "Pick two different people" };
  }

  const supabase = createServerClient();
  const { data: people, error: peopleError } = await supabase
    .from("people")
    .select("id,name,attending")
    .in("id", [person1Id, person2Id]);
  if (peopleError || !people || people.length !== 2) {
    return { error: "Couldn't find those people — refresh and try again" };
  }
  if (people.some((p) => !p.attending)) {
    return { error: "Both teammates must be at the reunion" };
  }

  const firstName = (fullName: string) => fullName.split(/\s+/)[0];
  const person1 = people.find((p) => p.id === person1Id)!;
  const person2 = people.find((p) => p.id === person2Id)!;
  const name =
    String(formData.get("team_name") ?? "").trim() ||
    `${firstName(person1.name)} & ${firstName(person2.name)}`;

  // Rejoining players (lost cookie, new device) get their old team back,
  // keeping its runs and best score instead of duplicating the leaderboard.
  // IDs are safe to interpolate — both were validated against `people` above.
  const { data: existing } = await supabase
    .from("teams")
    .select("id")
    .or(
      `and(person1_id.eq.${person1Id},person2_id.eq.${person2Id}),and(person1_id.eq.${person2Id},person2_id.eq.${person1Id})`,
    )
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let teamId = existing?.id;
  if (!teamId) {
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({ name, person1_id: person1Id, person2_id: person2Id })
      .select("id")
      .single();
    if (teamError) return { error: teamError.message };
    teamId = team.id;
  }

  for (const [personId, field] of [
    [person1Id, "photo1"],
    [person2Id, "photo2"],
  ] as const) {
    const file = formData.get(field);
    if (file instanceof File && file.size > 0) {
      try {
        await uploadTeamPhoto(personId, file);
      } catch (error) {
        // A failed photo shouldn't block the game — the avatar falls back to initials.
        console.error(`Photo upload failed for person ${personId}:`, error);
      }
    }
  }

  await setTeamCookie(teamId);
  redirect("/play");
}
