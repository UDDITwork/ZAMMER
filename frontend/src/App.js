import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// At the top of app.js


// Auth Provider
import { AuthProvider } from './contexts/AuthContext';

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

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <ToastContainer position="top-center" />
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
            <Route path="/seller/products/add" element={<AddProduct />} />
            <Route path="/seller/products/edit/:id" element={<EditProduct />} />
            <Route path="/seller/products" element={<ViewProducts />} />
            <Route path="/seller/profile" element={<EditProfile />} />
            
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
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;