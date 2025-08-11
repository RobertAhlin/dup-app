// frontend/src/pages/Dashboard.tsx

import { useEffect, useState } from 'react';
import axios from '../api/axios';

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get('/api/auth/me');
        setUser(res.data.user);
      } catch (err: any) {
        console.error('❌ Not authenticated:', err);
        setError('Not authenticated. Redirecting...');
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      }
    };

    fetchProfile();
  }, []);

  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!user) return <p>Loading profile...</p>;

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <p>Email: {user.email}</p>
      <p>Role: {user.role}</p>
      <p>Account created: {new Date(user.created_at).toLocaleString()}</p>
    </div>
  );
};

export default Dashboard;
