import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { supabase } from '../lib/supabase';
import { ArrowLeft } from 'lucide-react';
import styles from './Auth.module.css';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    rollNumber: '',
    email: '',
    fullName: '',
    password: '',
    batch: 'D1' as 'D1' | 'D2' | 'D3'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.rollNumber) newErrors.rollNumber = 'Roll number is required';
    if (!formData.email) newErrors.email = 'College email is required';
    if (!formData.fullName) newErrors.fullName = 'Full name is required';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            roll_number: formData.rollNumber,
            full_name: formData.fullName,
            batch: formData.batch
          }
        }
      });

      setLoading(false);

      if (error) {
        if (error.message.toLowerCase().includes('already')) {
          setErrors({ email: 'An account with this email already exists' });
        } else {
          setErrors({ submit: error.message });
        }
      } else if (data?.user?.identities && data.user.identities.length === 0) {
        // Supabase returns an empty identities array if the user already exists
        setErrors({ email: 'An account with this email already exists' });
      } else {
        // Automatically logged in after sign up (usually)
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
          <img src="/logo.png" alt="AttenDo Logo" className={styles.logo} onClick={() => navigate('/')} />
          <h1 className={styles.title}>Create an account</h1>
          <p className={styles.subtitle}>Enter your details to get started.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {errors.submit && <div style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>{errors.submit}</div>}
          <Input
            label="Roll Number"
            name="rollNumber"
            value={formData.rollNumber}
            onChange={handleChange}
            error={errors.rollNumber}
            placeholder="e.g. 25CE3061"
          />
          <Input
            label="College Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            placeholder="e.g. 25ce3061@rgipt.ac.in"
          />
          <Input
            label="Full Name"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            error={errors.fullName}
            placeholder="e.g. Vivek Kumar"
          />
          <Select
            label="Tutorial / Lab Batch"
            name="batch"
            value={formData.batch}
            onChange={handleChange}
            options={[
              { value: 'D', label: 'Combined Batch D' },
              { value: 'D1', label: 'Batch D1' },
              { value: 'D2', label: 'Batch D2' },
              { value: 'D3', label: 'Batch D3' },
            ]}
          />
          <div style={{ marginBottom: '1.5rem' }}>
            <Input
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              placeholder="••••••••"
            />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              ⚠️ The password is not resettable. Remember this, it's only for logging in.
            </p>
          </div>
          
          <Button type="submit" fullWidth className={styles.submitBtn} disabled={loading}>
            {loading ? 'Signing Up...' : 'Sign Up'}
          </Button>
        </form>

        <div className={styles.footer}>
          <p>Already have an account? <Link to="/login" className={styles.link}>Log in</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
