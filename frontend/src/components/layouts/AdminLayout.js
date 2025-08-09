// frontend/src/components/layouts/AdminLayout.js - CRITICAL FIX

import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminStats, setAdminStats] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { adminAuth, logout } = useAuth();

  // 🎯 MOVE ALL useEffect TO TOP - BEFORE ANY CONDITIONAL RETURNS
  useEffect(() => {
    const updateLayout = () => {
      const mainContent = document.querySelector('.admin-main-content');
      if (mainContent && window.innerWidth >= 1024) {
        mainContent.style.paddingLeft = '16rem';
      } else if (mainContent) {
        mainContent.style.paddingLeft = '0';
      }
    };
    
    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  useEffect(() => {
    console.log('%c[ADMIN-LAYOUT] Protected route - checking auth', 'color: #673AB7; font-weight: bold;', {
      isAuthenticated: adminAuth.isAuthenticated,
      hasAdmin: !!adminAuth.admin,
      hasToken: !!adminAuth.token,
      currentPath: location.pathname
    });

    const publicRoutes = ['/admin/login', '/admin/forgot-password', '/admin/register'];
    const isPublicRoute = publicRoutes.includes(location.pathname);

    if (!isPublicRoute && (!adminAuth.isAuthenticated || !adminAuth.admin || !adminAuth.token)) {
      console.log('%c[ADMIN-LAYOUT] Auth failed - redirecting to login', 'color: #F44336; font-weight: bold;');
      navigate('/admin/login', { replace: true });
      return;
    }

    if (!isPublicRoute) {
      loadAdminStats();
    }
  }, [adminAuth, location.pathname, navigate]);

  // 🎯 NOW CHECK PUBLIC ROUTES AFTER HOOKS
  const publicRoutes = ['/admin/login', '/admin/forgot-password', '/admin/register'];
  const isPublicRoute = publicRoutes.includes(location.pathname);

  console.log('%c[ADMIN-LAYOUT] Route check', 'color: #673AB7; font-weight: bold;', {
    pathname: location.pathname,
    isPublicRoute,
    adminAuth: {
      isAuthenticated: adminAuth.isAuthenticated,
      hasAdmin: !!adminAuth.admin,
      hasToken: !!adminAuth.token
    }
  });

  // 🎯 CRITICAL: If it's a public route, just render children without layout
  if (isPublicRoute) {
    console.log('%c[ADMIN-LAYOUT] Rendering public route without layout', 'color: #673AB7; font-weight: bold;');
    return children;
  }

  // Load admin statistics
  const loadAdminStats = async () => {
    try {
      console.log('%c[ADMIN-LAYOUT] Loading admin stats', 'color: #673AB7; font-weight: bold;');
      
      // Placeholder stats
      const stats = {
        totalOrders: 156,
        pendingApprovals: 8,
        activeDeliveryAgents: 12,
        totalUsers: 1250,
        totalSellers: 89,
        todayRevenue: 45600
      };
      
      setAdminStats(stats);
      console.log('%c[ADMIN-LAYOUT] Admin stats loaded', 'color: #4CAF50; font-weight: bold;', stats);
      
    } catch (error) {
      console.log('%c[ADMIN-LAYOUT] Stats loading error', 'color: #F44336; font-weight: bold;', error);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      console.log('%c[ADMIN-LAYOUT] Logout initiated', 'color: #FF9800; font-weight: bold;');
      
      const confirmLogout = window.confirm('Are you sure you want to logout?');
      if (!confirmLogout) return;

      await logout();
      console.log('%c[ADMIN-LAYOUT] Logout successful', 'color: #4CAF50; font-weight: bold;');
      navigate('/admin/login', { replace: true });
      
    } catch (error) {
      console.log('%c[ADMIN-LAYOUT] Logout error', 'color: #F44336; font-weight: bold;', error);
    }
  };

  // Navigation items
  const navigation = [
    {
      name: 'Dashboard',
      href: '/admin/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        </svg>
      )
    },
    {
      name: 'Orders',
      href: '/admin/orders',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      ),
      badge: adminStats?.pendingApprovals
    },
    {
      name: 'Delivery Agents',
      href: '/admin/delivery-agents',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      badge: adminStats?.activeDeliveryAgents
    },
    {
      name: 'Users',
      href: '/admin/users',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      )
    },
    {
      name: 'Sellers',
      href: '/admin/sellers',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    }
  ];

  // Check if current path is active
  const isActive = (href) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  // 🎯 CRITICAL: Show loading if no admin auth yet
  if (!adminAuth.isAuthenticated || !adminAuth.admin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  console.log('%c[ADMIN-LAYOUT] Rendering full admin layout', 'color: #4CAF50; font-weight: bold;');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
            <Link to="/admin/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">Z</span>
              </div>
              <span className="text-xl font-bold text-gray-900">ZAMMER Admin</span>
            </Link>
            
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Admin Info */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {adminAuth.admin?.name || 'Admin User'}
                </p>
                <p className="text-xs text-gray-500">{adminAuth.admin?.role || 'Administrator'}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-6 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => console.log('%c[ADMIN-LAYOUT] Navigation clicked', 'color: #FF5722; font-weight: bold;', item.name)}
                className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive(item.href)
                    ? 'bg-orange-100 text-orange-700 border-r-2 border-orange-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className={isActive(item.href) ? 'text-orange-600' : 'text-gray-400'}>
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                </div>
                
                {item.badge && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* Logout */}
          <div className="px-6 py-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 w-full px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="admin-main-content pl-0 lg:pl-64" style={{paddingLeft: window.innerWidth >= 1024 ? '16rem' : '0'}}>
        {/* Top header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex-1 lg:flex lg:items-center lg:justify-between">
              <h1 className="text-2xl font-semibold text-gray-900">
                {getPageTitle(location.pathname)}
              </h1>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-600">Authenticated</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

// Helper function to get page title
const getPageTitle = (pathname) => {
  const titles = {
    '/admin/dashboard': 'Dashboard',
    '/admin/orders': 'Order Management',
    '/admin/delivery-agents': 'Delivery Agents',
    '/admin/users': 'User Management',
    '/admin/sellers': 'Seller Management'
  };

  return titles[pathname] || 'Admin Panel';
};

export default AdminLayout;