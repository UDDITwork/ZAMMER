import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import axios from "axios";

const SellerForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);

  const checkEmail = async () => {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    setIsLoading(true);
    try {
      const response = await api.post('/sellers/check-email', { email });
      if (response.data.success) {
        setEmailVerified(true);
        toast.success('Email verified. Please enter your new password.');
      } else {
        toast.error('Email not found');
      }
    } catch (error) {
      toast.error('Email not found or server error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetPassword = async () => {
    if (!password || password.length < 6 || password !== confirmPassword) {
      toast.error('Password must be at least 6 characters and match confirmation.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await api.post('/sellers/reset-password-direct', { email, password });
      if (response.data.success) {
        setResetComplete(true);
        toast.success('Password reset successful!');
      } else {
        toast.error('Failed to reset password');
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    },
    card: {
      background: 'rgba(255, 255, 255, 0.25)',
      backdropFilter: 'blur(20px)',
      borderRadius: '20px',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      padding: '40px',
      width: '100%',
      maxWidth: '480px',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
      transition: 'all 0.3s ease'
    },
    logoContainer: {
      textAlign: 'center',
      marginBottom: '30px'
    },
    logo: {
      height: '60px',
      filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))'
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#ffffff',
      textAlign: 'center',
      marginBottom: '12px',
      textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
    },
    subtitle: {
      fontSize: '16px',
      color: 'rgba(255, 255, 255, 0.9)',
      textAlign: 'center',
      marginBottom: '30px',
      lineHeight: '1.6'
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    },
    inputField: {
      width: '100%',
      padding: '16px 20px',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      background: 'rgba(255, 255, 255, 0.2)',
      backdropFilter: 'blur(10px)',
      fontSize: '16px',
      color: '#ffffff',
      outline: 'none',
      transition: 'all 0.3s ease',
      '::placeholder': {
        color: 'rgba(255, 255, 255, 0.7)'
      }
    },
    button: {
      width: '100%',
      padding: '16px',
      borderRadius: '12px',
      border: 'none',
      background: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)',
      color: '#ffffff',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 8px 25px rgba(255, 107, 107, 0.3)',
      opacity: isLoading ? 0.7 : 1
    },
    buttonDisabled: {
      opacity: 0.6,
      cursor: 'not-allowed'
    },
    link: {
      color: 'rgba(255, 255, 255, 0.9)',
      textDecoration: 'none',
      fontWeight: '500',
      transition: 'all 0.3s ease'
    },
    linkText: {
      textAlign: 'center',
      marginTop: '24px',
      fontSize: '14px',
      color: 'rgba(255, 255, 255, 0.8)'
    },
    successContainer: {
      textAlign: 'center',
      padding: '20px'
    },
    successButton: {
      marginTop: '20px',
      display: 'inline-block',
      padding: '12px 30px',
      borderRadius: '12px',
      background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
      color: '#ffffff',
      textDecoration: 'none',
      fontWeight: '600',
      transition: 'all 0.3s ease',
      boxShadow: '0 8px 25px rgba(72, 187, 120, 0.3)'
    },
    spinner: {
      width: '20px',
      height: '20px',
      border: '2px solid rgba(255, 255, 255, 0.3)',
      borderTop: '2px solid #ffffff',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      display: 'inline-block',
      marginRight: '8px'
    }
  };

  const inputHoverStyle = {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 25px rgba(255, 255, 255, 0.15)',
    borderColor: 'rgba(255, 255, 255, 0.5)'
  };

  const buttonHoverStyle = {
    transform: 'translateY(-2px)',
    boxShadow: '0 12px 35px rgba(255, 107, 107, 0.4)'
  };

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .auth-input:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.5);
          }
          
          .auth-input:focus {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(255, 255, 255, 0.2);
            border-color: rgba(255, 255, 255, 0.6);
          }
          
          .auth-input::placeholder {
            color: rgba(255, 255, 255, 0.7);
          }
          
          .auth-button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 12px 35px rgba(255, 107, 107, 0.4);
          }
          
          .auth-button:active:not(:disabled) {
            transform: translateY(0);
          }
          
          .auth-link:hover {
            color: #ffffff;
            text-shadow: 0 0 8px rgba(255, 255, 255, 0.6);
          }
          
          .success-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 35px rgba(72, 187, 120, 0.4);
          }
          
          @media (max-width: 768px) {
            .auth-card {
              padding: 30px 20px !important;
              margin: 10px;
            }
            
            .auth-title {
              font-size: 24px !important;
            }
            
            .auth-subtitle {
              font-size: 14px !important;
            }
          }
        `}
      </style>
      
      <div style={styles.card} className="auth-card">
        <div style={styles.logoContainer}>
          <img src="https://zammernow.com/assets/logo.svg" alt="Zammer Logo" style={styles.logo} />
        </div>
        
        {resetComplete ? (
          <div style={styles.successContainer}>
            <h2 style={styles.title} className="auth-title">Password Reset Complete</h2>
            <p style={styles.subtitle} className="auth-subtitle">Your password has been reset successfully.</p>
            <Link 
              to="/seller/login" 
              style={styles.successButton}
              className="success-button"
            >
              Sign In
            </Link>
          </div>
        ) : (
          <>
            <h2 style={styles.title} className="auth-title">Reset Your Password</h2>
            <p style={styles.subtitle} className="auth-subtitle">
              {emailVerified ? 'Enter your new password below.' : 'Enter your email to reset your password.'}
            </p>
            
            <div style={styles.form}>
              {!emailVerified ? (
                <>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address"
                    style={styles.inputField}
                    className="auth-input"
                  />
                  <button 
                    onClick={checkEmail} 
                    disabled={isLoading} 
                    style={{
                      ...styles.button,
                      ...(isLoading ? styles.buttonDisabled : {})
                    }}
                    className="auth-button"
                  >
                    {isLoading && <span style={styles.spinner}></span>}
                    {isLoading ? 'Checking...' : 'Continue'}
                  </button>
                </>
              ) : (
                <>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New Password"
                    style={styles.inputField}
                    className="auth-input"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm New Password"
                    style={styles.inputField}
                    className="auth-input"
                  />
                  <button 
                    onClick={resetPassword} 
                    disabled={isLoading} 
                    style={{
                      ...styles.button,
                      ...(isLoading ? styles.buttonDisabled : {})
                    }}
                    className="auth-button"
                  >
                    {isLoading && <span style={styles.spinner}></span>}
                    {isLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </>
              )}
            </div>
            
            <p style={styles.linkText}>
              Remembered your password?{' '}
              <Link to="/seller/login" style={styles.link} className="auth-link">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default SellerForgotPassword;