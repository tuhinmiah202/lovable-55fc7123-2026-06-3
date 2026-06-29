import { Component, ReactNode } from "react";

interface Props { children: ReactNode }
interface State { hasError: boolean }

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error("[ErrorBoundary]", error, info);
  }

  handleReload = () => {
    try { sessionStorage.removeItem("__chunk_reload_at"); } catch {}
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <h1 className="mb-2 text-2xl font-bold">কিছু একটা ভুল হয়েছে</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          পেজটি লোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।
        </p>
        <button
          onClick={this.handleReload}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
        >
          আবার লোড করুন
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
