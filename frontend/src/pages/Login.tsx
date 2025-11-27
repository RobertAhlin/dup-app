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

    try {
      const response = await axiosInstance.post("/api/auth/login", {
        email,
        password,
      });

      if (import.meta.env.DEV) {
        console.log("✅ Login successful:", response.data);
      }

      // Förväntar oss att backend skickar med { message: '...', socketToken: '...' }
      const { socketToken } = response.data as { socketToken?: string };

      if (socketToken) {
        sessionStorage.setItem("socketToken", socketToken);
      } else {
        console.warn("⚠️ No socketToken in login response – Socket.IO auth will be disabled.");
      }

      setError("");
      setSuccess(true);
      showAlert("success", "Login successful!");

      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);
    } catch (err: unknown) {
      setSuccess(false);
      let message = "Login failed";

      if (isAxiosError(err)) {
        const resp = err.response;
        if (resp && resp.data && typeof resp.data === "object" && "error" in resp.data) {
          const e = (resp.data as { error?: string }).error;
          if (e) message = e;
        }
      }

      setError(message);
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
            style={{ ["--i"]: i } as React.CSSProperties & Record<"--i", number>}
            key={i}
          ></div>
        ))}
      </div>

      <form className="login-form gap-8" onSubmit={handleSubmit}>
        <FloatingInput
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <FloatingInput
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          className="bg-gray-200! px-1! py-0.5! border! border-gray-600! rounded! cursor-pointer"
          type="submit"
        >
          Log In
        </button>
      </form>
    </div>
  );
}
