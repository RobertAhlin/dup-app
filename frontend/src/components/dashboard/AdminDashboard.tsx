import AdminStats from "./AdminStats";
import ActivityLog from "./ActivityLog";

export default function AdminDashboard() {
  return (
    <div>
      <div className="flex justify-between gap-2 w-full min-w-0">
        {/* Main Stats Area */}
        <div className="shrink min-w-0 w-full border rounded-md border-slate-200 p-4 overflow-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          <AdminStats />
        </div>
        
        {/* Activity Log */}
        <div className="w-60 shrink-0 border rounded-md border-slate-200 p-2">
          <ActivityLog limit={10} />
        </div>
      </div>
    </div>
  );
}
