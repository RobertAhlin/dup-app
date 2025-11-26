import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AlertProvider } from "./contexts/AlertContext";
import App from "./App";
import DummyLoadingPage from "./pages/DummyPage";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminManagementPage";
import CourseBuilder from "./pages/CourseBuilder";
import MyCertificatesPage from "./pages/MyCertificatesPage";
import "./main.css";
import './tailwind.css';
import 'reactflow/dist/style.css';

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AlertProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/my-certificates" element={<MyCertificatesPage />} />
          <Route path="/courses/:courseId" element={<CourseBuilder />} />
          <Route path="/dummypage" element={<DummyLoadingPage />} />
        </Routes>
      </AlertProvider>
    </BrowserRouter>
  </React.StrictMode>
);
