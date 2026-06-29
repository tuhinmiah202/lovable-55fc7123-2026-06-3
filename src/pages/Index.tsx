import { ArrowRight, BookOpen, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import BookCard from "@/components/BookCard";
import LazyBookGrid from "@/components/LazyBookGrid";
import HeroSection from "@/components/HeroSection";
import { useBooks, useCategories } from "@/hooks/useBooks";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { data: books = [], isLoading } = useBooks();
  const { data: categories = [] } = useCategories();
  const [query, setQuery] = useState("");
  const [writers, setWriters] = useState<any[]>([]);

  const term = query.trim();
  const isSearching = term.length > 0;

  useEffect(() => {
    if (!isSearching) { setWriters([]); return; }
    const t = setTimeout(async () => {
      const { data } = await (supabase.from as any)("public_writer_profiles")
        .select("id, name, avatar_url")
        .ilike("name", `%${term}%`)
        .limit(12);
      setWriters(data || []);
    }, 200);
    return () => clearTimeout(t);
  }, [term, isSearching]);

  const featured = books.filter((b) => b.featured).slice(0, 12);
  const newBooks = books.filter((b) => b.is_new).slice(0, 12);
  const freeBooks = books.filter((b) => b.price === 0).slice(0, 12);

  const matchedBooks = isSearching
    ? books.filter((b) => b.title.toLowerCase().includes(term.toLowerCase()) || b.author.toLowerCase().includes(term.toLowerCase()))
    : [];

  return (
    <div className="min-h-screen">
      <HeroSection query={query} onQueryChange={setQuery} />

      {isSearching ? (
        <section className="container mx-auto px-4 py-5 md:py-8">
          <h2 className="mb-3 text-base font-bold md:text-xl">
            "{term}" এর জন্য ফলাফল
          </h2>

          {writers.length > 0 && (
            <div className="mb-6">
              <p className="mb-2 text-sm font-semibold text-muted-foreground">লেখক ({writers.length})</p>
              <div className="flex flex-wrap gap-2">
                {writers.map((w) => (
                  <Link key={w.id} to={`/writer/${w.id}`}
                    className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 hover:bg-muted transition-colors">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
                      {w.avatar_url ? <img src={w.avatar_url} alt="" className="h-full w-full object-cover" /> : <User className="h-4 w-4 text-primary" />}
                    </div>
                    <span className="text-sm font-medium">{w.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {matchedBooks.length > 0 ? (
            <>
              <p className="mb-2 text-sm font-semibold text-muted-foreground">বই ({matchedBooks.length})</p>
              <LazyBookGrid books={matchedBooks} batchSize={6} className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 md:gap-4" />
            </>
          ) : writers.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">কিছু পাওয়া যায়নি</p>
          ) : null}
        </section>
      ) : (
        <>
          {/* Categories - Horizontal Scroll */}
          <section className="container mx-auto px-4 pt-4 pb-2 md:pt-6">
            <h2 className="mb-2 text-base font-bold md:text-xl">ক্যাটাগরি</h2>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/books?category=${encodeURIComponent(cat.name)}`}
                  className="group flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5"
                >
                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium whitespace-nowrap group-hover:text-primary transition-colors">{cat.name}</span>
                </Link>
              ))}
            </div>
          </section>

          {isLoading ? (
            <div className="py-20 text-center text-muted-foreground">বই লোড হচ্ছে...</div>
          ) : books.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">এখনো কোনো বই যোগ করা হয়নি।</div>
          ) : (
            <>
              {featured.length > 0 && (
                <section className="container mx-auto px-4 py-5 md:py-10">
                  <div className="mb-3 flex items-center justify-between md:mb-5">
                    <h2 className="text-base font-bold md:text-2xl">নির্বাচিত বই</h2>
                    <Link to="/books" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline md:text-sm">
                      সব দেখুন <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <LazyBookGrid books={featured} batchSize={6} className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 md:gap-4" />
                </section>
              )}

              {newBooks.length > 0 && (
                <section className="container mx-auto px-4 py-5 md:py-10">
                  <div className="mb-3 flex items-center justify-between md:mb-5">
                    <h2 className="text-base font-bold md:text-2xl">নতুন আসা বই</h2>
                    <Link to="/books" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline md:text-sm">
                      সব দেখুন <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <LazyBookGrid books={newBooks} batchSize={6} className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 md:gap-4" />
                </section>
              )}

              {freeBooks.length > 0 && (
                <section className="bg-warm py-5 md:py-10">
                  <div className="container mx-auto px-4">
                    <div className="mb-3 flex items-center justify-between md:mb-5">
                      <h2 className="text-base font-bold md:text-2xl">ফ্রি বই</h2>
                      <Link to="/books?filter=free" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline md:text-sm">
                        সব দেখুন <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                    <LazyBookGrid books={freeBooks} batchSize={6} className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 md:gap-4" />
                  </div>
                </section>
              )}

              {featured.length === 0 && newBooks.length === 0 && freeBooks.length === 0 && (
                <section className="container mx-auto px-4 py-5 md:py-10">
                  <h2 className="text-base font-bold mb-3 md:text-2xl">সকল বই</h2>
                  <LazyBookGrid books={books} batchSize={6} className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 md:gap-4" />
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Index;
