import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

const SellerLayout = ({ children }) => {
  const { sellerAuth, logoutSeller } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debug logging for development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('SellerLayout - Current location:', location.pathname);
      console.log('SellerLayout - Auth state:', {
        isAuthenticated: sellerAuth?.isAuthenticated,
        hasSellerData: !!sellerAuth?.seller,
        sellerFirstName: sellerAuth?.seller?.firstName
      });
    }
  }, [location.pathname, sellerAuth]);

  // Handle authentication check
  useEffect(() => {
    const checkAuth = () => {
      try {
        // If not authenticated, redirect to login
        if (!sellerAuth?.isAuthenticated) {
          console.log('SellerLayout - Not authenticated, redirecting to login');
          navigate('/seller/login', { 
            replace: true,
            state: { from: location.pathname } 
          });
          return;
        }

        // Check if seller data is available
        if (!sellerAuth.seller) {
          console.warn('SellerLayout - Authenticated but no seller data');
          setError('Session data incomplete. Please log in again.');
          return;
        }

        setError(null);
      } catch (err) {
        console.error('SellerLayout - Auth check error:', err);
        setError('Authentication error occurred');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [sellerAuth, navigate, location.pathname]);

  const handleLogout = async () => {
    try {
      console.log('SellerLayout - Logging out seller');
      logoutSeller();
      toast.success('Logged out successfully');
      navigate('/seller/login', { replace: true });
    } catch (error) {
      console.error('SellerLayout - Logout error:', error);
      toast.error('Error during logout');
    }
  };

  // Navigation items configuration
  const navigationItems = [
    {
      path: '/seller/dashboard',
      label: 'Home',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      path: '/seller/add-product',
      label: 'Add Product',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      )
    },
    {
      path: '/seller/view-products',
      label: 'View Products',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    {
      path: '/seller/edit-profile',
      label: 'My Account',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }
  ];

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/seller/login')}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // If not authenticated, return null (redirect will happen)
  if (!sellerAuth?.isAuthenticated) {
    return null;
  }

  return (
    <div className="seller-layout min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-orange-500 text-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-xl font-bold">Zammer Seller Dashboard</h1>
            {process.env.NODE_ENV === 'development' && (
              <span className="ml-2 text-xs bg-orange-400 px-2 py-1 rounded">DEV</span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {sellerAuth.seller && (
              <div className="flex items-center space-x-2">
                <div className="bg-orange-400 rounded-full w-8 h-8 flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {sellerAuth.seller.firstName?.charAt(0)?.toUpperCase() || 'S'}
                  </span>
                </div>
                <span className="hidden sm:inline">
                  {sellerAuth.seller.firstName || 'Seller'}
                </span>
              </div>
            )}
            <button 
              onClick={handleLogout}
              className="bg-white text-orange-500 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <aside className="lg:w-64 bg-white rounded-lg shadow-sm p-4">
          <nav>
            <ul className="space-y-1">
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link 
                      to={item.path} 
                      className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-orange-500 text-white' 
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                      onClick={() => {
                        if (process.env.NODE_ENV === 'development') {
                          console.log(`Navigation clicked: ${item.path}`);
                        }
                      }}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Shop Info Widget */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Shop Info</h3>
            <div className="space-y-1 text-xs text-gray-600">
              <p>
                <span className="font-medium">Name:</span> {sellerAuth.seller?.shop?.name || 'Not set'}
              </p>
              <p>
                <span className="font-medium">Category:</span> {sellerAuth.seller?.shop?.category || 'Not set'}
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 bg-white rounded-lg shadow-sm p-6 min-h-[calc(100vh-12rem)]">
          <div className="max-w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 mt-8">
        <div className="container mx-auto px-4 text-center text-gray-600 text-sm">
          <p>&copy; {new Date().getFullYear()} Zammer Marketplace. All rights reserved.</p>
          {process.env.NODE_ENV === 'development' && (
            <p className="mt-1 text-xs text-gray-500">
              Development Mode | Route: {location.pathname}
            </p>
          )}
        </div>
      </footer>
    </div>
  );
};

export default SellerLayout;