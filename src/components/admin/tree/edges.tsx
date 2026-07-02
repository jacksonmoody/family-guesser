"use client";

import { type CSSProperties } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react";

function edgeStyle(selected: boolean | undefined): CSSProperties {
  return {
    stroke: selected ? "var(--color-brown-500)" : "var(--color-brown-300)",
    strokeWidth: 2,
    strokeLinecap: "round",
  };
}

function DeleteEdgeButton({ id, x, y }: { id: string; x: number; y: number }) {
  const { deleteElements } = useReactFlow();
  return (
    <EdgeLabelRenderer>
      <button
        type="button"
        onClick={() => deleteElements({ edges: [{ id }] })}
        className="nodrag nopan pointer-events-auto absolute z-10 flex size-6 items-center justify-center rounded-full border border-cream-300 bg-cream-50 text-xs font-semibold text-terracotta-600 shadow-sm"
        style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
        aria-label="Remove link"
      >
        ✕
      </button>
    </EdgeLabelRenderer>
  );
}

/** Horizontal marriage line between two side handles. */
export function SpouseEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
}: EdgeProps) {
  const path = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  return (
    <>
      <BaseEdge id={id} path={path} style={edgeStyle(selected)} />
      {selected && (
        <DeleteEdgeButton
          id={id}
          x={(sourceX + targetX) / 2}
          y={(sourceY + targetY) / 2}
        />
      )}
    </>
  );
}

/**
 * Orthogonal drop from a parent's bottom handle to a child's top handle.
 * The horizontal run sits at the same bus height the tree layout uses
 * (childY − 24), so sibling edges merge into one visual bar.
 */
export function ParentEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
}: EdgeProps) {
  const busY = targetY - 24;
  const path = `M ${sourceX} ${sourceY} V ${busY} H ${targetX} V ${targetY}`;
  return (
    <>
      <BaseEdge id={id} path={path} style={edgeStyle(selected)} />
      {selected && (
        <DeleteEdgeButton id={id} x={(sourceX + targetX) / 2} y={busY} />
      )}
    </>
  );
}
