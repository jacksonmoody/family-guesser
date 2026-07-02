import { createServerClient } from "@/lib/supabase/server";
import {
  buildGraph,
  type FamilyGraph,
  type Person,
  type Gender,
} from "@/lib/kinship/graph";
import { type Database } from "@/lib/database.types";

export type PersonRow = Database["public"]["Tables"]["people"]["Row"];
export type TeamRow = Database["public"]["Tables"]["teams"]["Row"];
export type RunRow = Database["public"]["Tables"]["runs"]["Row"];
export type QuestionRow = Database["public"]["Tables"]["questions"]["Row"];
export type LeaderboardRow = Database["public"]["Views"]["leaderboard"]["Row"];

export function toPerson(row: PersonRow): Person {
  return {
    id: row.id,
    name: row.name,
    gender: row.gender as Gender,
    attending: row.attending,
    photoPath: row.photo_path,
  };
}

export async function getPeople(): Promise<PersonRow[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("people").select("*").order("name");
  if (error) throw new Error(`Failed to load people: ${error.message}`);
  return data;
}

export async function loadFamilyGraph(): Promise<FamilyGraph> {
  const supabase = createServerClient();
  const [people, parentLinks, spouseLinks] = await Promise.all([
    supabase.from("people").select("*"),
    supabase.from("parent_links").select("*"),
    supabase.from("spouses").select("*"),
  ]);
  const firstError = people.error ?? parentLinks.error ?? spouseLinks.error;
  if (firstError) throw new Error(`Failed to load family graph: ${firstError.message}`);
  return buildGraph(
    (people.data ?? []).map(toPerson),
    (parentLinks.data ?? []).map((row) => ({
      parentId: row.parent_id,
      childId: row.child_id,
    })),
    (spouseLinks.data ?? []).map((row) => ({
      person1Id: row.person1_id,
      person2Id: row.person2_id,
    })),
  );
}

export async function getTeam(teamId: string): Promise<TeamRow | null> {
  const supabase = createServerClient();
  const { data } = await supabase.from("teams").select("*").eq("id", teamId).maybeSingle();
  return data;
}

/** The team's currently active (not yet ended) run, if any. */
export async function getActiveRun(teamId: string): Promise<RunRow | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("runs")
    .select("*")
    .eq("team_id", teamId)
    .gt("ends_at", new Date().toISOString())
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function hasCompletedRun(teamId: string): Promise<boolean> {
  const supabase = createServerClient();
  const { count } = await supabase
    .from("runs")
    .select("*", { count: "exact", head: true })
    .eq("team_id", teamId)
    .lte("ends_at", new Date().toISOString());
  return (count ?? 0) > 0;
}

export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("leaderboard")
    .select("*")
    .order("score", { ascending: false, nullsFirst: false });
  if (error) throw new Error(`Failed to load leaderboard: ${error.message}`);
  return data;
}
