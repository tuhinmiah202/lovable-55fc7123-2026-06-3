import { BookOpen } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-border bg-card mt-16">
    <div className="container mx-auto px-4 py-10">
      <div className="grid gap-8 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <BookOpen className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">বই ঘর</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            বাংলা ভাষায় সেরা ডিজিটাল বই পড়ার প্ল্যাটফর্ম। হাজারো বই আপনার হাতের মুঠোয়।
          </p>
        </div>
        <div>
          <h4 className="font-semibold mb-3">দ্রুত লিঙ্ক</h4>
          <div className="flex flex-col gap-2">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">হোম</Link>
            <Link to="/books" className="text-sm text-muted-foreground hover:text-foreground transition-colors">বইসমূহ</Link>
            <Link to="/categories" className="text-sm text-muted-foreground hover:text-foreground transition-colors">ক্যাটাগরি</Link>
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-3">যোগাযোগ</h4>
          <p className="text-sm text-muted-foreground">ইমেইল: info@boighor.com</p>
          <p className="text-sm text-muted-foreground mt-1">ফোন: +৮৮০ ১৭০০-০০০০০০</p>
        </div>
      </div>
      <div className="mt-8 border-t border-border pt-6 text-center">
        <p className="text-sm text-muted-foreground">© ২০২৬ বই ঘর। সর্বস্বত্ব সংরক্ষিত।</p>
      </div>
    </div>
  </footer>
);

export default Footer;
