import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import SellerLayout from '../../components/layouts/SellerLayout';
import { getSellerProducts } from '../../services/productService';

const Dashboard = () => {
  const { sellerAuth } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await getSellerProducts();
        if (response.success) {
          setProducts(response.data);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <SellerLayout>
      <div className="dashboard-container">
        <div className="welcome-section mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Welcome, {sellerAuth.seller?.firstName || 'Seller'}!
          </h1>
          <p className="text-gray-600">
            Manage your shop and products from your dashboard.
          </p>
        </div>

        <div className="stats-cards grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="stat-card bg-blue-50 p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-blue-700">Total Products</h3>
            <p className="text-3xl font-bold text-blue-900 mt-2">
              {loading ? '...' : products.length}
            </p>
            <Link 
              to="/seller/view-products" 
              className="text-blue-600 hover:underline text-sm inline-block mt-2"
            >
              View all products
            </Link>
          </div>
          
          <div className="stat-card bg-green-50 p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-green-700">Shop Status</h3>
            <p className="text-xl font-bold text-green-900 mt-2">
              Active
            </p>
            <p className="text-green-600 text-sm mt-1">
              Your shop is visible to customers
            </p>
          </div>
          
          <div className="stat-card bg-purple-50 p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-purple-700">Quick Actions</h3>
            <div className="flex flex-col space-y-2 mt-2">
              <Link 
                to="/seller/add-product" 
                className="text-purple-600 hover:underline text-sm"
              >
                Add a new product
              </Link>
              <Link 
                to="/seller/edit-profile" 
                className="text-purple-600 hover:underline text-sm"
              >
                Edit shop profile
              </Link>
            </div>
          </div>
        </div>

        <div className="recent-products mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              Recent Products
            </h2>
            <Link 
              to="/seller/add-product" 
              className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-md text-sm"
            >
              Add New Product
            </Link>
          </div>
          
          {loading ? (
            <p>Loading products...</p>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.slice(0, 3).map(product => (
                <div key={product._id} className="product-card border rounded-lg overflow-hidden shadow-sm">
                  <div className="h-40 bg-gray-200 flex items-center justify-center">
                    {product.images && product.images.length > 0 ? (
                      <img 
                        src={product.images[0]} 
                        alt={product.name} 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-gray-400">No image</div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg text-gray-800">{product.name}</h3>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-gray-600">₹{product.zammerPrice}</span>
                      <span className="text-sm text-gray-500">
                        {product.variants?.reduce((total, variant) => total + (variant.inventory || 0), 0) || 0} in stock
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <p className="text-gray-600 mb-4">You haven't added any products yet.</p>
              <Link 
                to="/seller/add-product" 
                className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-md text-sm"
              >
                Add Your First Product
              </Link>
            </div>
          )}
        </div>

        <div className="shop-info bg-gray-50 p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Your Shop Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Shop Name</p>
              <p className="font-medium">{sellerAuth.seller?.shop?.name || 'N/A'}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Category</p>
              <p className="font-medium">{sellerAuth.seller?.shop?.category || 'N/A'}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Address</p>
              <p className="font-medium">{sellerAuth.seller?.shop?.address || 'N/A'}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Contact Number</p>
              <p className="font-medium">{sellerAuth.seller?.shop?.phoneNumber?.main || 'N/A'}</p>
            </div>
          </div>
          
          <div className="mt-4">
            <Link 
              to="/seller/edit-profile" 
              className="text-orange-600 hover:text-orange-700 text-sm font-medium"
            >
              Edit Shop Information
            </Link>
          </div>
        </div>
      </div>
    </SellerLayout>
  );
};

export default Dashboard;