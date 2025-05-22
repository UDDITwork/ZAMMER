import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import UserLayout from '../../components/layouts/UserLayout';
import { getMarketplaceProducts } from '../../services/productService';
import { toast } from 'react-toastify';

const ProductListPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const category = searchParams.get('category');
  const subcategory = searchParams.get('subcategory');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const params = {};
        if (category) params.category = category;
        if (subcategory) params.subCategory = subcategory;
        
        const response = await getMarketplaceProducts(params);
        if (response.success) {
          setProducts(response.data);
        } else {
          toast.error(response.message || 'Failed to fetch products');
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [category, subcategory]);

  return (
    <UserLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">
          {category ? `${category}'s ${subcategory || 'Products'}` : 'All Products'}
        </h1>
        
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map(product => (
              <div key={product._id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="h-40 bg-gray-200 relative">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-gray-500">No Image</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="text-lg font-semibold">{product.name}</h2>
                  <div className="flex justify-between mt-2">
                    <span className="text-orange-600 font-bold">₹{product.zammerPrice}</span>
                    {product.mrp > product.zammerPrice && (
                      <span className="text-gray-500 line-through">₹{product.mrp}</span>
                    )}
                  </div>
                  <div className="mt-4">
                    <Link 
                      to={`/user/product/${product._id}`}
                      className="bg-orange-500 text-white px-4 py-2 rounded-md inline-block w-full text-center"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600">No products found.</p>
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default ProductListPage; 