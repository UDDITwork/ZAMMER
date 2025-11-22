import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { requestPasswordReset, verifyForgotPasswordOTP, resetPassword } from '../../services/userService';

const UserForgotPassword = () => {
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
    const logPrefix = '🔶 [FORGOT-PASSWORD-INIT]';
    console.log(`${logPrefix} ========================================`);
    console.log(`${logPrefix} UserForgotPassword Component Initialized`);
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
    const logPrefix = '🔄 [FORGOT-PASSWORD-STEP-CHANGE]';
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
  
  // 🎯 STEP 1: Request OTP via MSG91
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    
    const logPrefix = '🟨 [FORGOT-PASSWORD-STEP1]';
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
      console.error(`${logPrefix} ❌ VALIDATION: Email missing`, {
        usePhone,
        emailProvided: !!email?.trim()
      });
      console.log(`${logPrefix} ========================================`);
      toast.error('Please enter your email address');
      return;
    }
    
    if (usePhone && !phoneNumber.trim()) {
      console.error(`${logPrefix} ❌ VALIDATION: Phone number missing`, {
        usePhone,
        phoneNumberProvided: !!phoneNumber?.trim()
      });
      console.log(`${logPrefix} ========================================`);
      toast.error('Please enter your phone number');
      return;
    }
    
    console.log(`${logPrefix} ✅ Validation passed - Proceeding with OTP request`);
    
    setIsLoading(true);
    
    try {
      console.log(`${logPrefix} 📤 Calling requestPasswordReset service...`);
      console.log(`${logPrefix} Parameters:`, {
        email: email?.trim() || undefined,
        phoneNumber: phoneNumber?.trim() ? `${phoneNumber.trim().substring(0, 6)}****` : undefined
      });
      
      const response = await requestPasswordReset(email?.trim() || undefined, phoneNumber?.trim() || undefined);
      
      console.log(`${logPrefix} 📥 Service Response:`, {
        success: response.success,
        message: response.message,
        hasData: !!response.data,
        maskedPhone: response.data?.phoneNumber
      });
      
      if (response.success) {
        console.log(`${logPrefix} ✅ SUCCESS: OTP sent successfully`);
        console.log(`${logPrefix} 🔄 State Update:`, {
          settingMaskedPhone: response.data?.phoneNumber,
          movingToStep: 2
        });
        
        setMaskedPhone(response.data?.phoneNumber || '');
        setStep(2); // Move to OTP verification step
        
        console.log(`${logPrefix} ✅ State Updated - Now on Step 2 (OTP Verification)`);
        console.log(`${logPrefix} ========================================`);
        
        toast.success(response.message || 'OTP sent to your registered phone number');
      } else {
        console.error(`${logPrefix} ❌ FAILED: OTP request failed`, {
          message: response.message
        });
        console.log(`${logPrefix} ========================================`);
        toast.error(response.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error(`${logPrefix} ❌ EXCEPTION: Error during OTP request`, {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      console.error(`${logPrefix} ========================================`);
      toast.error(error.message || error.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
      console.log(`${logPrefix} 🔄 Loading state set to false`);
    }
  };

  // 🎯 STEP 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    const logPrefix = '🟧 [FORGOT-PASSWORD-STEP2]';
    console.log(`${logPrefix} ========================================`);
    console.log(`${logPrefix} STEP 2: Verify Password Reset OTP`);
    console.log(`${logPrefix} Input Data:`, {
      email: email || 'NOT_PROVIDED',
      phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 6)}****${phoneNumber.slice(-2)}` : 'NOT_PROVIDED',
      otpLength: otp?.length || 0,
      otpValue: otp?.substring(0, 2) + '****',
      timestamp: new Date().toISOString()
    });
    console.log(`${logPrefix} ========================================`);
    
    // Validation checks
    if (!otp || otp.length !== 6) {
      console.error(`${logPrefix} ❌ VALIDATION: Invalid OTP`, {
        otpLength: otp?.length || 0,
        otpProvided: !!otp
      });
      console.log(`${logPrefix} ========================================`);
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    
    console.log(`${logPrefix} ✅ Validation passed - Proceeding with OTP verification`);
    
    setIsLoading(true);
    
    try {
      console.log(`${logPrefix} 📤 Calling verifyForgotPasswordOTP service...`);
      console.log(`${logPrefix} Parameters:`, {
        email: email || undefined,
        phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 6)}****` : undefined,
        otp: otp?.substring(0, 2) + '****'
      });
      
      const response = await verifyForgotPasswordOTP(email || undefined, phoneNumber || undefined, otp);
      
      console.log(`${logPrefix} 📥 Service Response:`, {
        success: response.success,
        message: response.message,
        hasData: !!response.data,
        hasResetToken: !!response.data?.resetToken,
        tokenLength: response.data?.resetToken?.length
      });
      
      if (response.success && response.data?.resetToken) {
        console.log(`${logPrefix} ✅ SUCCESS: OTP verified, reset token received`);
        console.log(`${logPrefix} 🔄 State Update:`, {
          settingResetToken: response.data.resetToken ? `${response.data.resetToken.substring(0, 10)}...` : 'N/A',
          movingToStep: 3
        });
        
        setResetToken(response.data.resetToken);
        setStep(3); // Move to password reset step
        
        console.log(`${logPrefix} ✅ State Updated - Now on Step 3 (Reset Password)`);
        console.log(`${logPrefix} ========================================`);
        
        toast.success('OTP verified successfully! Now set your new password.');
      } else {
        console.error(`${logPrefix} ❌ FAILED: OTP verification failed`, {
          message: response.message,
          hasResetToken: !!response.data?.resetToken
        });
        console.log(`${logPrefix} ========================================`);
        toast.error(response.message || 'Invalid OTP');
      }
    } catch (error) {
      console.error(`${logPrefix} ❌ EXCEPTION: Error during OTP verification`, {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      console.error(`${logPrefix} ========================================`);
      toast.error(error.response?.data?.message || error.message || 'Invalid or expired OTP');
    } finally {
      setIsLoading(false);
      console.log(`${logPrefix} 🔄 Loading state set to false`);
    }
  };

  // 🎯 STEP 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    const logPrefix = '🟥 [FORGOT-PASSWORD-STEP3]';
    console.log(`${logPrefix} ========================================`);
    console.log(`${logPrefix} STEP 3: Reset Password`);
    console.log(`${logPrefix} Input Data:`, {
      resetToken: resetToken ? `${resetToken.substring(0, 10)}...${resetToken.slice(-5)}` : 'MISSING',
      newPasswordLength: newPassword?.length || 0,
      confirmPasswordLength: confirmPassword?.length || 0,
      passwordsMatch: newPassword === confirmPassword,
      timestamp: new Date().toISOString()
    });
    console.log(`${logPrefix} ========================================`);
    
    // Validation checks
    if (newPassword !== confirmPassword) {
      console.error(`${logPrefix} ❌ VALIDATION: Passwords do not match`, {
        newPasswordLength: newPassword?.length,
        confirmPasswordLength: confirmPassword?.length
      });
      console.log(`${logPrefix} ========================================`);
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      console.error(`${logPrefix} ❌ VALIDATION: Password too short`, {
        passwordLength: newPassword?.length,
        requiredLength: 6
      });
      console.log(`${logPrefix} ========================================`);
      toast.error('Password must be at least 6 characters long');
      return;
    }
    
    if (!resetToken) {
      console.error(`${logPrefix} ❌ VALIDATION: Reset token missing`, {
        resetTokenExists: !!resetToken
      });
      console.log(`${logPrefix} ========================================`);
      toast.error('Reset token missing. Please start over.');
      return;
    }
    
    console.log(`${logPrefix} ✅ Validation passed - Proceeding with password reset`);
    
    setIsLoading(true);
    
    try {
      console.log(`${logPrefix} 📤 Calling resetPassword service...`);
      console.log(`${logPrefix} Parameters:`, {
        resetToken: resetToken ? `${resetToken.substring(0, 10)}...${resetToken.slice(-5)}` : 'MISSING',
        newPasswordLength: newPassword?.length
      });
      
      const response = await resetPassword(resetToken, newPassword);
      
      console.log(`${logPrefix} 📥 Service Response:`, {
        success: response.success,
        message: response.message,
        hasData: !!response.data,
        userId: response.data?._id,
        userEmail: response.data?.email
      });
      
      if (response.success) {
        console.log(`${logPrefix} ✅ SUCCESS: Password reset completed`);
        console.log(`${logPrefix} 🔄 State Update:`, {
          movingToStep: 4
        });
        
        setStep(4); // Show success screen
        
        console.log(`${logPrefix} ✅ State Updated - Now on Step 4 (Success)`);
        console.log(`${logPrefix} ========================================`);
        
        toast.success('Password reset successfully!');
      } else {
        console.error(`${logPrefix} ❌ FAILED: Password reset failed`, {
          message: response.message
        });
        console.log(`${logPrefix} ========================================`);
        toast.error(response.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error(`${logPrefix} ❌ EXCEPTION: Error during password reset`, {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        validationErrors: error.response?.data?.errors
      });
      console.error(`${logPrefix} ========================================`);
      toast.error(error.response?.data?.message || error.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
      console.log(`${logPrefix} 🔄 Loading state set to false`);
    }
  };

  // Resend OTP handler
  const handleResendOTP = () => {
    setOtp('');
    setStep(1);
    toast.info('Please request a new OTP');
  };
  
  // 🎯 SUCCESS STATE
  if (step === 4) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-4 text-gray-900">Password Reset Complete!</h1>
          <p className="text-gray-600 mb-6">Your password has been reset successfully.</p>
          <Link 
            to="/user/login" 
            className="w-full bg-orange-500 text-white py-2 px-4 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 inline-block"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-900">
          {step === 1 && 'Reset Password'}
          {step === 2 && 'Verify OTP'}
          {step === 3 && 'Set New Password'}
        </h1>
        
        {step === 1 && (
          // 🎯 STEP 1: Request OTP
          <form onSubmit={handleRequestOTP}>
            <div className="mb-4">
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setUsePhone(false);
                    setPhoneNumber('');
                    setEmail('');
                  }}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
                    !usePhone
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Use Email
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUsePhone(true);
                    setEmail('');
                    setPhoneNumber('');
                  }}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
                    usePhone
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Use Phone
                </button>
              </div>
              
              <label className="block text-gray-700 mb-2" htmlFor={usePhone ? 'phone' : 'email'}>
                {usePhone ? 'Enter Your Phone Number' : 'Enter Your Email Address'}
              </label>
              
              {usePhone ? (
                <input
                  id="phone"
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  value={phoneNumber}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, '');
                    // Allow up to 12 digits (91 + 10 digit phone)
                    setPhoneNumber(cleaned.slice(0, 12));
                  }}
                  placeholder="Enter 10-digit phone number"
                  required
                  minLength={10}
                  maxLength={12}
                />
              ) : (
                <input
                  id="email"
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              )}
            </div>
            
            <button
              type="submit"
              className={`w-full bg-orange-500 text-white py-2 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending OTP...
                </div>
              ) : (
                'Send OTP'
              )}
            </button>
          </form>
        )}

        {step === 2 && (
          // 🎯 STEP 2: Verify OTP
          <form onSubmit={handleVerifyOTP}>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                OTP has been sent to your registered phone number {maskedPhone || '(hidden)'}
              </p>
              
              <label className="block text-gray-700 mb-2" htmlFor="otp">
                Enter 6-Digit OTP
              </label>
              
              <input
                id="otp"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-center text-2xl tracking-widest"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                required
                maxLength={6}
                autoFocus
              />
            </div>
            
            <button
              type="submit"
              className={`w-full bg-orange-500 text-white py-2 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 mb-3 ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
              disabled={isLoading || otp.length !== 6}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </div>
              ) : (
                'Verify OTP'
              )}
            </button>
            
            <button
              type="button"
              onClick={handleResendOTP}
              className="w-full text-orange-500 hover:text-orange-700 text-sm"
            >
              Resend OTP
            </button>
          </form>
        )}

        {step === 3 && (
          // 🎯 STEP 3: Reset Password
          <form onSubmit={handleResetPassword}>
            <div className="mb-4">
              <p className="text-green-600 text-sm mb-4">✅ OTP verified successfully</p>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="newPassword">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                minLength="6"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 mb-2" htmlFor="confirmPassword">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                minLength="6"
              />
            </div>
            
            <button
              type="submit"
              className={`w-full bg-orange-500 text-white py-2 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Resetting...
                </div>
              ) : (
                'Reset Password'
              )}
            </button>
            
            <button
              type="button"
              onClick={() => {
                setStep(2);
                setNewPassword('');
                setConfirmPassword('');
              }}
              className="w-full mt-3 text-orange-500 hover:text-orange-700 text-sm"
            >
              ← Back to OTP
            </button>
          </form>
        )}
        
        <div className="mt-6 text-center">
          <Link to="/user/login" className="text-orange-500 hover:underline text-sm">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UserForgotPassword;