import { useEffect, useState, useCallback } from "react";
import axios from "../../api/axios";
import { io } from "socket.io-client";
import AlertBanner from "../AlertBanner";

type Activity = {
  type: 'task' | 'hub' | 'task_created' | 'hub_created'
  userName: string
  itemTitle: string
  courseTitle: string
  timestamp: string
}

export default function StudentActivityNotification() {
  const [latestActivity, setLatestActivity] = useState<Activity | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get<{ activities: Activity[] }>(
        `/api/courses/dashboard/activity?limit=25`,
        { withCredentials: true }
      );
      setActivities(response.data.activities);
    } catch (err) {
      console.error('Failed to fetch activity log:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
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
      return;
    }
    
    // Connect to backend server for Socket.IO
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    // Initialize Socket.IO connection
    const newSocket = io(backendUrl, {
      auth: { token },
      withCredentials: true
    });

    // Listen for new activity updates
    newSocket.on('activity:new', (newActivity: Activity) => {
      setLatestActivity(newActivity);
      // Auto-hide after 10 seconds
      setTimeout(() => {
        setLatestActivity(null);
      }, 10000);
    });

    // Cleanup
    return () => {
      newSocket.close();
    };
  }, []);

  const handleViewActivities = () => {
    setLatestActivity(null);
    fetchActivities();
    setShowModal(true);
  };

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

  const getActivityMessage = (activity: Activity) => {
    let actionText = '';
    let itemType = '';
    
    switch (activity.type) {
      case 'task':
        actionText = 'completed';
        itemType = 'task';
        break;
      case 'hub':
        actionText = 'completed';
        itemType = 'hub';
        break;
      case 'task_created':
        actionText = 'added a new';
        itemType = 'task';
        break;
      case 'hub_created':
        actionText = 'added a new';
        itemType = 'hub';
        break;
    }

    return (
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">
          <span className="font-semibold text-xs">{activity.userName}</span> {actionText}{' '}
          <span className="font-medium">{itemType}</span> in{' '}
          <span className="font-medium">{activity.courseTitle}</span>{' - '}
          <span className="text-xs opacity-75">{getRelativeTime(activity.timestamp)}</span>
        </p>
      </div>
    );
  };

  return (
    <>
      {/* Activity Notification Banner using AlertBanner component */}
      {latestActivity && (
        <AlertBanner
          type="info"
          message={getActivityMessage(latestActivity)}
          onClose={() => setLatestActivity(null)}
          autoHide={true}
          duration={10000}
          width="40%"
          actionButton={{
            label: "View activities",
            onClick: handleViewActivities
          }}
        />
      )}

      {/* Activities Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-2 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Recent Activity</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <p className="text-sm text-slate-500 text-center py-8">Loading activities...</p>
              ) : activities.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No recent activity</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {activities.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-1 p-1 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 leading-snug">
                          <span className="font-semibold">{activity.userName}</span>{' '}
                          {activity.type === 'task' || activity.type === 'hub' ? 'completed' : 'added a new'}{' '}
                          <span className="font-medium">
                            {activity.type === 'task_created' ? 'task' : activity.type === 'hub_created' ? 'hub' : activity.type}
                          </span>{' '}
                          in <span className="font-medium">{activity.courseTitle}</span>{' '}
                          <span className="text-xs text-slate-500 mt-1">{getRelativeTime(activity.timestamp)}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200">
              <button
                onClick={() => setShowModal(false)}
                className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-400 text-slate-700 font-medium rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
