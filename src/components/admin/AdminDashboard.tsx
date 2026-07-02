"use client";

import { useActionState, useState } from "react";
import {
  addParentLink,
  addPerson,
  addSpouseLink,
  deleteParentLink,
  deletePerson,
  deleteSpouseLink,
  updatePerson,
  type ActionResult,
} from "@/app/actions/admin";
import { type Database } from "@/lib/database.types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { PhotoUpload } from "@/components/PhotoUpload";

type PersonRow = Database["public"]["Tables"]["people"]["Row"];
type ParentLink = Database["public"]["Tables"]["parent_links"]["Row"];
type SpouseLink = Database["public"]["Tables"]["spouses"]["Row"];

const TABS = ["People", "Parents", "Spouses"] as const;

function ErrorNote({ state }: { state: ActionResult | null }) {
  if (!state?.error) return null;
  return (
    <p className="rounded-xl bg-terracotta-500/10 px-3 py-2 text-sm text-terracotta-600">
      {state.error}
    </p>
  );
}

function AddPersonForm() {
  const [state, formAction, pending] = useActionState(addPerson, null);
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-semibold">Add a family member</h2>
      <form action={formAction} className="flex flex-col gap-3">
        <Input name="name" placeholder="Full name" required />
        <div className="flex gap-2">
          <Select name="gender" defaultValue="other" className="flex-1">
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other / skip</option>
          </Select>
          <label className="flex flex-1 items-center gap-2 rounded-xl border border-cream-300 bg-cream-50 px-3">
            <input type="checkbox" name="attending" className="size-5 accent-sage-500" />
            <span className="text-sm">At the reunion</span>
          </label>
        </div>
        <PhotoUpload name="photo" label="Photo (optional)" />
        <ErrorNote state={state} />
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add person"}
        </Button>
      </form>
    </Card>
  );
}

function PersonCard({ person }: { person: PersonRow }) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction, updatePending] = useActionState(updatePerson, null);
  const [, deleteAction, deletePending] = useActionState(deletePerson, null);

  return (
    <Card className="flex flex-col gap-3 py-3">
      <div className="flex items-center gap-3">
        <Avatar name={person.name} photoPath={person.photo_path} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{person.name}</p>
          <div className="mt-0.5 flex gap-1">
            {person.attending ? (
              <Badge tone="sage">at reunion</Badge>
            ) : (
              <Badge tone="cream">tree only</Badge>
            )}
            {person.gender !== "other" && <Badge tone="cream">{person.gender}</Badge>}
          </div>
        </div>
        <form action={updateAction}>
          <input type="hidden" name="id" value={person.id} />
          <input
            type="hidden"
            name="attending_value"
            value={person.attending ? "false" : "true"}
          />
          <Button type="submit" variant="secondary" disabled={updatePending} className="px-3 text-xs">
            {person.attending ? "Mark absent" : "Mark here"}
          </Button>
        </form>
        <Button
          type="button"
          variant="ghost"
          className="px-2 text-xs"
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? "Close" : "Edit"}
        </Button>
      </div>

      {editing && (
        <div className="flex flex-col gap-3 border-t border-cream-200 pt-3">
          <form action={updateAction} className="flex flex-col gap-2">
            <input type="hidden" name="id" value={person.id} />
            <Input name="name" defaultValue={person.name} />
            <Select name="gender" defaultValue={person.gender}>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other / skip</option>
            </Select>
            <PhotoUpload name="photo" label="Replace photo" />
            <ErrorNote state={updateState} />
            <Button type="submit" variant="secondary" disabled={updatePending}>
              {updatePending ? "Saving…" : "Save changes"}
            </Button>
          </form>
          <form
            action={deleteAction}
            onSubmit={(event) => {
              if (!confirm(`Delete ${person.name}? This removes their links and answers.`)) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={person.id} />
            <Button
              type="submit"
              variant="ghost"
              disabled={deletePending}
              className="w-full text-terracotta-600"
            >
              Delete {person.name}
            </Button>
          </form>
        </div>
      )}
    </Card>
  );
}

