import { useEffect, useState } from "react";
import axios from "../api/axios";
import { useNavigate } from "react-router-dom";
import MainCard from "../components/MainCard";
import type { User } from "../types/user";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get<{ user: User }>("/api/auth/me", {
          withCredentials: true,
        });
        setUser(res.data.user);
      } catch (err: unknown) {
        console.error("❌ Not authenticated:", err);
        setError("Not authenticated. Redirecting...");
        setTimeout(() => navigate("/login"), 2000);
      }
    };

    fetchProfile();
  }, [navigate]);

  if (!user) return <p style={{ color: "red" }}>{error || "Loading..."}</p>;

  return (
    <div className="dashboard-container">
      <MainCard name={user.name} email={user.email} role={user.role} />
    </div>
  );
};

export default Dashboard;
