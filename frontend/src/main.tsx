import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AlertProvider } from "./contexts/AlertContext";
import App from "./App";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AlertProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </AlertProvider>
    </BrowserRouter>
  </React.StrictMode>
);
