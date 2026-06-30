import { Link } from "react-router-dom";
import { ArrowLeft, HelpCircle, BookOpen, ShoppingCart, PlayCircle, MessageCircle } from "lucide-react";
import { NEXBOI_FACEBOOK_URL } from "@/lib/contact";

const Help = () => {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> হোমে ফিরে যান
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <HelpCircle className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">সাহায্য কেন্দ্র</h1>
          <p className="text-sm text-muted-foreground">
            Nexboi ব্যবহারে কোনো সমস্যা? নিচে দেখুন।
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 mb-8">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-start gap-3">
            <BookOpen className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-bold">কীভাবে বই পড়বেন?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                হোম পেজে যেকোনো বই বেছে নিন। বইয়ের প্রথম পর্ব সম্পূর্ণ ফ্রি, যেকেউ পড়তে
                পারবেন। পরবর্তী পর্ব পড়তে বইটি কিনুন অথবা এড দেখে আনলক করুন।
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-start gap-3">
            <ShoppingCart className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-bold">কীভাবে বই কিনবেন?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                বইয়ের পাতা থেকে "বই কিনুন" বাটনে ক্লিক করুন। বিকাশ / নগদ থেকে নির্দেশনা
                অনুযায়ী টাকা পাঠান। কোনো রেফারেন্স লাগবে না — শুধু সঠিক নম্বর ও পরিমাণ
                দিয়ে সেন্ড মানি করলেই বই স্বয়ংক্রিয়ভাবে আনলক হবে।
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-start gap-3">
            <PlayCircle className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-bold">এড দেখে পর্ব আনলক</h3>
              <p className="text-sm text-muted-foreground mt-1">
                পেইড বইয়ের প্রতিটি পর্ব এড দেখে আনলক করতে পারবেন। লগইন প্রয়োজন।
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
        <MessageCircle className="h-10 w-10 text-primary mx-auto mb-3" />
        <h2 className="text-lg font-bold mb-2">আরও সাহায্য দরকার?</h2>
        <p className="text-sm text-muted-foreground mb-4">
          সরাসরি আমাদের সাথে ফেসবুকে যোগাযোগ করুন।
        </p>
        <a
          href={NEXBOI_FACEBOOK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[hsl(214,89%,52%)] px-6 py-3 text-sm font-bold text-white hover:opacity-90 transition-all"
        >
          📘 ফেসবুকে যোগাযোগ করুন
        </a>
      </div>
    </div>
  );
};

export default Help;
