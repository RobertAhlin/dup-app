// frontend/src/pages/Login.tsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios'; // <-- Axios-instansen
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password,
      });

      const token = response.data.token;

      if (!token) {
        throw new Error('No token received from server');
      }

      localStorage.setItem('token', token);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unexpected error');
      }
    }
  };

  return (
    <div className="container">
      <div className="ring">
        {Array.from({ length: 36 }, (_, i) => (
          <div className="bar" style={{ ['--i' as any]: i }} key={i}></div>
        ))}
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        <label>
          Email:<br />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password:<br />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit">Log In</button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>
    </div>
  );
}
