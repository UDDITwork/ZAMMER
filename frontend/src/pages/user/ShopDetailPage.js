import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import StarRating from '../../components/common/StarRating';
import { getShop, getShopProducts, rateShop } from '../../services/shopService';
import UserLayout from '../../components/layouts/UserLayout';
import { getNearbyShops } from '../../services/userService';
import { getMarketplaceProducts } from '../../services/productService';

const ShopDetailPage = () => {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [rating, setRating] = useState(0);
  const [isRating, setIsRating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Move function definitions above useEffect
  const fetchShopDetails = async () => {
    setLoading(true);
    try {
      // This is a temporary solution since we don't have a dedicated shop API yet
      const response = await getNearbyShops();
      if (response.success) {
        const foundShop = response.data.find(s => s._id === shopId);
        if (foundShop) {
          setShop(foundShop);
        } else {
          toast.error('Shop not found');
        }
      } else {
        toast.error(response.message || 'Failed to fetch shop details');
      }
    } catch (error) {
      console.error('Error fetching shop details:', error);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const fetchShopProducts = async () => {
    setLoadingProducts(true);
    try {
      // This is a temporary solution - in a real implementation, 
      // we'd have a dedicated endpoint for shop products
      const response = await getMarketplaceProducts({
        seller: shopId,
        limit: 10
      });
      if (response.success) {
        setProducts(response.data);
      }
    } catch (error) {
      console.error('Error fetching shop products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchShopDetails();
    fetchShopProducts();
  }, [shopId]);

  const handleRateShop = async () => {
    if (rating === 0) {
      toast.warning('Please select a rating');
      return;
    }

    try {
      const response = await rateShop(shopId, rating);
      if (response.success) {
        toast.success('Rating submitted successfully');
        setIsRating(false);
        // Refresh shop details to get updated rating
        fetchShopDetails();
      } else {
        toast.error(response.message || 'Failed to submit rating');
      }
    } catch (error) {
      console.error('Error rating shop:', error);
      toast.error('Something went wrong');
    }
  };

  if (loading) {
    return (
      <UserLayout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </UserLayout>
    );
  }

  if (!shop) {
    return (
      <UserLayout>
        <div className="text-center py-8">
          <p className="text-gray-600">Shop not found.</p>
          <Link to="/user/dashboard" className="text-orange-500 block mt-4">Return to Dashboard</Link>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="container mx-auto p-4">
        {/* Shop Banner */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="h-48 bg-gray-200">
            {/* Shop Banner/Image would be here */}
            <div className="h-full w-full flex items-center justify-center text-gray-400">Shop Banner</div>
          </div>
          
          <div className="p-4">
            <h1 className="text-2xl font-bold mb-2">{shop.shop.name}</h1>
            <p className="text-gray-600 mb-2">{shop.shop.category}</p>
            <p className="text-gray-600 mb-2">{shop.shop.address}</p>
            
            <div className="flex items-center mb-4">
              <StarRating 
                rating={shop.averageRating || 4.8} 
                numReviews={shop.numReviews || 24} 
                showCount={true} 
              />
            </div>
          </div>
        </div>
        
        {/* Shop Products */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Products</h2>
          
          {loadingProducts ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map(product => (
                <Link key={product._id} to={`/user/product/${product._id}`} className="block">
                  <div className="bg-gray-100 rounded-lg overflow-hidden">
                    <div className="h-32 bg-gray-200">
                      {product.images && product.images[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-gray-400">No Image</div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-sm truncate">{product.name}</h3>
                      <p className="text-orange-600 font-bold text-sm">₹{product.zammerPrice}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center">No products available</p>
          )}
        </div>
      </div>
    </UserLayout>
  );
};

export default ShopDetailPage; 