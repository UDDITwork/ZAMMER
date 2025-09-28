import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { AuthContext } from "../../contexts/AuthContext";
import GooglePlacesAutocomplete from "../../components/GooglePlacesAutocomplete";

const LOGO_URL = "https://zammernow.com/assets/logo.svg";
const steps = ["Personal", "Shop", "Payment"];
const categories = ["Men", "Women", "Kids"]; // enum backend schema

/**
 * SELLER REGISTRATION DATA COLLECTION
 * 
 * This form collects the following information during seller registration:
 * 
 * STEP 1 - Personal Details:
 * - firstName (required)
 * - email (required, unique)
 * - password (required, min 6 chars)
 * - mobile (required, 10 digits, unique)
 * 
 * STEP 2 - Shop Details:
 * - shopName (required)
 * - shopPhone (required, 10 digits) - NEW: Added for customer contact
 * - address (required, with Google Places autocomplete)
 * - coordinates (auto-extracted from Google Places)
 * - gst (optional)
 * - category (required: Men/Women/Kids)
 * 
 * STEP 3 - Payment Details:
 * - upi (required, stored as bankDetails.accountNumber)
 * 
 * Fields NOT collected during registration (managed later via profile updates):
 * - Shop operating hours, working days, description
 * - Shop images and main image
 * - Complete bank details (IFSC, bank name, account type)
 * - Location details (city, state, postal code - defaults to Mumbai)
 * - Alternate phone number
 */

