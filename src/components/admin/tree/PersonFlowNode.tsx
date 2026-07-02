"use client";

import { type CSSProperties } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { type Gender, type Person } from "@/lib/kinship/graph";
import { AVATAR_CENTER_Y, NODE_H, NODE_W } from "@/lib/kinship/layout";
import { Avatar } from "@/components/ui/Avatar";

export type PersonFlowNodeType = Node<{ person: Person }, "person">;

function shapeFor(gender: Gender): "circle" | "square" | "diamond" {
  if (gender === "male") return "square";
  if (gender === "female") return "circle";
  return "diamond";
}

const handleStyle: CSSProperties = {
  width: 12,
  height: 12,
  border: "2px solid var(--color-cream-50)",
  background: "#78716c",
};

/**
 * Genogram convention: side handles draw marriages, bottom → top draws
 * parent → child. Handle ids are how connections get classified.
 */
export function PersonFlowNode({ data }: NodeProps<PersonFlowNodeType>) {
  const { person } = data;
  return (
    <div
      className="flex flex-col items-center gap-1"
      style={{ width: NODE_W, height: NODE_H }}
    >
      <Handle
        type="source"
        position={Position.Left}
        id="spouse-l"
        style={{ ...handleStyle, top: AVATAR_CENTER_Y }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="spouse-r"
        style={{ ...handleStyle, top: AVATAR_CENTER_Y }}
      />
      <Handle type="target" position={Position.Top} id="parent" style={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="child" style={handleStyle} />
      <Avatar
        name={person.name}
        photoPath={person.photoPath}
        size="md"
        shape={shapeFor(person.gender)}
      />
      <span className="line-clamp-2 text-center text-xs font-medium leading-tight">
        {person.name}
        {person.attending && (
          <span
            className="ml-1 inline-block size-2 rounded-full bg-sage-500"
            aria-label="Attending"
          />
        )}
      </span>
    </div>
  );
}
