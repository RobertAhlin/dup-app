import "./MainCard.css";

interface MainCardProps {
  name: string;
  email: string;
  role: string;
}

export default function MainCard({ name, email, role }: MainCardProps) {
  return (
    <div className="main-card">
      <div className="card-header">
        <div className="user-info-section">
          <h1 className="user-title">Welcome, {name}</h1> <span className="info-label">Role:</span><span className="info-value role-badge">{role}</span>
          <div className="user-info">
            <div className="info-item">
              <span className="info-label">Email:</span>
              <span className="info-value">{email}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="card-content">
        {/* This area is left empty as requested */}
      </div>
    </div>
  );
}
