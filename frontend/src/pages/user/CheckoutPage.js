import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserLayout from '../../components/layouts/UserLayout';
import { AuthContext } from '../../contexts/AuthContext';
import cartService from '../../services/cartService';
import orderService from '../../services/orderService';
import GooglePlacesAutocomplete from '../../components/GooglePlacesAutocomplete';

const CheckoutPage = () => {
  const { userAuth } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  const [shippingAddress, setShippingAddress] = useState({
    address: '',
    city: '',
    postalCode: '',
    country: 'India',
    phone: userAuth.user?.mobileNumber || ''
  });
  
  const [paymentMethod, setPaymentMethod] = useState('Card');
  const [addressInputMode, setAddressInputMode] = useState('manual'); // 'manual', 'saved', 'current'
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    fetchCart();
    loadUserLocation();
  }, []);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const response = await cartService.getCart();
      if (response.success) {
        if (!response.data.items || response.data.items.length === 0) {
          toast.error('Your cart is empty');
          navigate('/user/cart');
          return;
        }
        setCart(response.data);
      } else {
        toast.error(response.message || 'Failed to fetch cart');
        navigate('/user/cart');
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
      toast.error('Something went wrong');
      navigate('/user/cart');
    } finally {
      setLoading(false);
    }
  };

  const loadUserLocation = () => {
    if (userAuth.user?.location?.address) {
      // Don't auto-load saved address, let user choose
      console.log('💾 User has saved address available');
    }
  };

  // 🎯 NEW: High-accuracy geolocation function
  const getCurrentLocation = async () => {
    setLocationLoading(true);
    setLocationError('');
    
    try {
      console.log('📍 Starting high-accuracy location detection...');
      
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser');
      }

      // Request location with high accuracy settings
      const position = await new Promise((resolve, reject) => {
        const options = {
          enableHighAccuracy: true, // Use GPS for high accuracy
          timeout: 15000,           // 15 second timeout
          maximumAge: 0            // Don't use cached location
        };

        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('✅ Location obtained:', {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy + ' meters'
            });
            resolve(position);
          },
          (error) => {
            console.error('❌ Geolocation error:', error);
            let errorMessage = 'Unable to get your location';
            
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = 'Location access denied. Please enable location permissions.';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = 'Location information unavailable. Please try again.';
                break;
              case error.TIMEOUT:
                errorMessage = 'Location request timed out. Please try again.';
                break;
              default:
                errorMessage = 'Unable to get your location. Please try again.';
            }
            
            reject(new Error(errorMessage));
          },
          options
        );
      });

      const { latitude, longitude } = position.coords;
      console.log('🔄 Converting coordinates to address...');

      // Reverse geocode using Google Maps API
      const address = await reverseGeocode(latitude, longitude);
      
      // Parse the address components
      const parsedAddress = parseGoogleAddress(address);
      
      // Update shipping address with current location
      setShippingAddress(prev => ({
        ...prev,
        address: parsedAddress.fullAddress,
        city: parsedAddress.city,
        postalCode: parsedAddress.postalCode
      }));

      console.log('✅ Address updated successfully:', parsedAddress);
      toast.success('Current location detected successfully!');
      
    } catch (error) {
      console.error('❌ Location error:', error);
      setLocationError(error.message);
      toast.error(error.message);
    } finally {
      setLocationLoading(false);
    }
  };

  // 🎯 NEW: Reverse geocoding function
  const reverseGeocode = async (latitude, longitude) => {
    const API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    
    if (!API_KEY) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${API_KEY}&region=IN&language=en`
      );

      if (!response.ok) {
        throw new Error('Failed to get address from coordinates');
      }

      const data = await response.json();
      
      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        throw new Error('No address found for current location');
      }

      // Get the most detailed address (usually the first result)
      const bestResult = data.results[0];
      console.log('🗺️ Geocoding result:', bestResult);
      
      return bestResult;
      
    } catch (error) {
      console.error('❌ Reverse geocoding error:', error);
      throw new Error('Failed to convert location to address');
    }
  };

  // 🎯 NEW: Parse Google address components
  const parseGoogleAddress = (googleResult) => {
    const components = googleResult.address_components;
    const fullAddress = googleResult.formatted_address;
    
    let streetNumber = '';
    let route = '';
    let locality = '';
    let city = '';
    let state = '';
    let postalCode = '';
    let country = '';

    // Parse address components
    components.forEach(component => {
      const types = component.types;
      
      if (types.includes('street_number')) {
        streetNumber = component.long_name;
      }
      if (types.includes('route')) {
        route = component.long_name;
      }
      if (types.includes('locality')) {
        locality = component.long_name;
      }
      if (types.includes('administrative_area_level_2')) {
        city = component.long_name;
      }
      if (types.includes('administrative_area_level_1')) {
        state = component.long_name;
      }
      if (types.includes('postal_code')) {
        postalCode = component.long_name;
      }
      if (types.includes('country')) {
        country = component.long_name;
      }
    });

    // Build structured address
    const streetAddress = [streetNumber, route].filter(Boolean).join(' ');
    const finalCity = locality || city;
    
    return {
      fullAddress: fullAddress,
      streetAddress: streetAddress,
      city: finalCity,
      state: state,
      postalCode: postalCode,
      country: country
    };
  };

  // 🎯 ENHANCED: Handle address input mode changes
  const handleAddressInputModeChange = async (mode) => {
    setAddressInputMode(mode);
    setLocationError('');
    
    if (mode === 'saved' && userAuth.user?.location?.address) {
      // Use saved address from user profile
      setShippingAddress(prev => ({
        ...prev,
        address: userAuth.user.location.address
      }));
      toast.success('Saved address loaded');
      
    } else if (mode === 'current') {
      // Get current location
      await getCurrentLocation();
      
    } else if (mode === 'manual') {
      // Clear address for manual entry
      setShippingAddress(prev => ({
        ...prev,
        address: ''
      }));
    }
  };

  // 🎯 NEW: Handle Google Places selection for manual mode
  const handlePlaceSelected = (placeData) => {
    console.log('🏠 Place selected:', placeData);
    
    setShippingAddress(prev => ({
      ...prev,
      address: placeData.address
    }));
    
    // Try to extract city and postal code from the address
    if (placeData.address) {
      // Simple parsing for Indian addresses
      const addressParts = placeData.address.split(',').map(part => part.trim());
      
      // Look for postal code (6 digits)
      const postalCodeMatch = placeData.address.match(/\b\d{6}\b/);
      if (postalCodeMatch) {
        setShippingAddress(current => ({
          ...current,
          postalCode: postalCodeMatch[0]
        }));
      }
      
      // Try to extract city (usually after the first comma)
      if (addressParts.length > 1) {
        const potentialCity = addressParts[addressParts.length - 3] || addressParts[1];
        if (potentialCity && potentialCity.length > 2) {
          setShippingAddress(current => ({
            ...current,
            city: potentialCity
          }));
        }
      }
    }
  };

  const calculateTotals = () => {
    const subtotal = cart.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);

    const taxPrice = Math.round(subtotal * 0.18); // 18% GST
    const shippingPrice = subtotal >= 500 ? 0 : 50; // Free shipping above ₹500
    const totalPrice = subtotal + taxPrice + shippingPrice;

    return {
      subtotal: Math.round(subtotal),
      taxPrice,
      shippingPrice,
      totalPrice: Math.round(totalPrice)
    };
  };

  const validateForm = () => {
    if (!shippingAddress.address.trim()) {
      toast.error('Please enter your address');
      return false;
    }
    if (!shippingAddress.city.trim()) {
      toast.error('Please enter your city');
      return false;
    }
    if (!shippingAddress.postalCode.trim()) {
      toast.error('Please enter postal code');
      return false;
    }
    if (!shippingAddress.phone.trim()) {
      toast.error('Please enter phone number');
      return false;
    }
    if (!paymentMethod) {
      toast.error('Please select payment method');
      return false;
    }
    return true;
  };

  const handlePlaceOrder = async () => {
    if (!validateForm()) return;

    setProcessing(true);
    
    try {
      const totals = calculateTotals();
      
      // Format order data
      const orderData = orderService.formatOrderForAPI(
        cart.items,
        shippingAddress,
        paymentMethod
      );

      // Navigate to payment page with order data
      navigate('/user/payment', {
        state: {
          orderData,
          totals,
          cartItems: cart.items
        }
      });
      
    } catch (error) {
      console.error('Error processing order:', error);
      toast.error('Something went wrong while processing your order');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <UserLayout>
        <div className="container mx-auto p-4">
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading checkout...</p>
            </div>
          </div>
        </div>
      </UserLayout>
    );
  }

  const totals = calculateTotals();

  return (
    <UserLayout>
      <div className="container mx-auto p-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center mb-6">
          <button onClick={() => navigate('/user/cart')} className="mr-4">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Address */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Shipping Address</h2>
              
              {/* 🎯 NEW: Address Input Mode Selection */}
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-3">Choose address option:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Current Location Option */}
                  <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
                    <input
                      type="radio"
                      name="addressMode"
                      value="current"
                      checked={addressInputMode === 'current'}
                      onChange={(e) => handleAddressInputModeChange(e.target.value)}
                      className="mr-3 text-blue-600"
                      disabled={locationLoading}
                    />
                    <div className="flex items-center">
                      {locationLoading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
                      ) : (
                        <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                      <span className="text-sm font-medium">
                        {locationLoading ? 'Detecting...' : 'Use Current Location'}
                      </span>
                    </div>
                  </label>

                  {/* Saved Address Option */}
                  {userAuth.user?.location?.address && (
                    <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-green-50 transition-colors">
                      <input
                        type="radio"
                        name="addressMode"
                        value="saved"
                        checked={addressInputMode === 'saved'}
                        onChange={(e) => handleAddressInputModeChange(e.target.value)}
                        className="mr-3 text-green-600"
                      />
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                        <span className="text-sm font-medium">Use Saved Address</span>
                      </div>
                    </label>
                  )}

                  {/* Manual Entry Option */}
                  <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-orange-50 transition-colors">
                    <input
                      type="radio"
                      name="addressMode"
                      value="manual"
                      checked={addressInputMode === 'manual'}
                      onChange={(e) => handleAddressInputModeChange(e.target.value)}
                      className="mr-3 text-orange-600"
                    />
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      <span className="text-sm font-medium">Type Address</span>
                    </div>
                  </label>
                </div>

                {/* Location Error Display */}
                {locationError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-red-700">{locationError}</p>
                    </div>
                    <button
                      onClick={() => handleAddressInputModeChange('current')}
                      className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                    >
                      Try again
                    </button>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address *
                  </label>
                  
                  {/* 🎯 ENHANCED: Conditional Address Input */}
                  {addressInputMode === 'manual' ? (
                    <GooglePlacesAutocomplete
                      value={shippingAddress.address}
                      onChange={(address) => setShippingAddress({...shippingAddress, address})}
                      onPlaceSelected={handlePlaceSelected}
                      placeholder="Start typing your address..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  ) : (
                    <textarea
                      value={shippingAddress.address}
                      onChange={(e) => setShippingAddress({...shippingAddress, address: e.target.value})}
                      placeholder={
                        addressInputMode === 'current' 
                          ? 'Address will be detected automatically...' 
                          : 'Your saved address will appear here...'
                      }
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50"
                      readOnly={addressInputMode !== 'manual'}
                      required
                    />
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    value={shippingAddress.city}
                    onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                    placeholder="Enter city"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postal Code *
                  </label>
                  <input
                    type="text"
                    value={shippingAddress.postalCode}
                    onChange={(e) => setShippingAddress({...shippingAddress, postalCode: e.target.value})}
                    placeholder="Enter postal code"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <select
                    value={shippingAddress.country}
                    onChange={(e) => setShippingAddress({...shippingAddress, country: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="India">India</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={shippingAddress.phone}
                    onChange={(e) => setShippingAddress({...shippingAddress, phone: e.target.value})}
                    placeholder="Enter phone number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Payment Method</h2>
              
              <div className="space-y-3">
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="Card"
                    checked={paymentMethod === 'Card'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-3"
                  />
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                    </svg>
                    <span>Credit/Debit Card</span>
                  </div>
                </label>

                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="UPI"
                    checked={paymentMethod === 'UPI'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-3"
                  />
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-green-600 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <span>UPI Payment</span>
                  </div>
                </label>

                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="Cash on Delivery"
                    checked={paymentMethod === 'Cash on Delivery'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-3"
                  />
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-orange-600 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                    </svg>
                    <span>Cash on Delivery</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Order Items Preview */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Order Items ({cart.items.length})</h2>
              
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {cart.items.map((item) => (
                  <div key={item._id} className="flex items-center space-x-3 p-2 border-b border-gray-100 last:border-b-0">
                    <div className="w-12 h-12 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                      {item.product.images && item.product.images[0] ? (
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 line-clamp-1">{item.product.name}</p>
                      <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-800">₹{item.price * item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border sticky top-4">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-800">Order Summary</h2>
              </div>
              
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal ({cart.items.length} items)</span>
                  <span className="font-medium">₹{totals.subtotal}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax (18% GST)</span>
                  <span className="font-medium">₹{totals.taxPrice}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">
                    {totals.shippingPrice === 0 ? (
                      <span className="text-green-600">FREE</span>
                    ) : (
                      `₹${totals.shippingPrice}`
                    )}
                  </span>
                </div>
                
                <div className="border-t pt-3">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-orange-600">₹{totals.totalPrice}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 border-t">
                <button
                  onClick={handlePlaceOrder}
                  disabled={processing || locationLoading}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
                >
                  {processing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Place Order
                    </>
                  )}
                </button>
                
                <Link
                  to="/user/cart"
                  className="block w-full text-center text-orange-600 hover:text-orange-700 py-2 mt-3 font-medium"
                >
                  Back to Cart
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default CheckoutPage;