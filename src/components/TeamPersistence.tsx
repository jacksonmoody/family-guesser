"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { restoreTeam } from "@/app/actions/team";

const STORAGE_KEY = "family-guesser:team-id";

/** Mirrors the active team id into localStorage (cookie backup). */
export function TeamRemember({ teamId }: { teamId: string }) {
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, teamId);
    } catch {
      // Private-mode storage failures are fine — the cookie is primary.
    }
  }, [teamId]);
  return null;
}

/** If the cookie was lost but localStorage remembers the team, restore it. */
export function TeamRestore() {
  const router = useRouter();
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      return;
    }
    if (!stored) return;
    restoreTeam(stored).then((restored) => {
      if (restored) router.refresh();
      else {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
      }
    });
  }, [router]);
  return null;
}
