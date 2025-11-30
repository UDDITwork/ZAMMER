// frontend/src/App.js - Simplified Final Version (No Extra Components Needed)

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ROUTES } from './routes';

// Auth Provider
import { AuthProvider } from './contexts/AuthContext';

// 🎯 ADDED: Import DeliveryProvider for delivery agent operations
import { DeliveryProvider } from './contexts/DeliveryContext';

// Import auth utilities for debugging
import './utils/authUtils';

// Error Boundary Component
import ErrorBoundary from './components/ErrorBoundary';
import SimplePlacesTest from './components/SimplePlacesTest';

// Admin Auth Pages
import AdminLogin from './pages/admin/AdminLogin';

// Admin Dashboard Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ViewAllSellers from './pages/admin/ViewAllSellers';
import ViewSellerProfile from './pages/admin/ViewSellerProfile';
import ViewAllUsers from './pages/admin/ViewAllUsers';
import ViewUserProfile from './pages/admin/ViewUserProfile';
import DeliveryAgents from './pages/admin/DeliveryAgents';
import AdminPayoutDashboard from './pages/admin/PayoutDashboard';
import LiveLogs from './pages/admin/LiveLogs';

// Admin Layout
import AdminLayout from './components/layouts/AdminLayout';

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
import PaymentTracking from './pages/seller/PaymentTracking';
import BeneficiaryManagement from './pages/seller/BeneficiaryManagement';
import PayoutDashboard from './pages/seller/PayoutDashboard';

// Delivery Agent Auth Pages
import DeliveryAgentLogin from './pages/auth/DeliveryAgentLogin';
import DeliveryAgentRegister from './pages/auth/DeliveryAgentRegister';
import DeliveryAgentForgotPassword from './pages/auth/DeliveryAgentForgotPassword';
import DeliveryAgentResetPassword from './pages/auth/DeliveryAgentResetPassword';

// Delivery Agent Dashboard Pages
import DeliveryDashboard from './pages/delivery/DeliveryDashboard';
import AvailableOrders from './pages/delivery/AvailableOrders';
import DeliveryHistory from './pages/delivery/DeliveryHistory';
import DeliveryProfile from './pages/delivery/DeliveryProfile';
import OrderDelivery from './pages/delivery/OrderDelivery';
import OrderPickup from './pages/delivery/OrderPickup';

// 🎯 ADDED: Import AssignedOrders component for "My Orders" functionality
import AssignedOrders from './pages/delivery/AssignedOrders';

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
import PaymentReturnPage from './pages/user/PaymentReturnPage';
import WishlistPage from './pages/user/WishlistPage';
import TrendingPage from './pages/user/TrendingPage';
import LimitedEditionPage from './pages/user/LimitedEditionPage';
import OrderConfirmationPage from './pages/user/OrderConfirmationPage';
import CashfreePaymentConfirmationPage from './pages/user/CashfreePaymentConfirmationPage';
import UserProfile from './pages/user/UserProfile';
import ChangePassword from './pages/user/ChangePassword';
import MyOrdersPage from './pages/user/MyOrdersPage';

// Static Pages
import AboutPage from './pages/user/AboutPage';
import ContactPage from './pages/user/ContactPage';
import HelpPage from './pages/user/HelpPage';

// Testing Components
import SocketTestComponent from './components/user/SocketTestComponent';

// Landing Page Component
import LandingPage from './components/LandingPage';

