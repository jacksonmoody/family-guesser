import { type ComponentProps } from "react";

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`rounded-2xl border border-cream-200 bg-cream-100 p-4 shadow-sm ${className}`}
      {...props}
    />
  );
}
