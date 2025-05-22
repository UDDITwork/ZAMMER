import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';

const SellerLayout = ({ children }) => {
  const { sellerAuth, logoutSeller } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logoutSeller();
    navigate('/seller/login');
  };

  // If not authenticated, redirect to login
  if (!sellerAuth.isAuthenticated) {
    navigate('/seller/login');
    return null;
  }

  return (
    <div className="seller-layout">
      <header className="bg-orange-500 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Zammer Seller Dashboard</h1>
          <div>
            {sellerAuth.seller && (
              <span className="mr-4">{sellerAuth.seller.firstName}</span>
            )}
            <button 
              onClick={handleLogout}
              className="bg-white text-orange-500 px-4 py-2 rounded-md"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4 flex">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-gray-100 rounded-lg p-4 mr-8">
          <nav>
            <ul>
              <li className="mb-2">
                <Link 
                  to="/seller/dashboard" 
                  className={`block p-2 rounded ${
                    location.pathname === '/seller/dashboard' 
                      ? 'bg-orange-500 text-white' 
                      : 'hover:bg-gray-200'
                  }`}
                >
                  Home
                </Link>
              </li>
              <li className="mb-2">
                <Link 
                  to="/seller/add-product" 
                  className={`block p-2 rounded ${
                    location.pathname === '/seller/add-product' 
                      ? 'bg-orange-500 text-white' 
                      : 'hover:bg-gray-200'
                  }`}
                >
                  Add Product
                </Link>
              </li>
              <li className="mb-2">
                <Link 
                  to="/seller/view-products" 
                  className={`block p-2 rounded ${
                    location.pathname === '/seller/view-products' 
                      ? 'bg-orange-500 text-white' 
                      : 'hover:bg-gray-200'
                  }`}
                >
                  View Products
                </Link>
              </li>
              <li className="mb-2">
                <Link 
                  to="/seller/edit-profile" 
                  className={`block p-2 rounded ${
                    location.pathname === '/seller/edit-profile' 
                      ? 'bg-orange-500 text-white' 
                      : 'hover:bg-gray-200'
                  }`}
                >
                  My Account
                </Link>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 bg-white rounded-lg p-6 shadow-md">
          {children}
        </main>
      </div>

      <footer className="bg-gray-200 p-4 mt-8">
        <div className="container mx-auto text-center text-gray-600">
          <p>&copy; {new Date().getFullYear()} Zammer Marketplace. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default SellerLayout;