import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Auth Provider
import { AuthProvider } from './contexts/AuthContext';

// Error Boundary Component
import ErrorBoundary from './components/ErrorBoundary';
import SimplePlacesTest from './components/SimplePlacesTest';

// Admin Auth Pages
import AdminLogin from './pages/auth/AdminLogin';

// Admin Dashboard Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ViewAllSellers from './pages/admin/ViewAllSellers';
import ViewSellerProfile from './pages/admin/ViewSellerProfile';
import ViewAllUsers from './pages/admin/ViewAllUsers';
import ViewUserProfile from './pages/admin/ViewUserProfile';

// Seller Auth Pages
import SellerLogin from './pages/auth/SellerLogin';
import SellerRegister from './pages/auth/SellerRegister';
import SellerForgotPassword from './pages/auth/SellerForgotPassword';
import SellerResetPassword from './pages/auth/SellerResetPassword';

// Seller Dashboard Pages
import SellerDashboard from './pages/seller/Dashboard';
import AddProduct from './pages/seller/AddProduct';
import EditProduct from './pages/seller/EditProduct';
import ViewProducts from './pages/seller/ViewProducts';
import EditProfile from './pages/seller/EditProfile';
import Orders from './pages/seller/Orders';

// User Auth Pages
import UserLogin from './pages/auth/UserLogin';
import UserRegister from './pages/auth/UserRegister';
import UserForgotPassword from './pages/auth/UserForgotPassword';
import UserResetPassword from './pages/auth/UserResetPassword';

// User Pages
import HomePage from './pages/user/HomePage';
import UserDashboard from './pages/user/Dashboard';
import ShopOffersPage from './pages/user/ShopOffersPage';
import CategoryPage from './pages/user/CategoryPage';
import ProductListPage from './pages/user/ProductListPage';
import ProductDetailPage from './pages/user/ProductDetailPage';
import ShopDetailPage from './pages/user/ShopDetailPage';
import ShopPage from './pages/user/ShopPage';
import NearbyShopsPage from './pages/user/NearbyShopsPage';
import CartPage from './pages/user/CartPage';
import CheckoutPage from './pages/user/CheckoutPage';
import PaymentPage from './pages/user/PaymentPage';
import WishlistPage from './pages/user/WishlistPage';
import TrendingPage from './pages/user/TrendingPage';
import LimitedEditionPage from './pages/user/LimitedEditionPage';
import OrderConfirmationPage from './pages/user/OrderConfirmationPage';
import UserProfile from './pages/user/UserProfile';
import MyOrdersPage from './pages/user/MyOrdersPage';

// Testing Components
import SocketTestComponent from './components/user/SocketTestComponent';

// Landing Page Component
const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="text-center text-white p-8">
        <h1 className="text-6xl font-bold mb-6">ZAMMER</h1>
        <p className="text-xl mb-8">Your Complete Online Marketplace</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
          <a 
            href="/user/login" 
            className="bg-white text-blue-600 px-6 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors block"
          >
            User Login
          </a>
          <a 
            href="/seller/login" 
            className="bg-transparent border-2 border-white text-white px-6 py-4 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors block"
          >
            Seller Login
          </a>
          <a 
            href="/admin/login" 
            className="bg-yellow-500 text-black px-6 py-4 rounded-lg font-semibold hover:bg-yellow-400 transition-colors block"
          >
            Admin Login
          </a>
        </div>
        <div className="mt-8 text-sm opacity-80">
          <p>Backend API: Running</p>
          <p>Database: Connected</p>
          <p>Real-time: Active</p>
        </div>
      </div>
    </div>
  );
};

