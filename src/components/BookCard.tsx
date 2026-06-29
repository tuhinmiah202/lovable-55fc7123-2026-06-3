import { Link } from "react-router-dom";
import { Star, BookOpen } from "lucide-react";
import type { Book } from "@/data/books";
import { useBookRating } from "@/hooks/useBookRatings";
import { resizedImage, resizedSrcSet, withImageFallback } from "@/lib/imageUrl";
import BlurImage from "@/components/BlurImage";

const BookCard = ({ book }: { book: Book }) => {
  const { avg, count } = useBookRating(book.id);
  return (
  <Link
    to={`/book/${book.id}`}
    className="cv-auto group flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5"
  >
    <div className="relative aspect-[3/4] overflow-hidden bg-muted">
      {book.cover_url ? (
        <BlurImage
          src={resizedImage(book.cover_url, 240)}
          srcSet={resizedSrcSet(book.cover_url, [160, 240, 360])}
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 200px"
          alt={book.title}
          originalSrc={book.cover_url}
          className="transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          decoding="async"
          width={240}
          height={320}
          onError={withImageFallback(book.cover_url)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-secondary">
          <BookOpen className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      {book.price === 0 && (
        <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground sm:text-[10px]">
          ফ্রি
        </span>
      )}
      {book.is_new && (
        <span className="absolute right-1 top-1 rounded bg-accent px-1.5 py-0.5 text-[9px] font-semibold text-accent-foreground sm:text-[10px]">
          নতুন
        </span>
      )}
    </div>
    <div className="flex flex-1 flex-col p-2 sm:p-3">
      <h3 className="text-xs font-bold text-card-foreground line-clamp-1 group-hover:text-primary transition-colors sm:text-sm">
        {book.title}
      </h3>
      <p className="mt-0.5 text-[10px] text-muted-foreground line-clamp-1 sm:text-xs">{book.author}</p>
      <div className="mt-auto flex items-center justify-between pt-1.5">
        <div className="flex items-center gap-0.5">
          <Star className={`h-3 w-3 ${count > 0 ? "fill-accent text-accent" : "text-muted-foreground"}`} />
          <span className="text-[10px] font-medium text-foreground sm:text-xs">
            {count > 0 ? avg.toFixed(1) : "0"}
          </span>
          <span className="text-[9px] text-muted-foreground sm:text-[10px]">({count})</span>
        </div>
        <span className="text-[11px] font-bold text-primary sm:text-sm">
          {book.price === 0 ? "ফ্রি" : `৳${book.price}`}
        </span>
      </div>
    </div>
  </Link>
  );
};

export default BookCard;
