import Link from "next/link";
import { getLeaderboard, getPeople, hasCompletedRun } from "@/lib/data";
import { getTeamId } from "@/lib/team";
import { LiveLeaderboard } from "@/components/LiveLeaderboard";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const teamId = await getTeamId();
  const [rows, people, treeUnlocked] = await Promise.all([
    getLeaderboard(),
    getPeople(),
    teamId ? hasCompletedRun(teamId) : Promise.resolve(false),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-6">
      <header className="text-center">
        <h1 className="text-4xl font-semibold">Leaderboard</h1>
        <p className="mt-3 text-sm text-brown-700">
          Based on the best 5-minute score of each team
        </p>
      </header>

      <LiveLeaderboard
        initialRows={rows}
        people={people.map((p) => ({
          id: p.id,
          name: p.name,
          photo_path: p.photo_path,
        }))}
        ownTeamId={teamId}
      />

      <div className="flex flex-col gap-2">
        <Link href="/play" className="w-full">
          <Button variant="accent" className="w-full">
            {teamId ? "Play Again" : "Join the Game"}
          </Button>
        </Link>
        {treeUnlocked && (
          <Link href="/tree" className="text-center text-brown-500 underline">
            Explore the Family Tree
          </Link>
        )}
      </div>
    </main>
  );
}
