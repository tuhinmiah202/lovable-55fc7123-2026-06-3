// Image URL helpers for bandwidth-efficient delivery.
//
// Supabase Storage supports on-the-fly resizing via the render endpoint:
//   /storage/v1/object/public/<bucket>/<path>
//   -> /storage/v1/render/image/public/<bucket>/<path>?width=W&quality=Q&resize=contain
//
// If image transformations are disabled on the project, the transformed URL
// will fail; consumers should fall back to the original via `onError`.

const STORAGE_PUBLIC = "/storage/v1/object/public/";
const STORAGE_RENDER = "/storage/v1/render/image/public/";

export function isSupabasePublicStorage(url: string | null | undefined): boolean {
  return !!url && url.includes(STORAGE_PUBLIC);
}

/**
 * Resize a Supabase public-storage image URL. Non-storage URLs pass through.
 */
export function resizedImage(
  url: string | null | undefined,
  width: number,
  quality = 70,
): string {
  if (!url) return "";
  if (!isSupabasePublicStorage(url)) return url;
  const swapped = url.replace(STORAGE_PUBLIC, STORAGE_RENDER);
  const sep = swapped.includes("?") ? "&" : "?";
  return `${swapped}${sep}width=${width}&quality=${quality}&resize=contain`;
}

/**
 * Build a srcset string at multiple widths for responsive `sizes`.
 */
export function resizedSrcSet(
  url: string | null | undefined,
  widths: number[],
  quality = 70,
): string | undefined {
  if (!url || !isSupabasePublicStorage(url)) return undefined;
  return widths.map((w) => `${resizedImage(url, w, quality)} ${w}w`).join(", ");
}

/**
 * onError handler that falls back to the original URL if a transformed
 * variant fails (e.g. image transformations disabled on the project).
 */
export function withImageFallback(originalUrl: string | null | undefined) {
  return (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (originalUrl && img.src !== originalUrl) {
      img.srcset = "";
      img.src = originalUrl;
    }
  };
}