const SellerRegister = () => {
  const navigate = useNavigate();
  
  // 🎯 ADD: Get loginSeller from AuthContext
  const { loginSeller: contextLoginSeller } = useContext(AuthContext);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    email: "",
    password: "",
    mobile: "",
    address: "",
    shopName: "",
    shopPhone: "",
    gst: "",
    category: "",
    upi: "",
  });

  // 🎯 NEW: Add state for coordinates
  const [shopCoordinates, setShopCoordinates] = useState(null);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  /* ---------- SUBMIT ---------- */
  const handleSubmit = async () => {
    if (!formData.address.trim()) {
      toast.error("Please select a shop address from suggestions");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        firstName: formData.firstName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        mobileNumber: formData.mobile.trim(),
        shop: {
          name: formData.shopName.trim(),
          address: formData.address.trim(),
          phoneNumber: {
            main: formData.shopPhone.trim()
          },
          gstNumber: formData.gst.trim(),
          category: formData.category,
          // 🎯 NEW: Add coordinates if available
          location: shopCoordinates ? {
            type: "Point",
            coordinates: shopCoordinates // [longitude, latitude]
          } : {
            type: "Point", 
            coordinates: [0, 0] // fallback
          }
        },
        bankDetails: {
          accountNumber: formData.upi.trim(),
        },
      };

      console.log('🏪 Attempting seller registration...');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || "http://localhost:5001/api"}/sellers/register`,
        payload
      );

      console.log('✅ Seller registration response:', response.data);

      // 🎯 ENHANCED: Auto-login after successful registration
      if (response.data.success && response.data.data && response.data.data.token) {
        try {
          console.log('🔄 Auto-login after seller registration...');
          contextLoginSeller(response.data.data);
          toast.success(`Welcome to Zammer, ${response.data.data.firstName}!`);
          navigate("/seller/dashboard");
        } catch (loginError) {
          console.error('Seller auto-login failed:', loginError);
          // Fallback to manual login
          toast.success("Seller registered successfully! Please login.");
          navigate("/seller/login");
        }
      } else {
        // If no token returned or invalid response, redirect to login
        toast.success("Seller registered successfully! Please login.");
        navigate("/seller/login");
      }
    } catch (err) {
      console.error('Seller registration error:', err.response?.data || err);
      toast.error(
        err.response?.data?.message ||
          err.response?.data?.errors?.[0]?.msg ||
          "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    },
    logo: {
      height: '60px',
      marginBottom: '30px',
      filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))'
    },
    stepper: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '30px',
      gap: '20px'
    },
    stepCircle: {
      width: '50px',
      height: '50px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '16px',
      fontWeight: '600',
      transition: 'all 0.3s ease',
      border: '2px solid rgba(255, 255, 255, 0.3)',
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      color: 'rgba(255, 255, 255, 0.7)'
    },
    stepActive: {
      background: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)',
      border: '2px solid rgba(255, 255, 255, 0.5)',
      color: '#ffffff',
      boxShadow: '0 8px 25px rgba(255, 107, 107, 0.3)',
      transform: 'scale(1.1)'
    },
    stepCompleted: {
      background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
      border: '2px solid rgba(255, 255, 255, 0.5)',
      color: '#ffffff',
      boxShadow: '0 8px 25px rgba(72, 187, 120, 0.3)'
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
    sectionTitle: {
      fontSize: '24px',
      fontWeight: '700',
      color: '#ffffff',
      textAlign: 'center',
      marginBottom: '30px',
      textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
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
      marginBottom: '20px',
      boxSizing: 'border-box'
    },
    select: {
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
      marginBottom: '20px',
      boxSizing: 'border-box',
      cursor: 'pointer'
    },
    buttonPrimary: {
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
      transition: 'all 0.3s ease'
    },
    buttonDisabled: {
      opacity: 0.6,
      cursor: 'not-allowed'
    },
    linkText: {
      textAlign: 'center',
      marginTop: '24px',
      fontSize: '14px',
      color: 'rgba(255, 255, 255, 0.8)'
    },
    link: {
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
    },
    // 🎯 NEW: GooglePlacesAutocomplete specific styles
    autocompleteContainer: {
      width: '100%',
      marginBottom: '20px',
      position: 'relative'
    },
    
    autocompleteInput: {
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
      boxSizing: 'border-box',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }
  };

  /* ---------- STEP UI ---------- */
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <>
            <h3 style={styles.sectionTitle}>Personal Details</h3>

            <input
              style={styles.inputField}
              className="register-input"
              name="firstName"
              placeholder="First Name"
              value={formData.firstName}
              onChange={handleChange}
              required
            />

            <input
              style={styles.inputField}
              className="register-input"
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              required
            />

            <input
              style={styles.inputField}
              className="register-input"
              type="password"
              name="password"
              minLength={6}
              placeholder="Password (min 6 chars)"
              value={formData.password}
              onChange={handleChange}
              required
            />

            <input
              style={styles.inputField}
              className="register-input"
              name="mobile"
              pattern="[0-9]{10}"
              maxLength={10}
              placeholder="Mobile (10 digits)"
              value={formData.mobile}
              onChange={handleChange}
              required
            />
          </>
        );

      case 1:
        return (
          <>
            <h3 style={styles.sectionTitle}>Shop Details</h3>

            <input
              style={styles.inputField}
              className="register-input"
              name="shopName"
              placeholder="Shop / Brand Name"
              value={formData.shopName}
              onChange={handleChange}
              required
            />

            <input
              style={styles.inputField}
              className="register-input"
              name="shopPhone"
              type="tel"
              pattern="[0-9]{10}"
              maxLength={10}
              placeholder="Shop Phone Number (10 digits)"
              value={formData.shopPhone}
              onChange={handleChange}
              required
            />

            {/* 🎯 UPDATED: Enhanced GooglePlacesAutocomplete */}
            <div style={styles.autocompleteContainer}>
              <GooglePlacesAutocomplete
                className="google-places-autocomplete register-input"
                style={styles.autocompleteInput}
                placeholder="Shop Address"
                value={formData.address}
                onChange={(val) =>
                  setFormData((f) => ({ ...f, address: val }))
                }
                // 🎯 NEW: Extract coordinates when place is selected
                onPlaceSelected={(placeData) => {
                  console.log('🗺️ Place selected:', placeData);
                  if (placeData && placeData.coordinates) {
                    setShopCoordinates(placeData.coordinates);
                    console.log('📍 Coordinates extracted:', placeData.coordinates);
                  }
                }}
              />
            </div>

            <input
              style={styles.inputField}
              className="register-input"
              name="gst"
              placeholder="GST Number (optional)"
              value={formData.gst}
              onChange={handleChange}
            />

            <select
              style={styles.select}
              className="register-select"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </>
        );

      case 2:
        return (
          <>
            <h3 style={styles.sectionTitle}>Payment Details</h3>

            <input
              style={styles.inputField}
              className="register-input"
              name="upi"
              placeholder="UPI ID / Bank Acc No."
              value={formData.upi}
              onChange={handleChange}
              required
            />
          </>
        );

      default:
        return null;
    }
  };

  /* ---------- RENDER ---------- */
  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .register-input:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.5);
          }
          
          .register-input:focus {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(255, 255, 255, 0.2);
            border-color: rgba(255, 255, 255, 0.6);
          }
          
          .register-input::placeholder {
            color: rgba(255, 255, 255, 0.7);
          }
          
          .register-select:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.5);
          }
          
          .register-select:focus {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(255, 255, 255, 0.2);
            border-color: rgba(255, 255, 255, 0.6);
          }
          
          .register-select option {
            background: #2d3748;
            color: #ffffff;
          }
          
          .btn-primary:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 12px 35px rgba(255, 107, 107, 0.4);
          }
          
          .btn-secondary:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.5);
          }
          
          .register-link:hover {
            color: #ffffff;
            text-shadow: 0 0 8px rgba(255, 255, 255, 0.6);
          }

          /* 🎯 GooglePlacesAutocomplete CSS Fix */
          .pac-container {
            background-color: rgba(255, 255, 255, 0.95) !important;
            backdrop-filter: blur(10px) !important;
            border-radius: 12px !important;
            border: 1px solid rgba(255, 255, 255, 0.3) !important;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important;
            margin-top: 4px !important;
          }

          .pac-item {
            border-top: none !important;
            padding: 12px 16px !important;
            font-size: 14px !important;
            cursor: pointer !important;
            border-bottom: 1px solid rgba(0, 0, 0, 0.1) !important;
          }

          .pac-item:hover {
            background-color: rgba(255, 107, 107, 0.1) !important;
          }

          .pac-item:last-child {
            border-bottom: none !important;
            border-radius: 0 0 12px 12px !important;
          }

          .pac-item:first-child {
            border-radius: 12px 12px 0 0 !important;
          }

          /* 🎯 Fix autocomplete input styling */
          .google-places-autocomplete input {
            width: 100% !important;
            padding: 16px 20px !important;
            border-radius: 12px !important;
            border: 1px solid rgba(255, 255, 255, 0.3) !important;
            background: rgba(255, 255, 255, 0.2) !important;
            backdrop-filter: blur(10px) !important;
            font-size: 16px !important;
            color: #ffffff !important;
            outline: none !important;
            transition: all 0.3s ease !important;
            box-sizing: border-box !important;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          }

          .google-places-autocomplete input::placeholder {
            color: rgba(255, 255, 255, 0.7) !important;
          }

          .google-places-autocomplete input:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 8px 25px rgba(255, 255, 255, 0.15) !important;
            border-color: rgba(255, 255, 255, 0.5) !important;
          }

          .google-places-autocomplete input:focus {
            transform: translateY(-2px) !important;
            box-shadow: 0 8px 25px rgba(255, 255, 255, 0.2) !important;
            border-color: rgba(255, 255, 255, 0.6) !important;
          }
          
          @media (max-width: 768px) {
            .register-container {
              padding: 10px !important;
            }
            
            .register-card {
              padding: 30px 20px !important;
              margin: 10px;
            }
            
            .register-stepper {
              gap: 15px !important;
              margin-bottom: 20px !important;
            }
            
            .register-step-circle {
              width: 40px !important;
              height: 40px !important;
              font-size: 14px !important;
            }
            
            .register-section-title {
              font-size: 20px !important;
              margin-bottom: 20px !important;
            }
          }
        `}
      </style>
      
      <img src={LOGO_URL} alt="Zammer" style={styles.logo} />

      <div style={styles.stepper} className="register-stepper">
        {steps.map((_, i) => (
          <div
            key={i}
            style={{
              ...styles.stepCircle,
              ...(i < step ? styles.stepCompleted : {}),
              ...(i === step ? styles.stepActive : {})
            }}
            className="register-step-circle"
          >
            {i + 1}
          </div>
        ))}
      </div>

      <div style={styles.card} className="register-card">
        {renderStep()}

        {step === 2 ? (
          <button
            type="button"
            style={{
              ...styles.buttonPrimary,
              ...(loading ? styles.buttonDisabled : {})
            }}
            className="btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading && <span style={styles.spinner}></span>}
            {loading ? "Creating Account…" : "Create Seller Account"}
          </button>
        ) : (
          <button 
            type="button" 
            style={styles.buttonPrimary}
            className="btn-primary" 
            onClick={next}
          >
            Continue
          </button>
        )}

        {step > 0 && (
          <button 
            type="button" 
            style={styles.buttonSecondary}
            className="btn-secondary" 
            onClick={back}
          >
            Back
          </button>
        )}
      </div>

      <p style={styles.linkText}>
        Already have an account?{' '}
        <Link to="/seller/login" style={styles.link} className="register-link">
          Sign in here
        </Link>
      </p>
    </div>
  );
};

export default SellerRegister;