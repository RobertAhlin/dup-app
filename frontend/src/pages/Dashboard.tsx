import { useEffect, useState } from "react";
import axios from "../api/axios"; // <-- använd din instans
import { useNavigate } from "react-router-dom";
import MainCard from "../components/MainCard";
import "./Dashboard.css";

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get("/api/auth/me", {
          withCredentials: true,
        });
        setUser(res.data.user);
      } catch (err: any) {
        console.error("❌ Not authenticated:", err);
        setError("Not authenticated. Redirecting...");
        setTimeout(() => navigate("/login"), 2000);
      }
    };

    fetchProfile();
  }, []);

  if (!user) return <p style={{ color: "red" }}>{error || "Loading..."}</p>;

  return (
    <div className="dashboard-container">
      <MainCard name={user.name} email={user.email} role={user.role} />
    </div>
  );
};

export default Dashboard;
