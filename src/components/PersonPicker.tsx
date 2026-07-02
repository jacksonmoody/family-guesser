"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";

export interface PickerPerson {
  id: string;
  name: string;
  photo_path: string | null;
}

export function PersonPicker({
  people,
  selectedId,
  disabledId,
  onSelect,
}: {
  people: PickerPerson[];
  selectedId: string | null;
  /** Person already taken by the other slot. */
  disabledId: string | null;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = people.filter((p) =>
    p.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-3">
      {people.length > 8 && (
        <Input
          type="search"
          placeholder="Search names…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      )}
      <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto">
        {filtered.map((person) => {
          const isSelected = person.id === selectedId;
          const isTaken = person.id === disabledId;
          return (
            <button
              key={person.id}
              type="button"
              disabled={isTaken}
              onClick={() => onSelect(person.id)}
              className={`flex min-h-11 flex-col items-center gap-1 rounded-xl border p-2 transition-colors ${
                isSelected
                  ? "border-terracotta-500 bg-terracotta-500/10"
                  : "border-cream-300 bg-cream-50"
              } ${isTaken ? "opacity-40" : "active:bg-cream-200"}`}
            >
              <Avatar name={person.name} photoPath={person.photo_path} size="md" />
              <span className="line-clamp-2 text-center text-xs leading-tight text-brown-900">
                {person.name}
              </span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-3 py-4 text-center text-sm text-brown-500">
            No one matches “{query}”
          </p>
        )}
      </div>
    </div>
  );
}
