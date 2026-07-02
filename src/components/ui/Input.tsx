import { type ComponentProps } from "react";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return (
    <input
      className={`min-h-11 w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-brown-900 placeholder:text-brown-300 focus:border-brown-500 focus:outline-none focus:ring-2 focus:ring-brown-300/40 ${className}`}
      {...props}
    />
  );
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return (
    <select
      className={`min-h-11 w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-brown-900 focus:border-brown-500 focus:outline-none focus:ring-2 focus:ring-brown-300/40 ${className}`}
      {...props}
    />
  );
}
