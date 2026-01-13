/**
 * Upload Catalogue Page for ZAMMER Marketplace
 * 3-Step Wizard for bulk product upload (1-9 products)
 * Inspired by Meesho Supplier Panel catalogue upload system
 */

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import SellerLayout from '../../components/layouts/SellerLayout';
import CategorySelector from '../../components/seller/CategorySelector';
import { createCatalogue, uploadCatalogueImage } from '../../services/catalogueService';

// Constants
const MAX_PRODUCTS = 9;
const MIN_PRODUCTS = 1;
const MAX_IMAGES_PER_PRODUCT = 4;
const ALLOWED_IMAGE_FORMATS = ['image/png', 'image/jpeg', 'image/jpg'];

// Fabric type options
const fabricTypeOptions = [
  { value: '', label: 'Select Fabric Type' },
  { value: 'Cotton', label: 'Cotton' },
  { value: 'Silk', label: 'Silk' },
  { value: 'Polyester', label: 'Polyester' },
  { value: 'Linen', label: 'Linen' },
  { value: 'Wool', label: 'Wool' },
  { value: 'Rayon', label: 'Rayon' },
  { value: 'Chiffon', label: 'Chiffon' },
  { value: 'Georgette', label: 'Georgette' },
  { value: 'Velvet', label: 'Velvet' },
  { value: 'Denim', label: 'Denim' },
  { value: 'Satin', label: 'Satin' },
  { value: 'Crepe', label: 'Crepe' },
  { value: 'Net', label: 'Net' },
  { value: 'Lycra', label: 'Lycra' },
  { value: 'Nylon', label: 'Nylon' },
  { value: 'Jacquard', label: 'Jacquard' },
  { value: 'Khadi', label: 'Khadi' },
  { value: 'Organza', label: 'Organza' },
  { value: 'Cotton Blend', label: 'Cotton Blend' },
  { value: 'Silk Blend', label: 'Silk Blend' },
  { value: 'Poly Cotton', label: 'Poly Cotton' }
];

// Size options
const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

// Color options
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
  { name: 'Maroon', code: '#800000' }
];

