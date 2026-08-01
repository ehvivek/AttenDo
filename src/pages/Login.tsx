import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { supabase } from '../lib/supabase';
import { ArrowLeft } from 'lucide-react';
import styles from './Auth.module.css';

const Login: React.FC = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      setLoading(false);
      
      if (error) {
        setErrors({ submit: error.message });
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
          <img src="/logovg.png" alt="AttenDo Logo" className={styles.logo} onClick={() => navigate('/')} />
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Log in to manage your attendance.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {errors.submit && <div style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>{errors.submit}</div>}
          
          <Input
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            placeholder="e.g. 25ce3061@rgipt.ac.in"
          />
          <Input
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            placeholder="••••••••"
          />
          
          <Button type="submit" fullWidth className={styles.submitBtn} disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </Button>
        </form>

        <div className={styles.footer}>
          <p>Don't have an account? <Link to="/signup" className={styles.link}>Sign up</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
