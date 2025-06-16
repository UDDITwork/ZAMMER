import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import AdminLayout from '../../components/layouts/AdminLayout';
import adminService from '../../services/adminService';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      console.log('📊 Fetching dashboard statistics...');
      
      const response = await adminService.getDashboardStats();
      
      if (response.success) {
        setStats(response.data);
        console.log('✅ Dashboard stats loaded:', response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch dashboard stats');
      }
    } catch (error) {
      console.error('❌ Dashboard stats error:', error);
      setError(error.message || 'Failed to load dashboard data');
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color, link }) => (
    <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center`}>
              {icon}
            </div>
          </div>
          <div className="ml-4 flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 truncate">
                  {title}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {value}
                </p>
              </div>
              {link && (
                <Link
                  to={link}
                  className="text-sm text-orange-600 hover:text-orange-500 font-medium"
                >
                  View All →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const RecentItem = ({ item, type }) => (
    <div className="flex items-center p-4 hover:bg-gray-50 rounded-lg">
      <div className="flex-shrink-0">
        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
          <span className="text-sm font-medium text-orange-600">
            {type === 'seller' ? 
              (item.firstName?.charAt(0)?.toUpperCase() || 'S') : 
              (item.name?.charAt(0)?.toUpperCase() || 'U')
            }
          </span>
        </div>
      </div>
      <div className="ml-4 flex-1">
        <p className="text-sm font-medium text-gray-900">
          {type === 'seller' ? item.firstName : item.name}
        </p>
        <p className="text-sm text-gray-500">
          {item.email}
        </p>
        {type === 'seller' && item.shop?.name && (
          <p className="text-xs text-gray-400">
            Shop: {item.shop.name}
          </p>
        )}
      </div>
      <div className="text-xs text-gray-400">
        {new Date(item.createdAt).toLocaleDateString()}
      </div>
    </div>
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Dashboard</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchDashboardStats}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Welcome to the Zammer Admin Panel</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-600">System Active</span>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Sellers"
            value={stats?.overview?.totalSellers || 0}
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
            color="bg-blue-500"
            link="/admin/sellers"
          />
          
          <StatCard
            title="Total Users"
            value={stats?.overview?.totalUsers || 0}
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            }
            color="bg-green-500"
            link="/admin/users"
          />
          
          <StatCard
            title="Total Products"
            value={stats?.overview?.totalProducts || 0}
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
            color="bg-purple-500"
          />
          
          <StatCard
            title="Active Products"
            value={stats?.overview?.activeProducts || 0}
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="bg-emerald-500"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                to="/admin/sellers"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">View Registered Sellers</h3>
                  <p className="text-sm text-gray-500">Manage all seller accounts and shops</p>
                </div>
              </Link>

              <Link
                to="/admin/users"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">View All Buyers</h3>
                  <p className="text-sm text-gray-500">Manage all user accounts and profiles</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Sellers */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Recent Sellers</h2>
              <Link
                to="/admin/sellers"
                className="text-sm text-orange-600 hover:text-orange-500 font-medium"
              >
                View All
              </Link>
            </div>
            <div className="divide-y divide-gray-200">
              {stats?.recent?.sellers?.length > 0 ? (
                stats.recent.sellers.map((seller) => (
                  <RecentItem key={seller._id} item={seller} type="seller" />
                ))
              ) : (
                <div className="p-6 text-center text-gray-500">
                  No recent sellers found
                </div>
              )}
            </div>
          </div>

          {/* Recent Users */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Recent Users</h2>
              <Link
                to="/admin/users"
                className="text-sm text-orange-600 hover:text-orange-500 font-medium"
              >
                View All
              </Link>
            </div>
            <div className="divide-y divide-gray-200">
              {stats?.recent?.users?.length > 0 ? (
                stats.recent.users.map((user) => (
                  <RecentItem key={user._id} item={user} type="user" />
                ))
              ) : (
                <div className="p-6 text-center text-gray-500">
                  No recent users found
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard; 