import React, { forwardRef, useState } from 'react';
import styles from './Input.module.css';
import { Eye, EyeOff, Calendar } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, fullWidth = true, className, type, onClick, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const isDate = type === 'date';
    const hasIcon = isPassword || isDate;
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    const handleDateClick = (e: React.MouseEvent<HTMLInputElement>) => {
      if (isDate && e.currentTarget.showPicker) {
        try {
          e.currentTarget.showPicker();
        } catch (err) {
          // ignore
        }
      }
      if (onClick) onClick(e);
    };

    return (
      <div className={`${styles.wrapper} ${fullWidth ? styles.fullWidth : ''}`}>
        {label && <label className={styles.label}>{label}</label>}
        <div className={styles.inputContainer}>
          <input
            ref={ref}
            type={inputType}
            onClick={handleDateClick}
            className={`${styles.input} ${error ? styles.inputError : ''} ${hasIcon ? styles.inputWithIcon : ''} ${isDate ? styles.dateInput : ''} ${className || ''}`}
            {...props}
          />
          {isPassword && (
            <button 
              type="button"
              className={styles.eyeBtn} 
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
          {isDate && (
            <div className={styles.calendarIconWrapper} style={{ pointerEvents: 'none' }}>
              <Calendar size={18} />
            </div>
          )}
        </div>
        {error && <span className={styles.errorText}>{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
