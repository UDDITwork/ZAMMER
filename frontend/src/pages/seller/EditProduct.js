import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik';
import * as Yup from 'yup';
import SellerLayout from '../../components/layouts/SellerLayout';
import { getProductById, updateProduct, deleteImage } from '../../services/productService';

// 🎯 FIXED: Categories EXACTLY matching backend Product.js schema
const productCategories = {
  Men: {
    subCategories: [
      'T-shirts', 'Shirts', 'Jeans', 'Ethnic Wear', 'Jackets',
      'Tops', 'Tees', 'Sleepwear', 'Top Wear'
    ]
  },
  Women: {
    subCategories: [
      'Kurtis', 'Tops', 'T-shirts', 'Dresses', 'Jeans', 'Sarees', 'Blouses', 'Petticoats',
      'Leggings', 'Palazzos', 'Nightwear', 'Sleepwear', 'Lehengas', 'Ethnic Sets',
      'Co-ord Sets', 'Gowns', 'Shrugs', 'Tunics', 'Skirts', 'Jumpsuits', 'Sharara', 'Dupatta'
    ]
  },
  Kids: {
    subCategories: [
      'T-shirts', 'Shirts', 'Boys Sets', 'Top Wear', 'Nightwear', 'Sleepwear'
    ]
  }
};

// 🎯 FIXED: Product categories exactly matching backend enum (20 items)
const productCategoryOptions = [
  { value: '', label: 'Select Product Category' },
  { value: 'Traditional Indian', label: 'Traditional Indian' },
  { value: 'Ethnic Wear', label: 'Ethnic Wear' },
  { value: 'Western Wear', label: 'Western Wear' },
  { value: 'Fusion Wear', label: 'Fusion Wear' },
  { value: 'Party Wear', label: 'Party Wear' },
  { value: 'Casual Wear', label: 'Casual Wear' },
  { value: 'Daily Wear', label: 'Daily Wear' },
  { value: 'Office Wear', label: 'Office Wear' },
  { value: 'Festive Wear', label: 'Festive Wear' },
  { value: 'Wedding Wear', label: 'Wedding Wear' },
  { value: 'Winter Fashion', label: 'Winter Fashion' },
  { value: 'Summer Wear', label: 'Summer Wear' },
  { value: 'Nightwear & Loungewear', label: 'Nightwear & Loungewear' },
  { value: 'Activewear', label: 'Activewear' },
  { value: 'Travel Wear', label: 'Travel Wear' },
  { value: 'College Wear', label: 'College Wear' },
  { value: 'Maternity Wear', label: 'Maternity Wear' },
  { value: 'Plus Size Wear', label: 'Plus Size Wear' },
  { value: 'Saree Essentials', label: 'Saree Essentials' },
  { value: 'Kids-Friendly Wear', label: 'Kids-Friendly Wear' }
];

// Size options aligned with backend enum
const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

// Common color options with hex codes
const colorOptions = [
  { name: 'Black', code: '#000000' },
  { name: 'White', code: '#FFFFFF' },
  { name: 'Red', code: '#FF0000' },
  { name: 'Blue', code: '#0000FF' },
  { name: 'Green', code: '#008000' },
  { name: 'Yellow', code: '#FFFF00' },
  { name: 'Purple', code: '#800080' },
  { name: 'Orange', code: '#FFA500' },
  { name: 'Pink', code: '#FFC0CB' },
  { name: 'Brown', code: '#964B00' },
  { name: 'Gray', code: '#808080' },
  { name: 'Navy', code: '#000080' },
  { name: 'Maroon', code: '#800000' },
  { name: 'Olive', code: '#808000' },
  { name: 'Cyan', code: '#00FFFF' },
  { name: 'Magenta', code: '#FF00FF' }
];

// Validation schema aligned with backend
const productSchema = Yup.object().shape({
  name: Yup.string()
    .required('Product name is required')
    .max(100, 'Name cannot be more than 100 characters'),
  description: Yup.string()
    .required('Description is required')
    .max(1000, 'Description cannot be more than 1000 characters'),
  category: Yup.string().required('Category is required'),
  subCategory: Yup.string().required('Sub-category is required'),
  productCategory: Yup.string().required('Product category is required'),
  zammerPrice: Yup.number()
    .required('Zammer price is required')
    .positive('Price must be positive'),
  mrp: Yup.number()
    .required('MRP is required')
    .positive('MRP must be positive')
    .test('mrp-greater', 'MRP should be greater than or equal to Zammer price', function(value) {
      const { zammerPrice } = this.parent;
      return !zammerPrice || !value || value >= zammerPrice;
    }),
  variants: Yup.array().of(
    Yup.object().shape({
      color: Yup.string().required('Color is required'),
      colorCode: Yup.string().required('Color code is required'),
      size: Yup.string().required('Size is required'),
      quantity: Yup.number()
        .required('Quantity is required')
        .min(0, 'Quantity must be at least 0')
    })
  ).min(1, 'At least one variant is required'),
  images: Yup.array().min(1, 'At least one image is required')
});

