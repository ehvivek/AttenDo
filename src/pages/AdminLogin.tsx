import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Shield, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import styles from './Auth.module.css';

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Map 'vivek67' to dummy email
    const loginEmail = adminId === 'vivek67' ? 'vivek67@attendo.com' : adminId;

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: password
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
    } else if (data.session) {
      const authUser = data.session.user;
      const isAdmin = authUser.user_metadata?.role === 'admin' || authUser.email?.toLowerCase() === 'vivek67@attendo.com';
      
      if (!isAdmin) {
        await supabase.auth.signOut();
        setError("Access denied: You are not an admin. Please login via Student Login.");
      } else {
        navigate('/dashboard');
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.authCard}>
        <button onClick={() => navigate('/')} className={styles.backButton} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <div className={styles.header}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: 'var(--accent-color)' }}>
            <Shield size={48} />
          </div>
          <h1 className={styles.title}>Admin Portal</h1>
          <p className={styles.subtitle}>Upload syllabus, manage notes, and reschedule classes.</p>
        </div>

        <form onSubmit={handleLogin} className={styles.form}>
          {error && <div style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
          <Input
            label="Admin ID"
            type="text"
            placeholder="Enter your admin ID"
            value={adminId}
            onChange={(e) => setAdminId(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" fullWidth className={styles.submitBtn} disabled={loading}>
            {loading ? 'Logging in...' : 'Login to Admin Portal'}
          </Button>
        </form>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            Not an admin?{' '}
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => navigate('/login')}
            >
              Student Login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
