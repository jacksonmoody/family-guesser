import { type ComponentProps } from "react";

type Variant = "primary" | "secondary" | "accent" | "ghost";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-brown-700 text-cream-50 active:scale-95 disabled:bg-brown-300 hover:bg-brown-900",
  secondary:
    "bg-cream-200 text-brown-900 border border-cream-300 active:scale-95 hover:bg-cream-300",
  accent:
    "bg-terracotta-500 text-cream-50 active:scale-95 disabled:opacity-60 hover:bg-terracotta-600",
  ghost: "bg-transparent text-brown-700 hover:bg-cream-100",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 py-2.5 font-medium transition-all disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
