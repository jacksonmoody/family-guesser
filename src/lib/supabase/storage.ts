const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export const PHOTOS_BUCKET = "photos";

export function publicPhotoUrl(photoPath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${PHOTOS_BUCKET}/${photoPath}`;
}
