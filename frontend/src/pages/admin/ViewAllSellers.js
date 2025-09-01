// frontend/src/pages/admin/ViewAllSellers.js
// View and manage all registered sellers with authentication fixes

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import adminService from '../../services/adminService';
import { checkAdminAuth, fixAdminAuth } from '../../utils/adminAuthFix';

const ViewAllSellers = () => {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalSellers: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSellers, setFilteredSellers] = useState([]);

  // 🔒 SECURITY: Get auth context and navigation
  const { adminAuth } = useAuth();
  const navigate = useNavigate();

  // 🔒 CRITICAL: Wait for auth context to initialize first
  useEffect(() => {
    // Small delay to ensure auth context is fully initialized
    const timer = setTimeout(() => {
      setAuthInitialized(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // 🔒 CRITICAL: Authentication protection with auto-fix capability
  useEffect(() => {
    if (!authInitialized) return;

    const handleAuthCheck = async () => {
      console.log('🔒 [VIEW-ALL-SELLERS] Authentication check started...', {
        isAuthenticated: adminAuth.isAuthenticated,
        hasAdmin: !!adminAuth.admin,
        hasToken: !!adminAuth.token,
        adminName: adminAuth.admin?.name,
        authInitialized
      });

      // Check if AuthContext has valid authentication
      if (adminAuth.isAuthenticated && adminAuth.admin && adminAuth.token) {
        console.log('✅ [VIEW-ALL-SELLERS] Authentication verified for admin:', adminAuth.admin.name);
        setAuthCheckComplete(true);
        return;
      }

      // If AuthContext doesn't have auth, check localStorage directly
      console.log('⚠️ [VIEW-ALL-SELLERS] AuthContext missing auth, checking localStorage...');
      const authCheck = checkAdminAuth();
      
      if (authCheck.isValid) {
        console.log('✅ [VIEW-ALL-SELLERS] Valid auth found in localStorage, AuthContext will sync');
        setAuthCheckComplete(true);
        return;
      }

      // Try to auto-fix authentication
      console.log('🔧 [VIEW-ALL-SELLERS] Attempting to auto-fix authentication...');
      const fixResult = await fixAdminAuth();
      
      if (fixResult.success) {
        console.log('✅ [VIEW-ALL-SELLERS] Authentication auto-fixed successfully');
        toast.success('Admin authentication restored');
        setAuthCheckComplete(true);
        return;
      }

      // If all else fails, redirect to login
      console.log('❌ [VIEW-ALL-SELLERS] Authentication failed, redirecting to login...');
      toast.error('Please login to access admin panel');
      navigate('/admin/login', { replace: true });
    };

    handleAuthCheck();
  }, [authInitialized, adminAuth.isAuthenticated, adminAuth.admin, adminAuth.token, navigate]);

  // 🔒 ONLY fetch data AFTER authentication is verified
  useEffect(() => {
    if (authCheckComplete && adminAuth.isAuthenticated) {
      fetchSellers();
    }
  }, [authCheckComplete, adminAuth.isAuthenticated, pagination.currentPage]);

  useEffect(() => {
    // Filter sellers based on search term
    if (searchTerm.trim() === '') {
      setFilteredSellers(sellers);
    } else {
      const filtered = sellers.filter(seller =>
        seller.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        seller.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        seller.shop?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        seller.shop?.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSellers(filtered);
    }
  }, [searchTerm, sellers]);

  const fetchSellers = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      console.log('📊 [VIEW-ALL-SELLERS] Fetching sellers for page:', page);
      
      // Verify authentication before making API call
      if (!adminAuth.isAuthenticated || !adminAuth.token) {
        console.log('❌ [VIEW-ALL-SELLERS] No valid authentication for API call');
        toast.error('Authentication required. Please login again.');
        navigate('/admin/login', { replace: true });
        return;
      }
      
      const response = await adminService.getAllSellers({ 
        page, 
        limit: 20 
      });
      
      if (response.success) {
        setSellers(response.data);
        setFilteredSellers(response.data);
        setPagination(response.pagination);
        console.log('✅ [VIEW-ALL-SELLERS] Sellers loaded:', {
          count: response.data.length,
          total: response.pagination.totalSellers
        });
      } else {
        throw new Error(response.message || 'Failed to fetch sellers');
      }
    } catch (error) {
      console.error('❌ [VIEW-ALL-SELLERS] Sellers fetch error:', error);
      
      if (error.response?.status === 401) {
        console.log('🔒 [VIEW-ALL-SELLERS] Authentication expired, redirecting to login...');
        toast.error('Session expired. Please login again.');
        navigate('/admin/login', { replace: true });
        return;
      }
      
      setError(error.message || 'Failed to load sellers');
      toast.error('Failed to load sellers');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getShopStatus = (seller) => {
    if (!seller.shop?.name) {
      return { status: 'No Shop', color: 'bg-red-100 text-red-800' };
    }
    return { status: 'Active', color: 'bg-green-100 text-green-800' };
  };

  const SellerCard = ({ seller }) => {
    const shopStatus = getShopStatus(seller);
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            {/* Avatar */}
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-lg font-semibold text-orange-600">
                {seller.firstName?.charAt(0)?.toUpperCase() || 'S'}
              </span>
            </div>
            
            {/* Seller Info */}
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {seller.firstName || 'Unknown'}
              </h3>
              <p className="text-sm text-gray-600">{seller.email}</p>
              <p className="text-sm text-gray-500">{seller.mobileNumber}</p>
              
              {/* Shop Info */}
              <div className="mt-2">
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${shopStatus.color}`}>
                    {shopStatus.status}
                  </span>
                  {seller.shop?.category && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {seller.shop.category}
                    </span>
                  )}
                </div>
                
                {seller.shop?.name && (
                  <p className="text-sm text-gray-700 mt-1">
                    <span className="font-medium">Shop:</span> {seller.shop.name}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex flex-col items-end space-y-2">
            <Link
              to={`/admin/sellers/${seller._id}`}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              View Profile
            </Link>
            
            <div className="text-xs text-gray-500 text-right">
              <p>Products: {seller.productCount || 0}</p>
              <p>Joined: {formatDate(seller.createdAt)}</p>
            </div>
          </div>
        </div>
        
        {/* Shop Address */}
        {seller.shop?.address && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Address:</span> {seller.shop.address}
            </p>
          </div>
        )}
      </div>
    );
  };

  // Loading and authentication states
  if (!authInitialized || !authCheckComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {!authInitialized ? 'Initializing authentication...' : 'Verifying admin access...'}
          </p>
        </div>
      </div>
    );
  }

  if (!adminAuth.isAuthenticated || !adminAuth.admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600 mb-4">You need admin privileges to access this page</p>
          <button
            onClick={() => navigate('/admin/login')}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading sellers...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Sellers</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => fetchSellers()}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">View Registered Sellers</h1>
            <p className="text-gray-600">
              Total {pagination.totalSellers} sellers registered in the system
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search sellers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Sellers</p>
                <p className="text-lg font-semibold text-gray-900">{pagination.totalSellers}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">With Shops</p>
                <p className="text-lg font-semibold text-gray-900">
                  {sellers.filter(s => s.shop?.name).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-lg font-semibold text-gray-900">
                  {sellers.reduce((sum, s) => sum + (s.productCount || 0), 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Showing</p>
                <p className="text-lg font-semibold text-gray-900">{filteredSellers.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sellers List */}
        <div className="space-y-4">
          {filteredSellers.length > 0 ? (
            filteredSellers.map((seller) => (
              <SellerCard key={seller._id} seller={seller} />
            ))
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No sellers found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search terms.' : 'No sellers have registered yet.'}
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => fetchSellers(pagination.currentPage - 1)}
                disabled={!pagination.hasPrevPage}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => fetchSellers(pagination.currentPage + 1)}
                disabled={!pagination.hasNextPage}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing page <span className="font-medium">{pagination.currentPage}</span> of{' '}
                  <span className="font-medium">{pagination.totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => fetchSellers(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrevPage}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => fetchSellers(pagination.currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewAllSellers; 