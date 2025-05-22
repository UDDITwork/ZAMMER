import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';

const UserLayout = ({ children }) => {
  const { userAuth, logoutUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logoutUser();
    navigate('/user/login');
  };

  // If not authenticated, redirect to login
  if (!userAuth.isAuthenticated) {
    navigate('/user/login');
    return null;
  }

  // Helper function to determine active tab
  const isActive = (path) => {
    return location.pathname.includes(path);
  };

  return (
    <div className="user-layout min-h-screen flex flex-col bg-gray-50">
      {/* Page content */}
      <div className="flex-grow pb-16">
        {children}
      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
        <div className="flex justify-between items-center max-w-screen-xl mx-auto">
          <Link 
            to="/user/dashboard" 
            className={`flex flex-col items-center justify-center py-2 px-4 text-xs ${
              location.pathname === '/user/dashboard' ? 'text-orange-500' : 'text-gray-500'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Home</span>
          </Link>

          <Link 
            to="/user/shop" 
            className={`flex flex-col items-center justify-center py-2 px-4 text-xs ${
              isActive('/shop') ? 'text-orange-500' : 'text-gray-500'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span>Shop</span>
          </Link>

          <Link 
            to="/user/cart" 
            className={`flex flex-col items-center justify-center py-2 px-4 text-xs ${
              isActive('/cart') ? 'text-orange-500' : 'text-gray-500'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Cart</span>
          </Link>

          <Link 
            to="/user/trending" 
            className={`flex flex-col items-center justify-center py-2 px-4 text-xs ${
              isActive('/trending') ? 'text-orange-500' : 'text-gray-500'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span>Trending</span>
          </Link>

          <Link 
            to="/user/limited-edition" 
            className={`flex flex-col items-center justify-center py-2 px-4 text-xs ${
              isActive('/limited-edition') ? 'text-orange-500' : 'text-gray-500'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <span>Limited Edition</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UserLayout;