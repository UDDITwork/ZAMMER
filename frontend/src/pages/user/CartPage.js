import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserLayout from '../../components/layouts/UserLayout';
import UserHeader from '../../components/header/UserHeader';
import cartService from '../../services/cartService';
import { ShoppingCart, Trash2, Plus, Minus, Sparkles } from 'lucide-react';

const CartPage = () => {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [updatingItems, setUpdatingItems] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const response = await cartService.getCart();
      if (response.success) {
        setCart(response.data);
      } else {
        toast.error(response.message || 'Failed to fetch cart');
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
      toast.error('Something went wrong while fetching cart');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId, newQuantity) => {
    if (newQuantity <= 0) return;

    setUpdatingItems({ ...updatingItems, [productId]: true });

    try {
      const response = await cartService.updateCartItem(productId, newQuantity);
      if (response.success) {
        setCart(response.data);
        toast.success('Cart updated');
      } else {
        toast.error(response.message || 'Failed to update cart');
      }
    } catch (error) {
      console.error('Error updating cart:', error);
      toast.error('Something went wrong');
    } finally {
      setUpdatingItems({ ...updatingItems, [productId]: false });
    }
  };

  const removeItem = async (productId) => {
    setUpdatingItems({ ...updatingItems, [productId]: true });

    try {
      const response = await cartService.removeFromCart(productId);
      if (response.success) {
        setCart(response.data);
        toast.success('Item removed from cart');
      } else {
        toast.error(response.message || 'Failed to remove item');
      }
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('Something went wrong');
    } finally {
      setUpdatingItems({ ...updatingItems, [productId]: false });
    }
  };

  const clearCart = async () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      try {
        const response = await cartService.clearCart();
        if (response.success) {
          setCart({ items: [], total: 0 });
          toast.success('Cart cleared');
        } else {
          toast.error(response.message || 'Failed to clear cart');
        }
      } catch (error) {
        console.error('Error clearing cart:', error);
        toast.error('Something went wrong');
      }
    }
  };

  const calculateSubtotal = () => {
    return cart.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  };

  const calculateTax = (subtotal) => {
    return Math.round(subtotal * 0.18); // 18% GST
  };

  const calculateShipping = (subtotal) => {
    return subtotal >= 500 ? 0 : 50; // Free shipping above ₹500
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax(subtotal);
    const shipping = calculateShipping(subtotal);
    return subtotal + tax + shipping;
  };

  if (loading) {
    return (
      <UserLayout>
        <UserHeader />
        <div className="container mx-auto p-4">
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your cart...</p>
            </div>
          </div>
        </div>
      </UserLayout>
    );
  }

  if (!cart.items || cart.items.length === 0) {
    return (
      <UserLayout>
        <UserHeader />
        <div className="container mx-auto p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md mx-auto">
            <ShoppingCart className="w-24 h-24 mx-auto text-gray-300 mb-4" strokeWidth={1} />
            <h2 className="text-2xl font-light tracking-[-0.02em] text-gray-800 mb-2">Your Cart is Empty</h2>
            <p className="text-[13px] text-gray-600 mb-6">Looks like you haven't added any items to your cart yet.</p>
            <div className="space-y-3">
              <Link
                to="/user/home"
                className="inline-block bg-gradient-to-r from-orange-500 to-orange-600 hover:shadow-lg text-white px-8 py-3 rounded-lg font-medium transition-all"
              >
                Continue Shopping
              </Link>
              <br />
              <Link
                to="/user/trending"
                className="inline-flex items-center text-orange-600 hover:text-orange-700 font-medium text-sm"
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                Browse Trending Products
              </Link>
            </div>
          </div>
        </div>
      </UserLayout>
    );
  }

  const subtotal = calculateSubtotal();
  const tax = calculateTax(subtotal);
  const shipping = calculateShipping(subtotal);
  const total = calculateTotal();
  const freeShippingRemaining = Math.max(0, 500 - subtotal);

  return (
    <UserLayout>
      <UserHeader />
      <div className="container mx-auto p-4 max-w-6xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-[22px] font-light tracking-[-0.02em] text-black">Shopping Cart</h1>
          <button
            onClick={clearCart}
            className="flex items-center px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-md text-sm font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Clear Cart
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-lg shadow-md border border-gray-100 p-4">
              <h2 className="text-base font-semibold text-gray-800 mb-4">
                Cart Items ({cart.items.length})
              </h2>
            </div>

            {cart.items.map((item) => (
              <div
                key={item._id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg border border-gray-100 p-5 transition-all"
              >
                <div className="flex items-start space-x-5">
                  {/* Product Image - LARGER SIZE */}
                  <div className="flex-shrink-0">
                    <Link to={`/user/product/${item.product._id}`}>
                      <div className="w-[120px] h-[120px] bg-gray-100 rounded-lg overflow-hidden">
                        {item.product.images && item.product.images[0] ? (
                          <img
                            src={item.product.images[0]}
                            alt={item.product.name}
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <ShoppingCart className="w-10 h-10" />
                          </div>
                        )}
                      </div>
                    </Link>
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <Link to={`/user/product/${item.product._id}`} className="block">
                      <h3 className="font-semibold text-base text-gray-900 hover:text-orange-600 transition-colors line-clamp-2 mb-1">
                        {item.product.name}
                      </h3>
                    </Link>

                    {item.product.seller && (
                      <Link
                        to={`/user/shop/${item.product.seller._id}`}
                        className="text-sm text-gray-500 hover:text-orange-600 inline-block mb-2"
                      >
                        by {item.product.seller.shop?.name || 'Shop'}
                      </Link>
                    )}

                    {/* Size/Color Badges */}
                    <div className="flex items-center flex-wrap gap-2 mb-3">
                      {item.selectedSize && (
                        <span className="bg-gray-100 px-2 py-1 rounded-full text-xs font-medium text-gray-700">
                          Size: {item.selectedSize}
                        </span>
                      )}
                      {item.selectedColor && (
                        <span className="bg-gray-100 px-2 py-1 rounded-full text-xs font-medium text-gray-700">
                          Color: {item.selectedColor}
                        </span>
                      )}
                    </div>

                    {/* Price */}
                    <div className="flex items-center space-x-2 mb-4">
                      <span className="text-xl font-bold text-gray-900">₹{item.price}</span>
                      {item.product.mrp > item.price && (
                        <span className="text-sm text-gray-500 line-through">₹{item.product.mrp}</span>
                      )}
                      {item.product.mrp > item.price && (
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">
                          {Math.round(((item.product.mrp - item.price) / item.product.mrp) * 100)}% OFF
                        </span>
                      )}
                    </div>

                    {/* Quantity Controls & Remove */}
                    <div className="flex items-center justify-between">
                      {/* Quantity Controls - REDESIGNED */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                          disabled={item.quantity <= 1 || updatingItems[item.product._id]}
                          className="w-10 h-10 rounded-full bg-orange-50 border-2 border-orange-200 hover:bg-orange-100 hover:border-orange-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                        >
                          <Minus className="w-5 h-5 text-orange-600" />
                        </button>

                        <span className="w-12 text-center font-bold text-base">
                          {updatingItems[item.product._id] ? (
                            <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                          ) : (
                            item.quantity
                          )}
                        </span>

                        <button
                          onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                          disabled={updatingItems[item.product._id]}
                          className="w-10 h-10 rounded-full bg-orange-50 border-2 border-orange-200 hover:bg-orange-100 hover:border-orange-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                        >
                          <Plus className="w-5 h-5 text-orange-600" />
                        </button>

                        {/* Remove Button - REDESIGNED */}
                        <button
                          onClick={() => removeItem(item.product._id)}
                          disabled={updatingItems[item.product._id]}
                          className="ml-3 w-10 h-10 rounded-full bg-red-50 hover:bg-red-100 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                        >
                          <Trash2 className="w-5 h-5 text-red-600" />
                        </button>
                      </div>

                      {/* Item Total - PROMINENT */}
                      <div className="text-right">
                        <div className="text-xs text-gray-500 mb-0.5">Item Total</div>
                        <div className="text-lg font-bold text-orange-600">₹{item.price * item.quantity}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary - REDESIGNED */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg border-2 border-gray-100 sticky top-4">
              <div className="p-5 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
              </div>

              <div className="p-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal ({cart.items.length} {cart.items.length === 1 ? 'item' : 'items'})</span>
                  <span className="font-medium text-gray-900">₹{subtotal}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax (18% GST)</span>
                  <span className="font-medium text-gray-900">₹{tax}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">
                    {shipping === 0 ? (
                      <span className="bg-green-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">FREE</span>
                    ) : (
                      <span className="text-gray-900">₹{shipping}</span>
                    )}
                  </span>
                </div>

                {/* Free Shipping Progress - REDESIGNED */}
                {freeShippingRemaining > 0 && (
                  <div className="bg-orange-50 border-l-4 border-orange-500 px-3 py-2 rounded">
                    <p className="text-xs text-orange-800 font-medium">
                      Add ₹{freeShippingRemaining} more for FREE shipping
                    </p>
                    <div className="mt-1.5 w-full bg-orange-200 rounded-full h-1.5">
                      <div
                        className="bg-orange-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min((subtotal / 500) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Total Section - PREMIUM GRADIENT */}
                <div className="!mt-4 bg-gradient-to-r from-orange-50 to-white p-4 rounded-lg border border-orange-100">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-3xl font-bold text-orange-600">₹{total}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Inclusive of all taxes</p>
                </div>
              </div>

              <div className="p-5 border-t border-gray-100 space-y-3">
                {/* Checkout Button - PREMIUM GRADIENT */}
                <button
                  onClick={() => navigate('/user/checkout')}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3 rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Proceed to Checkout
                </button>

                {/* Continue Shopping - SECONDARY BUTTON */}
                <Link
                  to="/user/home"
                  className="block w-full text-center border-2 border-orange-500 text-orange-600 hover:bg-orange-50 py-3 rounded-lg font-medium transition-all"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default CartPage;
