// frontend/src/pages/Login.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axios";
import { useAlert } from "../contexts/AlertContext";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Don't reset states immediately to avoid showing default color
    try {
      const response = await axiosInstance.post("/api/auth/login", {
        email,
        password,
      });

      console.log("✅ Login successful:", response.data);
      // Clear error state and set success state
      setError("");
      setSuccess(true);

      // Show success alert
      showAlert("success", "Login successful!");

      // Wait 1 second before navigating to dashboard
      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);
    } catch (err: any) {
      // Clear success state and set error state
      setSuccess(false);
      setError(err?.response?.data?.error || "Login failed");

      // Show error alert using the global alert system
      showAlert("error", err?.response?.data?.error || "Login failed");

      console.error("❌ Login error:", err);
    }
  };

  return (
    <div className="container">
      <div
        className={`ring ${error ? "error" : ""} ${success ? "success" : ""}`}
      >
        {Array.from({ length: 36 }, (_, i) => (
          <div className="bar" style={{ ["--i" as any]: i }} key={i}></div>
        ))}
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        <label>
          Email:
          <br />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password:
          <br />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit">Log In</button>
      </form>
    </div>
  );
}
