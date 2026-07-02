import { createServerClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/team";
import { PasscodeGate } from "@/components/admin/PasscodeGate";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4 py-8">
        <PasscodeGate />
      </main>
    );
  }

  const supabase = createServerClient();
  const [people, parentLinks, spouseLinks] = await Promise.all([
    supabase.from("people").select("*").order("name"),
    supabase.from("parent_links").select("*"),
    supabase.from("spouses").select("*"),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-6">
      <header>
        <p className="text-sm tracking-wide text-brown-500 uppercase">
          Organizer tools
        </p>
        <h1 className="font-display text-3xl font-semibold">Family Admin</h1>
        <p className="mt-1 text-sm text-brown-700">
          Add everyone to the tree, then mark who&apos;s at the reunion.
        </p>
      </header>
      <AdminDashboard
        people={people.data ?? []}
        parentLinks={parentLinks.data ?? []}
        spouseLinks={spouseLinks.data ?? []}
      />
    </main>
  );
}
