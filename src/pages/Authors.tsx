import { Link } from "react-router-dom";
import { User } from "lucide-react";
import { useBooks } from "@/hooks/useBooks";

const Authors = () => {
  const { data: books = [], isLoading } = useBooks();

  const authorMap = new Map<string, number>();
  books.forEach((b) => {
    authorMap.set(b.author, (authorMap.get(b.author) || 0) + 1);
  });
  const authors = Array.from(authorMap.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">লেখকসমূহ</h1>
      <p className="text-muted-foreground mb-8">প্রিয় লেখকের বই খুঁজুন</p>

      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">লোড হচ্ছে...</div>
      ) : authors.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">এখনো কোনো লেখক নেই।</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {authors.map(([author, count]) => (
            <Link
              key={author}
              to={`/books?category=`}
              className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg shrink-0">
                {author.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold group-hover:text-primary transition-colors">{author}</h3>
                <p className="text-sm text-muted-foreground">{count}টি বই</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Authors;
