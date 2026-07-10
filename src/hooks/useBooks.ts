import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Book, Category } from "@/data/books";
import { cacheGet, cacheSet } from "@/lib/cache";

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    initialData: () => cacheGet<Category[]>("categories") || undefined,
    staleTime: 1000 * 60 * 60,
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");
      if (error) throw error;
      const out = data || [];
      cacheSet("categories", out);
      return out;
    },
  });
};

export const useBooks = () => {
  return useQuery({
    // bumped key invalidates older HTTP-cached responses
    queryKey: ["books", "v4"],
    initialData: () => cacheGet<Book[]>("books_list_v4") || undefined,
    staleTime: 10 * 1000, // 10s — very fresh
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    queryFn: async (): Promise<Book[]> => {
      const { data, error } = await supabase
        .from("books")
        .select("id, title, author, cover_url, price, category_id, category_ids, description, featured, is_new, pages, rating, uploader_id, ads_disabled, blocked, created_at, categories(name)" as any)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const visible = (data || []).filter((b: any) => !b.blocked);
      const mapped = visible.map((b: any) => ({
        id: b.id,
        title: b.title,
        author: b.author,
        cover_url: b.cover_url,
        price: b.price,
        category: b.categories?.name || "",
        category_id: b.category_id,
        category_ids: b.category_ids || [],
        description: b.description || "",
        content: "",
        featured: b.featured || false,
        is_new: b.is_new || false,
        pages: b.pages || 0,
        rating: Number(b.rating) || 4.0,
        uploader_id: b.uploader_id || null,
        ads_disabled: !!b.ads_disabled,
      }));
      // Set a shorter TTL for the home page list (30 mins) to prevent long-term stale mobile views
      cacheSet("books_list_v4", mapped, 1000 * 60 * 30);
      return mapped;
    },
  });
};

export const useBook = (id: string | undefined) => {
  return useQuery({
    queryKey: ["book", "v4", id],
    enabled: !!id,
    initialData: () => (id ? cacheGet<Book>(`book:v4:${id}`) || undefined : undefined),
    staleTime: 30 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<Book | null> => {
      const { data, error } = await supabase
        .from("books")
        .select("*, categories(name)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const out: Book = {
        id: data.id,
        title: data.title,
        author: data.author,
        cover_url: data.cover_url,
        price: data.price,
        category: (data as any).categories?.name || "",
        category_id: data.category_id,
        category_ids: (data as any).category_ids || [],
        description: data.description || "",
        content: data.content || "",
        featured: data.featured || false,
        is_new: data.is_new || false,
        pages: data.pages || 0,
        rating: Number(data.rating) || 4.0,
        uploader_id: data.uploader_id || null,
        ads_disabled: !!(data as any).ads_disabled,
      };
      if (id) cacheSet(`book:v4:${id}`, out, 1000 * 60 * 60); // 1 hour TTL for individual books
      return out;
    },
  });
};
