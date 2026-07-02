import Link from "next/link";
import { getPeople, getTeam } from "@/lib/data";
import { getTeamId } from "@/lib/team";
import { TeamSetupForm } from "@/components/TeamSetupForm";
import { TeamRestore } from "@/components/TeamPersistence";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [people, teamId] = await Promise.all([getPeople(), getTeamId()]);
  const attending = people.filter((p) => p.attending);
  const team = teamId ? await getTeam(teamId) : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-8">
      {!team && <TeamRestore />}
      <header className="text-center flex flex-col gap-2">
        <p className="text-sm tracking-wide text-brown-500 uppercase">
          07/02/2026
        </p>
        <h1 className="font-display text-3xl font-semibold text-brown-900">
          LBI Family Guessing Game
        </h1>
      </header>

      {team ? (
        <Card className="flex flex-col items-center gap-3 text-center">
          <p className="text-brown-700">
            This device already has a team:{" "}
            <span className="font-display font-semibold">{team.name}</span>
          </p>
          <Link href="/play">
            <Button variant="accent">Keep playing as {team.name}</Button>
          </Link>
          <p className="text-xs text-brown-500">...or make a new team below!</p>
        </Card>
      ) : (
        <p className="text-center text-brown-700 py-4">
          Select your team members below to get started!
        </p>
      )}

      {attending.length < 2 ? (
        <Card className="text-center text-brown-700">
          The guest list isn&apos;t ready yet — check back soon!
        </Card>
      ) : (
        <TeamSetupForm people={attending} />
      )}
    </main>
  );
}
