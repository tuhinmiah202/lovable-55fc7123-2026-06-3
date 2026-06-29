import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RatingStat = { avg: number; count: number };

export const useBookRatings = () => {
  return useQuery({
    queryKey: ["book_ratings_all"],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<Record<string, RatingStat>> => {
      const { data, error } = await (supabase as any)
        .from("book_ratings")
        .select("book_id, rating");
      if (error) return {};
      const map: Record<string, { sum: number; count: number }> = {};
      for (const r of (data as any[]) || []) {
        const m = map[r.book_id] || { sum: 0, count: 0 };
        m.sum += Number(r.rating) || 0;
        m.count += 1;
        map[r.book_id] = m;
      }
      const out: Record<string, RatingStat> = {};
      for (const [k, v] of Object.entries(map)) {
        out[k] = { avg: v.count ? v.sum / v.count : 0, count: v.count };
      }
      return out;
    },
  });
};

export const useBookRating = (bookId: string | undefined) => {
  const { data } = useBookRatings();
  if (!bookId || !data || !data[bookId]) return { avg: 0, count: 0 };
  return data[bookId];
};
