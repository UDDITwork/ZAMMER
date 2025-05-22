import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik';
import * as Yup from 'yup';
import SellerLayout from '../../components/layouts/SellerLayout';
import { createProduct } from '../../services/productService';

const productCategories = {
  Men: {
    subCategories: [
      'T-Shirts', 'Shirts', 'Jeans', 'Trousers', 'Shorts', 'Jackets', 
      'Sweatshirts', 'Ethnic Wear', 'Innerwear', 'Sportswear', 'Winterwear'
    ]
  },
  Women: {
    subCategories: [
      'Tops & Tees', 'Kurtis & Kurtas', 'Sarees', 'Dresses & Gowns', 
      'Leggings & Palazzos', 'Jeans', 'Skirts & Shorts', 'Ethnic Sets', 
      'Lingerie', 'Maternity Wear', 'Nightwear', 'Winterwear'
    ]
  },
  Kids: {
    subCategories: [
      'T-Shirts', 'Frocks', 'Shirts & Pants', 'Rompers', 
      'Ethnic Wear', 'School Uniforms', 'Nightwear', 'Winterwear', 'Shorts & Skirts'
    ]
  }
};

const productSchema = Yup.object().shape({
  name: Yup.string().required('Product name is required'),
  description: Yup.string().required('Description is required'),
  category: Yup.string().required('Category is required'),
  subCategory: Yup.string().required('Sub-category is required'),
  productCategory: Yup.string().required('Product category is required'),
  zammerPrice: Yup.number()
    .required('Zammer price is required')
    .positive('Price must be positive'),
  mrp: Yup.number()
    .required('MRP is required')
    .positive('MRP must be positive'),
  variants: Yup.array().of(
    Yup.object().shape({
      color: Yup.string().required('Color is required'),
      size: Yup.string().required('Size is required'),
      inventory: Yup.number()
        .required('Inventory is required')
        .min(0, 'Inventory must be at least 0')
    })
  ).min(1, 'At least one variant is required'),
  images: Yup.array().min(1, 'At least one image is required')
});

// For simplicity, using placeholder for image uploads
const mockImageUpload = async (file) => {
  // Simulate upload delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Return a mocked image URL
  return `/uploads/mock-product-${Date.now()}.jpg`;
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
      const response = await createProduct(values);
      
      if (response.success) {
        toast.success('Product added successfully!');
        resetForm();
        navigate('/seller/view-products');
      } else {
        toast.error(response.message || 'Failed to add product');
      }
    } catch (error) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <SellerLayout>
      <div className="add-product-container">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Add New Product</h1>
        
        <Formik
          initialValues={{
            name: '',
            description: '',
            category: '',
            subCategory: '',
            productCategory: '',
            zammerPrice: '',
            mrp: '',
            variants: [{ color: '', size: '', inventory: 1 }],
            images: [],
            tags: [],
            isLimitedEdition: false,
            isTrending: false
          }}
          validationSchema={productSchema}
          onSubmit={handleSubmit}
        >
          {({ values, setFieldValue, isSubmitting, errors, touched }) => (
            <Form className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Product Name*
                    </label>
                    <Field
                      id="name"
                      name="name"
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                    />
                    <ErrorMessage
                      name="name"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>
                  
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
                        setFieldValue('productCategory', '');
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
                  </div>
                  
                  <div>
                    <label htmlFor="productCategory" className="block text-sm font-medium text-gray-700 mb-1">
                      Product Category*
                    </label>
                    <Field
                      id="productCategory"
                      name="productCategory"
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      placeholder="E.g., Casual, Formal, Party Wear"
                    />
                    <ErrorMessage
                      name="productCategory"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description*
                  </label>
                  <Field
                    as="textarea"
                    id="description"
                    name="description"
                    rows={4}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  />
                  <ErrorMessage
                    name="description"
                    component="div"
                    className="text-red-500 text-sm mt-1"
                  />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Pricing</h2>
                
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
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
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
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                    />
                    <ErrorMessage
                      name="mrp"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Variants</h2>
                
                <FieldArray name="variants">
                  {({ remove, push }) => (
                    <div>
                      {values.variants.map((variant, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 pb-4 border-b border-gray-200">
                          <div>
                            <label 
                              htmlFor={`variants.${index}.color`}
                              className="block text-sm font-medium text-gray-700 mb-1"
                            >
                              Color*
                            </label>
                            <Field
                              id={`variants.${index}.color`}
                              name={`variants.${index}.color`}
                              type="text"
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                            />
                            <ErrorMessage
                              name={`variants.${index}.color`}
                              component="div"
                              className="text-red-500 text-xs mt-1"
                            />
                          </div>
                          
                          <div>
                            <label 
                              htmlFor={`variants.${index}.size`}
                              className="block text-sm font-medium text-gray-700 mb-1"
                            >
                              Size*
                            </label>
                            <Field
                              id={`variants.${index}.size`}
                              name={`variants.${index}.size`}
                              type="text"
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                            />
                            <ErrorMessage
                              name={`variants.${index}.size`}
                              component="div"
                              className="text-red-500 text-xs mt-1"
                            />
                          </div>
                          
                          <div>
                            <label 
                              htmlFor={`variants.${index}.inventory`}
                              className="block text-sm font-medium text-gray-700 mb-1"
                            >
                              Inventory*
                            </label>
                            <Field
                              id={`variants.${index}.inventory`}
                              name={`variants.${index}.inventory`}
                              type="number"
                              min="0"
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                            />
                            <ErrorMessage
                              name={`variants.${index}.inventory`}
                              component="div"
                              className="text-red-500 text-xs mt-1"
                            />
                          </div>
                          
                          <div className="flex items-end">
                            {index > 0 && (
                              <button
                                type="button"
                                onClick={() => remove(index)}
                                className="text-red-600 hover:text-red-800 font-medium"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      <button
                        type="button"
                        onClick={() => push({ color: '', size: '', inventory: 1 })}
                        className="mt-2 px-4 py-2 border border-orange-300 rounded-md shadow-sm text-sm font-medium text-orange-600 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                      >
                        Add Variant
                      </button>
                    </div>
                  )}
                </FieldArray>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Images</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Images*
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
                            onClick={() => {
                              const newImages = [...values.images];
                              newImages.splice(index, 1);
                              setFieldValue('images', newImages);
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs"
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
                      <div className="mt-2 text-sm text-gray-500">Uploading images...</div>
                    )}
                    {errors.images && touched.images && (
                      <div className="text-red-500 text-sm mt-1">{errors.images}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Additional Information</h2>
                
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
                      placeholder="E.g., summer, casual, cotton"
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
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => navigate('/seller/dashboard')}
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
                  {isLoading ? 'Adding Product...' : 'Add Product'}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </SellerLayout>
  );
};

export default AddProduct;