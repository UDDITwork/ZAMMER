import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { loginSeller } from '../../services/sellerService';
import { AuthContext } from '../../contexts/AuthContext';

const LoginSchema = Yup.object().shape({
  email: Yup.string().email('Invalid email address').required('Email is required'),
  password: Yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
});

const SellerLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { loginSeller: authLoginSeller } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (values, { setSubmitting }) => {
    setIsLoading(true);
    try {
      const response = await loginSeller(values);
      if (response.success) {
        authLoginSeller(response.data);
        toast.success('Login successful!');
        navigate('/seller/dashboard');
      } else {
        toast.error(response.message || 'Login failed');
      }
    } catch (error) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
      setSubmitting(false);
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
      marginBottom: '8px',
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
    inputGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
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
      boxSizing: 'border-box'
    },
    errorMessage: {
      color: '#ff6b6b',
      fontSize: '14px',
      marginTop: '4px',
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
    },
    forgotLink: {
      textAlign: 'right',
      marginTop: '8px'
    },
    link: {
      color: 'rgba(255, 255, 255, 0.9)',
      textDecoration: 'none',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.3s ease'
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
      marginTop: '10px'
    },
    buttonDisabled: {
      opacity: 0.6,
      cursor: 'not-allowed'
    },
    registerText: {
      textAlign: 'center',
      marginTop: '24px',
      fontSize: '14px',
      color: 'rgba(255, 255, 255, 0.8)'
    },
    registerLink: {
      color: 'rgba(255, 255, 255, 0.9)',
      textDecoration: 'none',
      fontWeight: '600',
      transition: 'all 0.3s ease'
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

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .login-input {
            box-sizing: border-box;
          }
          
          .login-input:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.5);
          }
          
          .login-input:focus {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(255, 255, 255, 0.2);
            border-color: rgba(255, 255, 255, 0.6);
          }
          
          .login-input::placeholder {
            color: rgba(255, 255, 255, 0.7);
          }
          
          .login-button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 12px 35px rgba(255, 107, 107, 0.4);
          }
          
          .login-button:active:not(:disabled) {
            transform: translateY(0);
          }
          
          .auth-link:hover {
            color: #ffffff;
            text-shadow: 0 0 8px rgba(255, 255, 255, 0.6);
          }
          
          .register-link:hover {
            color: #ffffff;
            text-shadow: 0 0 8px rgba(255, 255, 255, 0.6);
          }
          
          @media (max-width: 768px) {
            .login-card {
              padding: 30px 20px !important;
              margin: 10px;
            }
            
            .login-title {
              font-size: 24px !important;
            }
            
            .login-subtitle {
              font-size: 14px !important;
            }
          }
        `}
      </style>
      
      <div style={styles.card} className="login-card">
        <div style={styles.logoContainer}>
          <img src="https://zammernow.com/assets/logo.svg" alt="Zammer Logo" style={styles.logo} />
        </div>
        
        <h2 style={styles.title} className="login-title">Welcome Back Seller!</h2>
        <p style={styles.subtitle} className="login-subtitle">Login to manage your shop</p>

        <Formik
          initialValues={{ email: '', password: '' }}
          validationSchema={LoginSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting }) => (
            <Form style={styles.form}>
              <div style={styles.inputGroup}>
                <Field
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  style={styles.inputField}
                  className="login-input"
                />
                <ErrorMessage name="email" component="div" style={styles.errorMessage} />
              </div>
              
              <div style={styles.inputGroup}>
                <Field
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  style={styles.inputField}
                  className="login-input"
                />
                <ErrorMessage name="password" component="div" style={styles.errorMessage} />
              </div>

              <div style={styles.forgotLink}>
                <Link to="/seller/forgot-password" style={styles.link} className="auth-link">
                  Forgot Password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                style={{
                  ...styles.button,
                  ...((isSubmitting || isLoading) ? styles.buttonDisabled : {})
                }}
                className="login-button"
              >
                {isLoading && <span style={styles.spinner}></span>}
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>

              <div style={styles.registerText}>
                Don't have an account?{' '}
                <Link to="/seller/register" style={styles.registerLink} className="register-link">
                  Register
                </Link>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default SellerLogin;