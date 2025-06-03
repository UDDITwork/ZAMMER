import React, { useState, useContext, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import SellerLayout from '../../components/layouts/SellerLayout';
import GooglePlacesAutocomplete from '../../components/GooglePlacesAutocomplete';
import { getSellerProfile, updateSellerProfile } from '../../services/sellerService';
import { AuthContext } from '../../contexts/AuthContext';

const ProfileSchema = Yup.object().shape({
  firstName: Yup.string().required('First name is required'),
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  mobileNumber: Yup.string().required('Mobile number is required'),
  shop: Yup.object().shape({
    name: Yup.string().required('Shop name is required'),
    address: Yup.string().required('Shop address is required'),
    category: Yup.string().required('Shop category is required'),
    description: Yup.string().max(500, 'Description cannot be more than 500 characters')
  })
});

// 🎯 NEW: Mock image upload function (same as AddProduct.js)
const mockImageUpload = async (file) => {
  try {
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create base64 data URL for reliable image display
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target.result); // Returns base64 data URL
      };
      reader.onerror = (error) => {
        console.error('File reading error:', error);
        // Fallback to a placeholder
        resolve('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiNmMGYwZjAiLz4KPHRleHQgeD0iMTUwIiB5PSIxNTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiI+U2hvcCBJbWFnZTwvdGV4dD4KPC9zdmc+');
      };
      reader.readAsDataURL(file);
    });
  } catch (error) {
    console.error('Image upload error:', error);
    // Return placeholder SVG
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiNmMGYwZjAiLz4KPHRleHQgeD0iMTUwIiB5PSIxNTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiI+U2hvcCBJbWFnZTwvdGV4dD4KPC9zdmc+';
  }
};

