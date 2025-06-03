import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik';
import * as Yup from 'yup';
import SellerLayout from '../../components/layouts/SellerLayout';
import { createProduct } from '../../services/productService';

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
      'Kurties', 'Tops', 'Tees', 'Dresses', 'Jeans', 'Nightwear', 
      'Sleepwear', 'Lehengass', 'Rayon', 'Shrugs'
    ]
  },
  Kids: {
    subCategories: [
      'T-shirts', 'Shirts', 'Boys Sets', 'Top Wear', 'Nightwear', 'Sleepwear'
    ]
  }
};

// 🎯 FIXED: Product categories exactly matching backend enum
const productCategoryOptions = [
  { value: '', label: 'Select Product Category' },
  { value: 'Traditional Indian', label: 'Traditional Indian' },
  { value: 'Winter Fashion', label: 'Winter Fashion' },
  { value: 'Party Wear', label: 'Party Wear' },
  { value: 'Sports Destination', label: 'Sports Destination' },
  { value: 'Office Wear', label: 'Office Wear' }
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

const AddProduct = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const navigate = useNavigate();

  const handleImageUpload = async (e, setFieldValue, images) => {
    setUploadingImages(true);
    try {
      const files = Array.from(e.target.files);
      const uploadedImages = [...images];
      
      for (const file of files) {
        const imageUrl = await mockImageUpload(file);
        uploadedImages.push(imageUrl);
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

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
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

      console.log('Submitting product data:', productData);
      
      const response = await createProduct(productData);
      
      if (response.success) {
        toast.success('Product added successfully!');
        resetForm();
        navigate('/seller/view-products');
      } else {
        toast.error(response.message || 'Failed to add product');
      }
    } catch (error) {
      console.error('Product creation error:', error);
      
      // Enhanced error message handling
      if (error.message && error.message.includes('validation failed')) {
        const errorDetails = error.message.split(':').slice(1).join(':').trim();
        toast.error(`Validation Error: ${errorDetails}`);
      } else if (error.message && error.message.includes('enum')) {
        toast.error('Please select from the available dropdown options only');
      } else {
        toast.error(error.message || 'Something went wrong while adding the product');
      }
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
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 rounded-3xl transform rotate-1 opacity-10"></div>
            <div className="relative bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-orange-600 bg-clip-text text-transparent">
                    Create New Product
                  </h1>
                  <p className="text-lg text-gray-600 mt-2">Build your next bestseller with our premium product creator</p>
                </div>
              </div>
            </div>
          </div>
        
          <Formik
            initialValues={{
              name: '',
              description: '',
              category: '',
              subCategory: '',
              productCategory: '',
              zammerPrice: '',
              mrp: '',
              variants: [{ color: '', colorCode: '', size: '', quantity: 1 }],
              images: [],
              tags: [],
              isLimitedEdition: false,
              isTrending: false
            }}
            validationSchema={productSchema}
            onSubmit={handleSubmit}
          >
            {({ values, setFieldValue, isSubmitting, errors, touched }) => (
              <Form className="space-y-8">
                {/* Basic Information Section */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                  <div className="relative bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/50">
                    <div className="flex items-center mb-6">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg mr-4">
                        <span className="text-white text-lg font-bold">1</span>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-800">Basic Information</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Product Name */}
                      <div className="lg:col-span-2">
                        <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-3">
                          Product Name*
                        </label>
                        <Field
                          id="name"
                          name="name"
                          type="text"
                          className="block w-full px-5 py-4 bg-white/70 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-base backdrop-blur-sm"
                          placeholder="Enter your amazing product name..."
                        />
                        <ErrorMessage
                          name="name"
                          component="div"
                          className="text-red-500 text-sm mt-2 font-medium"
                        />
                      </div>
                      
                      {/* Category */}
                      <div>
                        <label htmlFor="category" className="block text-sm font-semibold text-gray-700 mb-3">
                          Category*
                        </label>
                        <Field
                          as="select"
                          id="category"
                          name="category"
                          className="block w-full px-5 py-4 bg-white/70 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-base backdrop-blur-sm"
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
                          className="text-red-500 text-sm mt-2 font-medium"
                        />
                      </div>
                      
                      {/* Sub Category */}
                      <div>
                        <label htmlFor="subCategory" className="block text-sm font-semibold text-gray-700 mb-3">
                          Sub Category*
                        </label>
                        <Field
                          as="select"
                          id="subCategory"
                          name="subCategory"
                          className="block w-full px-5 py-4 bg-white/70 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-base backdrop-blur-sm disabled:opacity-50"
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
                          className="text-red-500 text-sm mt-2 font-medium"
                        />
                        {!values.category && (
                          <p className="text-sm text-gray-500 mt-2 italic">Please select a category first</p>
                        )}
                      </div>
                      
                      {/* Product Category */}
                      <div className="lg:col-span-2">
                        <label htmlFor="productCategory" className="block text-sm font-semibold text-gray-700 mb-3">
                          Product Category*
                        </label>
                        <Field
                          as="select"
                          id="productCategory"
                          name="productCategory"
                          className="block w-full px-5 py-4 bg-white/70 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-base backdrop-blur-sm"
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
                          className="text-red-500 text-sm mt-2 font-medium"
                        />
                      </div>
                    </div>
                    
                    {/* Description */}
                    <div className="mt-8">
                      <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-3">
                        Product Description*
                      </label>
                      <Field
                        as="textarea"
                        id="description"
                        name="description"
                        rows={5}
                        className="block w-full px-5 py-4 bg-white/70 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-base backdrop-blur-sm resize-none"
                        placeholder="Describe your product in detail... What makes it special?"
                      />
                      <ErrorMessage
                        name="description"
                        component="div"
                        className="text-red-500 text-sm mt-2 font-medium"
                      />
                      <div className="flex justify-between items-center mt-2">
                        <div className={`text-sm ${values.description.length > 800 ? 'text-orange-600' : 'text-gray-500'}`}>
                          {values.description.length}/1000 characters
                        </div>
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              values.description.length > 800 ? 'bg-orange-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${(values.description.length / 1000) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pricing Section */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                  <div className="relative bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/50">
                    <div className="flex items-center mb-6">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg mr-4">
                        <span className="text-white text-lg font-bold">2</span>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-800">Pricing Strategy</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div>
                        <label htmlFor="zammerPrice" className="block text-sm font-semibold text-gray-700 mb-3">
                          Zammer Price (₹)*
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <span className="text-gray-500 text-lg">₹</span>
                          </div>
                          <Field
                            id="zammerPrice"
                            name="zammerPrice"
                            type="number"
                            min="0"
                            step="0.01"
                            className="block w-full pl-10 pr-5 py-4 bg-white/70 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-base backdrop-blur-sm"
                            placeholder="0.00"
                          />
                        </div>
                        <ErrorMessage
                          name="zammerPrice"
                          component="div"
                          className="text-red-500 text-sm mt-2 font-medium"
                        />
                        <p className="text-sm text-gray-600 mt-2">Your selling price on Zammer</p>
                      </div>
                      
                      <div>
                        <label htmlFor="mrp" className="block text-sm font-semibold text-gray-700 mb-3">
                          MRP (₹)*
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <span className="text-gray-500 text-lg">₹</span>
                          </div>
                          <Field
                            id="mrp"
                            name="mrp"
                            type="number"
                            min="0"
                            step="0.01"
                            className="block w-full pl-10 pr-5 py-4 bg-white/70 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-base backdrop-blur-sm"
                            placeholder="0.00"
                          />
                        </div>
                        <ErrorMessage
                          name="mrp"
                          component="div"
                          className="text-red-500 text-sm mt-2 font-medium"
                        />
                        <p className="text-sm text-gray-600 mt-2">Maximum retail price</p>
                      </div>
                    </div>
                    
                    {/* Discount Calculation */}
                    {values.zammerPrice && values.mrp && Number(values.mrp) > Number(values.zammerPrice) && (
                      <div className="mt-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                              </svg>
                            </div>
                            <div>
                              <div className="text-green-700 text-lg font-bold">
                                {Math.round(((Number(values.mrp) - Number(values.zammerPrice)) / Number(values.mrp)) * 100)}% Discount
                              </div>
                              <div className="text-green-600 text-sm">
                                Customer saves ₹{(Number(values.mrp) - Number(values.zammerPrice)).toFixed(2)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-700">₹{values.zammerPrice}</div>
                            <div className="text-sm text-gray-500 line-through">₹{values.mrp}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Variants Section */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                  <div className="relative bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/50">
                    <div className="flex items-center mb-6">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg mr-4">
                        <span className="text-white text-lg font-bold">3</span>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-800">Product Variants</h2>
                    </div>
                    
                    <FieldArray name="variants">
                      {({ remove, push }) => (
                        <div className="space-y-6">
                          {values.variants.map((variant, index) => (
                            <div key={index} className="relative p-6 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-2xl shadow-sm">
                              <div className="absolute -top-3 left-6 bg-purple-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                                Variant {index + 1}
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
                                {/* Color Selection */}
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-3">Color*</label>
                                  <Field
                                    as="select"
                                    name={`variants.${index}.color`}
                                    className="block w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
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
                                    className="text-red-500 text-xs mt-1 font-medium"
                                  />
                                </div>

                                {/* Color Preview */}
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-3">Preview</label>
                                  <div className="flex items-center space-x-3">
                                    <div 
                                      className="w-12 h-12 border-2 border-gray-300 rounded-xl shadow-sm"
                                      style={{ backgroundColor: variant.colorCode || '#f0f0f0' }}
                                    ></div>
                                    <Field
                                      name={`variants.${index}.colorCode`}
                                      type="text"
                                      placeholder="#000000"
                                      className="flex-1 px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                  </div>
                                  <ErrorMessage
                                    name={`variants.${index}.colorCode`}
                                    component="div"
                                    className="text-red-500 text-xs mt-1 font-medium"
                                  />
                                </div>
                                
                                {/* Size Selection */}
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-3">Size*</label>
                                  <Field
                                    as="select"
                                    name={`variants.${index}.size`}
                                    className="block w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
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
                                    className="text-red-500 text-xs mt-1 font-medium"
                                  />
                                </div>
                                
                                {/* Quantity */}
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-3">Quantity*</label>
                                  <Field
                                    name={`variants.${index}.quantity`}
                                    type="number"
                                    min="0"
                                    className="block w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                                  />
                                  <ErrorMessage
                                    name={`variants.${index}.quantity`}
                                    component="div"
                                    className="text-red-500 text-xs mt-1 font-medium"
                                  />
                                </div>
                              </div>
                              
                              {/* Remove Button */}
                              {index > 0 && (
                                <button
                                  type="button"
                                  onClick={() => remove(index)}
                                  className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          ))}
                          
                          <button
                            type="button"
                            onClick={() => push({ color: '', colorCode: '', size: '', quantity: 1 })}
                            className="w-full p-4 border-2 border-dashed border-purple-300 rounded-2xl text-purple-600 hover:text-purple-700 hover:border-purple-400 hover:bg-purple-50 transition-all duration-200 font-semibold"
                          >
                            <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Add Another Variant
                          </button>
                        </div>
                      )}
                    </FieldArray>
                  </div>
                </div>

                {/* Images Section */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                  <div className="relative bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/50">
                    <div className="flex items-center mb-6">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg mr-4">
                        <span className="text-white text-lg font-bold">4</span>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-800">Product Gallery</h2>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-4">
                        Upload Product Images*
                      </label>
                      
                      {values.images.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                          {values.images.map((image, index) => (
                            <div key={index} className="relative group">
                              <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden shadow-lg">
                                <img 
                                  src={image} 
                                  alt={`Product ${index + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const newImages = [...values.images];
                                  newImages.splice(index, 1);
                                  setFieldValue('images', newImages);
                                }}
                                className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow-lg opacity-0 group-hover:opacity-100"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                              {index === 0 && (
                                <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                                  Main
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="border-2 border-dashed border-blue-300 rounded-2xl p-8 hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-200">
                        <label className="block cursor-pointer">
                          <div className="text-center">
                            <svg className="mx-auto h-16 w-16 text-blue-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <div className="text-lg font-semibold text-gray-700 mb-2">
                              {uploadingImages ? 'Uploading...' : 'Upload Product Images'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {uploadingImages ? (
                                <div className="flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
                                  Processing your images...
                                </div>
                              ) : (
                                'Drag and drop or click to browse'
                              )}
                            </div>
                          </div>
                          <input 
                            type="file" 
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload(e, setFieldValue, values.images)}
                            disabled={uploadingImages}
                          />
                        </label>
                      </div>
                      
                      <ErrorMessage
                        name="images"
                        component="div"
                        className="text-red-500 text-sm mt-3 font-medium"
                      />
                      <p className="text-sm text-gray-500 mt-3">
                        💡 <strong>Tip:</strong> Upload high-quality images for better customer engagement. First image will be the main product image.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                  <div className="relative bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/50">
                    <div className="flex items-center mb-6">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg mr-4">
                        <span className="text-white text-lg font-bold">5</span>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-800">Product Features</h2>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-center p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
                          <Field
                            id="isLimitedEdition"
                            name="isLimitedEdition"
                            type="checkbox"
                            className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded mr-4"
                          />
                          <label htmlFor="isLimitedEdition" className="text-gray-700 font-medium">
                            <span className="text-purple-600">⭐</span> Limited Edition Product
                          </label>
                        </div>
                        
                        <div className="flex items-center p-4 bg-gradient-to-r from-pink-50 to-red-50 rounded-xl border border-pink-200">
                          <Field
                            id="isTrending"
                            name="isTrending"
                            type="checkbox"
                            className="h-5 w-5 text-pink-600 focus:ring-pink-500 border-gray-300 rounded mr-4"
                          />
                          <label htmlFor="isTrending" className="text-gray-700 font-medium">
                            <span className="text-pink-600">🔥</span> Mark as Trending
                          </label>
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="tags" className="block text-sm font-semibold text-gray-700 mb-3">
                          Product Tags
                        </label>
                        <input
                          id="tags"
                          type="text"
                          className="block w-full px-5 py-4 bg-white/70 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-base backdrop-blur-sm"
                          placeholder="summer, casual, cotton, comfortable, trendy..."
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
                        <p className="text-sm text-gray-500 mt-2">
                          Separate tags with commas. Tags help customers discover your product easily.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Section */}
                <div className="flex justify-end space-x-6 pt-8">
                  <button
                    type="button"
                    onClick={() => navigate('/seller/dashboard')}
                    className="px-8 py-4 border-2 border-gray-300 rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || isLoading || uploadingImages}
                    className={`px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200 font-semibold ${
                      (isSubmitting || isLoading || uploadingImages) ? 'opacity-70 cursor-not-allowed' : 'hover:from-orange-600 hover:to-amber-600'
                    }`}
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        Creating Product...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Create Product
                      </div>
                    )}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </SellerLayout>
  );
};

export default AddProduct;