// src/components/dashboard/AdminStats.tsx

import { useEffect, useState } from "react";
import axios from "../../api/axios";
import LoadingSpinner from "../LoadingSpinner";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";

type AdminStatsData = {
  totalTeachers: number;
  totalStudents: number;
  totalUsers: number;
  totalCourses: number;
  loginsLastWeek: number;
  activeSessions: number;
};

export default function AdminStats() {
  const [stats, setStats] = useState<AdminStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<"connected" | "disconnected">(
    "disconnected"
  );
  const [socketStatus, setSocketStatus] = useState<"active" | "inactive">(
    "inactive"
  );

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get<{ stats: AdminStatsData }>(
          "/api/courses/dashboard/admin-stats",
          { withCredentials: true }
        );
        setStats(response.data.stats);
        setDbStatus("connected"); // If we got data, DB is connected
      } catch (err) {
        console.error("Failed to fetch admin stats:", err);
        setDbStatus("disconnected");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Check socket status via sessionStorage (inte via cookies)
    const socketToken = sessionStorage.getItem("socketToken");
    setSocketStatus(socketToken ? "active" : "inactive");
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="small" text="Loading stats..." />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <p>Failed to load statistics</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Platform Statistics Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 mb-1">
          Platform Statistics
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
            <p className="text-sm text-slate-600 mb-1">Total Users</p>
            <div className="flex items-center gap-4">
              <p className="text-3xl font-bold text-blue-700">
                {stats.totalUsers}
              </p>
              <div className="text-xs text-slate-600 space-y-0.5">
                <div>{stats.totalTeachers} teachers</div>
                <div>{stats.totalStudents} students</div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-2">
            <p className="text-sm text-slate-600 mb-1">Total Courses</p>
            <p className="text-3xl font-bold text-green-700">
              {stats.totalCourses}
            </p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-2">
            <p className="text-sm text-slate-600 mb-1">
              Active users last week
            </p>
            <p className="text-3xl font-bold text-purple-700">
              {stats.loginsLastWeek}
            </p>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-2">
            <p className="text-sm text-slate-600 mb-1">Active Sessions</p>
            <div className="flex items-end gap-4">
              <p className="text-3xl font-bold text-orange-700">
                {stats.activeSessions}
              </p>
              <p className="text-xs text-slate-500">Last 30 minutes</p>
            </div>
          </div>
        </div>
      </div>

      {/* System Status Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">
          System Status
        </h3>
        <div className="space-y-1">
          <div className="flex items-center justify-between p-1 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              {dbStatus === "connected" ? (
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              ) : (
                <XCircleIcon className="w-6 h-6 text-red-600" />
              )}
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Database
                </p>
                <p className="text-xs text-slate-500">PostgreSQL connection</p>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                dbStatus === "connected"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {dbStatus === "connected" ? "Connected" : "Disconnected"}
            </span>
          </div>

          <div className="flex items-center justify-between p-1 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              {socketStatus === "active" ? (
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              ) : (
                <XCircleIcon className="w-6 h-6 text-red-600" />
              )}
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Socket.IO
                </p>
                <p className="text-xs text-slate-500">Real-time communication</p>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                socketStatus === "active"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {socketStatus === "active" ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="flex items-center justify-between p-1 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  API Server
                </p>
                <p className="text-xs text-slate-500">Express backend</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
              Running
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
