import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App.jsx";

import DataGate from "./api/DataGate.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <DataGate>
          <App />
        </DataGate>
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
);
