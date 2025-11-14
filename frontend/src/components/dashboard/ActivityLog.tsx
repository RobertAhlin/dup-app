import { useEffect, useState, useCallback } from "react";
import axios from "../../api/axios";
import { io, Socket } from "socket.io-client";

type Activity = {
  type: 'task' | 'hub'
  userName: string
  itemTitle: string
  courseTitle: string
  timestamp: string
}

type Props = {
  limit?: number
}

export default function ActivityLog({ limit = 20 }: Props) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const fetchActivities = useCallback(async () => {
    try {
      const response = await axios.get<{ activities: Activity[] }>(
        `/api/courses/dashboard/activity?limit=${limit}`,
        { withCredentials: true }
      );
      setActivities(response.data.activities);
    } catch (err) {
      console.error('Failed to fetch activity log:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    // Initial fetch
    fetchActivities();

    // Get token from cookie (socketToken is non-httpOnly for Socket.IO)
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return null;
    };

    const token = getCookie('socketToken');
    
    if (!token) {
      console.error('No socketToken found in cookies. Please log in again.');
      setIsConnected(false);
      return;
    }
    
    // Ensure we connect to the backend server, not the Vite dev server
    const backendUrl = 'http://localhost:5000';

    // Initialize Socket.IO connection
    const newSocket = io(backendUrl, {
      auth: { token },
      withCredentials: true
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', () => {
      setIsConnected(false);
    });

    // Listen for new activity updates
    newSocket.on('activity:new', (newActivity: Activity) => {
      setActivities(prev => [newActivity, ...prev].slice(0, limit));
    });

    setSocket(newSocket);

    // Cleanup
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

    if (diffMs < 0) return 'just now';
    if (diffSecs < 10) return 'just now';
    if (diffSecs < 60) return `${diffSecs} seconds ago`;
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-semibold text-slate-800">Recent Activity</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-slate-500">
              {isConnected ? 'Live' : 'Offline'}
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
        <div className="flex flex-col gap-1.5 max-h-96 overflow-y-auto">
          {activities.map((activity, index) => (
            <div 
              key={index} 
              className="flex items-start gap-2 p-2 rounded bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100"
            >
              <div className="shrink-0 mt-0.5">
                {activity.type === 'task' ? (
                  <div className="w-2 h-2 rounded-full bg-blue-500" title="Task" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-green-500" title="Hub" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-700 leading-snug">
                  <span className="font-semibold">{activity.userName}</span> completed a{' '}
                  <span className="font-medium">{activity.type}</span> in{' '}
                  <span className="font-medium">{activity.courseTitle}</span>
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{getRelativeTime(activity.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
