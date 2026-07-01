import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register Service Worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // Add version to SW registration to bypass old cached SW
    navigator.serviceWorker
      .register("/sw.js?v=20260629")
      .then((reg) => {
        console.log("SW registered:", reg);
        // Force update check
        reg.update();
      })
      .catch((err) => {
        console.error("SW registration failed:", err);
      });
  });
}
