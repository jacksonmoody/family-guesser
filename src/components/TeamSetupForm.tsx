"use client";

import { useActionState, useState } from "react";
import { createTeam } from "@/app/actions/team";
import { PersonPicker, type PickerPerson } from "@/components/PersonPicker";
import { PhotoUpload } from "@/components/PhotoUpload";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export function TeamSetupForm({ people }: { people: PickerPerson[] }) {
  const [person1, setPerson1] = useState<string | null>(null);
  const [person2, setPerson2] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(createTeam, null);

  const slots = [
    {
      label: "Player 1",
      value: person1,
      other: person2,
      set: setPerson1,
      field: "person1_id",
      photoField: "photo1",
    },
    {
      label: "Player 2",
      value: person2,
      other: person1,
      set: setPerson2,
      field: "person2_id",
      photoField: "photo2",
    },
  ] as const;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Card className="flex flex-col gap-2">
        <label
          htmlFor="team_name"
          className="font-display text-lg font-semibold"
        >
          Team Name
        </label>
        <Input
          id="team_name"
          name="team_name"
          placeholder="Moodylicious"
          maxLength={40}
        />
      </Card>
      {slots.map((slot) => {
        const selected = people.find((p) => p.id === slot.value);
        return (
          <Card key={slot.label} className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-semibold">
              {slot.label}
              {selected ? `: ${selected.name.split(/\s+/)[0]}` : ""}
            </h2>
            <input type="hidden" name={slot.field} value={slot.value ?? ""} />
            <PersonPicker
              people={people}
              selectedId={slot.value}
              disabledId={slot.other}
              onSelect={slot.set}
            />
            {selected && !selected.photo_path && (
              <PhotoUpload
                name={slot.photoField}
                label={`Take a photo of ${selected.name.split(/\s+/)[0]}!`}
              />
            )}
          </Card>
        );
      })}
      {state?.error && (
        <p className="rounded-xl bg-terracotta-500/10 px-4 py-2 text-center text-sm text-terracotta-600">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        variant="accent"
        disabled={!person1 || !person2 || pending}
        className="w-full"
      >
        {pending ? "Building Team..." : "Let's Play!"}
      </Button>
    </form>
  );
}
