import Image from "next/image";
import { publicPhotoUrl } from "@/lib/supabase/storage";

const sizeClasses = {
  sm: "size-8 text-xs",
  md: "size-12 text-sm",
  lg: "size-20 text-xl",
  xl: "size-28 text-3xl",
} as const;

const sizePx = { sm: 32, md: 48, lg: 80, xl: 112 } as const;

// Diamond keeps the ring (clip-path would cut it off): rotate the frame and
// counter-rotate the contents, over-scaling the photo to cover the corners.
const shapeClasses = {
  circle: "rounded-full",
  square: "rounded-md",
  diamond: "rotate-45 rounded-md",
} as const;

export function Avatar({
  name,
  photoPath,
  size = "md",
  shape = "circle",
  className = "",
}: {
  name: string;
  photoPath: string | null;
  size?: keyof typeof sizeClasses;
  shape?: keyof typeof shapeClasses;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const counterRotate = shape === "diamond" ? "-rotate-45" : "";

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-brown-500 font-display font-semibold text-cream-50 ring-2 ring-brown-500/60 ${shapeClasses[shape]} ${sizeClasses[size]} ${className}`}
    >
      {photoPath ? (
        <Image
          src={publicPhotoUrl(photoPath)}
          alt={name}
          width={sizePx[size]}
          height={sizePx[size]}
          className={`size-full object-cover ${counterRotate} ${shape === "diamond" ? "scale-[1.45]" : ""}`}
        />
      ) : (
        <span className={counterRotate}>{initials}</span>
      )}
    </span>
  );
}
