// frontend/src/pages/user/CategoryPage.js - FIXED WITH DATABASE MATCHING

import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import categoryService from '../../services/categoryService';

const CategoryPage = () => {
  const { category } = useParams();
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    
    console.log('🔍 CategoryPage - Current category:', category);
    
    // Get the category info using the service
    const categoryInfo = categoryService.getCategoryInfo(category);
    setSubcategories(categoryInfo.subCategories);
    
    console.log('📂 Available subcategories for', category, ':', 
      categoryInfo.subCategories.map(sub => sub.id));
    
    setLoading(false);
  }, [category]);

  // Helper to get proper category display name
  const getCategoryTitle = () => {
    return categoryService.getCategoryDisplayName(category);
  };

  return (
    <div className="category-page pb-16 bg-gradient-to-br from-gray-50 via-orange-25 to-pink-25 min-h-screen">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-pink-500 text-white p-6 shadow-xl relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-white/10 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]"></div>
        <div className="container mx-auto relative z-10 flex items-center">
          <button onClick={() => navigate(-1)} className="mr-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-wide mb-1">{getCategoryTitle()}</h1>
            <p className="text-orange-100 text-sm">{categoryService.getCategoryDescription(category)}</p>
          </div>
        </div>
      </div>

      {/* Subcategories Grid */}
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-12 bg-white rounded-2xl shadow-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-500 mx-auto mb-4"></div>
              <span className="text-gray-600 font-medium">Loading categories...</span>
            </div>
          </div>
        ) : subcategories.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {subcategories.map((subcat) => (
              <Link
                key={subcat.id}
                to={`/user/products?category=${category}&subCategory=${encodeURIComponent(subcat.id)}`}
                onClick={() => {
                  console.log('🔗 Navigating to:', {
                    category: category,
                    subCategory: subcat.id,
                    url: `/user/products?category=${category}&subCategory=${encodeURIComponent(subcat.id)}`
                  });
                }}
                className="relative rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group transform hover:scale-105"
              >
                <div className="h-40 bg-gray-200 relative overflow-hidden">
                  <img
                    src={subcat.image || '/placeholders/default-category.jpg'}
                    alt={subcat.name}
                    className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-end justify-center p-4">
                  <div className="text-white text-center w-full">
                    <h3 className="font-bold text-lg mb-1 truncate">{subcat.name}</h3>
                    {/* Show product count based on your database */}
                    {category === 'Men' && subcat.id === 'T-shirts' && (
                      <p className="text-xs text-gray-200">5 Products</p>
                    )}
                    {category === 'Men' && subcat.id === 'Jeans' && (
                      <p className="text-xs text-gray-200">2 Products</p>
                    )}
                    {category === 'Men' && subcat.id === 'Shirts' && (
                      <p className="text-xs text-gray-200">1 Product</p>
                    )}
                    {category === 'Men' && subcat.id === 'Ethnic Wear' && (
                      <p className="text-xs text-gray-200">1 Product</p>
                    )}
                    {category === 'Men' && subcat.id === 'Sleepwear' && (
                      <p className="text-xs text-gray-200">1 Product</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-300 shadow-lg">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium">No subcategories found for this category.</p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
        <div className="flex justify-between items-center">
          <Link to="/user/dashboard" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs">Home</span>
          </Link>
          
          <Link to="/user/shop" className="flex flex-col items-center justify-center py-2 flex-1 text-orange-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span className="text-xs">Shop</span>
          </Link>
          
          <Link to="/user/cart" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-xs">Cart</span>
          </Link>
          
          <Link to="/user/trending" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-xs">Trending</span>
          </Link>
          
          <Link to="/user/limited-edition" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <span className="text-xs">Limited Edition</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CategoryPage;