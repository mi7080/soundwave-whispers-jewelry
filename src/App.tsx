import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Index from "./pages/Index.tsx";
import FAQ from "./pages/FAQ.tsx";
import AdminAuth from "./pages/AdminAuth.tsx";
import AdminOrders from "./pages/AdminOrders.tsx";
import AdminControl from "./pages/AdminControl.tsx";
import PolicyPage from "./pages/PolicyPage.tsx";
import SoulPage from "./pages/SoulPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import Unsubscribe from "./pages/Unsubscribe.tsx";
import Checkout from "./pages/Checkout.tsx";
import ThankYou from "./pages/ThankYou.tsx";
import SoulPageErrorBoundary from "@/components/SoulPageErrorBoundary";
import ScrollToTop from "@/components/ScrollToTop";

function PostHogPageView() {
  const location = useLocation();
  useEffect(() => {
    posthog.capture("$pageview");
  }, [location]);
  return null;
}

const queryClient = new QueryClient();
const PREVIEW_SOUL_TEST_ID = "ee8ee56f-d7d6-4f06-8cca-14ecab243a4e";

function LegacySoulPageRedirect() {
  const { id } = useParams<{ id: string }>();
  const normalizedId = (id || "").trim();
  const redirectId = import.meta.env.DEV && normalizedId === ":id"
    ? PREVIEW_SOUL_TEST_ID
    : normalizedId;

  return <Navigate replace to={redirectId ? `/soul/${redirectId}` : "/"} />;
}

function AppContent() {
  return (
    <BrowserRouter>
      <PostHogPageView />
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/admin" element={<Navigate replace to="/admin/control" />} />
        <Route path="/admin/orders" element={<AdminOrders />} />
        <Route path="/admin/control" element={<AdminControl />} />
        <Route path="/admin-login" element={<AdminAuth />} />
        {/* Legacy admin routes - consolidated into the single command center */}
        <Route path="/admin-dashboard" element={<Navigate replace to="/admin/control" />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/thank-you" element={<ThankYou />} />
        <Route path="/soul/:id" element={<SoulPageErrorBoundary><SoulPage /></SoulPageErrorBoundary>} />
        <Route path="/soul-page/:id" element={<LegacySoulPageRedirect />} />
        <Route path="/unsubscribe" element={<Unsubscribe />} />
        <Route path="/:slug" element={<PolicyPage />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => (
  <PostHogProvider client={posthog}>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </PostHogProvider>
);

export default App;
