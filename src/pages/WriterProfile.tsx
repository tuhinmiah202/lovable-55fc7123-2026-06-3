import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, BookOpen, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BookCard from "@/components/BookCard";
import { resizedImage, withImageFallback } from "@/lib/imageUrl";

const WriterProfile = () => {
  const { id } = useParams();
  const [writer, setWriter] = useState<any>(null);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      const fetch = async () => {
        setLoading(true);
        const [{ data: profile }, { data: booksData }] = await Promise.all([
          (supabase.from as any)("public_writer_profiles").select("*").eq("id", id).maybeSingle(),
          supabase.from("books").select("*, categories(name)").eq("uploader_id", id).order("created_at", { ascending: false }),
        ]);
        setWriter(profile);
        const visible = (booksData || []).filter((b: any) => !b.blocked);
        setBooks(visible.map((b: any) => ({
          id: b.id, title: b.title, author: b.author, cover_url: b.cover_url,
          price: b.price, category: b.categories?.name || "", category_id: b.category_id,
          description: b.description || "", content: "", featured: b.featured || false,
          is_new: b.is_new || false, pages: b.pages || 0, rating: Number(b.rating) || 4.0,
        })));
        setLoading(false);
      };
      fetch();
    }
  }, [id]);

  if (loading) return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!writer) return <div className="container mx-auto px-4 py-20 text-center"><p className="text-muted-foreground">লেখক পাওয়া যায়নি</p></div>;
  // Blocked writers are hidden from the public — show a generic "not found" page.
  if ((writer as any).writer_blocked) {
    return <div className="container mx-auto px-4 py-20 text-center"><p className="text-muted-foreground">লেখক পাওয়া যায়নি</p></div>;
  }

  const isWriterBlocked = !!(writer as any).writer_blocked;

  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/books" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> ফিরে যান
      </Link>

      <div className="mb-8 flex flex-col items-center gap-4 rounded-2xl bg-card p-8 shadow-card sm:flex-row sm:items-start">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground">
          {writer.avatar_url ? (
            <img
              src={resizedImage(writer.avatar_url, 160)}
              alt=""
              className="h-full w-full rounded-full object-cover"
              loading="lazy"
              decoding="async"
              width={80}
              height={80}
              onError={withImageFallback(writer.avatar_url)}
            />
          ) : (
            <User className="h-8 w-8" />
          )}
        </div>
        <div className="text-center sm:text-left flex-1">
          <h1 className="text-2xl font-bold">{writer.name || "লেখক"}</h1>
          {!isWriterBlocked && (
            <span className="mt-1 inline-block rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">✍️ লেখক</span>
          )}
          {!isWriterBlocked && (
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              {writer.facebook_page && <a href={writer.facebook_page.startsWith("http") ? writer.facebook_page : `https://facebook.com/${writer.facebook_page}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ফেসবুক পেজ</a>}
            </div>
          )}
        </div>
        {!isWriterBlocked && (
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{books.length}</p>
            <p className="text-xs text-muted-foreground">প্রকাশিত বই</p>
          </div>
        )}
      </div>

      {isWriterBlocked ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-semibold text-destructive mb-2">
            আপনার লেখক প্রোফাইল এডমিন কর্তৃক ব্লক করা হয়েছে।
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            সাহায্যের জন্য সাহায্য সেকশন থেকে যোগাযোগ করুন।
          </p>
          <Link to="/help" className="inline-block rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:opacity-90">
            সাহায্য নিন
          </Link>
        </div>
      ) : books.length > 0 ? (
        <div>
          <h2 className="text-xl font-bold mb-4">প্রকাশিত বই</h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 md:gap-4">
            {books.map((book) => <BookCard key={book.id} book={book} />)}
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground py-10 text-center">এখনো কোনো বই প্রকাশিত হয়নি।</p>
      )}
    </div>
  );
};

export default WriterProfile;
