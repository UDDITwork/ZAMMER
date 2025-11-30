import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { requestPasswordReset, verifyForgotPasswordOTP } from '../../services/deliveryService';

const DeliveryAgentForgotPassword = () => {
  // Step 1: Email/Phone input
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [usePhone, setUsePhone] = useState(false);
  
  // Step 2: OTP verification
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  
  // UI State
  const [step, setStep] = useState(1); // 1: Request OTP, 2: Verify OTP, 3: Redirect to reset
  const [isLoading, setIsLoading] = useState(false);

  // Component initialization logging
  useEffect(() => {
    const logPrefix = '🚚 [DELIVERY-FORGOT-PASSWORD-INIT]';
    console.log(`${logPrefix} ========================================`);
    console.log(`${logPrefix} DeliveryAgentForgotPassword Component Initialized`);
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
    const logPrefix = '🔄 [DELIVERY-FORGOT-PASSWORD-STEP-CHANGE]';
    const stepNames = {
      1: 'Request OTP',
      2: 'Verify OTP',
      3: 'Redirect to Reset'
    };
    console.log(`${logPrefix} Step changed to: ${step}`, {
      currentStep: step,
      stepName: stepNames[step] || 'Unknown',
      timestamp: new Date().toISOString()
    });
  }, [step]);
  
  // 🚚 STEP 1: Request OTP via MSG91 (uses LOGIN_TEMPLATE_ID)
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    
    const logPrefix = '🟨 [DELIVERY-FORGOT-PASSWORD-STEP1]';
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
        hasData: !!response.data,
        hasPhoneNumber: !!response.data?.phoneNumber,
        timestamp: new Date().toISOString()
      });
      console.log(`${logPrefix} ========================================`);
      
      if (response.success) {
        const masked = response.data.phoneNumber || phoneNumber.trim();
        setMaskedPhone(masked.substring(0, 6) + '****' + masked.slice(-2));
        setStep(2);
        toast.success('OTP sent successfully! Please check your phone.');
      } else {
        toast.error(response.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error(`${logPrefix} ❌ Error:`, error);
      const errorMessage = error.message || error.response?.data?.message || 'Failed to send OTP';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 🚚 STEP 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    const logPrefix = '🟧 [DELIVERY-FORGOT-PASSWORD-STEP2]';
    console.log(`${logPrefix} ========================================`);
    console.log(`${logPrefix} STEP 2: Verify Password Reset OTP`);
    console.log(`${logPrefix} Input Data:`, {
      email: email || 'NOT_PROVIDED',
      phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 6)}****` : 'NOT_PROVIDED',
      otpLength: otp?.length || 0,
      timestamp: new Date().toISOString()
    });
    console.log(`${logPrefix} ========================================`);
    
    if (!otp.trim() || otp.trim().length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await verifyForgotPasswordOTP(email?.trim() || undefined, phoneNumber?.trim() || undefined, otp.trim());
      
      console.log(`${logPrefix} 📥 Service Response:`, {
        success: response.success,
        hasResetToken: !!response.data?.resetToken,
        timestamp: new Date().toISOString()
      });
      console.log(`${logPrefix} ========================================`);
      
      if (response.success && response.data.resetToken) {
        setResetToken(response.data.resetToken);
        // Redirect to reset password page with token
        window.location.href = `/delivery/reset-password/${response.data.resetToken}`;
      } else {
        toast.error(response.message || 'OTP verification failed');
      }
    } catch (error) {
      console.error(`${logPrefix} ❌ Error:`, error);
      const errorMessage = error.message || error.response?.data?.message || 'OTP verification failed';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            🚚 Reset Password
          </h2>
          <p className="text-gray-600">
            Delivery Agent Password Recovery
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {step === 1 && (
            <form onSubmit={handleRequestOTP} className="space-y-6">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-600">
                  Enter your email or phone number to receive OTP
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {usePhone ? 'Phone Number' : 'Email Address'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setUsePhone(!usePhone);
                      setEmail('');
                      setPhoneNumber('');
                    }}
                    className="text-sm text-orange-600 hover:text-orange-500"
                  >
                    {usePhone ? 'Use Email Instead' : 'Use Phone Instead'}
                  </button>
                </div>

                {!usePhone ? (
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  />
                ) : (
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter your phone number"
                    required
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  />
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending OTP...
                  </div>
                ) : (
                  'Send OTP'
                )}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-600">
                  Enter the 6-digit OTP sent to {maskedPhone || email}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OTP Code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-center text-2xl tracking-widest"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Verifying...
                  </div>
                ) : (
                  'Verify OTP'
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setOtp('');
                }}
                className="w-full text-sm text-gray-600 hover:text-gray-700"
              >
                ← Back to email/phone
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/delivery/login"
              className="text-sm text-orange-600 hover:text-orange-500"
            >
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryAgentForgotPassword;

