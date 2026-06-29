import { supabase } from "@/integrations/supabase/client";

/**
 * Upload a book part file (.txt or .pdf) to Supabase Storage.
 * Files are stored in the public `cover-photos` bucket under
 * `<userId>/parts/<timestamp>.<ext>`. Returns a marker string of the form
 * `file::<publicUrl>` to be saved into `book_parts.content` (or the
 * pending `book_uploads.content`). The Reader detects this prefix and
 * loads the file on demand — keeping the database row tiny.
 */
export async function uploadBookPartFile(
  file: File,
  userId: string,
): Promise<string> {
  const allowed = ["txt", "pdf"];
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!allowed.includes(ext)) {
    throw new Error("শুধুমাত্র .txt বা .pdf ফাইল আপলোড করা যাবে");
  }
  // 20 MB hard cap to stay well within Supabase free tier
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("ফাইল ২০MB এর বেশি হতে পারবে না");
  }
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `${userId}/parts/${Date.now()}-${rand}.${ext}`;
  const { error } = await supabase.storage
    .from("cover-photos")
    .upload(path, file, {
      contentType: ext === "pdf" ? "application/pdf" : "text/plain; charset=utf-8",
      upsert: false,
    });
  if (error) throw error;
  const { data } = supabase.storage.from("cover-photos").getPublicUrl(path);
  return `file::${data.publicUrl}`;
}

export function isPartFileMarker(content: string | null | undefined): boolean {
  return typeof content === "string" && content.startsWith("file::");
}

export function partFileUrl(content: string): string {
  return content.replace(/^file::/, "");
}
