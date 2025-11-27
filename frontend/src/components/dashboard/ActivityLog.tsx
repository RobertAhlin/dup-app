// frontend/src/components/dashboard/ActivityLog.tsx

import { useEffect, useState, useCallback } from "react";
import axios from "../../api/axios";
import { io } from "socket.io-client";
import { CheckIcon, PlusCircleIcon } from "@heroicons/react/24/solid";

type Activity = {
  type: "task" | "hub" | "task_created" | "hub_created";
  userName: string;
  itemTitle: string;
  courseTitle: string;
  timestamp: string;
};

type Props = {
  limit?: number;
};

export default function ActivityLog({ limit = 20 }: Props) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const fetchActivities = useCallback(async () => {
    try {
      const response = await axios.get<{ activities: Activity[] }>(
        `/api/courses/dashboard/activity?limit=${limit}`,
        { withCredentials: true }
      );
      setActivities(response.data.activities);
    } catch (err) {
      console.error("Failed to fetch activity log:", err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    // Initial fetch
    fetchActivities();

    // Hämta token från sessionStorage (satt i Login.tsx)
    const token = sessionStorage.getItem("socketToken");

    if (!token) {
      console.warn(
        "⚠️ No socketToken found in sessionStorage – Socket.IO live activity disabled."
      );
      setIsConnected(false);
      return;
    }

    const backendUrl =
      import.meta.env.VITE_API_URL || "http://localhost:5000";

    const newSocket = io(backendUrl, {
      auth: { token },
      withCredentials: true,
      transports: ["websocket"], // valfritt men ofta stabilare i prod
    });

    newSocket.on("connect", () => {
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    newSocket.on("connect_error", () => {
      setIsConnected(false);
    });

    newSocket.on("activity:new", (newActivity: Activity) => {
      setActivities((prev) => [newActivity, ...prev].slice(0, limit));
    });

    return () => {
      newSocket.close();
    };
  }, [fetchActivities, limit]);

  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);

    const diffMs = now.getTime() - then.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) return "just now";
    if (diffSecs < 10) return "just now";
    if (diffSecs < 60) return `${diffSecs} seconds ago`;
    if (diffMins === 1) return "1 minute ago";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours === 1) return "1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return "1 day ago";
    return `${diffDays} days ago`;
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-semibold text-slate-800">
          Recent Activity
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-xs text-slate-500">
              {isConnected ? "Live" : "Offline"}
            </span>
          </div>
          <button
            onClick={() => fetchActivities()}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-slate-500">Loading activity...</p>
      ) : activities.length === 0 ? (
        <p className="text-xs text-slate-500">No recent activity</p>
      ) : (
        <div className="flex flex-col gap-1 max-h-full overflow-y-auto">
          {activities.map((activity, index) => {
            const isCreation =
              activity.type === "task_created" ||
              activity.type === "hub_created";
            const itemType = activity.type.replace("_created", "");

            return (
              <div
                key={index}
                className="flex items-start gap-2 p-0.5 rounded bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 leading-snug">
                    <span className="font-semibold">{activity.userName}</span>{" "}
                    {isCreation ? (
                      <>
                        <PlusCircleIcon className="w-3 h-3 text-blue-600 inline" />{" "}
                        created a{" "}
                        <span className="font-medium">{itemType}</span> in{" "}
                      </>
                    ) : (
                      <>
                        <CheckIcon className="w-3 h-3 text-green-600 inline" /> a{" "}
                        <span className="font-medium">{itemType}</span> in{" "}
                      </>
                    )}
                    <span className="font-medium">
                      {activity.courseTitle}
                    </span>{" "}
                    <span className="text-xs text-slate-500 mt-0.5">
                      {getRelativeTime(activity.timestamp)}
                    </span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