// Policy Pages
import ContactPolicy from './pages/policy/ContactPolicy';
import ShippingPolicy from './pages/policy/ShippingPolicy';
import TermsPolicy from './pages/policy/TermsPolicy';
import RefundPolicy from './pages/policy/RefundPolicy';
import PrivacyPolicy from './pages/policy/PrivacyPolicy';

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
            <Route path={ROUTES.LANDING} element={<LandingPage />} />
            
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
            <Route path="/admin/returns" element={<AdminLayout><AdminDashboard defaultActiveTab="returns" /></AdminLayout>} />
            <Route path="/admin/delivery-agents" element={<AdminLayout><DeliveryAgents /></AdminLayout>} />
            <Route path="/admin/users" element={<AdminLayout><ViewAllUsers /></AdminLayout>} />
            <Route path="/admin/sellers" element={<AdminLayout><ViewAllSellers /></AdminLayout>} />
            <Route path="/admin/sellers/:id" element={<AdminLayout><ViewSellerProfile /></AdminLayout>} />
            <Route path="/admin/users/:id" element={<AdminLayout><ViewUserProfile /></AdminLayout>} />
            <Route path="/admin/payouts" element={<AdminLayout><AdminPayoutDashboard /></AdminLayout>} />
            <Route path="/admin/logs" element={<AdminLayout><LiveLogs /></AdminLayout>} />
            <Route path="/admin/live-logs" element={<AdminLayout><LiveLogs /></AdminLayout>} />
            
            {/* 🆕 ADMIN ROUTE ALIASES - Point to main dashboard sections */}
            <Route path="/admin/orders" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
            <Route path="/admin/analytics" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
            
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
            <Route path="/seller/payment-tracking" element={<PaymentTracking />} />
            <Route path="/seller/beneficiary" element={<BeneficiaryManagement />} />
            <Route path="/seller/payouts" element={<PayoutDashboard />} />
              
            {/* Legacy route redirects for backward compatibility */}
            <Route path="/seller/products/add" element={<Navigate replace to="/seller/add-product" />} />
            <Route path="/seller/products/edit/:id" element={<Navigate replace to="/seller/edit-product/:id" />} />
            <Route path="/seller/products" element={<Navigate replace to="/seller/view-products" />} />
            <Route path="/seller/profile" element={<Navigate replace to="/seller/edit-profile" />} />
            
            {/* 🎯 DELIVERY AGENT ROUTES - Simple Approach with DeliveryProvider Only */}
            
            {/* Delivery Agent Auth Routes - Public (no protection needed) */}
            <Route path="/delivery/login" element={<DeliveryAgentLogin />} />
            <Route path="/delivery/register" element={<DeliveryAgentRegister />} />
            <Route path="/delivery/forgot-password" element={<DeliveryAgentForgotPassword />} />
            <Route path="/delivery/reset-password/:resetToken" element={<DeliveryAgentResetPassword />} />
            
            {/* 🎯 DELIVERY AGENT PROTECTED ROUTES - Simple approach using DeliveryProvider */}
            
            {/* Dashboard Route */}
            <Route path="/delivery/dashboard" element={
              <DeliveryProvider>
                <DeliveryDashboard />
              </DeliveryProvider>
            } />
            
            {/* 🆕 PROFILE ROUTE - NEW Addition */}
            <Route path="/delivery/profile" element={
              <DeliveryProvider>
                <DeliveryProfile />
              </DeliveryProvider>
            } />
            
            {/* Order Management Routes */}
            <Route path="/delivery/orders/available" element={
              <DeliveryProvider>
                <AvailableOrders />
              </DeliveryProvider>
            } />
            
            {/* 🆕 ASSIGNED ORDERS ROUTE - For "My Orders" functionality */}
            <Route path="/delivery/orders/assigned" element={
              <DeliveryProvider>
                <AssignedOrders />
              </DeliveryProvider>
            } />
            
            {/* Order Action Routes */}
            <Route path="/delivery/orders/:orderId/pickup" element={
              <DeliveryProvider>
                <OrderPickup />
              </DeliveryProvider>
            } />
            
            {/* Order Delivery Route */}
            <Route path="/delivery/orders/:orderId/delivery" element={
              <DeliveryProvider>
                <OrderDelivery />
              </DeliveryProvider>
            } />
            
            {/* Alternative delivery route for backward compatibility */}
            <Route path="/delivery/orders/:id/deliver" element={
              <DeliveryProvider>
                <OrderDelivery />
              </DeliveryProvider>
            } />
            
            {/* Delivery History Route */}
            <Route path="/delivery/history" element={
              <DeliveryProvider>
                <DeliveryHistory />
              </DeliveryProvider>
            } />
            
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
            <Route path="/payment-return" element={<PaymentReturnPage />} />
            <Route path="/payment/cashfree/confirmation/:orderId" element={<CashfreePaymentConfirmationPage />} />
            <Route path="/user/wishlist" element={<WishlistPage />} />
            <Route path="/user/trending" element={<TrendingPage />} />
            <Route path="/user/limited-edition" element={<LimitedEditionPage />} />
            <Route path="/user/order-confirmation" element={<OrderConfirmationPage />} />
            <Route path="/user/profile" element={<UserProfile />} />
            <Route path="/user/change-password" element={<ChangePassword />} />
            
            {/* User Order Routes */}
            <Route path="/user/orders" element={<MyOrdersPage />} />
            <Route path="/user/my-orders" element={<MyOrdersPage />} />
            
            {/* Testing Routes */}
            <Route path="/test-socket" element={<SocketTestComponent />} />
            <Route path="/test-places" element={<SimplePlacesTest />} />
            
            {/* Static Pages */}
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/help" element={<HelpPage />} />
            
            {/* Policy Pages */}
            <Route path={ROUTES.POLICY_CONTACT} element={<ContactPolicy />} />
            <Route path={ROUTES.POLICY_SHIPPING} element={<ShippingPolicy />} />
            <Route path={ROUTES.POLICY_TERMS} element={<TermsPolicy />} />
            <Route path={ROUTES.POLICY_REFUND} element={<RefundPolicy />} />
            <Route path={ROUTES.POLICY_PRIVACY} element={<PrivacyPolicy />} />
              
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
                    <a href="/delivery/login" className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors">
                      Delivery Login
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