import { Search, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import heroBanner from "@/assets/hero-banner.jpg";

interface HeroSectionProps {
  query?: string;
  onQueryChange?: (q: string) => void;
}

const HeroSection = ({ query, onQueryChange }: HeroSectionProps) => {
  const navigate = useNavigate();
  const [internal, setInternal] = useState("");
  const q = query !== undefined ? query : internal;
  const setQ = (v: string) => {
    if (onQueryChange) onQueryChange(v);
    else setInternal(v);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onQueryChange) return; // already showing inline results
    navigate(`/books${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
  };

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img src={heroBanner} alt="বই ঘর" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/85 via-foreground/70 to-foreground/40" />
      </div>
      <div className="container relative mx-auto px-4 py-5 md:py-10">
        <div className="max-w-2xl animate-fade-up">
          <h1 className="text-lg font-extrabold leading-tight text-primary-foreground sm:text-xl md:text-3xl">
            আপনার প্রিয় <span className="text-gradient-gold">বইয়ের</span> ডিজিটাল ঠিকানা
          </h1>
          <form onSubmit={submit} className="mt-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="বই বা লেখকের নাম খুঁজুন..."
                className="w-full rounded-lg border-0 bg-background/95 py-2 pl-9 pr-3 text-xs shadow outline-none backdrop-blur-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-accent/50 md:text-sm md:py-2.5"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1 rounded-lg bg-accent px-3 py-2 text-xs font-bold text-accent-foreground hover:opacity-90 md:text-sm md:py-2.5"
            >
              খুঁজুন <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
