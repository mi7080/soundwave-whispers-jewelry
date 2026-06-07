import { createRoot } from "react-dom/client";
import posthog from "posthog-js";
import App from "./App.tsx";
import "./index.css";

posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_KEY, {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  capture_pageview: false,
  capture_pageleave: true,
});

createRoot(document.getElementById("root")!).render(<App />);