const UploadCatalogue = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Category state (Step 1)
  const [categoryValues, setCategoryValues] = useState({
    categoryLevel1: '',
    categoryLevel2: '',
    categoryLevel3: '',
    categoryLevel4: '',
    categoryPath: ''
  });

  // Products state (Step 2 & 3)
  const [products, setProducts] = useState([]);
  const [activeProductIndex, setActiveProductIndex] = useState(0);
  const [copyToAll, setCopyToAll] = useState(false);

  // GST/HSN (Optional)
  const [gst, setGst] = useState('');
  const [hsnCode, setHsnCode] = useState('');

  // Step 1: Category Selection
  const handleCategoryChange = (field, value) => {
    setCategoryValues(prev => ({ ...prev, [field]: value }));
  };

  const setFieldValue = (field, value) => {
    setCategoryValues(prev => ({ ...prev, [field]: value }));
  };

  const canProceedToStep2 = () => {
    return categoryValues.categoryLevel1 &&
           categoryValues.categoryLevel2 &&
           categoryValues.categoryLevel3;
  };

  // Step 2: Image Upload
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Validate file count
    if (files.length > MAX_PRODUCTS) {
      toast.error(`Maximum ${MAX_PRODUCTS} products allowed per catalogue`);
      return;
    }

    if (files.length < MIN_PRODUCTS) {
      toast.error(`At least ${MIN_PRODUCTS} product image is required`);
      return;
    }

    setUploadingImages(true);

    try {
      const newProducts = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate format
        if (!ALLOWED_IMAGE_FORMATS.includes(file.type)) {
          toast.error(`Invalid format: ${file.name}. Only PNG and JPG are supported.`);
          continue;
        }

        // Upload to Cloudinary
        const response = await uploadCatalogueImage(file);

        if (response.success) {
          newProducts.push({
            name: '',
            description: '',
            zammerPrice: '',
            mrp: '',
            images: [response.data.url],
            variants: [{ size: 'M', color: 'Black', colorCode: '#000000', quantity: 1 }],
            fabricType: ''
          });
        } else {
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      if (newProducts.length > 0) {
        setProducts(newProducts);
        setActiveProductIndex(0);
        toast.success(`${newProducts.length} product image(s) uploaded successfully`);
      }
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  const addMoreImages = async (e, productIndex) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const product = products[productIndex];
    if (product.images.length >= MAX_IMAGES_PER_PRODUCT) {
      toast.error(`Maximum ${MAX_IMAGES_PER_PRODUCT} images per product`);
      return;
    }

    setUploadingImages(true);

    try {
      const newImages = [...product.images];

      for (const file of files) {
        if (newImages.length >= MAX_IMAGES_PER_PRODUCT) break;

        if (!ALLOWED_IMAGE_FORMATS.includes(file.type)) {
          toast.error(`Invalid format: ${file.name}`);
          continue;
        }

        const response = await uploadCatalogueImage(file);
        if (response.success) {
          newImages.push(response.data.url);
        }
      }

      updateProduct(productIndex, 'images', newImages);
      toast.success('Images added successfully');
    } catch (error) {
      toast.error('Failed to add images');
    } finally {
      setUploadingImages(false);
    }
  };

  const removeProductImage = (productIndex, imageIndex) => {
    const product = products[productIndex];
    if (product.images.length <= 1) {
      toast.error('At least one image is required');
      return;
    }

    const newImages = product.images.filter((_, i) => i !== imageIndex);
    updateProduct(productIndex, 'images', newImages);
  };

  const canProceedToStep3 = () => {
    return products.length >= MIN_PRODUCTS;
  };

  // Step 3: Product Details
  const updateProduct = (index, field, value) => {
    setProducts(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const updateVariant = (productIndex, variantIndex, field, value) => {
    setProducts(prev => {
      const updated = [...prev];
      const variants = [...updated[productIndex].variants];
      variants[variantIndex] = { ...variants[variantIndex], [field]: value };

      // Auto-fill color code when color is selected
      if (field === 'color') {
        const colorOption = colorOptions.find(c => c.name === value);
        if (colorOption) {
          variants[variantIndex].colorCode = colorOption.code;
        }
      }

      updated[productIndex] = { ...updated[productIndex], variants };
      return updated;
    });
  };

  const addVariant = (productIndex) => {
    setProducts(prev => {
      const updated = [...prev];
      updated[productIndex].variants.push({ size: 'M', color: 'Black', colorCode: '#000000', quantity: 1 });
      return updated;
    });
  };

  const removeVariant = (productIndex, variantIndex) => {
    setProducts(prev => {
      const updated = [...prev];
      if (updated[productIndex].variants.length <= 1) {
        toast.error('At least one variant is required');
        return prev;
      }
      updated[productIndex].variants = updated[productIndex].variants.filter((_, i) => i !== variantIndex);
      return updated;
    });
  };

  const copyDetailsToAll = () => {
    if (products.length <= 1) return;

    const sourceProduct = products[activeProductIndex];
    setProducts(prev => prev.map((product, index) => {
      if (index === activeProductIndex) return product;
      return {
        ...product,
        description: sourceProduct.description,
        zammerPrice: sourceProduct.zammerPrice,
        mrp: sourceProduct.mrp,
        fabricType: sourceProduct.fabricType,
        variants: [...sourceProduct.variants]
      };
    }));

    toast.success('Details copied to all products');
  };

  const canSubmit = () => {
    return products.every(p =>
      p.name &&
      p.zammerPrice &&
      p.mrp &&
      Number(p.mrp) >= Number(p.zammerPrice) &&
      p.images.length > 0
    );
  };

  // Submit handlers
  const handleSaveDraft = async () => {
    setIsLoading(true);
    try {
      const catalogueData = {
        category: {
          level1: categoryValues.categoryLevel1,
          level2: categoryValues.categoryLevel2,
          level3: categoryValues.categoryLevel3,
          level4: categoryValues.categoryLevel4,
          path: categoryValues.categoryPath
        },
        products,
        gst,
        hsnCode,
        status: 'draft'
      };

      const response = await createCatalogue(catalogueData);

      if (response.success) {
        toast.success('Catalogue saved as draft');
        navigate('/seller/view-products');
      } else {
        toast.error(response.message || 'Failed to save draft');
      }
    } catch (error) {
      console.error('Save draft error:', error);
      toast.error(error.message || 'Failed to save draft');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit()) {
      toast.error('Please fill all required fields for all products');
      return;
    }

    setIsLoading(true);
    try {
      const catalogueData = {
        category: {
          level1: categoryValues.categoryLevel1,
          level2: categoryValues.categoryLevel2,
          level3: categoryValues.categoryLevel3,
          level4: categoryValues.categoryLevel4,
          path: categoryValues.categoryPath
        },
        products: products.map(p => ({
          ...p,
          zammerPrice: Number(p.zammerPrice),
          mrp: Number(p.mrp)
        })),
        gst,
        hsnCode,
        status: 'submitted'
      };

      const response = await createCatalogue(catalogueData);

      if (response.success) {
        toast.success(`Catalogue submitted! ${products.length} products created.`);
        navigate('/seller/view-products');
      } else {
        toast.error(response.message || 'Failed to submit catalogue');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error.message || 'Failed to submit catalogue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscard = () => {
    if (window.confirm('Are you sure you want to discard this catalogue? All uploaded images will be lost.')) {
      navigate('/seller/dashboard');
    }
  };

  // Render Step Progress
  const renderStepProgress = () => (
    <div className="mb-8">
      <div className="flex items-center justify-center">
        {[1, 2, 3].map((step, index) => (
          <React.Fragment key={step}>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${
              currentStep >= step
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-500'
            }`}>
              {currentStep > step ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : step}
            </div>
            {index < 2 && (
              <div className={`w-24 h-1 mx-2 ${
                currentStep > step ? 'bg-purple-600' : 'bg-gray-200'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="flex justify-center mt-2">
        <div className="flex justify-between w-80 text-xs text-gray-600">
          <span className={currentStep >= 1 ? 'text-purple-600 font-medium' : ''}>Select Category</span>
          <span className={currentStep >= 2 ? 'text-purple-600 font-medium' : ''}>Upload Images</span>
          <span className={currentStep >= 3 ? 'text-purple-600 font-medium' : ''}>Add Details</span>
        </div>
      </div>
    </div>
  );

  // Render Step 1: Category Selection
  const renderStep1 = () => (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Step 1: Select Category</h2>
      <p className="text-gray-600 mb-6">
        Choose the appropriate category for all products in this catalogue.
        All products will share the same category.
      </p>

      <CategorySelector
        values={categoryValues}
        setFieldValue={setFieldValue}
        showAllLevels={true}
      />

      <div className="mt-8 flex justify-end">
        <button
          onClick={() => setCurrentStep(2)}
          disabled={!canProceedToStep2()}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            canProceedToStep2()
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue to Upload Images
        </button>
      </div>
    </div>
  );

  // Render Step 2: Image Upload
  const renderStep2 = () => (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-2">Step 2: Upload Product Images</h2>
      <p className="text-gray-600 mb-6">
        Upload 1-9 product images. Each image will create a separate product in the catalogue.
      </p>

      {/* Category Display */}
      <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
        <p className="text-sm text-purple-600 font-medium">Selected Category:</p>
        <p className="text-purple-800 font-semibold">{categoryValues.categoryPath}</p>
      </div>

      {/* Upload Area */}
      {products.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-purple-300 rounded-xl p-12 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition-all"
        >
          <svg className="mx-auto h-16 w-16 text-purple-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-lg font-medium text-gray-700 mb-2">
            {uploadingImages ? 'Uploading...' : 'Click to upload product images'}
          </p>
          <p className="text-sm text-gray-500">PNG, JPG formats (1-9 images, one per product)</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/jpg"
            className="hidden"
            onChange={handleImageUpload}
            disabled={uploadingImages}
          />
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-800">{products.length} Product(s) Ready</h3>
            <button
              onClick={() => {
                setProducts([]);
                setActiveProductIndex(0);
              }}
              className="text-red-500 hover:text-red-600 text-sm"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {products.map((product, index) => (
              <div
                key={index}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 ${
                  activeProductIndex === index ? 'border-purple-500' : 'border-gray-200'
                }`}
              >
                <img
                  src={product.images[0]}
                  alt={`Product ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center">
                  Product {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Guidelines */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-800 mb-2">Image Guidelines:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>Use high-quality product images (recommended: 800x800 px or higher)</li>
          <li>White or light background preferred</li>
          <li>Show the complete product clearly</li>
          <li>Maximum 4 images per product (you can add more in the next step)</li>
        </ul>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex justify-between">
        <button
          onClick={() => setCurrentStep(1)}
          className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={() => setCurrentStep(3)}
          disabled={!canProceedToStep3()}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            canProceedToStep3()
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue to Add Details
        </button>
      </div>
    </div>
  );

  // Render Step 3: Product Details
  const renderStep3 = () => {
    const activeProduct = products[activeProductIndex];

    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Step 3: Add Product Details</h2>
            <p className="text-gray-600">Fill in details for each product in your catalogue</p>
          </div>
          {products.length > 1 && (
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={copyToAll}
                onChange={(e) => setCopyToAll(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <span className="text-sm text-gray-600">Copy details to all products</span>
              {copyToAll && (
                <button
                  onClick={copyDetailsToAll}
                  className="ml-2 text-purple-600 hover:text-purple-700 text-sm font-medium"
                >
                  Apply Now
                </button>
              )}
            </label>
          )}
        </div>

        {/* Product Tabs */}
        <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
          {products.map((product, index) => (
            <button
              key={index}
              onClick={() => setActiveProductIndex(index)}
              className={`flex-shrink-0 flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all ${
                activeProductIndex === index
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
              }`}
            >
              <img
                src={product.images[0]}
                alt={`Product ${index + 1}`}
                className="w-8 h-8 rounded object-cover"
              />
              <span className="text-sm font-medium">
                {product.name || `Product ${index + 1}`}
              </span>
              {product.name && product.zammerPrice && (
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>

        {/* Active Product Form */}
        {activeProduct && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Images */}
            <div className="lg:col-span-1">
              <h3 className="font-medium text-gray-800 mb-3">Product Images</h3>
              <div className="space-y-3">
                {activeProduct.images.map((image, imgIndex) => (
                  <div key={imgIndex} className="relative group">
                    <img
                      src={image}
                      alt={`Product ${activeProductIndex + 1} - ${imgIndex + 1}`}
                      className="w-full aspect-square object-cover rounded-lg border"
                    />
                    {activeProduct.images.length > 1 && (
                      <button
                        onClick={() => removeProductImage(activeProductIndex, imgIndex)}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    )}
                    {imgIndex === 0 && (
                      <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                        Main
                      </div>
                    )}
                  </div>
                ))}

                {activeProduct.images.length < MAX_IMAGES_PER_PRODUCT && (
                  <label className="block border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-purple-400">
                    <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="text-sm text-gray-500">Add more images</span>
                    <input
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/jpg"
                      className="hidden"
                      onChange={(e) => addMoreImages(e, activeProductIndex)}
                      disabled={uploadingImages}
                    />
                  </label>
                )}
                <p className="text-xs text-gray-500 text-center">
                  {activeProduct.images.length}/{MAX_IMAGES_PER_PRODUCT} images
                </p>
              </div>
            </div>

            {/* Right: Details Form */}
            <div className="lg:col-span-2 space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={activeProduct.name}
                  onChange={(e) => updateProduct(activeProductIndex, 'name', e.target.value)}
                  placeholder="Enter product name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={activeProduct.description}
                  onChange={(e) => updateProduct(activeProductIndex, 'description', e.target.value)}
                  placeholder="Describe your product..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    value={activeProduct.zammerPrice}
                    onChange={(e) => updateProduct(activeProductIndex, 'zammerPrice', e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    MRP (₹) *
                  </label>
                  <input
                    type="number"
                    value={activeProduct.mrp}
                    onChange={(e) => updateProduct(activeProductIndex, 'mrp', e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Discount Display */}
              {activeProduct.zammerPrice && activeProduct.mrp &&
               Number(activeProduct.mrp) > Number(activeProduct.zammerPrice) && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <span className="text-green-700 font-medium">
                    {Math.round(((Number(activeProduct.mrp) - Number(activeProduct.zammerPrice)) / Number(activeProduct.mrp)) * 100)}% Discount
                  </span>
                  <span className="text-green-600 ml-2">
                    (Customer saves ₹{(Number(activeProduct.mrp) - Number(activeProduct.zammerPrice)).toFixed(0)})
                  </span>
                </div>
              )}

              {/* Fabric Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fabric Type
                </label>
                <select
                  value={activeProduct.fabricType}
                  onChange={(e) => updateProduct(activeProductIndex, 'fabricType', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {fabricTypeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Variants */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Variants</label>
                  <button
                    onClick={() => addVariant(activeProductIndex)}
                    className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                  >
                    + Add Variant
                  </button>
                </div>

                <div className="space-y-3">
                  {activeProduct.variants.map((variant, vIndex) => (
                    <div key={vIndex} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <select
                        value={variant.size}
                        onChange={(e) => updateVariant(activeProductIndex, vIndex, 'size', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        {sizeOptions.map(size => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>

                      <select
                        value={variant.color}
                        onChange={(e) => updateVariant(activeProductIndex, vIndex, 'color', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        {colorOptions.map(color => (
                          <option key={color.name} value={color.name}>{color.name}</option>
                        ))}
                      </select>

                      <div
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: variant.colorCode }}
                      />

                      <input
                        type="number"
                        value={variant.quantity}
                        onChange={(e) => updateVariant(activeProductIndex, vIndex, 'quantity', Number(e.target.value))}
                        min="1"
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center"
                        placeholder="Qty"
                      />

                      {activeProduct.variants.length > 1 && (
                        <button
                          onClick={() => removeVariant(activeProductIndex, vIndex)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GST/HSN (Optional) */}
        <div className="mt-6 pt-6 border-t">
          <h3 className="font-medium text-gray-800 mb-4">Optional Information (Applied to all products)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
              <input
                type="text"
                value={gst}
                onChange={(e) => setGst(e.target.value)}
                placeholder="Enter GST number"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">HSN Code</label>
              <input
                type="text"
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
                placeholder="Enter HSN code"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-between items-center">
          <div className="flex space-x-3">
            <button
              onClick={handleDiscard}
              className="px-4 py-2 text-red-600 hover:text-red-700 font-medium"
            >
              Discard Catalogue
            </button>
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleSaveDraft}
              disabled={isLoading}
              className="px-6 py-3 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 font-medium"
            >
              {isLoading ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || !canSubmit()}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                canSubmit() && !isLoading
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? 'Submitting...' : `Submit Catalogue (${products.length} products)`}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <SellerLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Upload Catalogue</h1>
          <p className="text-gray-600 mt-1">Create multiple products at once by uploading a catalogue</p>
        </div>

        {/* Step Progress */}
        {renderStepProgress()}

        {/* Step Content */}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </div>
    </SellerLayout>
  );
};

export default UploadCatalogue;
