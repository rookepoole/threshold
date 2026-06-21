import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { APP_VERSION } from "./lib/releases";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  let refreshing = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js?v=${APP_VERSION}`;

    navigator.serviceWorker
      .register(swUrl, { scope: import.meta.env.BASE_URL })
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener("statechange", () => {
            if (
              installingWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              installingWorker.postMessage({ type: "THRESHOLD_SKIP_WAITING" });
            }
          });
        });

        registration.update();
      })
      .catch(() => {});
  });
}
