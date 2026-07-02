"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { type LeaderboardRow, type PersonRow } from "@/lib/data";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

const POLL_MS = 5000;

export function LiveLeaderboard({
  initialRows,
  people,
  ownTeamId,
}: {
  initialRows: LeaderboardRow[];
  people: Pick<PersonRow, "id" | "name" | "photo_path">[];
  ownTeamId: string | null;
}) {
  const [rows, setRows] = useState(initialRows);
  const personById = new Map(people.map((p) => [p.id, p]));

  useEffect(() => {
    const supabase = createBrowserClient();
    let cancelled = false;
    const poll = async () => {
      const { data } = await supabase
        .from("leaderboard")
        .select("*")
        .order("score", { ascending: false, nullsFirst: false });
      if (!cancelled && data) setRows(data);
    };
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (rows.length === 0) {
    return <Card className="text-center text-brown-700">No Teams Yet!</Card>;
  }

  return (
    <ol className="flex flex-col gap-2">
      {rows.map((row, index) => {
        const person1 = personById.get(row.person1_id);
        const person2 = personById.get(row.person2_id);
        const isOwn = row.id === ownTeamId;
        return (
          <li key={row.id}>
            <Card
              className={`flex items-center gap-3 py-3 ${
                isOwn
                  ? "border-terracotta-500 ring-1 ring-terracotta-500/40"
                  : ""
              }`}
            >
              <span
                className={`w-8 shrink-0 text-center font-display text-xl font-semibold ${
                  index === 0 ? "text-terracotta-500" : "text-brown-500"
                }`}
              >
                {index + 1}
              </span>
              <span className="flex shrink-0 -space-x-2">
                {[person1, person2].map(
                  (person) =>
                    person && (
                      <Avatar
                        key={person.id}
                        name={person.name}
                        photoPath={person.photo_path}
                        size="sm"
                        className="border-2 border-cream-100"
                      />
                    ),
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{row.name}</span>
                <span className="block text-xs text-brown-500">
                  {row.correct_count ?? 0} correct
                  {row.hard_mode ? " · best run on hard mode" : ""}
                </span>
              </span>
              {row.hard_mode && <Badge tone="terracotta">1.5×</Badge>}
              <span className="font-display text-2xl font-semibold tabular-nums">
                {row.score ?? 0}
              </span>
            </Card>
          </li>
        );
      })}
    </ol>
  );
}
