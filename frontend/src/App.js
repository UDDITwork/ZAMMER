import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Auth Provider
import { AuthProvider } from './contexts/AuthContext';

// Error Boundary Component
import ErrorBoundary from './components/ErrorBoundary';
import SimplePlacesTest from './components/SimplePlacesTest';

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

// 🎯 FIXED: Import the missing MyOrdersPage component
import MyOrdersPage from './pages/user/MyOrdersPage';

// 🎯 TESTING: Import the socket test component
import SocketTestComponent from './components/user/SocketTestComponent';

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
            {/* Root redirect */}
            <Route path="/" element={<Navigate replace to="/user/dashboard" />} />
            
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
            
            {/* 🎯 FIXED: Add missing order routes */}
            <Route path="/user/orders" element={<MyOrdersPage />} />
            <Route path="/user/my-orders" element={<MyOrdersPage />} />
            
            {/* 🎯 TESTING: Add socket test route */}
            <Route path="/test-socket" element={<SocketTestComponent />} />
            
            {/* Add this route for testing */}
            <Route path="/test-places" element={<SimplePlacesTest />} />
              
            {/* 404 Catch-all route */}
            <Route path="*" element={
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">404 - Page Not Found</h1>
                  <p className="text-gray-600 mb-4">The page you're looking for doesn't exist.</p>
                  <Navigate to="/user/dashboard" replace />
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