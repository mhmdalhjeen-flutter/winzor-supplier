import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { onlineManager } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import App from "./App";
import ErrorBoundary from "./shared/ErrorBoundary";
import "./styles/globals.css";
import { StoreProvider } from "./context/StoreContext";
import { queryClient } from "./lib/queryClient";
import { persistOptions } from "./lib/queryPersister";
import OfflinePublishHost from "./components/OfflinePublishHost";
import GlobalToastHost from "./components/GlobalToastHost";
import { initPwaServiceWorker } from "./pwa/registerServiceWorker";

initPwaServiceWorker();

onlineManager.setEventListener((setOnline) => {
  const onOnline = () => setOnline(true);
  const onOffline = () => setOnline(false);
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  setOnline(navigator.onLine);
  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={persistOptions}
        onSuccess={() => {
          queryClient.resumePausedMutations().catch(() => {});
        }}
      >
        <BrowserRouter>
          <StoreProvider>
            <OfflinePublishHost />
            <GlobalToastHost />
            <App />
          </StoreProvider>
        </BrowserRouter>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
)