const EditProfile = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const { sellerAuth, loginSeller } = useContext(AuthContext);

  useEffect(() => {
    fetchSellerProfile();
  }, []);

  const fetchSellerProfile = async () => {
    setFetchLoading(true);
    try {
      const response = await getSellerProfile();
      if (response.success) {
        setProfile(response.data);
        
        // Set existing location data if available
        if (response.data.shop?.location) {
          setSelectedPlace({
            address: response.data.shop.address,
            coordinates: response.data.shop.location.coordinates
          });
        }
      } else {
        toast.error(response.message || 'Failed to fetch profile');
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      toast.error(error.message || 'Something went wrong');
    } finally {
      setFetchLoading(false);
    }
  };

  const handlePlaceSelected = (placeData) => {
    console.log('Place selected in EditProfile:', placeData);
    setSelectedPlace(placeData);
    
    // Show success message
    toast.success('Address selected successfully!');
  };

  // 🎯 NEW: Handle shop image upload
  const handleShopImageUpload = async (e, setFieldValue, currentImages) => {
    setUploadingImages(true);
    try {
      const files = Array.from(e.target.files);
      const uploadedImages = [...(currentImages || [])];
      
      console.log('📸 Uploading shop images:', files.length);
      
      for (const file of files) {
        const imageUrl = await mockImageUpload(file);
        uploadedImages.push(imageUrl);
      }
      
      setFieldValue('shop.images', uploadedImages);
      
      // Set main image if not already set
      if (uploadedImages.length > 0 && !currentImages?.length) {
        setFieldValue('shop.mainImage', uploadedImages[0]);
      }
      
      toast.success(`${files.length} shop image(s) uploaded successfully`);
    } catch (error) {
      toast.error('Failed to upload shop images');
      console.error('Shop image upload error:', error);
    } finally {
      setUploadingImages(false);
    }
  };

  // 🎯 NEW: Remove shop image
  const removeShopImage = (index, setFieldValue, currentImages) => {
    const newImages = [...currentImages];
    const removedImage = newImages.splice(index, 1)[0];
    setFieldValue('shop.images', newImages);
    
    // If removed image was the main image, set new main image
    setFieldValue('shop.mainImage', newImages.length > 0 ? newImages[0] : '');
    
    toast.success('Shop image removed');
  };

  // 🎯 NEW: Set main image
  const setMainImage = (imageUrl, setFieldValue) => {
    setFieldValue('shop.mainImage', imageUrl);
    toast.success('Main shop image updated');
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    setIsLoading(true);
    try {
      // Prepare the data with location coordinates if available
      const submitData = {
        ...values,
        shop: {
          ...values.shop,
          // Include location coordinates if a place was selected
          ...(selectedPlace && selectedPlace.coordinates && {
            location: {
              type: 'Point',
              coordinates: selectedPlace.coordinates
            }
          })
        }
      };

      console.log('🔄 Submitting profile data with shop images:', {
        ...submitData,
        shop: {
          ...submitData.shop,
          imagesCount: submitData.shop.images?.length || 0,
          hasMainImage: !!submitData.shop.mainImage
        }
      });
      
      const response = await updateSellerProfile(submitData);
      
      if (response.success) {
        // Update auth context with new data
        loginSeller({
          ...sellerAuth.seller,
          ...response.data
        });
        
        toast.success('Profile updated successfully!');
      } else {
        toast.error(response.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(error.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <SellerLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Premium Header */}
          <div className="relative mb-12">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500 rounded-3xl transform rotate-1 opacity-10"></div>
            <div className="relative bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-indigo-800 to-purple-600 bg-clip-text text-transparent">
                      Profile Settings
                    </h1>
                    <p className="text-lg text-gray-600 mt-2">Manage your personal and business information</p>
                  </div>
                </div>
                
                {selectedPlace && selectedPlace.coordinates && (
                  <div className="flex items-center bg-green-50 border border-green-200 rounded-xl px-4 py-2">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <span className="text-green-700 font-medium text-sm">Location Saved</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        
          {fetchLoading ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-12">
              <div className="flex justify-center items-center">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                </div>
                <span className="ml-4 text-gray-600 font-medium text-lg">Loading your profile...</span>
              </div>
            </div>
          ) : profile ? (
            <Formik
              initialValues={{
                firstName: profile.firstName || '',
                email: profile.email || '',
                mobileNumber: profile.mobileNumber || '',
                shop: {
                  name: profile.shop?.name || '',
                  address: profile.shop?.address || '',
                  gstNumber: profile.shop?.gstNumber || '',
                  phoneNumber: {
                    main: profile.shop?.phoneNumber?.main || '',
                    alternate: profile.shop?.phoneNumber?.alternate || ''
                  },
                  category: profile.shop?.category || '',
                  openTime: profile.shop?.openTime || '',
                  closeTime: profile.shop?.closeTime || '',
                  workingDays: profile.shop?.workingDays || '',
                  description: profile.shop?.description || '',
                  images: profile.shop?.images || [],
                  mainImage: profile.shop?.mainImage || ''
                },
                bankDetails: {
                  accountNumber: profile.bankDetails?.accountNumber || '',
                  ifscCode: profile.bankDetails?.ifscCode || '',
                  bankName: profile.bankDetails?.bankName || '',
                  accountType: profile.bankDetails?.accountType || ''
                }
              }}
              validationSchema={ProfileSchema}
              onSubmit={handleSubmit}
            >
              {({ values, setFieldValue, isSubmitting, errors, touched }) => (
                <Form className="space-y-8">
                  
                  {/* Personal Information */}
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                    <div className="relative bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/50">
                      <div className="flex items-center mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg mr-4">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Personal Information</h2>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div>
                          <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-3">
                            First Name*
                          </label>
                          <Field
                            id="firstName"
                            name="firstName"
                            type="text"
                            className="block w-full px-5 py-4 bg-white/70 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-base backdrop-blur-sm"
                            placeholder="Your first name"
                          />
                          <ErrorMessage
                            name="firstName"
                            component="div"
                            className="text-red-500 text-sm mt-2 font-medium"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-3">
                            Email Address*
                          </label>
                          <Field
                            id="email"
                            name="email"
                            type="email"
                            className="block w-full px-5 py-4 bg-white/70 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-base backdrop-blur-sm"
                            placeholder="your@email.com"
                          />
                          <ErrorMessage
                            name="email"
                            component="div"
                            className="text-red-500 text-sm mt-2 font-medium"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="mobileNumber" className="block text-sm font-semibold text-gray-700 mb-3">
                            Mobile Number*
                          </label>
                          <Field
                            id="mobileNumber"
                            name="mobileNumber"
                            type="text"
                            className="block w-full px-5 py-4 bg-white/70 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-base backdrop-blur-sm"
                            placeholder="+91 XXXXX XXXXX"
                          />
                          <ErrorMessage
                            name="mobileNumber"
                            component="div"
                            className="text-red-500 text-sm mt-2 font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Shop Information */}
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                    <div className="relative bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/50">
                      <div className="flex items-center mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg mr-4">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Shop Information</h2>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                          <label htmlFor="shop.name" className="block text-sm font-semibold text-gray-700 mb-3">
                            Shop Name*
                          </label>
                          <Field
                            id="shop.name"
                            name="shop.name"
                            type="text"
                            className="block w-full px-5 py-4 bg-white/70 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-base backdrop-blur-sm"
                            placeholder="Your shop name"
                          />
                          <ErrorMessage
                            name="shop.name"
                            component="div"
                            className="text-red-500 text-sm mt-2 font-medium"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="shop.address" className="block text-sm font-semibold text-gray-700 mb-3">
                            Shop Address*
                          </label>
                          <GooglePlacesAutocomplete
                            value={values.shop.address}
                            onChange={(address) => setFieldValue('shop.address', address)}
                            onPlaceSelected={handlePlaceSelected}
                            placeholder="Enter your shop address"
                            className="block w-full px-5 py-4 bg-white/70 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-base backdrop-blur-sm"
                            error={errors.shop?.address && touched.shop?.address ? errors.shop.address : null}
                          />
                          <ErrorMessage
                            name="shop.address"
                            component="div"
                            className="text-red-500 text-sm mt-2 font-medium"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="shop.gstNumber" className="block text-sm font-semibold text-gray-700 mb-3">
                            GST Number <span className="text-gray-400">(Optional)</span>
                          </label>
                          <Field
                            id="shop.gstNumber"
                            name="shop.gstNumber"
                            type="text"
                            className="block w-full px-5 py-4 bg-white/70 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-base backdrop-blur-sm"
                            placeholder="GST Registration Number"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="shop.category" className="block text-sm font-semibold text-gray-700 mb-3">
                            Shop Category*
                          </label>
                          <Field
                            as="select"
                            id="shop.category"
                            name="shop.category"
                            className="block w-full px-5 py-4 bg-white/70 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-base backdrop-blur-sm"
                          >
                            <option value="">Select a category</option>
                            <option value="Men">Men's Fashion</option>
                            <option value="Women">Women's Fashion</option>
                            <option value="Kids">Kids Fashion</option>
                          </Field>
                          <ErrorMessage
                            name="shop.category"
                            component="div"
                            className="text-red-500 text-sm mt-2 font-medium"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="shop.phoneNumber.main" className="block text-sm font-semibold text-gray-700 mb-3">
                            Shop Phone Number
                          </label>
                          <Field
                            id="shop.phoneNumber.main"
                            name="shop.phoneNumber.main"
                            type="text"
                            className="block w-full px-5 py-4 bg-white/70 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-base backdrop-blur-sm"
                            placeholder="Shop contact number"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="shop.phoneNumber.alternate" className="block text-sm font-semibold text-gray-700 mb-3">
                            Alternate Phone <span className="text-gray-400">(Optional)</span>
                          </label>
                          <Field
                            id="shop.phoneNumber.alternate"
                            name="shop.phoneNumber.alternate"
                            type="text"
                            className="block w-full px-5 py-4 bg-white/70 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-base backdrop-blur-sm"
                            placeholder="Alternative contact number"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="shop.openTime" className="block text-sm font-semibold text-gray-700 mb-3">
                            Opening Time
                          </label>
                          <Field
                            id="shop.openTime"
                            name="shop.openTime"
                            type="text"
                            placeholder="e.g. 9:00 AM"
                            className="block w-full px-5 py-4 bg-white/70 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-base backdrop-blur-sm"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="shop.closeTime" className="block text-sm font-semibold text-gray-700 mb-3">
                            Closing Time
                          </label>
                          <Field
                            id="shop.closeTime"
                            name="shop.closeTime"
                            type="text"
                            placeholder="e.g. 8:00 PM"
                            className="block w-full px-5 py-4 bg-white/70 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-base backdrop-blur-sm"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="shop.workingDays" className="block text-sm font-semibold text-gray-700 mb-3">
                            Working Days
                          </label>
                          <Field
                            id="shop.workingDays"
                            name="shop.workingDays"
                            type="text"
                            placeholder="e.g. Monday to Saturday"
                            className="block w-full px-5 py-4 bg-white/70 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-base backdrop-blur-sm"
                          />
                        </div>
                      </div>

                      {/* Shop Description */}
                      <div className="mt-8">
                        <label htmlFor="shop.description" className="block text-sm font-semibold text-gray-700 mb-3">
                          Shop Description <span className="text-gray-400">(Optional)</span>
                        </label>
                        <Field
                          as="textarea"
                          id="shop.description"
                          name="shop.description"
                          rows={4}
                          className="block w-full px-5 py-4 bg-white/70 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-base backdrop-blur-sm resize-none"
                          placeholder="Tell customers about your shop, what you sell, and what makes you special..."
                        />
                        <ErrorMessage
                          name="shop.description"
                          component="div"
                          className="text-red-500 text-sm mt-2 font-medium"
                        />
                        <div className="flex justify-between items-center mt-2">
                          <div className={`text-sm ${values.shop.description.length > 400 ? 'text-orange-600' : 'text-gray-500'}`}>
                            {values.shop.description.length}/500 characters
                          </div>
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                values.shop.description.length > 400 ? 'bg-orange-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${(values.shop.description.length / 500) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Location Preview */}
                      {selectedPlace && selectedPlace.coordinates && (
                        <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center mr-4">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-bold text-green-800">Location Coordinates Captured</p>
                              <p className="text-sm text-green-600">
                                Lat: {selectedPlace.coordinates[1].toFixed(6)}, 
                                Lng: {selectedPlace.coordinates[0].toFixed(6)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Shop Images Section */}
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                    <div className="relative bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/50">
                      <div className="flex items-center mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg mr-4">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Shop Gallery</h2>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-4">
                          Upload Shop Images
                        </label>
                        
                        {values.shop.images.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                            {values.shop.images.map((image, index) => (
                              <div key={index} className="relative group">
                                <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden shadow-lg">
                                  <img 
                                    src={image} 
                                    alt={`Shop ${index + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                </div>
                                
                                {/* Main Image Badge */}
                                {values.shop.mainImage === image && (
                                  <div className="absolute top-2 left-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                                    ⭐ Main
                                  </div>
                                )}
                                
                                {/* Action Buttons */}
                                <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {values.shop.mainImage !== image && (
                                    <button
                                      type="button"
                                      onClick={() => setMainImage(image, setFieldValue)}
                                      className="w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
                                      title="Set as main image"
                                    >
                                      <span className="text-xs">★</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => removeShopImage(index, setFieldValue, values.shop.images)}
                                    className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
                                    title="Remove image"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="border-2 border-dashed border-purple-300 rounded-2xl p-8 hover:border-purple-400 hover:bg-purple-50/50 transition-all duration-200">
                          <label className="block cursor-pointer">
                            <div className="text-center">
                              <svg className="mx-auto h-16 w-16 text-purple-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              <div className="text-lg font-semibold text-gray-700 mb-2">
                                {uploadingImages ? 'Uploading Shop Images...' : 'Upload Shop Images'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {uploadingImages ? (
                                  <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500 mr-2"></div>
                                    Processing your images...
                                  </div>
                                ) : (
                                  'Showcase your shop with beautiful photos'
                                )}
                              </div>
                            </div>
                            <input 
                              type="file" 
                              multiple
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleShopImageUpload(e, setFieldValue, values.shop.images)}
                              disabled={uploadingImages}
                            />
                          </label>
                        </div>
                        
                        <p className="text-sm text-gray-500 mt-3">
                          💡 <strong>Tip:</strong> Upload high-quality images that represent your shop. The first image or the one you mark as "main" will be featured prominently.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bank Information */}
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                    <div className="relative bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/50">
                      <div className="flex items-center mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg mr-4">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Banking Information</h2>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                          <label htmlFor="bankDetails.bankName" className="block text-sm font-semibold text-gray-700 mb-3">
                            Bank Name
                          </label>
                          <Field
                            id="bankDetails.bankName"
                            name="bankDetails.bankName"
                            type="text"
                            className="block w-full px-5 py-4 bg-white/70 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-base backdrop-blur-sm"
                            placeholder="Bank name"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="bankDetails.accountNumber" className="block text-sm font-semibold text-gray-700 mb-3">
                            Account Number
                          </label>
                          <Field
                            id="bankDetails.accountNumber"
                            name="bankDetails.accountNumber"
                            type="text"
                            className="block w-full px-5 py-4 bg-white/70 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-base backdrop-blur-sm"
                            placeholder="Account number"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="bankDetails.ifscCode" className="block text-sm font-semibold text-gray-700 mb-3">
                            IFSC Code
                          </label>
                          <Field
                            id="bankDetails.ifscCode"
                            name="bankDetails.ifscCode"
                            type="text"
                            className="block w-full px-5 py-4 bg-white/70 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-base backdrop-blur-sm"
                            placeholder="IFSC code"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="bankDetails.accountType" className="block text-sm font-semibold text-gray-700 mb-3">
                            Account Type
                          </label>
                          <Field
                            as="select"
                            id="bankDetails.accountType"
                            name="bankDetails.accountType"
                            className="block w-full px-5 py-4 bg-white/70 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-base backdrop-blur-sm"
                          >
                            <option value="">Select account type</option>
                            <option value="Savings">Savings Account</option>
                            <option value="Current">Current Account</option>
                          </Field>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submit Section */}
                  <div className="flex justify-end space-x-6 pt-8">
                    <button
                      type="button"
                      onClick={() => window.history.back()}
                      className="px-8 py-4 border-2 border-gray-300 rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || isLoading || uploadingImages}
                      className={`px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 font-semibold ${
                        (isSubmitting || isLoading || uploadingImages) ? 'opacity-70 cursor-not-allowed' : 'hover:from-indigo-600 hover:to-purple-600'
                      }`}
                    >
                      {isLoading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                          Saving Changes...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Save Changes
                        </div>
                      )}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-12 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Unable to Load Profile</h3>
              <p className="text-gray-600 mb-6">We couldn't fetch your profile data. Please try again.</p>
              <button
                onClick={fetchSellerProfile}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </SellerLayout>
  );
};

export default EditProfile;