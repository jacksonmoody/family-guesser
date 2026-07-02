import Link from "next/link";
import { redirect } from "next/navigation";
import { loadFamilyGraph, hasCompletedRun } from "@/lib/data";
import { getTeamId, isAdmin } from "@/lib/team";
import { TreeView } from "@/components/TreeView";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function TreePage() {
  const [teamId, admin] = await Promise.all([getTeamId(), isAdmin()]);
  const unlocked = admin || (teamId ? await hasCompletedRun(teamId) : false);
  if (!unlocked) redirect("/play");

  const graph = await loadFamilyGraph();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-4 py-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">Family Tree</h1>
      </header>

      <TreeView graph={graph} />

      <div className="mx-auto flex w-full max-w-2xl gap-2">
        <Link href="/play" className="flex-1">
          <Button variant="accent" className="w-full">
            Back to Game
          </Button>
        </Link>
        <Link href="/leaderboard" className="flex-1">
          <Button variant="secondary" className="w-full">
            Leaderboard
          </Button>
        </Link>
      </div>
    </main>
  );
}
