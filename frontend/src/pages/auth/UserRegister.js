import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { sendSignupOTP, resendSignupOTP, verifySignupOTPAndRegister } from '../../services/userService';
import { AuthContext } from '../../contexts/AuthContext';

const RegisterSchema = Yup.object().shape({
  name: Yup.string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters'),
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Confirm password is required'),
  mobileNumber: Yup.string()
    .required('Mobile number is required')
    .matches(/^[0-9]{10,12}$/, 'Mobile number must be 10-12 digits'),
  gender: Yup.string()
    .oneOf(['Male', 'Female', 'Other', ''], 'Invalid gender selection')
});

const UserRegister = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Enter details & send OTP, 2: Verify OTP & register
  const [formData, setFormData] = useState(null);
  const [otp, setOtp] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const navigate = useNavigate();
  
  const { loginUser: contextLogin } = useContext(AuthContext);

  // Component initialization logging
  React.useEffect(() => {
    const logPrefix = '🔷 [USER-REGISTER-INIT]';
    console.log(`${logPrefix} ========================================`);
    console.log(`${logPrefix} UserRegister Component Initialized`);
    console.log(`${logPrefix} Initial State:`, {
      step,
      hasFormData: !!formData,
      otpLength: otp?.length || 0,
      maskedPhone: maskedPhone || 'N/A',
      timestamp: new Date().toISOString()
    });
    console.log(`${logPrefix} ========================================`);
    
    return () => {
      console.log(`${logPrefix} Component Unmounting`);
    };
  }, []);

  // Step change logging
  React.useEffect(() => {
    const logPrefix = '🔄 [USER-REGISTER-STEP-CHANGE]';
    console.log(`${logPrefix} Step changed to: ${step}`, {
      previousStep: step - 1,
      currentStep: step,
      stepName: step === 1 ? 'Enter Details & Send OTP' : step === 2 ? 'Verify OTP & Register' : 'Unknown',
      timestamp: new Date().toISOString()
    });
  }, [step]);

  // 🎯 STEP 1: Send OTP for signup
  const handleSendOTP = async (values) => {
    const logPrefix = '🟦 [USER-REGISTER-STEP1]';
    console.log(`${logPrefix} ========================================`);
    console.log(`${logPrefix} STEP 1: Send Signup OTP`);
    console.log(`${logPrefix} Form Values:`, {
      name: values.name?.substring(0, 10) + '...',
      email: values.email,
      mobileNumber: `${values.mobileNumber?.substring(0, 6)}****${values.mobileNumber?.slice(-2)}`,
      passwordLength: values.password?.length || 0,
      confirmPasswordLength: values.confirmPassword?.length || 0,
      timestamp: new Date().toISOString()
    });
    console.log(`${logPrefix} ========================================`);
    
    setIsLoading(true);
    
    try {
      console.log(`${logPrefix} 📤 Calling sendSignupOTP service...`);
      
      const response = await sendSignupOTP(values.name, values.email, values.mobileNumber);
      
      console.log(`${logPrefix} 📥 Service Response:`, {
        success: response.success,
        message: response.message,
        hasData: !!response.data,
        maskedPhone: response.data?.phoneNumber
      });
      
      if (response.success) {
        console.log(`${logPrefix} ✅ SUCCESS: OTP sent successfully`);
        console.log(`${logPrefix} 🔄 State Update:`, {
          settingFormData: true,
          maskedPhone: response.data?.phoneNumber,
          movingToStep: 2
        });
        
        setFormData(values);
        setMaskedPhone(response.data?.phoneNumber || '');
        setStep(2); // Move to OTP verification step
        
        console.log(`${logPrefix} ✅ State Updated - Now on Step 2 (OTP Verification)`);
        console.log(`${logPrefix} ========================================`);
        
        toast.success(response.message || 'OTP sent to your phone number');
      } else {
        console.error(`${logPrefix} ❌ FAILED: OTP send failed`, {
          message: response.message
        });
        console.log(`${logPrefix} ========================================`);
        toast.error(response.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error(`${logPrefix} ❌ EXCEPTION: Error during OTP send`, {
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

  // 🎯 STEP 2: Verify OTP and register
  const handleVerifyOTPAndRegister = async (e) => {
    e.preventDefault();
    
    const logPrefix = '🟩 [USER-REGISTER-STEP2]';
    console.log(`${logPrefix} ========================================`);
    console.log(`${logPrefix} STEP 2: Verify OTP and Register`);
    console.log(`${logPrefix} Input Data:`, {
      otpLength: otp?.length || 0,
      otpValue: otp?.substring(0, 2) + '****',
      hasFormData: !!formData,
      formDataEmail: formData?.email,
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
    
    if (!formData) {
      console.error(`${logPrefix} ❌ VALIDATION: Form data missing`, {
        formDataExists: !!formData
      });
      console.log(`${logPrefix} ========================================`);
      toast.error('Form data missing. Please start over.');
      setStep(1);
      return;
    }
    
    console.log(`${logPrefix} ✅ Validation passed - Proceeding with OTP verification`);
    console.log(`${logPrefix} 📋 Form Data:`, {
      name: formData.name?.substring(0, 10) + '...',
      email: formData.email,
      mobileNumber: `${formData.mobileNumber?.substring(0, 6)}****${formData.mobileNumber?.slice(-2)}`,
      passwordLength: formData.password?.length || 0,
      hasLocation: !!formData.location
    });
    
    setIsLoading(true);
    
    try {
      console.log(`${logPrefix} 📤 Calling verifySignupOTPAndRegister service...`);
      
      const response = await verifySignupOTPAndRegister(
        formData.name,
        formData.email,
        formData.password,
        formData.mobileNumber,
        otp,
        formData.location || null,
        formData.gender || ''
      );
      
      console.log(`${logPrefix} 📥 Service Response:`, {
        success: response.success,
        message: response.message,
        hasData: !!response.data,
        hasToken: !!response.data?.token,
        userId: response.data?._id,
        userEmail: response.data?.email
      });
      
      if (response.success) {
        console.log(`${logPrefix} ✅ SUCCESS: OTP verified and user registered`);
        
        // Auto-login after successful registration
        if (response.data && response.data.token) {
          try {
            console.log(`${logPrefix} 🔄 Starting auto-login process...`);
            console.log(`${logPrefix} 📋 Login Data:`, {
              userId: response.data._id,
              email: response.data.email,
              name: response.data.name,
              hasToken: !!response.data.token
            });
            
            await contextLogin(response.data);
            
            console.log(`${logPrefix} ✅ Auto-login successful`);
            console.log(`${logPrefix} 🔄 Navigating to /user/dashboard`);
            console.log(`${logPrefix} ========================================`);
            
            toast.success(`Welcome to Zammer, ${response.data.name}!`);
            navigate('/user/dashboard');
          } catch (loginError) {
            console.error(`${logPrefix} ❌ Auto-login failed`, {
              error: loginError.message,
              stack: loginError.stack
            });
            console.log(`${logPrefix} 🔄 Fallback: Navigating to /user/login`);
            console.log(`${logPrefix} ========================================`);
            toast.success('Registration successful! Please login.');
            navigate('/user/login');
          }
        } else {
          console.log(`${logPrefix} ⚠️ No token in response - Redirecting to login`);
          console.log(`${logPrefix} 🔄 Navigating to /user/login`);
          console.log(`${logPrefix} ========================================`);
          toast.success('Registration successful! Please login.');
          navigate('/user/login');
        }
      } else {
        console.error(`${logPrefix} ❌ FAILED: Registration failed`, {
          message: response.message
        });
        console.log(`${logPrefix} ========================================`);
        toast.error(response.message || 'Registration failed');
      }
    } catch (error) {
      console.error(`${logPrefix} ❌ EXCEPTION: Error during registration`, {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        validationErrors: error.response?.data?.errors
      });
      console.error(`${logPrefix} ========================================`);
      toast.error(error.response?.data?.message || error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
      console.log(`${logPrefix} 🔄 Loading state set to false`);
    }
  };

  const handleResendOTP = async () => {
    const logPrefix = '🔄 [USER-REGISTER-RESEND]';
    console.log(`${logPrefix} ========================================`);
    console.log(`${logPrefix} Resending OTP`);
    console.log(`${logPrefix} Form Data:`, {
      hasFormData: !!formData,
      email: formData?.email,
      mobileNumber: formData?.mobileNumber ? `${formData.mobileNumber.substring(0, 6)}****` : 'N/A'
    });
    console.log(`${logPrefix} ========================================`);
    
    if (!formData || !formData.mobileNumber) {
      console.error(`${logPrefix} ❌ ERROR: Form data or mobile number missing`);
      console.log(`${logPrefix} ========================================`);
      toast.error('Please fill the form first');
      setStep(1);
      return;
    }
    
    setIsLoading(true);
    setOtp(''); // Clear OTP input
    
    try {
      console.log(`${logPrefix} 📤 Calling resendSignupOTP service...`);
      
      const response = await resendSignupOTP(formData.mobileNumber);
      
      console.log(`${logPrefix} 📥 Service Response:`, {
        success: response.success,
        message: response.message,
        hasData: !!response.data,
        maskedPhone: response.data?.phoneNumber
      });
      
      if (response.success) {
        console.log(`${logPrefix} ✅ SUCCESS: OTP resent successfully`);
        console.log(`${logPrefix} ========================================`);
        toast.success(response.message || 'OTP has been resent to your phone number');
      } else {
        console.error(`${logPrefix} ❌ FAILED: OTP resend failed`, {
          message: response.message
        });
        console.log(`${logPrefix} ========================================`);
        toast.error(response.message || 'Failed to resend OTP');
      }
    } catch (error) {
      console.error(`${logPrefix} ❌ EXCEPTION: Error during OTP resend`, {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      console.error(`${logPrefix} ========================================`);
      toast.error(error.response?.data?.message || error.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setIsLoading(false);
      console.log(`${logPrefix} 🔄 Loading state set to false`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {step === 1 ? 'Create your account' : 'Verify OTP'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {step === 1 ? (
              <>
                Or{' '}
                <Link to="/user/login" className="font-medium text-orange-600 hover:text-orange-500">
                  sign in to your account
                </Link>
              </>
            ) : (
              <>
                OTP sent to {maskedPhone || 'your phone number'}
              </>
            )}
          </p>
        </div>

        {step === 1 && (
          // 🎯 STEP 1: Enter details and send OTP
          <Formik
            initialValues={{
              name: '',
              email: '',
              password: '',
              confirmPassword: '',
              mobileNumber: '',
              gender: ''
            }}
            validationSchema={RegisterSchema}
            onSubmit={handleSendOTP}
          >
            {({ isSubmitting, setFieldValue }) => (
              <Form className="mt-8 space-y-6">
                <div className="rounded-md shadow-sm -space-y-px">
                  <div>
                    <label htmlFor="name" className="sr-only">
                      Full Name
                    </label>
                    <Field
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                      placeholder="Full Name"
                    />
                    <ErrorMessage
                      name="name"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="sr-only">
                      Email address
                    </label>
                    <Field
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                      placeholder="Email address"
                    />
                    <ErrorMessage
                      name="email"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label htmlFor="mobileNumber" className="sr-only">
                      Mobile Number
                    </label>
                    <Field
                      id="mobileNumber"
                      name="mobileNumber"
                      type="tel"
                      autoComplete="tel"
                      className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                      placeholder="Mobile Number (10 digits)"
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\D/g, '');
                        const limited = cleaned.slice(0, 12);
                        setFieldValue('mobileNumber', limited);
                      }}
                    />
                    <ErrorMessage
                      name="mobileNumber"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="sr-only">
                      Password
                    </label>
                    <Field
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                      placeholder="Password"
                    />
                    <ErrorMessage
                      name="password"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="sr-only">
                      Confirm Password
                    </label>
                    <Field
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                      placeholder="Confirm Password"
                    />
                    <ErrorMessage
                      name="confirmPassword"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label htmlFor="gender" className="sr-only">
                      Gender
                    </label>
                    <Field
                      as="select"
                      id="gender"
                      name="gender"
                      className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                    >
                      <option value="">Gender (Optional)</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </Field>
                    <ErrorMessage
                      name="gender"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting || isLoading}
                    className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${
                      (isSubmitting || isLoading) ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {isLoading ? (
                      <div className="flex items-center">
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
                </div>
              </Form>
            )}
          </Formik>
        )}

        {step === 2 && (
          // 🎯 STEP 2: Verify OTP and complete registration
          <form onSubmit={handleVerifyOTPAndRegister} className="mt-8 space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-800">
                <strong>Registration Details:</strong><br />
                Name: {formData?.name}<br />
                Email: {formData?.email}<br />
                Phone: {maskedPhone || formData?.mobileNumber}
              </p>
            </div>

            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
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
              <p className="mt-2 text-sm text-gray-500">
                OTP has been sent to {maskedPhone || 'your phone number'}
              </p>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 mb-3 ${
                  (isLoading || otp.length !== 6) ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying & Registering...
                  </div>
                ) : (
                  'Verify OTP & Register'
                )}
              </button>

              <button
                type="button"
                onClick={handleResendOTP}
                disabled={isLoading}
                className="w-full text-orange-500 hover:text-orange-700 text-sm"
              >
                Resend OTP
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setOtp('');
                  setFormData(null);
                }}
                className="w-full mt-2 text-gray-500 hover:text-gray-700 text-sm"
              >
                ← Back to Form
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default UserRegister;