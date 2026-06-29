import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6">
      <div className="text-center">
        <h1 className="mb-3 text-5xl font-extrabold text-primary">404</h1>
        <p className="mb-6 text-lg text-muted-foreground">
          পেজটি খুঁজে পাওয়া যায়নি
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
          >
            হোম পেজ
          </Link>
          <Link
            to="/books"
            className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-bold hover:bg-muted"
          >
            সব বই
          </Link>
          <Link
            to="/help"
            className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-bold hover:bg-muted"
          >
            সাহায্য
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
