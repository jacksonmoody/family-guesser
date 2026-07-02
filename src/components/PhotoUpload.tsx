"use client";

import { useEffect, useRef, useState } from "react";

export function PhotoUpload({
  name,
  label,
}: {
  name: string;
  label: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-brown-300 bg-cream-50 p-3">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Selected profile"
          className="size-12 shrink-0 rounded-full object-cover ring-2 ring-brown-500/60"
        />
      ) : (
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-cream-200 text-xl">
          📷
        </span>
      )}
      <span className="text-sm text-brown-700">{label}</span>
      <input
        type="file"
        name={name}
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (previewRef.current) URL.revokeObjectURL(previewRef.current);
          const url = file ? URL.createObjectURL(file) : null;
          previewRef.current = url;
          setPreview(url);
        }}
      />
    </label>
  );
}
