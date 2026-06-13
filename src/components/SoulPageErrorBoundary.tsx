import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import posthog from "posthog-js";

interface SoulPageErrorBoundaryProps {
  children: ReactNode;
}

interface SoulPageErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class SoulPageErrorBoundary extends Component<
  SoulPageErrorBoundaryProps,
  SoulPageErrorBoundaryState
> {
  state: SoulPageErrorBoundaryState = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: Error): SoulPageErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || "This memory page could not be displayed.",
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[SoulPageErrorBoundary] Soul Page crashed:", error, errorInfo);
    posthog.captureException(error, {
      boundary: "SoulPageErrorBoundary",
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground font-sans">
            Animus
          </p>
          <h1 className="text-3xl font-serif text-foreground">Memory unavailable</h1>
          <p className="text-muted-foreground font-sans">
            {this.state.message || "This memory page could not be loaded."}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => window.location.reload()}
              className="inline-block border border-border text-foreground px-6 py-3 text-[10px] tracking-[0.3em] uppercase hover:bg-muted transition-all duration-300"
            >
              Retry loading memory
            </button>
            <Link
              to="/"
              className="inline-block border border-border text-muted-foreground px-6 py-3 text-[10px] tracking-[0.3em] uppercase hover:text-foreground hover:border-foreground/40 transition-all duration-300"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }
}

export default SoulPageErrorBoundary;