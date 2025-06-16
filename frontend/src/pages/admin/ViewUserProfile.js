import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import AdminLayout from '../../components/layouts/AdminLayout';
import adminService from '../../services/adminService';

const ViewUserProfile = () => {
  const { id } = useParams();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      fetchUserProfile();
    }
  }, [id]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      console.log('👤 Fetching user profile for ID:', id);
      
      const response = await adminService.getUserProfile(id);
      
      if (response.success) {
        setUserData(response.data);
        console.log('✅ User profile loaded:', response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch user profile');
      }
    } catch (error) {
      console.error('❌ User profile fetch error:', error);
      setError(error.message || 'Failed to load user profile');
      toast.error('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const WishlistItem = ({ item }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex space-x-4">
        {/* Product Image */}
        <div className="flex-shrink-0">
          {item.images && item.images.length > 0 ? (
            <img
              src={item.images[0]}
              alt={item.name}
              className="w-16 h-16 object-cover rounded-lg"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/api/placeholder/64/64';
              }}
            />
          ) : (
            <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>
        
        {/* Product Info */}
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900">{item.name}</h4>
          <div className="mt-1 flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">₹{item.zammerPrice}</span>
            {item.mrp > item.zammerPrice && (
              <span className="text-sm text-gray-500 line-through">₹{item.mrp}</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">Category: {item.category}</p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading user profile...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Profile</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchUserProfile}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!userData) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">User not found</h3>
          <Link to="/admin/users" className="text-orange-600 hover:text-orange-500 mt-2 inline-block">
            Back to Users
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const { user, stats } = userData;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <nav className="flex mb-4">
              <Link to="/admin/users" className="text-orange-600 hover:text-orange-500">
                ← Back to All Users
              </Link>
            </nav>
            <h1 className="text-2xl font-bold text-gray-900">
              {user.name} Profile
            </h1>
            <p className="text-gray-600">User ID: {user._id}</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${user.isVerified ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <span className={`text-sm ${user.isVerified ? 'text-green-600' : 'text-yellow-600'}`}>
              {user.isVerified ? 'Verified Account' : 'Unverified Account'}
            </span>
          </div>
        </div>

        {/* User Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Wishlist Items</p>
                <p className="text-2xl font-bold text-gray-900">{stats.wishlistItems}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Verification Status</p>
                <p className="text-lg font-bold text-gray-900">{user.isVerified ? 'Verified' : 'Unverified'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Location Status</p>
                <p className="text-lg font-bold text-gray-900">{stats.hasLocation ? 'Available' : 'Not Set'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 12V9" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Member Since</p>
                <p className="text-sm font-bold text-gray-900">{formatDate(stats.joinedDate).split(',')[0]}</p>
              </div>
            </div>
          </div>
        </div>

        {/* User Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Full Name</label>
                <p className="mt-1 text-sm text-gray-900">{user.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-sm text-gray-900">{user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Mobile Number</label>
                <p className="mt-1 text-sm text-gray-900">{user.mobileNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Account Status</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {user.isVerified ? 'Verified' : 'Unverified'}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Joined</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(user.createdAt)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Last Updated</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(user.updatedAt)}</p>
              </div>
            </div>
          </div>

          {/* Location Information */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Location Information</h3>
            </div>
            <div className="p-6 space-y-4">
              {user.location ? (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Address</label>
                    <p className="mt-1 text-sm text-gray-900">{user.location.address || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Coordinates</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {user.location.coordinates && user.location.coordinates.length === 2
                        ? `${user.location.coordinates[1]?.toFixed(6)}, ${user.location.coordinates[0]?.toFixed(6)}`
                        : 'Not available'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Location Type</label>
                    <p className="mt-1 text-sm text-gray-900">{user.location.type || 'Point'}</p>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">No location information available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Wishlist */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Wishlist ({stats.wishlistItems} items)
            </h3>
          </div>
          <div className="p-6">
            {user.wishlist && user.wishlist.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {user.wishlist.map((item) => (
                  <WishlistItem key={item._id} item={item} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Empty Wishlist</h3>
                <p className="mt-1 text-sm text-gray-500">This user hasn't added any items to their wishlist yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Activity Summary */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Activity Summary</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{stats.wishlistItems}</div>
                <div className="text-sm text-gray-600">Items Wishlisted</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24))}
                </div>
                <div className="text-sm text-gray-600">Days as Member</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {user.isVerified ? '✓' : '✗'}
                </div>
                <div className="text-sm text-gray-600">Email Verified</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {stats.hasLocation ? '✓' : '✗'}
                </div>
                <div className="text-sm text-gray-600">Location Set</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ViewUserProfile; 