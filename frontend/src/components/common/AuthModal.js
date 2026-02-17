import React, { useState, useContext, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { AuthContext } from '../../contexts/AuthContext';
import { useAuthModal } from '../../contexts/AuthModalContext';
import { loginUser, sendSignupOTP, resendSignupOTP, verifySignupOTPAndRegister } from '../../services/userService';

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

const AuthModal = () => {
  const { isOpen, activeTab, setActiveTab, hideAuthModal, handleAuthSuccess } = useAuthModal();
  const { loginUser: contextLogin } = useContext(AuthContext);

  // Login state
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Register state
  const [registerStep, setRegisterStep] = useState(1);
  const [registerFormData, setRegisterFormData] = useState(null);
  const [otp, setOtp] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setLoginForm({ email: '', password: '' });
      setLoginLoading(false);
      setShowPassword(false);
      setRegisterStep(1);
      setRegisterFormData(null);
      setOtp('');
      setMaskedPhone('');
      setRegisterLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ─── Login handlers ───
  const handleLoginSubmit = async (e) => {
    e.preventDefault();

    if (!loginForm.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!loginForm.password.trim() || loginForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoginLoading(true);
    try {
      const response = await loginUser(loginForm);
      if (response.success && response.data) {
        await contextLogin(response.data);
        toast.success(`Welcome back, ${response.data.name}!`);
        handleAuthSuccess();
      } else {
        toast.error(response.message || 'Login failed');
      }
    } catch (error) {
      const errorMessage = error.message || error.response?.data?.message || 'Something went wrong during login';
      toast.error(errorMessage);
    } finally {
      setLoginLoading(false);
    }
  };

  // ─── Register handlers ───
  const handleSendOTP = async (values) => {
    setRegisterLoading(true);
    try {
      const response = await sendSignupOTP(values.name, values.email, values.mobileNumber);
      if (response.success) {
        setRegisterFormData(values);
        setMaskedPhone(response.data?.phoneNumber || '');
        setRegisterStep(2);
        toast.success(response.message || 'OTP sent to your phone number');
      } else {
        toast.error(response.message || 'Failed to send OTP');
      }
    } catch (error) {
      toast.error(error.message || error.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleVerifyOTPAndRegister = async (e) => {
    e.preventDefault();

    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    if (!registerFormData) {
      toast.error('Form data missing. Please start over.');
      setRegisterStep(1);
      return;
    }

    setRegisterLoading(true);
    try {
      const response = await verifySignupOTPAndRegister(
        registerFormData.name,
        registerFormData.email,
        registerFormData.password,
        registerFormData.mobileNumber,
        otp,
        registerFormData.location || null,
        registerFormData.gender || ''
      );

      if (response.success && response.data && response.data.token) {
        await contextLogin(response.data);
        toast.success(`Welcome to Zammer, ${response.data.name}!`);
        handleAuthSuccess();
      } else if (response.success) {
        toast.success('Registration successful! Please login.');
        setActiveTab('login');
        setRegisterStep(1);
      } else {
        toast.error(response.message || 'Registration failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Registration failed');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!registerFormData || !registerFormData.mobileNumber) {
      toast.error('Please fill the form first');
      setRegisterStep(1);
      return;
    }
    setRegisterLoading(true);
    setOtp('');
    try {
      const response = await resendSignupOTP(registerFormData.mobileNumber);
      if (response.success) {
        toast.success(response.message || 'OTP has been resent');
      } else {
        toast.error(response.message || 'Failed to resend OTP');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to resend OTP');
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={hideAuthModal}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Modal */}
      <div
        className="relative bg-white w-full max-w-md rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={hideAuthModal}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="pt-6 pb-4 px-6 text-center">
          <div className="text-2xl font-bold text-gray-900 mb-1">ZAMMER</div>
          <p className="text-sm text-gray-500">
            {activeTab === 'login' ? 'Sign in to continue' : 'Create your account'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex mx-6 mb-4 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => { setActiveTab('login'); setRegisterStep(1); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
              activeTab === 'login'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
              activeTab === 'register'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Register
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {/* ─── LOGIN TAB ─── */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label htmlFor="modal-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  id="modal-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label htmlFor="modal-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="modal-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm pr-10"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-black text-white py-2.5 rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
              >
                {loginLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>

              <div className="text-center">
                <a href="/user/forgot-password" className="text-sm text-gray-500 hover:text-gray-700">
                  Forgot your password?
                </a>
              </div>
            </form>
          )}

          {/* ─── REGISTER TAB ─── */}
          {activeTab === 'register' && registerStep === 1 && (
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
                <Form className="space-y-3">
                  <div>
                    <label htmlFor="reg-name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <Field
                      id="reg-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                      placeholder="Full Name"
                    />
                    <ErrorMessage name="name" component="div" className="text-red-500 text-xs mt-1" />
                  </div>

                  <div>
                    <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <Field
                      id="reg-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                      placeholder="Email address"
                    />
                    <ErrorMessage name="email" component="div" className="text-red-500 text-xs mt-1" />
                  </div>

                  <div>
                    <label htmlFor="reg-mobile" className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                    <Field
                      id="reg-mobile"
                      name="mobileNumber"
                      type="tel"
                      autoComplete="tel"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                      placeholder="Mobile Number (10 digits)"
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\D/g, '');
                        const limited = cleaned.slice(0, 12);
                        setFieldValue('mobileNumber', limited);
                      }}
                    />
                    <ErrorMessage name="mobileNumber" component="div" className="text-red-500 text-xs mt-1" />
                  </div>

                  <div>
                    <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <Field
                      id="reg-password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                      placeholder="Password (min 6 chars)"
                    />
                    <ErrorMessage name="password" component="div" className="text-red-500 text-xs mt-1" />
                  </div>

                  <div>
                    <label htmlFor="reg-confirm" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <Field
                      id="reg-confirm"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                      placeholder="Confirm Password"
                    />
                    <ErrorMessage name="confirmPassword" component="div" className="text-red-500 text-xs mt-1" />
                  </div>

                  <div>
                    <label htmlFor="reg-gender" className="block text-sm font-medium text-gray-700 mb-1">Gender (Optional)</label>
                    <Field
                      as="select"
                      id="reg-gender"
                      name="gender"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </Field>
                    <ErrorMessage name="gender" component="div" className="text-red-500 text-xs mt-1" />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || registerLoading}
                    className="w-full bg-black text-white py-2.5 rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                  >
                    {registerLoading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Sending OTP...
                      </span>
                    ) : (
                      'Send OTP'
                    )}
                  </button>
                </Form>
              )}
            </Formik>
          )}

          {/* ─── REGISTER STEP 2: OTP Verification ─── */}
          {activeTab === 'register' && registerStep === 2 && (
            <form onSubmit={handleVerifyOTPAndRegister} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Registration Details:</strong><br />
                  Name: {registerFormData?.name}<br />
                  Email: {registerFormData?.email}<br />
                  Phone: {maskedPhone || registerFormData?.mobileNumber}
                </p>
              </div>

              <div>
                <label htmlFor="modal-otp" className="block text-sm font-medium text-gray-700 mb-1">
                  Enter 6-Digit OTP
                </label>
                <input
                  id="modal-otp"
                  type="text"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-center text-2xl tracking-widest"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  required
                  maxLength={6}
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-500">
                  OTP has been sent to {maskedPhone || 'your phone number'}
                </p>
              </div>

              <button
                type="submit"
                disabled={registerLoading || otp.length !== 6}
                className="w-full bg-black text-white py-2.5 rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
              >
                {registerLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Verifying...
                  </span>
                ) : (
                  'Verify OTP & Register'
                )}
              </button>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={registerLoading}
                  className="text-sm text-gray-600 hover:text-black font-medium"
                >
                  Resend OTP
                </button>
                <button
                  type="button"
                  onClick={() => { setRegisterStep(1); setOtp(''); }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Back to Form
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
