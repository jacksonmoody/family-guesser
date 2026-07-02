"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { isAdmin, setAdminCookie } from "@/lib/team";
import { PHOTOS_BUCKET } from "@/lib/supabase/storage";
import { type Database } from "@/lib/database.types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error("Not authorized");
}

export async function verifyPasscode(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const passcode = String(formData.get("passcode") ?? "");
  if (!process.env.ADMIN_PASSCODE || passcode !== process.env.ADMIN_PASSCODE) {
    return { ok: false, error: "Wrong passcode" };
  }
  await setAdminCookie();
  revalidatePath("/admin");
  return { ok: true };
}

async function uploadPhoto(personId: string, file: File): Promise<string> {
  const supabase = createServerClient();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  // Unique path per upload so the public CDN never serves a stale image.
  const path = `people/${personId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type || "image/jpeg",
      upsert: true,
    });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);
  return path;
}

export async function addPerson(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const gender = String(formData.get("gender") ?? "other");
  const attending = formData.get("attending") === "on";
  if (!name) return { ok: false, error: "Name is required" };
  if (!["female", "male", "other"].includes(gender)) {
    return { ok: false, error: "Invalid gender" };
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("people")
    .insert({ name, gender: gender as "female" | "male" | "other", attending })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    try {
      const path = await uploadPhoto(data.id, photo);
      await supabase.from("people").update({ photo_path: path }).eq("id", data.id);
    } catch (err) {
      return { ok: true, error: `Person added, but photo failed: ${(err as Error).message}` };
    }
  }
  revalidatePath("/admin");
  return { ok: true };
}

export async function updatePerson(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing person id" };

  const updates: Database["public"]["Tables"]["people"]["Update"] = {};
  if (formData.has("name")) {
    const name = String(formData.get("name")).trim();
    if (!name) return { ok: false, error: "Name cannot be empty" };
    updates.name = name;
  }
  if (formData.has("gender")) {
    const gender = String(formData.get("gender"));
    if (!["female", "male", "other"].includes(gender)) {
      return { ok: false, error: "Invalid gender" };
    }
    updates.gender = gender as "female" | "male" | "other";
  }
  if (formData.has("attending_value")) {
    updates.attending = formData.get("attending_value") === "true";
  }

  const supabase = createServerClient();
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    try {
      updates.photo_path = await uploadPhoto(id, photo);
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }
  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from("people").update(updates).eq("id", id);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/admin");
  return { ok: true };
}

export async function deletePerson(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const supabase = createServerClient();
  const { error } = await supabase.from("people").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function addParentLink(
  parentId: string,
  childId: string,
): Promise<ActionResult> {
  await requireAdmin();
  if (!parentId || !childId) return { ok: false, error: "Pick both people" };
  if (parentId === childId) {
    return { ok: false, error: "Someone can't be their own parent" };
  }
  const supabase = createServerClient();

  // Reject links that would make someone their own ancestor.
  const { data: links, error: linksError } = await supabase
    .from("parent_links")
    .select("*");
  if (linksError) return { ok: false, error: linksError.message };
  const parentsOf = new Map<string, string[]>();
  for (const link of links) {
    const list = parentsOf.get(link.child_id);
    if (list) list.push(link.parent_id);
    else parentsOf.set(link.child_id, [link.parent_id]);
  }
  const seen = new Set<string>([parentId]);
  let frontier = [parentId];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const ancestorId of parentsOf.get(id) ?? []) {
        if (ancestorId === childId) {
          return { ok: false, error: "That link would create an ancestry loop" };
        }
        if (!seen.has(ancestorId)) {
          seen.add(ancestorId);
          next.push(ancestorId);
        }
      }
    }
    frontier = next;
  }

  const { error } = await supabase
    .from("parent_links")
    .insert({ parent_id: parentId, child_id: childId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteParentLink(
  parentId: string,
  childId: string,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createServerClient();
  const { error } = await supabase
    .from("parent_links")
    .delete()
    .eq("parent_id", parentId)
    .eq("child_id", childId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function addSpouseLink(a: string, b: string): Promise<ActionResult> {
  await requireAdmin();
  if (!a || !b) return { ok: false, error: "Pick both people" };
  if (a === b) return { ok: false, error: "Someone can't marry themselves" };
  // Table stores the pair in canonical order (person1_id < person2_id).
  const [person1Id, person2Id] = a < b ? [a, b] : [b, a];
  const supabase = createServerClient();
  const { error } = await supabase
    .from("spouses")
    .insert({ person1_id: person1Id, person2_id: person2Id });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteSpouseLink(a: string, b: string): Promise<ActionResult> {
  await requireAdmin();
  const [person1Id, person2Id] = a < b ? [a, b] : [b, a];
  const supabase = createServerClient();
  const { error } = await supabase
    .from("spouses")
    .delete()
    .eq("person1_id", person1Id)
    .eq("person2_id", person2Id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}
