import { redirect } from "next/navigation";
import Link from "next/link";
import { getTeam, hasCompletedRun } from "@/lib/data";
import { getTeamId } from "@/lib/team";
import { getRunState } from "@/app/actions/game";
import { RunScreen } from "@/components/RunScreen";
import { TeamRemember } from "@/components/TeamPersistence";

export const dynamic = "force-dynamic";

export default async function PlayPage() {
  const teamId = await getTeamId();
  if (!teamId) redirect("/");
  const team = await getTeam(teamId);
  if (!team) redirect("/");

  const [initialState, treeUnlocked] = await Promise.all([
    getRunState(),
    hasCompletedRun(teamId),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      <TeamRemember teamId={team.id} />
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs tracking-wide text-brown-500 uppercase">Team</p>
          <h1 className="font-display text-2xl font-semibold">{team.name}</h1>
        </div>
        <Link
          href="/leaderboard"
          className="rounded-full bg-cream-200 px-4 py-2 text-sm font-medium text-brown-700"
        >
          Live Leaderboard
        </Link>
      </header>
      <RunScreen
        initialRun={initialState.run ?? null}
        initialQuestion={initialState.question ?? null}
        treeUnlocked={treeUnlocked}
      />
    </main>
  );
}
