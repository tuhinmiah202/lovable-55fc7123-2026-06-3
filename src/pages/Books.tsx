import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Grid3X3, List, BookOpen, User } from "lucide-react";
import BookCard from "@/components/BookCard";
import LazyBookGrid from "@/components/LazyBookGrid";
import { BookCardSkeletonGrid } from "@/components/BookCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { useBooks, useCategories } from "@/hooks/useBooks";
import { supabase } from "@/integrations/supabase/client";
import { resizedImage, withImageFallback } from "@/lib/imageUrl";
import BlurImage from "@/components/BlurImage";

const Books = () => {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") || "";
  const initialFilter = searchParams.get("filter") || "";
  const initialQ = searchParams.get("q") || "";

  const [search, setSearch] = useState(initialQ);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [priceFilter, setPriceFilter] = useState<string>(initialFilter === "free" ? "free" : "all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: books = [], isLoading } = useBooks();
  const { data: categories = [] } = useCategories();
  const [writers, setWriters] = useState<any[]>([]);

  useEffect(() => {
    const q = search.trim();
    if (!q) { setWriters([]); return; }
    const t = setTimeout(async () => {
      const { data } = await (supabase.from as any)("public_writer_profiles")
        .select("id, name, avatar_url")
        .ilike("name", `%${q}%`)
        .limit(8);
      setWriters(data || []);
    }, 200);
    return () => clearTimeout(t);
  }, [search]);

  const filtered = books.filter((b) => {
    const matchSearch = !search || b.title.includes(search) || b.author.includes(search);
    const matchCategory = !selectedCategory || b.category === selectedCategory;
    const matchPrice =
      priceFilter === "all" ||
      (priceFilter === "free" && b.price === 0) ||
      (priceFilter === "paid" && b.price > 0);
    return matchSearch && matchCategory && matchPrice;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">বইসমূহ</h1>
      <p className="text-muted-foreground mb-8">আমাদের সম্পূর্ণ বই সংগ্রহ ব্রাউজ করুন</p>

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="বই বা লেখকের নাম খুঁজুন..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-input bg-background py-3 pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          >
            <option value="">সব ক্যাটাগরি</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
          <select
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value)}
            className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          >
            <option value="all">সকল মূল্য</option>
            <option value="free">ফ্রি</option>
            <option value="paid">পেইড</option>
          </select>
          <div className="flex rounded-xl border border-input">
            <button onClick={() => setViewMode("grid")} className={`p-2.5 ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground"} rounded-l-xl transition-colors`}>
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode("list")} className={`p-2.5 ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"} rounded-r-xl transition-colors`}>
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div>
          <Skeleton className="mb-4 h-4 w-32" />
          <BookCardSkeletonGrid count={10} />
        </div>
      ) : (
        <>
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
          <p className="mb-4 text-sm text-muted-foreground">{filtered.length}টি বই পাওয়া গেছে</p>
          {viewMode === "grid" ? (
            <LazyBookGrid books={filtered} batchSize={5} />
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map((book) => (
                <a key={book.id} href={`/book/${book.id}`} className="flex gap-4 rounded-xl border border-border bg-card p-4 shadow-card transition-all hover:shadow-card-hover">
                  <div className="h-24 w-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                    {book.cover_url ? (
                      <BlurImage
                        src={resizedImage(book.cover_url, 160)}
                        alt={book.title}
                        originalSrc={book.cover_url}
                        loading="lazy"
                        decoding="async"
                        width={64}
                        height={96}
                        onError={withImageFallback(book.cover_url)}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center"><BookOpen className="h-6 w-6 text-muted-foreground" /></div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-center">
                    <h3 className="font-bold text-card-foreground">{book.title}</h3>
                    <p className="text-sm text-muted-foreground">{book.author}</p>
                    <p className="text-sm text-muted-foreground">{book.category}</p>
                  </div>
                  <div className="flex items-center">
                    <span className="font-bold text-primary">{book.price === 0 ? "ফ্রি" : `৳${book.price}`}</span>
                  </div>
                </a>
              ))}
            </div>
          )}
          {filtered.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-lg text-muted-foreground">কোনো বই পাওয়া যায়নি</p>
              <p className="text-sm text-muted-foreground mt-1">অন্যভাবে খুঁজে দেখুন</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Books;
