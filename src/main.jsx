import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import ErrorBoundary from "./shared/ErrorBoundary";
import "./styles/globals.css";
import { StoreProvider } from "./context/StoreContext";
import { queryClient } from "./lib/queryClient";
import { initPwaServiceWorker } from "./pwa/registerServiceWorker";

initPwaServiceWorker();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <StoreProvider>
            <App />
          </StoreProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
)