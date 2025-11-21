// frontend/src/pages/Login.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axios";
import { useAlert } from "../contexts/useAlert";
import FloatingInput from "../components/FloatingInput";
import "./Login.css";
import { isAxiosError } from "axios";

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
    } catch (err: unknown) {
      // Clear success state and set error state
      setSuccess(false);
      let message = "Login failed";
      if (isAxiosError(err)) {
        const resp = err.response;
        if (resp && resp.data && typeof resp.data === 'object' && 'error' in resp.data) {
          const e = (resp.data as { error?: string }).error;
          if (e) message = e;
        }
      }
      setError(message);

      // Show error alert using the global alert system
      showAlert("error", message);

      console.error("❌ Login error:", err);
    }
  };

  return (
    <div>
      <div
        className={`spinner-ring ${error ? "error" : ""} ${
          success ? "success" : ""
        } absolute left-1/2! top-1/2! -translate-x-1/2 -translate-y-[55%] w-[260px]! h-[260px]! pointer-events-none`}
      >
        {Array.from({ length: 36 }, (_, i) => (
          <div
            className="bar"
            style={{ ['--i']: i } as React.CSSProperties & Record<'--i', number>}
            key={i}
          ></div>
        ))}
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        <FloatingInput
          id="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <FloatingInput
          id="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Log In</button>
      </form>
    </div>
  );
}
