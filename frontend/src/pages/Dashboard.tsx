import { useEffect, useState } from 'react';
import axios from '../api/axios'; // <-- använd din instans
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get('/api/auth/me', {
          withCredentials: true,
        });
        setUser(res.data.user);
      } catch (err: any) {
        console.error('❌ Not authenticated:', err);
        setError('Not authenticated. Redirecting...');
        setTimeout(() => navigate('/login'), 2000);
      }
    };

    fetchProfile();
  }, []);

  if (!user) return <p style={{ color: 'red' }}>{error || 'Loading...'}</p>;

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <p>Email: {user.email}</p>
      <p>Role: {user.role}</p>
    </div>
  );
};

export default Dashboard;