function PersonSelect({
  name,
  people,
  placeholder,
}: {
  name: string;
  people: PersonRow[];
  placeholder: string;
}) {
  return (
    <Select name={name} defaultValue="" required className="flex-1">
      <option value="" disabled>
        {placeholder}
      </option>
      {people.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </Select>
  );
}

function ParentsTab({
  people,
  parentLinks,
}: {
  people: PersonRow[];
  parentLinks: ParentLink[];
}) {
  const [addState, addAction, addPending] = useActionState(addParentLink, null);
  const [, deleteAction] = useActionState(deleteParentLink, null);
  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? "?";

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold">Link parent → child</h2>
        <form action={addAction} className="flex flex-col gap-2">
          <PersonSelect name="parent_id" people={people} placeholder="Parent…" />
          <PersonSelect name="child_id" people={people} placeholder="Child…" />
          <ErrorNote state={addState} />
          <Button type="submit" disabled={addPending}>
            {addPending ? "Linking…" : "Add link"}
          </Button>
        </form>
      </Card>
      <ul className="flex flex-col gap-2">
        {parentLinks.map((link) => (
          <li
            key={`${link.parent_id}:${link.child_id}`}
            className="flex items-center justify-between rounded-xl border border-cream-200 bg-cream-100 px-3 py-2"
          >
            <span className="text-sm">
              <span className="font-medium">{nameOf(link.parent_id)}</span>
              <span className="text-brown-500"> is a parent of </span>
              <span className="font-medium">{nameOf(link.child_id)}</span>
            </span>
            <form action={deleteAction}>
              <input type="hidden" name="parent_id" value={link.parent_id} />
              <input type="hidden" name="child_id" value={link.child_id} />
              <button type="submit" className="px-2 text-terracotta-600" aria-label="Remove link">
                ✕
              </button>
            </form>
          </li>
        ))}
        {parentLinks.length === 0 && (
          <p className="py-2 text-center text-sm text-brown-500">No parent links yet.</p>
        )}
      </ul>
    </div>
  );
}

function SpousesTab({
  people,
  spouseLinks,
}: {
  people: PersonRow[];
  spouseLinks: SpouseLink[];
}) {
  const [addState, addAction, addPending] = useActionState(addSpouseLink, null);
  const [, deleteAction] = useActionState(deleteSpouseLink, null);
  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? "?";

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold">Link spouses</h2>
        <form action={addAction} className="flex flex-col gap-2">
          <PersonSelect name="person1_id" people={people} placeholder="Spouse…" />
          <PersonSelect name="person2_id" people={people} placeholder="Spouse…" />
          <ErrorNote state={addState} />
          <Button type="submit" disabled={addPending}>
            {addPending ? "Linking…" : "Add marriage"}
          </Button>
        </form>
      </Card>
      <ul className="flex flex-col gap-2">
        {spouseLinks.map((link) => (
          <li
            key={`${link.person1_id}:${link.person2_id}`}
            className="flex items-center justify-between rounded-xl border border-cream-200 bg-cream-100 px-3 py-2"
          >
            <span className="text-sm">
              <span className="font-medium">{nameOf(link.person1_id)}</span>
              <span className="text-brown-500"> ♥ </span>
              <span className="font-medium">{nameOf(link.person2_id)}</span>
            </span>
            <form action={deleteAction}>
              <input type="hidden" name="person1_id" value={link.person1_id} />
              <input type="hidden" name="person2_id" value={link.person2_id} />
              <button type="submit" className="px-2 text-terracotta-600" aria-label="Remove link">
                ✕
              </button>
            </form>
          </li>
        ))}
        {spouseLinks.length === 0 && (
          <p className="py-2 text-center text-sm text-brown-500">No marriages yet.</p>
        )}
      </ul>
    </div>
  );
}

export function AdminDashboard({
  people,
  parentLinks,
  spouseLinks,
}: {
  people: PersonRow[];
  parentLinks: ParentLink[];
  spouseLinks: SpouseLink[];
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("People");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-full bg-cream-200 p-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`min-h-11 flex-1 rounded-full text-sm font-medium transition-colors ${
              tab === t ? "bg-brown-700 text-cream-50" : "text-brown-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "People" && (
        <div className="flex flex-col gap-3">
          <AddPersonForm />
          <p className="text-sm text-brown-500">
            {people.length} people · {people.filter((p) => p.attending).length} at the
            reunion
          </p>
          {people.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </div>
      )}
      {tab === "Parents" && <ParentsTab people={people} parentLinks={parentLinks} />}
      {tab === "Spouses" && <SpousesTab people={people} spouseLinks={spouseLinks} />}
    </div>
  );
}
