import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";


interface Props {
  bookId: string;
  userId: string | null;
  canRate: boolean; // user has purchased
}

const BookRatingSection = ({ bookId, userId, canRate }: Props) => {
  const queryClient = useQueryClient();
  const [avg, setAvg] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [hover, setHover] = useState(0);
  const [submitting, setSubmitting] = useState(false);


  const load = async () => {
    const { data } = await (supabase as any)
      .from("book_ratings")
      .select("rating, user_id")
      .eq("book_id", bookId);
    const rows = data || [];
    setCount(rows.length);
    setAvg(rows.length ? rows.reduce((s: number, r: any) => s + r.rating, 0) / rows.length : null);
    if (userId) {
      const mine = rows.find((r: any) => r.user_id === userId);
      setMyRating(mine ? mine.rating : null);
    }
  };

  useEffect(() => {
    if (bookId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, userId]);

  const submit = async (value: number) => {
    if (!userId || !canRate || submitting || myRating) return;
    setSubmitting(true);
    const { error } = await (supabase as any)
      .from("book_ratings")
      .insert({ book_id: bookId, user_id: userId, rating: value });
    setSubmitting(false);
    if (error) {
      toast.error("রেটিং দিতে পারিনি। আপনি কি বইটি কিনেছেন?");
      return;
    }
    toast.success("ধন্যবাদ! আপনার রেটিং সংরক্ষিত হয়েছে।");
    load();
    queryClient.invalidateQueries({ queryKey: ["book_ratings_all"] });
  };


  // After user has rated, hide the entire section
  if (myRating) return null;

  // Only show the rating box to purchasers who haven't rated yet
  if (!canRate) return null;

  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-sm font-semibold">পাঠকদের রেটিং</p>
        <div className="flex items-center gap-1 text-sm">
          <Star className={`h-4 w-4 ${count > 0 ? "fill-accent text-accent" : "text-muted-foreground"}`} />
          <span className="font-bold">{count > 0 && avg ? avg.toFixed(1) : "0"}</span>
          <span className="text-xs text-muted-foreground">({count} জন)</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-1">আপনার রেটিং দিন (একবার):</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={submitting}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => submit(n)}
            className="p-0.5 disabled:opacity-50"
            aria-label={`${n} স্টার`}
          >
            <Star
              className={`h-6 w-6 ${
                n <= (hover || 0) ? "fill-accent text-accent" : "text-muted-foreground"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default BookRatingSection;
