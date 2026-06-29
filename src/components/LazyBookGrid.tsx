import { useEffect, useRef, useState } from "react";
import BookCard from "@/components/BookCard";
import type { Book } from "@/data/books";

interface Props {
  books: Book[];
  batchSize?: number;
  className?: string;
}

// Progressive loader: shows first batch, then loads more on intersection
const LazyBookGrid = ({ books, batchSize = 5, className }: Props) => {
  const [visible, setVisible] = useState(batchSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisible(batchSize);
  }, [books, batchSize]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    if (visible >= books.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible((v) => Math.min(v + batchSize, books.length));
        }
      },
      { rootMargin: "200px" }
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [visible, books.length, batchSize]);

  return (
    <>
      <div
        className={
          className ||
          "grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 md:gap-4"
        }
      >
        {books.slice(0, visible).map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
      {visible < books.length && (
        <div ref={sentinelRef} className="py-6 text-center text-xs text-muted-foreground">
          আরও বই লোড হচ্ছে...
        </div>
      )}
    </>
  );
};

export default LazyBookGrid;
