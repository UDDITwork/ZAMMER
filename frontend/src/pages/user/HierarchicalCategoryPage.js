// frontend/src/pages/user/HierarchicalCategoryPage.js
// Hierarchical Category Browser for 4-Level Category System

import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import categoryService from '../../services/categoryService';

const HierarchicalCategoryPage = () => {
  const { level1, level2, level3 } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [pageTitle, setPageTitle] = useState('');
  const [pageDescription, setPageDescription] = useState('');

  // Decode URL parameters
  const decodedLevel1 = level1 ? decodeURIComponent(level1) : null;
  const decodedLevel2 = level2 ? decodeURIComponent(level2) : null;
  const decodedLevel3 = level3 ? decodeURIComponent(level3) : null;

  // Determine current hierarchy level and fetch appropriate categories
  useEffect(() => {
    setLoading(true);

    try {
      let categoryData = [];
      let title = '';
      let description = '';

      if (!decodedLevel1) {
        // Show Level 1 categories (Men Fashion, Women Fashion, Kids Fashion)
        categoryData = categoryService.getLevel1Categories();
        title = 'Shop by Category';
        description = 'Browse our complete collection by category';
      } else if (!decodedLevel2) {
        // Show Level 2 categories for selected Level 1
        categoryData = categoryService.getLevel2Categories(decodedLevel1);
        title = decodedLevel1;
        description = `Explore ${decodedLevel1} categories`;
      } else if (!decodedLevel3) {
        // Show Level 3 categories for selected Level 1 and Level 2
        categoryData = categoryService.getLevel3Categories(decodedLevel1, decodedLevel2);
        title = decodedLevel2;
        description = `${decodedLevel2} in ${decodedLevel1}`;
      } else {
        // Show Level 4 categories (or redirect to products if at deepest level)
        const level4Data = categoryService.getLevel4Categories(decodedLevel1, decodedLevel2, decodedLevel3);

        if (level4Data.length > 0) {
          categoryData = level4Data;
          title = decodedLevel3;
          description = `${decodedLevel3} types in ${decodedLevel2}`;
        } else {
          // No Level 4, redirect to products
          const filterParams = categoryService.buildFilterParams(decodedLevel1, decodedLevel2, decodedLevel3);
          const queryString = new URLSearchParams(filterParams).toString();
          navigate(`/user/products?${queryString}`);
          return;
        }
      }

      setCategories(categoryData);
      setPageTitle(title);
      setPageDescription(description);

      // Build breadcrumbs
      const crumbs = categoryService.getBreadcrumbs(decodedLevel1, decodedLevel2, decodedLevel3);
      setBreadcrumbs(crumbs);

    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  }, [decodedLevel1, decodedLevel2, decodedLevel3, navigate]);

  // Determine the navigation URL for each category item
  const getCategoryLink = (category) => {
    if (!decodedLevel1) {
      // Clicking Level 1 - go to Level 2 selection
      return `/user/browse/${encodeURIComponent(category.id)}`;
    } else if (!decodedLevel2) {
      // Clicking Level 2 - go to Level 3 selection
      return `/user/browse/${encodeURIComponent(decodedLevel1)}/${encodeURIComponent(category.id)}`;
    } else if (!decodedLevel3) {
      // Clicking Level 3 - check if Level 4 exists, otherwise go to products
      const level4Data = categoryService.getLevel4Categories(decodedLevel1, decodedLevel2, category.id);
      if (level4Data.length > 0) {
        return `/user/browse/${encodeURIComponent(decodedLevel1)}/${encodeURIComponent(decodedLevel2)}/${encodeURIComponent(category.id)}`;
      } else {
        // No Level 4, go directly to products
        const filterParams = categoryService.buildFilterParams(decodedLevel1, decodedLevel2, category.id);
        return `/user/products?${new URLSearchParams(filterParams).toString()}`;
      }
    } else {
      // Clicking Level 4 - go to products with full filter
      const filterParams = categoryService.buildFilterParams(decodedLevel1, decodedLevel2, decodedLevel3, category.id);
      return `/user/products?${new URLSearchParams(filterParams).toString()}`;
    }
  };

  // Get "View All Products" link for current selection
  const getViewAllLink = () => {
    const filterParams = categoryService.buildFilterParams(decodedLevel1, decodedLevel2, decodedLevel3);
    return `/user/products?${new URLSearchParams(filterParams).toString()}`;
  };

  // Get appropriate icon for category type
  const getCategoryIcon = (categoryName) => {
    const iconMap = {
      'Ethnic Wear': '🪷',
      'Western Wear': '👕',
      'Winter Wear': '🧥',
      'Sportswear': '🏃',
      'Sleepwear & Loungewear': '😴',
      'Boys Wear': '👦',
      'Girls Wear': '👧',
      'Infant Wear': '👶',
      'School Uniforms': '🎒',
      'Bottom Wear': '👖',
      'Lingerie & Innerwear': '🩱',
      'Men Fashion': '👔',
      'Women Fashion': '👗',
      'Kids Fashion': '🧒'
    };
    return iconMap[categoryName] || '📦';
  };

  // Current level indicator
  const getCurrentLevel = () => {
    if (!decodedLevel1) return 1;
    if (!decodedLevel2) return 2;
    if (!decodedLevel3) return 3;
    return 4;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-25 to-indigo-25 pb-20">
      {/* Header with Gradient */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-xl">
        <div className="container mx-auto px-4 py-6">
          {/* Back Button and Title */}
          <div className="flex items-center mb-4">
            <button
              onClick={() => navigate(-1)}
              className="mr-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold">{pageTitle}</h1>
              <p className="text-purple-100 text-sm">{pageDescription}</p>
            </div>
          </div>

          {/* Breadcrumb Navigation */}
          {breadcrumbs.length > 0 && (
            <div className="flex items-center space-x-2 text-sm overflow-x-auto pb-2">
              <Link
                to="/user/browse"
                className="text-purple-200 hover:text-white transition-colors whitespace-nowrap"
              >
                All Categories
              </Link>
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  <svg className="w-4 h-4 text-purple-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <Link
                    to={crumb.path}
                    className={`whitespace-nowrap ${
                      index === breadcrumbs.length - 1
                        ? 'text-white font-medium'
                        : 'text-purple-200 hover:text-white transition-colors'
                    }`}
                  >
                    {crumb.name}
                  </Link>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Level Indicator */}
          <div className="flex items-center space-x-2 mt-4">
            {[1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={`flex items-center ${level <= getCurrentLevel() ? 'text-white' : 'text-purple-300'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  level < getCurrentLevel()
                    ? 'bg-green-500'
                    : level === getCurrentLevel()
                      ? 'bg-white text-purple-600'
                      : 'bg-purple-400/50'
                }`}>
                  {level < getCurrentLevel() ? '✓' : level}
                </div>
                {level < 4 && (
                  <div className={`w-8 h-0.5 ${level < getCurrentLevel() ? 'bg-green-500' : 'bg-purple-400/50'}`} />
                )}
              </div>
            ))}
            <span className="text-purple-200 text-xs ml-2">
              {getCurrentLevel() === 1 && 'Select Category'}
              {getCurrentLevel() === 2 && 'Select Type'}
              {getCurrentLevel() === 3 && 'Select Product Group'}
              {getCurrentLevel() === 4 && 'Select Specific Type'}
            </span>
          </div>
        </div>
      </div>

      {/* View All Products Button (shown when at least one level is selected) */}
      {decodedLevel1 && (
        <div className="container mx-auto px-4 py-4">
          <Link
            to={getViewAllLink()}
            className="block w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-center py-4 rounded-xl font-semibold shadow-lg hover:from-purple-600 hover:to-indigo-600 transition-all"
          >
            View All Products in {decodedLevel3 || decodedLevel2 || decodedLevel1}
            <svg className="inline-block ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      )}

      {/* Categories Grid */}
      <div className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-16 bg-white rounded-2xl shadow-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"></div>
              <span className="text-gray-600 font-medium">Loading categories...</span>
            </div>
          </div>
        ) : categories.length > 0 ? (
          <div className={`grid gap-4 ${
            getCurrentLevel() === 1
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              : getCurrentLevel() === 4
                ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
                : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
          }`}>
            {categories.map((category, index) => (
              <Link
                key={category.id || index}
                to={getCategoryLink(category)}
                className={`relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group transform hover:scale-102 border border-gray-100 ${
                  getCurrentLevel() === 1 ? 'p-6' : 'p-4'
                }`}
              >
                {/* Category Content */}
                <div className="flex items-center space-x-4">
                  {/* Icon/Emoji */}
                  <div className={`flex-shrink-0 ${
                    getCurrentLevel() === 1
                      ? 'w-16 h-16 text-3xl'
                      : 'w-12 h-12 text-2xl'
                  } bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl flex items-center justify-center group-hover:from-purple-200 group-hover:to-indigo-200 transition-colors`}>
                    {getCategoryIcon(category.name || category.id)}
                  </div>

                  {/* Text Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-bold text-gray-900 group-hover:text-purple-600 transition-colors truncate ${
                      getCurrentLevel() === 1 ? 'text-lg' : 'text-base'
                    }`}>
                      {category.name || category.id}
                    </h3>
                    {getCurrentLevel() === 1 && category.legacyName && (
                      <p className="text-gray-500 text-sm">Browse {category.legacyName}'s Collection</p>
                    )}
                    {getCurrentLevel() > 1 && (
                      <p className="text-gray-400 text-xs truncate">
                        {getCurrentLevel() === 4 ? 'Click to view products' : 'Click to explore'}
                      </p>
                    )}
                  </div>

                  {/* Arrow Icon */}
                  <svg
                    className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>

                {/* Hover Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 to-indigo-500/0 group-hover:from-purple-500/5 group-hover:to-indigo-500/5 transition-all duration-300 pointer-events-none rounded-2xl" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-300 shadow-lg">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-10 w-10 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium">No categories found.</p>
            <Link
              to="/user/browse"
              className="inline-block mt-4 text-purple-600 hover:text-purple-700 font-medium"
            >
              Go back to all categories
            </Link>
          </div>
        )}
      </div>

      {/* Quick Category Chips (shown at Level 2+) */}
      {getCurrentLevel() >= 2 && decodedLevel1 && (
        <div className="container mx-auto px-4 py-4">
          <h3 className="text-sm font-semibold text-gray-500 mb-3">Quick Navigation</h3>
          <div className="flex flex-wrap gap-2">
            {categoryService.getLevel2Categories(decodedLevel1).map((cat) => (
              <Link
                key={cat.id}
                to={`/user/browse/${encodeURIComponent(decodedLevel1)}/${encodeURIComponent(cat.id)}`}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  cat.id === decodedLevel2
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-purple-100 border border-gray-200'
                }`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
        <div className="flex justify-between items-center">
          <Link to="/user/dashboard" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs">Home</span>
          </Link>

          <Link to="/user/browse" className="flex flex-col items-center justify-center py-2 flex-1 text-purple-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span className="text-xs">Categories</span>
          </Link>

          <Link to="/user/cart" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-xs">Cart</span>
          </Link>

          <Link to="/user/products" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span className="text-xs">Shop</span>
          </Link>

          <Link to="/user/profile" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs">Profile</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HierarchicalCategoryPage;