// Development error logging
const logRouteError = (error, errorInfo) => {
  console.error('Route Error:', error);
  console.error('Error Info:', errorInfo);
  
  // In production, you might want to send this to an error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Example: Sentry.captureException(error);
  }
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <ErrorBoundary onError={logRouteError}>
        <div className="App">
            <ToastContainer 
              position="top-center"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
            />
          <Routes>
            {/* Root Landing Page */}
            <Route path="/" element={<LandingPage />} />
            
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/sellers" element={<ViewAllSellers />} />
            <Route path="/admin/sellers/:id" element={<ViewSellerProfile />} />
            <Route path="/admin/users" element={<ViewAllUsers />} />
            <Route path="/admin/users/:id" element={<ViewUserProfile />} />
            
            {/* Seller Auth Routes */}
            <Route path="/seller/login" element={<SellerLogin />} />
            <Route path="/seller/register" element={<SellerRegister />} />
            <Route path="/seller/forgot-password" element={<SellerForgotPassword />} />
            <Route path="/seller/reset-password/:token" element={<SellerResetPassword />} />
            
            {/* Seller Dashboard Routes */}
            <Route path="/seller/dashboard" element={<SellerDashboard />} />
            <Route path="/seller/add-product" element={<AddProduct />} />
            <Route path="/seller/edit-product/:id" element={<EditProduct />} />
            <Route path="/seller/view-products" element={<ViewProducts />} />
            <Route path="/seller/edit-profile" element={<EditProfile />} />
            <Route path="/seller/orders" element={<Orders />} />
              
            {/* Legacy route redirects for backward compatibility */}
            <Route path="/seller/products/add" element={<Navigate replace to="/seller/add-product" />} />
            <Route path="/seller/products/edit/:id" element={<Navigate replace to="/seller/edit-product/:id" />} />
            <Route path="/seller/products" element={<Navigate replace to="/seller/view-products" />} />
            <Route path="/seller/profile" element={<Navigate replace to="/seller/edit-profile" />} />
            
            {/* User Auth Routes */}
            <Route path="/user/login" element={<UserLogin />} />
            <Route path="/user/register" element={<UserRegister />} />
            <Route path="/user/forgot-password" element={<UserForgotPassword />} />
            <Route path="/user/reset-password/:token" element={<UserResetPassword />} />
            
            {/* User Pages */}
            <Route path="/user/dashboard" element={<UserDashboard />} />
            <Route path="/user/home" element={<HomePage />} />
            <Route path="/user/offers" element={<ShopOffersPage />} />
            <Route path="/user/categories/:category" element={<CategoryPage />} />
            <Route path="/user/products" element={<ProductListPage />} />
            <Route path="/user/product/:productId" element={<ProductDetailPage />} />
            <Route path="/user/shop/:shopId" element={<ShopDetailPage />} />
            <Route path="/user/shop" element={<ShopPage />} />
            <Route path="/user/nearby-shops" element={<NearbyShopsPage />} />
            <Route path="/user/cart" element={<CartPage />} />
            <Route path="/user/checkout" element={<CheckoutPage />} />
            <Route path="/user/payment" element={<PaymentPage />} />
            <Route path="/user/wishlist" element={<WishlistPage />} />
            <Route path="/user/trending" element={<TrendingPage />} />
            <Route path="/user/limited-edition" element={<LimitedEditionPage />} />
            <Route path="/user/order-confirmation" element={<OrderConfirmationPage />} />
            <Route path="/user/profile" element={<UserProfile />} />
            
            {/* User Order Routes */}
            <Route path="/user/orders" element={<MyOrdersPage />} />
            <Route path="/user/my-orders" element={<MyOrdersPage />} />
            
            {/* Testing Routes */}
            <Route path="/test-socket" element={<SocketTestComponent />} />
            <Route path="/test-places" element={<SimplePlacesTest />} />
              
            {/* 404 Catch-all route */}
            <Route path="*" element={
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">404 - Page Not Found</h1>
                  <p className="text-gray-600 mb-6">The page you're looking for doesn't exist.</p>
                  <div className="space-x-4">
                    <a href="/" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                      Go Home
                    </a>
                    <a href="/user/login" className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors">
                      User Login
                    </a>
                  </div>
                </div>
              </div>
            } />
          </Routes>
        </div>
        </ErrorBoundary>
      </AuthProvider>
    </Router>
  );
}

export default App;