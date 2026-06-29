import { Link } from "react-router-dom";
import { ShieldX, HelpCircle, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Blocked = () => {
  const { logout } = useAuth();
  return (
    <div className="container mx-auto max-w-md px-4 py-16">
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15">
          <ShieldX className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-2">আপনি ব্লক করা হয়েছে</h1>
        <p className="text-sm text-muted-foreground mb-6">
          এডমিন আপনার অ্যাকাউন্ট ব্লক করেছে। এই মুহূর্তে আপনি অ্যাপ ব্যবহার করতে পারবেন না।
          সাহায্যের জন্য নিচের বাটনে ক্লিক করুন।
        </p>
        <div className="flex flex-col gap-3">
          <Link
            to="/help"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:opacity-90"
          >
            <HelpCircle className="h-4 w-4" /> সাহায্য নিন
          </Link>
          <button
            onClick={logout}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-6 py-3 text-sm font-medium hover:bg-muted"
          >
            <LogOut className="h-4 w-4" /> লগআউট
          </button>
        </div>
      </div>
    </div>
  );
};

export default Blocked;
