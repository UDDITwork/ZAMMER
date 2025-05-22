import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getMarketplaceProducts } from '../../services/productService';

const CategoryPage = () => {
  const { category } = useParams();
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Define subcategories based on the main category
  const categoryMappings = {
    women: {
      title: 'Women',
      description: 'Find stylish, trendy fashion...',
      subcategories: [
        { id: 'kurties', name: 'Kurties', image: '/placeholders/women-kurties.jpg' },
        { id: 'suits', name: 'Suits', image: '/placeholders/women-suits.jpg' },
        { id: 'tops', name: 'Tops', image: '/placeholders/women-tops.jpg' },
        { id: 'dresses', name: 'Dresses', image: '/placeholders/women-dresses.jpg' },
        { id: 'ethnic', name: 'Ethnic Wear', image: '/placeholders/women-ethnic.jpg' },
        { id: 'lehengass', name: 'Lehengass', image: '/placeholders/women-lehenga.jpg' },
        { id: 'rayon', name: 'Rayon', image: '/placeholders/women-rayon.jpg' },
        { id: 'shrugs', name: 'Shrugs', image: '/placeholders/women-shrugs.jpg' }
      ]
    },
    men: {
      title: 'Men',
      description: 'Find trendy, comfortable men fashion...',
      subcategories: [
        { id: 't-shirts', name: 'T-shirts', image: '/placeholders/men-tshirts.jpg' },
        { id: 'shirts', name: 'Shirts', image: '/placeholders/men-shirts.jpg' },
        { id: 'kurties', name: 'Kurties', image: '/placeholders/men-kurties.jpg' },
        { id: 'jackets', name: 'Ethnic Jackets', image: '/placeholders/men-jackets.jpg' },
        { id: 'jeans', name: 'Jeans', image: '/placeholders/men-jeans.jpg' }
      ]
    },
    kids: {
      title: 'Kids',
      description: 'Find cute, comfortable kids styles...',
      subcategories: [
        { id: 'ethnic', name: 'Ethnic Wear', image: '/placeholders/kids-ethnic.jpg' },
        { id: 'tshirts', name: 'T-shirts', image: '/placeholders/kids-tshirts.jpg' },
        { id: 'nightwear', name: 'Nightwear', image: '/placeholders/kids-nightwear.jpg' },
        { id: 'sleepwear', name: 'Sleepwear', image: '/placeholders/kids-sleepwear.jpg' },
        { id: 'boys', name: 'Boys Sets', image: '/placeholders/kids-boys.jpg' }
      ]
    },
    traditional: {
      title: 'Traditional Indian',
      description: 'Ethnic styles, festival fashion, more...',
      subcategories: []
    },
    winter: {
      title: 'Winter Fashion',
      description: 'Coats, jackets, sweaters, more...',
      subcategories: []
    },
    party: {
      title: 'Party Wear',
      description: 'Look your best at every party...',
      subcategories: []
    },
    sports: {
      title: 'Sports Destination',
      description: 'Active wear, sports shoes, accessories...',
      subcategories: []
    },
    office: {
      title: 'Office Wear',
      description: 'Professional, business casual styles...',
      subcategories: []
    }
  };

  useEffect(() => {
    // Get the category info or default to women if not found
    const categoryInfo = categoryMappings[category?.toLowerCase()] || categoryMappings['women'];
    setSubcategories(categoryInfo.subcategories);
    setLoading(false);
  }, [category]);

  // Helper to get proper category display name
  const getCategoryTitle = () => {
    const categoryInfo = categoryMappings[category?.toLowerCase()];
    if (!categoryInfo) return 'Categories';
    return categoryInfo.title;
  };

  return (
    <div className="category-page pb-16">
      {/* Header */}
      <div className="bg-white p-4 border-b flex items-center">
        <button onClick={() => navigate(-1)} className="mr-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-medium">{getCategoryTitle()}</h1>
      </div>

      {/* Subcategories Grid */}
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : subcategories.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {subcategories.map((subcat) => (
              <Link 
                key={subcat.id} 
                to={`/user/products?category=${category}&subcategory=${subcat.id}`}
                className="relative rounded-lg overflow-hidden"
              >
                <div className="h-40 bg-gray-200">
                  <img 
                    src={subcat.image || '/placeholders/default-category.jpg'} 
                    alt={subcat.name} 
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                  <div className="text-white text-center">
                    <h3 className="font-medium text-lg">{subcat.name}</h3>
                    <div className="mt-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full inline-block">
                      -50% OFF
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-600">No subcategories found.</p>
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