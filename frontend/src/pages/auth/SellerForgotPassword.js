import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { requestPasswordReset, verifyForgotPasswordOTP, resetPassword } from '../../services/sellerService';

const SellerForgotPassword = () => {
  // Step 1: Email/Phone input
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [usePhone, setUsePhone] = useState(false);
  
  // Step 2: OTP verification
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  
  // Step 3: Password reset
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI State
  const [step, setStep] = useState(1); // 1: Request OTP, 2: Verify OTP, 3: Reset Password, 4: Success
  const [isLoading, setIsLoading] = useState(false);

  // Component initialization logging
  useEffect(() => {
    const logPrefix = '🔶 [SELLER-FORGOT-PASSWORD-INIT]';
    console.log(`${logPrefix} ========================================`);
    console.log(`${logPrefix} SellerForgotPassword Component Initialized`);
    console.log(`${logPrefix} Initial State:`, {
      step,
      usePhone,
      email: email || 'N/A',
      phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 6)}****` : 'N/A',
      otpLength: otp?.length || 0,
      hasResetToken: !!resetToken,
      maskedPhone: maskedPhone || 'N/A',
      timestamp: new Date().toISOString()
    });
    console.log(`${logPrefix} ========================================`);
    
    return () => {
      console.log(`${logPrefix} Component Unmounting`);
    };
  }, []);

  // Step change logging
  useEffect(() => {
    const logPrefix = '🔄 [SELLER-FORGOT-PASSWORD-STEP-CHANGE]';
    const stepNames = {
      1: 'Request OTP',
      2: 'Verify OTP',
      3: 'Reset Password',
      4: 'Success'
    };
    console.log(`${logPrefix} Step changed to: ${step}`, {
      currentStep: step,
      stepName: stepNames[step] || 'Unknown',
      timestamp: new Date().toISOString()
    });
  }, [step]);
  
  // 🎯 STEP 1: Request OTP via MSG91 (uses LOGIN_TEMPLATE_ID)
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    
    const logPrefix = '🟨 [SELLER-FORGOT-PASSWORD-STEP1]';
    console.log(`${logPrefix} ========================================`);
    console.log(`${logPrefix} STEP 1: Request Password Reset OTP`);
    console.log(`${logPrefix} Input Data:`, {
      usePhone,
      email: email ? email.trim() : 'NOT_PROVIDED',
      phoneNumber: phoneNumber ? `${phoneNumber.trim().substring(0, 6)}****${phoneNumber.trim().slice(-2)}` : 'NOT_PROVIDED',
      timestamp: new Date().toISOString()
    });
    console.log(`${logPrefix} ========================================`);
    
    // Validation checks
    if (!usePhone && !email.trim()) {
      console.error(`${logPrefix} ❌ VALIDATION: Email missing`);
      toast.error('Please enter your email address');
      return;
    }
    
    if (usePhone && !phoneNumber.trim()) {
      console.error(`${logPrefix} ❌ VALIDATION: Phone number missing`);
      toast.error('Please enter your phone number');
      return;
    }
    
    console.log(`${logPrefix} ✅ Validation passed - Proceeding with OTP request`);
    
    setIsLoading(true);
    
    try {
      console.log(`${logPrefix} 📤 Calling requestPasswordReset service...`);
      
      const response = await requestPasswordReset(email?.trim() || undefined, phoneNumber?.trim() || undefined);
      
      console.log(`${logPrefix} 📥 Service Response:`, {
        success: response.success,
        message: response.message,
        maskedPhone: response.data?.phoneNumber
      });
      
      if (response.success) {
        console.log(`${logPrefix} ✅ SUCCESS: OTP sent successfully`);
        setMaskedPhone(response.data?.phoneNumber || '');
        setStep(2); // Move to OTP verification step
        toast.success(response.message || 'OTP sent to your registered phone number');
      } else {
        console.error(`${logPrefix} ❌ FAILED: OTP request failed`);
        toast.error(response.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error(`${logPrefix} ❌ EXCEPTION: Error during OTP request`, error);
      toast.error(error.message || error.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
      console.log(`${logPrefix} ========================================`);
    }
  };

  // 🎯 STEP 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    const logPrefix = '🟧 [SELLER-FORGOT-PASSWORD-STEP2]';
    console.log(`${logPrefix} ========================================`);
    console.log(`${logPrefix} STEP 2: Verify Password Reset OTP`);
    console.log(`${logPrefix} Input Data:`, {
      email: email || 'NOT_PROVIDED',
      phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 6)}****` : 'NOT_PROVIDED',
      otpLength: otp?.length || 0,
      otpValue: otp?.substring(0, 2) + '****'
    });
    console.log(`${logPrefix} ========================================`);
    
    if (!otp || otp.length !== 6) {
      console.error(`${logPrefix} ❌ VALIDATION: Invalid OTP`);
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log(`${logPrefix} 📤 Calling verifyForgotPasswordOTP service...`);
      
      const response = await verifyForgotPasswordOTP(email || undefined, phoneNumber || undefined, otp);
      
      console.log(`${logPrefix} 📥 Service Response:`, {
        success: response.success,
        hasResetToken: !!response.data?.resetToken,
        tokenLength: response.data?.resetToken?.length
      });
      
      if (response.success && response.data?.resetToken) {
        console.log(`${logPrefix} ✅ SUCCESS: OTP verified, reset token received`);
        setResetToken(response.data.resetToken);
        setStep(3); // Move to password reset step
        toast.success('OTP verified successfully! Now set your new password.');
      } else {
        console.error(`${logPrefix} ❌ FAILED: OTP verification failed`);
        toast.error(response.message || 'Invalid OTP');
      }
    } catch (error) {
      console.error(`${logPrefix} ❌ EXCEPTION: Error during OTP verification`, error);
      toast.error(error.response?.data?.message || error.message || 'Invalid or expired OTP');
    } finally {
      setIsLoading(false);
      console.log(`${logPrefix} ========================================`);
    }
  };

  // 🎯 STEP 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    const logPrefix = '🟥 [SELLER-FORGOT-PASSWORD-STEP3]';
    console.log(`${logPrefix} ========================================`);
    console.log(`${logPrefix} STEP 3: Reset Password`);
    
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (!resetToken) {
      toast.error('Reset token missing. Please start over.');
      setStep(1);
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log(`${logPrefix} 📤 Calling resetPassword service...`);
      
      const response = await resetPassword(resetToken, newPassword);
      
      console.log(`${logPrefix} 📥 Service Response:`, {
        success: response.success,
        message: response.message
      });
      
      if (response.success) {
        console.log(`${logPrefix} ✅ SUCCESS: Password reset completed`);
        setStep(4); // Move to success step
        toast.success('Password reset successfully!');
      } else {
        console.error(`${logPrefix} ❌ FAILED: Password reset failed`);
        toast.error(response.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error(`${logPrefix} ❌ EXCEPTION: Error during password reset`, error);
      toast.error(error.response?.data?.message || error.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
      console.log(`${logPrefix} ========================================`);
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
      boxSizing: 'border-box'
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
      marginBottom: '15px'
    },
    buttonSecondary: {
      width: '100%',
      padding: '16px',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      color: '#ffffff',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      marginBottom: '15px'
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
    },
    toggleContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '15px',
      marginBottom: '20px',
      color: 'rgba(255, 255, 255, 0.9)',
      fontSize: '14px'
    },
    toggleButton: {
      background: 'transparent',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      color: 'rgba(255, 255, 255, 0.9)',
      padding: '8px 16px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'all 0.3s ease'
    },
    toggleButtonActive: {
      background: 'rgba(255, 255, 255, 0.2)',
      borderColor: 'rgba(255, 255, 255, 0.5)',
      fontWeight: '600'
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
        `}
      </style>
      
      <div style={styles.card}>
        <div style={styles.logoContainer}>
          <img src="https://zammernow.com/assets/logo.svg" alt="Zammer Logo" style={styles.logo} />
        </div>
        
        {step === 4 ? (
          // Step 4: Success
          <div style={styles.successContainer}>
            <h2 style={styles.title}>Password Reset Complete!</h2>
            <p style={styles.subtitle}>Your password has been reset successfully.</p>
            <Link 
              to="/seller/login" 
              style={styles.successButton}
            >
              Sign In
            </Link>
          </div>
        ) : step === 1 ? (
          // Step 1: Request OTP
          <>
            <h2 style={styles.title}>Reset Your Password</h2>
            <p style={styles.subtitle}>Enter your email or phone number to receive an OTP</p>
            
            <div style={styles.toggleContainer}>
              <button
                type="button"
                onClick={() => setUsePhone(false)}
                style={{
                  ...styles.toggleButton,
                  ...(!usePhone ? styles.toggleButtonActive : {})
                }}
              >
                Use Email
              </button>
              <button
                type="button"
                onClick={() => setUsePhone(true)}
                style={{
                  ...styles.toggleButton,
                  ...(usePhone ? styles.toggleButtonActive : {})
                }}
              >
                Use Phone
              </button>
            </div>
            
            <form onSubmit={handleRequestOTP} style={styles.form}>
              {!usePhone ? (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                  style={styles.inputField}
                  className="auth-input"
                  required
                />
              ) : (
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  placeholder="Phone Number (10-12 digits)"
                  style={styles.inputField}
                  className="auth-input"
                  required
                />
              )}
              
              <button 
                type="submit"
                disabled={isLoading} 
                style={{
                  ...styles.button,
                  ...(isLoading ? styles.buttonDisabled : {})
                }}
                className="auth-button"
              >
                {isLoading && <span style={styles.spinner}></span>}
                {isLoading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          </>
        ) : step === 2 ? (
          // Step 2: Verify OTP
          <>
            <h2 style={styles.title}>Verify OTP</h2>
            <p style={styles.subtitle}>
              Enter the 6-digit OTP sent to {maskedPhone || phoneNumber || email}
            </p>
            
            <form onSubmit={handleVerifyOTP} style={styles.form}>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit OTP"
                style={styles.inputField}
                className="auth-input"
                maxLength={6}
                required
                autoFocus
              />
              
              <button 
                type="submit"
                disabled={isLoading || !otp || otp.length !== 6} 
                style={{
                  ...styles.button,
                  ...(isLoading || !otp || otp.length !== 6 ? styles.buttonDisabled : {})
                }}
                className="auth-button"
              >
                {isLoading && <span style={styles.spinner}></span>}
                {isLoading ? 'Verifying...' : 'Verify OTP'}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setOtp('');
                }}
                disabled={isLoading}
                style={{
                  ...styles.buttonSecondary,
                  ...(isLoading ? styles.buttonDisabled : {})
                }}
              >
                Back
              </button>
            </form>
          </>
        ) : step === 3 ? (
          // Step 3: Reset Password
          <>
            <h2 style={styles.title}>Set New Password</h2>
            <p style={styles.subtitle}>Enter your new password</p>
            
            <form onSubmit={handleResetPassword} style={styles.form}>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New Password (min 6 characters)"
                style={styles.inputField}
                className="auth-input"
                minLength={6}
                required
                autoFocus
              />
              
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm New Password"
                style={styles.inputField}
                className="auth-input"
                minLength={6}
                required
              />
              
              <button 
                type="submit"
                disabled={isLoading || !newPassword || newPassword !== confirmPassword} 
                style={{
                  ...styles.button,
                  ...(isLoading || !newPassword || newPassword !== confirmPassword ? styles.buttonDisabled : {})
                }}
                className="auth-button"
              >
                {isLoading && <span style={styles.spinner}></span>}
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setStep(2);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                disabled={isLoading}
                style={{
                  ...styles.buttonSecondary,
                  ...(isLoading ? styles.buttonDisabled : {})
                }}
              >
                Back
              </button>
            </form>
          </>
        ) : null}
        
        {step !== 4 && (
          <p style={styles.linkText}>
            Remembered your password?{' '}
            <Link to="/seller/login" style={styles.link}>
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default SellerForgotPassword;