// 🎯 IMPROVED: Better mock image upload with base64 fallback
const mockImageUpload = async (file) => {
  try {
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 🎯 FIXED: Create base64 data URL for reliable image display
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target.result); // Returns base64 data URL
      };
      reader.onerror = (error) => {
        console.error('File reading error:', error);
        // Fallback to a placeholder
        resolve('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiNmMGYwZjAiLz4KPHRleHQgeD0iMTUwIiB5PSIxNTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiI+UHJvZHVjdCBJbWFnZTwvdGV4dD4KPC9zdmc+');
      };
      reader.readAsDataURL(file);
    });
  } catch (error) {
    console.error('Image upload error:', error);
    // Return placeholder SVG
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiNmMGYwZjAiLz4KPHRleHQgeD0iMTUwIiB5PSIxNTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiI+UHJvZHVjdCBJbWFnZTwvdGV4dD4KPC9zdmc+';
  }
};

const EditProduct = () => {
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [product, setProduct] = useState(null);
  const [initialValues, setInitialValues] = useState(null);
  const navigate = useNavigate();

  // 🎯 NEW: Fetch product data on component mount
  useEffect(() => {
    fetchProductData();
  }, [id]);

  const fetchProductData = async () => {
    setLoadingProduct(true);
    try {
      const response = await getProductById(id);
      if (response.success) {
        const productData = response.data;
        setProduct(productData);
        
        // 🎯 IMPORTANT: Transform product data to match form structure
        const formData = {
          name: productData.name || '',
          description: productData.description || '',
          category: productData.category || '',
          subCategory: productData.subCategory || '',
          productCategory: productData.productCategory || '',
          zammerPrice: productData.zammerPrice || '',
          mrp: productData.mrp || '',
          variants: productData.variants && productData.variants.length > 0 
            ? productData.variants.map(variant => ({
                color: variant.color || '',
                colorCode: variant.colorCode || '',
                size: variant.size || '',
                quantity: variant.quantity || 1
              }))
            : [{ color: '', colorCode: '', size: '', quantity: 1 }],
          images: productData.images || [],
          tags: productData.tags || [],
          isLimitedEdition: productData.isLimitedEdition || false,
          isTrending: productData.isTrending || false
        };
        
        setInitialValues(formData);
      } else {
        toast.error(response.message || 'Failed to fetch product details');
        navigate('/seller/view-products');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Something went wrong while fetching product details');
      navigate('/seller/view-products');
    } finally {
      setLoadingProduct(false);
    }
  };

  const handleImageUpload = async (e, setFieldValue, images) => {
    setUploadingImages(true);
    try {
      const files = Array.from(e.target.files);
      const uploadedImages = [...images];
      
      for (const file of files) {
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('sellerToken')}`
          }
        });
        
        const data = await response.json();
        if (data.success) {
          uploadedImages.push(data.data.url);
        }
      }
      
      setFieldValue('images', uploadedImages);
      toast.success(`${files.length} image(s) uploaded successfully`);
    } catch (error) {
      toast.error('Failed to upload images');
      console.error('Image upload error:', error);
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = async (index, setFieldValue, images) => {
    try {
      const imageUrl = images[index];
      // Extract public_id from Cloudinary URL
      const publicId = imageUrl.split('/').slice(-1)[0].split('.')[0];
      
      // Delete from Cloudinary
      await deleteImage(publicId);
      
      // Update local state
      const newImages = [...images];
      newImages.splice(index, 1);
      setFieldValue('images', newImages);
      
      toast.success('Image removed');
    } catch (error) {
      toast.error('Failed to remove image');
      console.error('Image removal error:', error);
    }
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    setIsLoading(true);
    try {
      // Transform data to match backend schema exactly
      const productData = {
        ...values,
        // Ensure variants match backend VariantSchema exactly
        variants: values.variants.map(variant => ({
          color: variant.color,
          colorCode: variant.colorCode,
          size: variant.size,
          quantity: Number(variant.quantity), // Ensure it's a number
          images: [] // Variant-specific images can be added later
        }))
      };

      // Log the data being sent
      console.log('📦 Submitting product data:', {
        productId: id,
        mrp: productData.mrp,
        zammerPrice: productData.zammerPrice,
        difference: Number(productData.mrp) - Number(productData.zammerPrice),
        variantsCount: productData.variants.length,
        hasImages: productData.images && productData.images.length > 0
      });
      
      // 🎯 DEBUG: Log complete data being sent
      console.log('🔍 Complete product data being sent:', JSON.stringify(productData, null, 2));
      
      const response = await updateProduct(id, productData);
      
      if (response.success) {
        toast.success('Product updated successfully!');
        navigate('/seller/view-products');
      } else {
        toast.error(response.message || 'Failed to update product');
      }
    } catch (error) {
      console.error('Product update error:', {
        message: error.message,
        details: error.details,
        validationErrors: error.validationErrors
      });
      
      // 🎯 DEBUG: Log the actual validation error details
      if (error.details && Array.isArray(error.details)) {
        console.error('🔍 Validation Error Details:', error.details);
      }
      if (error.validationErrors && Array.isArray(error.validationErrors)) {
        console.error('🔍 Validation Errors Array:', error.validationErrors);
      }
      
      // 🎯 ENHANCED: Better error message handling
      if (error.validationErrors && Array.isArray(error.validationErrors)) {
        // Show all validation errors
        const errorMessages = error.validationErrors.map(err => 
          `${err.field}: ${err.message}`
        ).join('\n');
        toast.error(`Validation Errors:\n${errorMessages}`);
      } else if (error.details) {
        // Show specific validation error with details
        if (typeof error.details === 'object') {
          const detailsStr = Object.entries(error.details)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
          toast.error(`Validation Error: ${error.message}\n${detailsStr}`);
        } else {
          toast.error(`Validation Error: ${error.message}\n${error.details}`);
        }
      } else if (error.message && error.message.includes('validation failed')) {
        const errorDetails = error.message.split(':').slice(1).join(':').trim();
        toast.error(`Validation Error: ${errorDetails}`);
      } else if (error.message && error.message.includes('enum')) {
        toast.error('Please select from the available dropdown options only');
      } else {
        toast.error(error.message || 'Something went wrong while updating the product');
      }
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  };

  // Show loading state while fetching product
  if (loadingProduct) {
    return (
      <SellerLayout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading product details...</p>
          </div>
        </div>
      </SellerLayout>
    );
  }

  // Show error if no initial values (product not found)
  if (!initialValues) {
    return (
      <SellerLayout>
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">Product not found.</p>
          <button
            onClick={() => navigate('/seller/view-products')}
            className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-md text-sm"
          >
            Back to Products
          </button>
        </div>
      </SellerLayout>
    );
  }
  
  return (
    <SellerLayout>
      <div className="edit-product-container">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Edit Product</h1>
          <p className="text-gray-600 text-sm">Update your product details</p>
        </div>
        
        <Formik
          initialValues={initialValues}
          validationSchema={productSchema}
          onSubmit={handleSubmit}
          enableReinitialize={true} // Important: allows form to update when initialValues change
        >
          {({ values, setFieldValue, isSubmitting, errors, touched }) => (
            <Form className="space-y-6">
              {/* Basic Information Section */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mr-2">
                    <span className="text-orange-600 text-sm font-bold">1</span>
                  </div>
                  Basic Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Product Name */}
                  <div className="md:col-span-2">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Product Name*
                    </label>
                    <Field
                      id="name"
                      name="name"
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      placeholder="Enter product name (max 100 characters)"
                    />
                    <ErrorMessage
                      name="name"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>
                  
                  {/* Category */}
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                      Category*
                    </label>
                    <Field
                      as="select"
                      id="category"
                      name="category"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      onChange={(e) => {
                        const category = e.target.value;
                        setFieldValue('category', category);
                        setFieldValue('subCategory', '');
                      }}
                    >
                      <option value="">Select Category</option>
                      {Object.keys(productCategories).map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </Field>
                    <ErrorMessage
                      name="category"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>
                  
                  {/* Sub Category */}
                  <div>
                    <label htmlFor="subCategory" className="block text-sm font-medium text-gray-700 mb-1">
                      Sub Category*
                    </label>
                    <Field
                      as="select"
                      id="subCategory"
                      name="subCategory"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      disabled={!values.category}
                    >
                      <option value="">Select Sub Category</option>
                      {values.category && 
                        productCategories[values.category].subCategories.map((subCategory) => (
                          <option key={subCategory} value={subCategory}>
                            {subCategory}
                          </option>
                        ))
                      }
                    </Field>
                    <ErrorMessage
                      name="subCategory"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                    {!values.category && (
                      <p className="text-xs text-gray-500 mt-1">Please select a category first</p>
                    )}
                  </div>
                  
                  {/* Product Category */}
                  <div className="md:col-span-2">
                    <label htmlFor="productCategory" className="block text-sm font-medium text-gray-700 mb-1">
                      Product Category*
                    </label>
                    <Field
                      as="select"
                      id="productCategory"
                      name="productCategory"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                    >
                      {productCategoryOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Field>
                    <ErrorMessage
                      name="productCategory"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>
                </div>
                
                {/* Description */}
                <div className="mt-6">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description*
                  </label>
                  <Field
                    as="textarea"
                    id="description"
                    name="description"
                    rows={4}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                    placeholder="Describe your product in detail (max 1000 characters)"
                  />
                  <ErrorMessage
                    name="description"
                    component="div"
                    className="text-red-500 text-sm mt-1"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {values.description.length}/1000 characters
                  </div>
                </div>
              </div>

              {/* Pricing Section */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mr-2">
                    <span className="text-orange-600 text-sm font-bold">2</span>
                  </div>
                  Pricing
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="zammerPrice" className="block text-sm font-medium text-gray-700 mb-1">
                      Zammer Price (₹)*
                    </label>
                    <Field
                      id="zammerPrice"
                      name="zammerPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      placeholder="Enter selling price"
                    />
                    <ErrorMessage
                      name="zammerPrice"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="mrp" className="block text-sm font-medium text-gray-700 mb-1">
                      MRP (₹)*
                    </label>
                    <Field
                      id="mrp"
                      name="mrp"
                      type="number"
                      min="0"
                      step="0.01"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      placeholder="Enter maximum retail price"
                    />
                    <ErrorMessage
                      name="mrp"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>
                </div>
                
                {/* Discount Calculation */}
                {values.zammerPrice && values.mrp && Number(values.mrp) > Number(values.zammerPrice) && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center">
                      <div className="text-green-600 text-sm font-medium">
                        💰 Discount: {Math.round(((Number(values.mrp) - Number(values.zammerPrice)) / Number(values.mrp)) * 100)}%
                      </div>
                      <div className="ml-4 text-green-600 text-sm">
                        Savings: ₹{(Number(values.mrp) - Number(values.zammerPrice)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Variants Section */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mr-2">
                    <span className="text-orange-600 text-sm font-bold">3</span>
                  </div>
                  Product Variants
                </h2>
                
                <FieldArray name="variants">
                  {({ remove, push }) => (
                    <div>
                      {values.variants.map((variant, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                          <div className="md:col-span-5 mb-2">
                            <h4 className="font-medium text-gray-700">Variant {index + 1}</h4>
                          </div>
                          
                          {/* Color Selection */}
                          <div>
                            <label 
                              htmlFor={`variants.${index}.color`}
                              className="block text-sm font-medium text-gray-700 mb-1"
                            >
                              Color*
                            </label>
                            <Field
                              as="select"
                              id={`variants.${index}.color`}
                              name={`variants.${index}.color`}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                              onChange={(e) => {
                                const selectedColor = colorOptions.find(color => color.name === e.target.value);
                                setFieldValue(`variants.${index}.color`, e.target.value);
                                if (selectedColor) {
                                  setFieldValue(`variants.${index}.colorCode`, selectedColor.code);
                                }
                              }}
                            >
                              <option value="">Select Color</option>
                              {colorOptions.map((color) => (
                                <option key={color.name} value={color.name}>
                                  {color.name}
                                </option>
                              ))}
                            </Field>
                            <ErrorMessage
                              name={`variants.${index}.color`}
                              component="div"
                              className="text-red-500 text-xs mt-1"
                            />
                          </div>

                          {/* Color Code Preview */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Preview
                            </label>
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-8 h-8 border border-gray-300 rounded"
                                style={{ backgroundColor: variant.colorCode || '#f0f0f0' }}
                              ></div>
                              <Field
                                name={`variants.${index}.colorCode`}
                                type="text"
                                placeholder="#000000"
                                className="block w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                              />
                            </div>
                            <ErrorMessage
                              name={`variants.${index}.colorCode`}
                              component="div"
                              className="text-red-500 text-xs mt-1"
                            />
                          </div>
                          
                          {/* Size Selection */}
                          <div>
                            <label 
                              htmlFor={`variants.${index}.size`}
                              className="block text-sm font-medium text-gray-700 mb-1"
                            >
                              Size*
                            </label>
                            <Field
                              as="select"
                              id={`variants.${index}.size`}
                              name={`variants.${index}.size`}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                            >
                              <option value="">Select Size</option>
                              {sizeOptions.map((size) => (
                                <option key={size} value={size}>
                                  {size}
                                </option>
                              ))}
                            </Field>
                            <ErrorMessage
                              name={`variants.${index}.size`}
                              component="div"
                              className="text-red-500 text-xs mt-1"
                            />
                          </div>
                          
                          {/* Quantity */}
                          <div>
                            <label 
                              htmlFor={`variants.${index}.quantity`}
                              className="block text-sm font-medium text-gray-700 mb-1"
                            >
                              Quantity*
                            </label>
                            <Field
                              id={`variants.${index}.quantity`}
                              name={`variants.${index}.quantity`}
                              type="number"
                              min="0"
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                            />
                            <ErrorMessage
                              name={`variants.${index}.quantity`}
                              component="div"
                              className="text-red-500 text-xs mt-1"
                            />
                          </div>
                          
                          {/* Remove Button */}
                          <div className="flex items-end">
                            {index > 0 && (
                              <button
                                type="button"
                                onClick={() => remove(index)}
                                className="text-red-600 hover:text-red-800 font-medium text-sm px-3 py-2 border border-red-300 rounded hover:bg-red-50 transition-colors"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      <button
                        type="button"
                        onClick={() => push({ color: '', colorCode: '', size: '', quantity: 1 })}
                        className="mt-2 px-4 py-2 border border-orange-300 rounded-md shadow-sm text-sm font-medium text-orange-600 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                      >
                        + Add Another Variant
                      </button>
                    </div>
                  )}
                </FieldArray>
              </div>

              {/* Images Section */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mr-2">
                    <span className="text-orange-600 text-sm font-bold">4</span>
                  </div>
                  Product Images
                </h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Images*
                  </label>
                  
                  {values.images.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                      {values.images.map((image, index) => (
                        <div key={index} className="relative h-24 bg-gray-100 rounded-md overflow-hidden">
                          <img 
                            src={image} 
                            alt={`Product ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index, setFieldValue, values.images)}
                            className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-2">
                    <label className="block">
                      <span className="sr-only">Choose product images</span>
                      <input 
                        type="file" 
                        multiple
                        accept="image/*"
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100"
                        onChange={(e) => handleImageUpload(e, setFieldValue, values.images)}
                        disabled={uploadingImages}
                      />
                    </label>
                    {uploadingImages && (
                      <div className="mt-2 text-sm text-gray-500 flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500 mr-2"></div>
                        Uploading images...
                      </div>
                    )}
                    <ErrorMessage
                      name="images"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Supported formats: JPG, PNG, GIF. Max size: 5MB per image.
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mr-2">
                    <span className="text-orange-600 text-sm font-bold">5</span>
                  </div>
                  Additional Information
                </h2>
                
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Field
                      id="isLimitedEdition"
                      name="isLimitedEdition"
                      type="checkbox"
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isLimitedEdition" className="ml-2 block text-sm text-gray-700">
                      Limited Edition Product
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <Field
                      id="isTrending"
                      name="isTrending"
                      type="checkbox"
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isTrending" className="ml-2 block text-sm text-gray-700">
                      Mark as Trending
                    </label>
                  </div>
                  
                  <div>
                    <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                      Tags (comma separated)
                    </label>
                    <input
                      id="tags"
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      placeholder="E.g., summer, casual, cotton, comfortable"
                      value={values.tags.join(', ')}
                      onChange={(e) => {
                        const tagsString = e.target.value;
                        const tagsArray = tagsString
                          .split(',')
                          .map(tag => tag.trim())
                          .filter(tag => tag);
                        setFieldValue('tags', tagsArray);
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Tags help customers find your product easily
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Section */}
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/seller/view-products')}
                  className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isLoading || uploadingImages}
                  className={`px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${
                    (isSubmitting || isLoading || uploadingImages) ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating Product...
                    </div>
                  ) : (
                    'Update Product'
                  )}
                </button>
              </div>
            </Form>
          )}
        </Formik>
    </div>
    </SellerLayout>
  );
};

export default EditProduct; 