import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import UserLayout from '../../components/layouts/UserLayout';
import { getNearbyShops } from '../../services/userService';
import { toast } from 'react-toastify';

const NearbyShopsPage = () => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShops = async () => {
      try {
        const response = await getNearbyShops();
        if (response.success) {
          setShops(response.data);
        } else {
          toast.error(response.message || 'Failed to fetch nearby shops');
        }
      } catch (error) {
        console.error('Error fetching shops:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShops();
  }, []);

  return (
    <UserLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Nearby Shops</h1>
        
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          </div>
        ) : shops.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shops.map(shop => (
              <div key={shop._id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="h-40 bg-gray-200 relative">
                  {/* Shop image would go here */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-gray-500">Shop Image</span>
                  </div>
                </div>
                <div className="p-4">
                  <h2 className="text-xl font-semibold">{shop.shop.name}</h2>
                  <p className="text-gray-600">{shop.shop.category}</p>
                  <p className="text-gray-600">{shop.shop.address}</p>
                  <div className="mt-4">
                    <Link 
                      to={`/user/shop/${shop._id}`}
                      className="bg-orange-500 text-white px-4 py-2 rounded-md inline-block"
                    >
                      View Shop
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600">No nearby shops found.</p>
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default NearbyShopsPage; 