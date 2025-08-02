                            // frontend/src/components/delivery/OTPInput.js - OTP Input Component for Delivery Verification

import React, { useState, useRef, useEffect } from 'react';

const OTPInput = ({ 
  length = 6, 
  onComplete, 
  onOTPChange,
  loading = false,
  error = '',
  className = '',
  label = '',
  placeholder = '',
  autoFocus = true,
  disabled = false
}) => {
  const [otp, setOtp] = useState(new Array(length).fill(''));
  const [focusedIndex, setFocusedIndex] = useState(autoFocus ? 0 : -1);
  const inputRefs = useRef([]);

  // Initialize refs
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (autoFocus && inputRefs.current[0] && !disabled) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus, disabled]);

  // Handle input change
  const handleChange = (index, value) => {
    if (disabled) return;

    // Only allow digits
    const newValue = value.replace(/[^0-9]/g, '');
    
    if (newValue.length <= 1) {
      const newOtp = [...otp];
      newOtp[index] = newValue;
      setOtp(newOtp);

      // Call onChange callback
      if (onOTPChange) {
        onOTPChange(newOtp.join(''));
      }

      // Auto-focus next input
      if (newValue && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
        setFocusedIndex(index + 1);
      }

      // Check if OTP is complete
      if (newOtp.every(digit => digit !== '') && onComplete) {
        onComplete(newOtp.join(''));
      }
    }
  };

  // Handle key down
  const handleKeyDown = (index, e) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      if (otp[index] === '' && index > 0) {
        // Move to previous input if current is empty
        inputRefs.current[index - 1]?.focus();
        setFocusedIndex(index - 1);
      } else {
        // Clear current input
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
        
        if (onOTPChange) {
          onOTPChange(newOtp.join(''));
        }
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setFocusedIndex(index - 1);
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    } else if (e.key === 'Enter' && otp.every(digit => digit !== '')) {
      // Submit on Enter if OTP is complete
      if (onComplete) {
        onComplete(otp.join(''));
      }
    }
  };

  // Handle paste
  const handlePaste = (e) => {
    if (disabled) return;

    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/[^0-9]/g, '');
    
    if (pastedData.length >= length) {
      const newOtp = pastedData.slice(0, length).split('');
      setOtp(newOtp);
      
      if (onOTPChange) {
        onOTPChange(newOtp.join(''));
      }

      // Focus last input
      inputRefs.current[length - 1]?.focus();
      setFocusedIndex(length - 1);

      // Check if complete
      if (newOtp.every(digit => digit !== '') && onComplete) {
        onComplete(newOtp.join(''));
      }
    }
  };

  // Handle input focus
  const handleFocus = (index) => {
    setFocusedIndex(index);
    
    // Select all text on focus
    setTimeout(() => {
      inputRefs.current[index]?.select();
    }, 0);
  };

  // Clear OTP function
  const clearOTP = () => {
    if (disabled) return;
    
    const newOtp = new Array(length).fill('');
    setOtp(newOtp);
    
    if (onOTPChange) {
      onOTPChange('');
    }
    
    // Focus first input
    inputRefs.current[0]?.focus();
    setFocusedIndex(0);
  };

  // Get input class names
  const getInputClassName = (index) => {
    let baseClass = `
      w-12 h-12 text-center text-lg font-semibold border rounded-lg
      focus:outline-none focus:ring-2 transition-all duration-200
      ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
    `;

    if (error) {
      baseClass += ' border-red-300 focus:ring-red-500 focus:border-red-500';
    } else if (focusedIndex === index) {
      baseClass += ' border-orange-500 ring-2 ring-orange-500 ring-opacity-20';
    } else if (otp[index]) {
      baseClass += ' border-green-500 bg-green-50';
    } else {
      baseClass += ' border-gray-300 focus:ring-orange-500 focus:border-orange-500';
    }

    return baseClass;
  };

  return (
    <div className={`otp-input-container ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}

      {/* OTP Input Fields */}
      <div className="flex items-center justify-center space-x-2 mb-2">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={el => inputRefs.current[index] = el}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            onChange={e => handleChange(index, e.target.value)}
            onKeyDown={e => handleKeyDown(index, e)}
            onFocus={() => handleFocus(index)}
            onPaste={handlePaste}
            className={getInputClassName(index)}
            placeholder={placeholder}
            disabled={disabled || loading}
            aria-label={`OTP digit ${index + 1}`}
          />
        ))}
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="flex items-center justify-center mt-2">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <svg className="animate-spin h-4 w-4 text-orange-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Verifying OTP...</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-2 text-sm text-red-600 text-center">
          <div className="flex items-center justify-center space-x-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 flex justify-center space-x-4">
        <button
          type="button"
          onClick={clearOTP}
          disabled={disabled || loading || otp.every(digit => digit === '')}
          className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Helper Text */}
      <div className="mt-2 text-center">
        <p className="text-xs text-gray-500">
          Enter the {length}-digit OTP provided by the customer
        </p>
      </div>
    </div>
  );
};

// Delivery-specific OTP Input Component
export const DeliveryOTPInput = ({ 
  onComplete, 
  loading = false, 
  error = '',
  orderNumber = '',
  customerName = ''
}) => {
  const [otp, setOtp] = useState('');

  const handleOTPChange = (newOtp) => {
    setOtp(newOtp);
  };

  const handleComplete = (completedOtp) => {
    if (onComplete) {
      onComplete(completedOtp);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Delivery Verification
        </h3>
        {orderNumber && (
          <p className="text-sm text-gray-600 mb-1">
            Order: <span className="font-medium">{orderNumber}</span>
          </p>
        )}
        {customerName && (
          <p className="text-sm text-gray-600">
            Customer: <span className="font-medium">{customerName}</span>
          </p>
        )}
      </div>

      {/* OTP Input */}
      <OTPInput
        length={6}
        onComplete={handleComplete}
        onOTPChange={handleOTPChange}
        loading={loading}
        error={error}
        label="Enter Delivery OTP"
        autoFocus={true}
      />

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-1">
              Delivery Instructions
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Ask the customer for their 6-digit delivery OTP</li>
              <li>• Verify the OTP matches the order details</li>
              <li>• Only hand over the package after successful verification</li>
              <li>• Contact support if customer doesn't have the OTP</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// Export both components
export default OTPInput;