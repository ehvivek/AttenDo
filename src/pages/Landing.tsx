import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { useTheme } from '../context/ThemeContext';
import { ArrowRight, Moon, Sun } from 'lucide-react';
import styles from './Landing.module.css';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={toggleTheme} className={styles.themeToggle} aria-label="Toggle theme">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </header>
      
      <main className={styles.main}>
        <div className={styles.heroImageContainer}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
            <div className={styles.logoWrapper}>
              <img src="/logo.png" alt="AttenDo Logo" className={styles.logo} />
            </div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, fontFamily: 'cursive' }}>AttenDo</h2>
          </div>
        </div>
        
        <h1 className={styles.title}>
          Track your attendance effortlessly.
        </h1>
        

        
        <div className={styles.ctaGroup}>
          <Button onClick={() => navigate('/signup')} size="lg">
            Signup
          </Button>
          <Button onClick={() => navigate('/login')} variant="outline" size="lg">
            Log In <ArrowRight size={18} />
          </Button>
        </div>

        <div style={{ marginTop: '3rem', textAlign: 'center' }}>
          <button 
            type="button" 
            onClick={() => navigate('/admin-login')}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--text-secondary)', 
              fontSize: '0.875rem', 
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: '4px'
            }}
          >
            Admin Login
          </button>
        </div>
      </main>
    </div>
  );
};

export default Landing;
