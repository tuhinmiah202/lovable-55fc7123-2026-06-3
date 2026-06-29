import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { useCategories } from "@/hooks/useBooks";

const Categories = () => {
  const { data: categories = [], isLoading } = useCategories();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">ক্যাটাগরি</h1>
      <p className="text-muted-foreground mb-8">আপনার পছন্দের ক্যাটাগরি থেকে বই খুঁজুন</p>

      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">লোড হচ্ছে...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/books?category=${encodeURIComponent(cat.name)}`}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-1"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{cat.name}</h3>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Categories;
