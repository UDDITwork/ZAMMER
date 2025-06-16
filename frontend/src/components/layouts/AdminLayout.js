import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState(null);
  const [error, setError] = useState(null);

  // Debug logging for development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('AdminLayout - Current location:', location.pathname);
    }
  }, [location.pathname]);

  // Handle authentication check
  useEffect(() => {
    const checkAuth = () => {
      try {
        const adminToken = localStorage.getItem('adminToken');
        const adminDataString = localStorage.getItem('adminData');

        // If not authenticated, redirect to login
        if (!adminToken || !adminDataString) {
          console.log('AdminLayout - Not authenticated, redirecting to login');
          navigate('/admin/login', { 
            replace: true,
            state: { from: location.pathname } 
          });
          return;
        }

        // Parse admin data
        try {
          const parsedAdminData = JSON.parse(adminDataString);
          if (!parsedAdminData || !parsedAdminData._id) {
            throw new Error('Invalid admin data structure');
          }
          setAdminData(parsedAdminData);
          setError(null);
        } catch (parseError) {
          console.error('AdminLayout - Error parsing admin data:', parseError);
          setError('Session data corrupted. Please log in again.');
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminData');
          navigate('/admin/login', { replace: true });
          return;
        }

      } catch (err) {
        console.error('AdminLayout - Auth check error:', err);
        setError('Authentication error occurred');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate, location.pathname]);

  const handleLogout = async () => {
    try {
      console.log('AdminLayout - Logging out admin');
      
      // Clear localStorage
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminData');
      
      toast.success('Logged out successfully');
      navigate('/admin/login', { replace: true });
    } catch (error) {
      console.error('AdminLayout - Logout error:', error);
      toast.error('Error during logout');
    }
  };

  // Navigation items configuration
  const navigationItems = [
    {
      path: '/admin/dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      path: '/admin/sellers',
      label: 'View Sellers',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      path: '/admin/users',
      label: 'View Users',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
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
          <p className="text-gray-600">Loading admin panel...</p>
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
            onClick={() => navigate('/admin/login')}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // If not authenticated, return null (redirect will happen)
  if (!adminData) {
    return null;
  }

  return (
    <div className="admin-layout min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-orange-600 text-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-xl font-bold">Zammer Admin Panel</h1>
            {process.env.NODE_ENV === 'development' && (
              <span className="ml-2 text-xs bg-orange-500 px-2 py-1 rounded">DEV</span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {adminData && (
              <div className="flex items-center space-x-2">
                <div className="bg-orange-500 rounded-full w-8 h-8 flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {adminData.name?.charAt(0)?.toUpperCase() || 'A'}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <span className="text-sm font-medium">{adminData.name || 'Admin'}</span>
                  <p className="text-xs text-orange-200">{adminData.role || 'admin'}</p>
                </div>
              </div>
            )}
            <button 
              onClick={handleLogout}
              className="bg-white text-orange-600 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
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
                      className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-orange-500 text-white' 
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                      onClick={() => {
                        if (process.env.NODE_ENV === 'development') {
                          console.log(`Admin navigation clicked: ${item.path}`);
                        }
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Admin Info Widget */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Admin Info</h3>
            <div className="space-y-1 text-xs text-gray-600">
              <p>
                <span className="font-medium">Name:</span> {adminData?.name || 'Not set'}
              </p>
              <p>
                <span className="font-medium">Role:</span> {adminData?.role || 'admin'}
              </p>
              <p>
                <span className="font-medium">Email:</span> {adminData?.email || 'Not set'}
              </p>
              
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600">System monitoring active</span>
                </div>
              </div>
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
          <p>&copy; {new Date().getFullYear()} Zammer Marketplace Admin Panel. All rights reserved.</p>
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

export default AdminLayout; 