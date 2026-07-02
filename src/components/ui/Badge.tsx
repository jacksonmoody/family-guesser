import { type ComponentProps } from "react";

type Tone = "brown" | "terracotta" | "sage" | "cream";

const toneClasses: Record<Tone, string> = {
  brown: "bg-brown-700 text-cream-50",
  terracotta: "bg-terracotta-500 text-cream-50",
  sage: "bg-sage-500 text-cream-50",
  cream: "bg-cream-200 text-brown-700 border border-cream-300",
};

export function Badge({
  tone = "cream",
  className = "",
  ...props
}: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]} ${className}`}
      {...props}
    />
  );
}
