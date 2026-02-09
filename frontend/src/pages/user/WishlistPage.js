// frontend/src/pages/WishlistPage.js
// -----------------------------------------------------------------------------
// Shows the logged‑in user’s wishlist.  Works with both data shapes:
//   1️⃣  [{ _id, name, images, zammerPrice … }] – when wishlist is stored directly
//   2️⃣  [{ product: { … } }]               – when using the new Wishlist model
// -----------------------------------------------------------------------------

import React, { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import UserLayout from '../../components/layouts/UserLayout';
import UserHeader from '../../components/header/UserHeader';
import { getWishlist, removeFromWishlist } from '../../services/wishlistService';
import { AuthContext } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import ProductCard from '../../components/common/ProductCard';
import { useAddToCart } from '../../hooks/useAddToCart';
import { ProductGridSkeleton } from '../../components/common/SkeletonLoader';
import { Heart } from 'lucide-react';

const WishlistPage = () => {
  const { userAuth } = useContext(AuthContext);
  const { addingToCart, handleAddToCart } = useAddToCart();
  const navigate = useNavigate();

  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);

  /* ---------------------------------------------------------------------
   * Helpers
   * ------------------------------------------------------------------ */
  const normaliseItem = (item = {}) =>
    item.product && typeof item.product === 'object' ? item.product : item;

  /* ---------------------------------------------------------------------
   * Fetch wishlist on mount / auth change
   * ------------------------------------------------------------------ */
  useEffect(() => {
    const fetchWishlist = async () => {
      setLoading(true);

      if (!userAuth.isAuthenticated) {
        setWishlist([]);
        setLoading(false);
        return;
      }

      try {
        const response = await getWishlist();
        if (response.success) {
          setWishlist(response.data || []);
        } else {
          if (response.requiresAuth) {
            // token expired – force relogin
            navigate('/user/login', {
              state: { from: '/user/wishlist' }
            });
          }
          toast.error(response.message || 'Failed to load wishlist');
          setWishlist([]);
        }
      } catch (err) {
        toast.error('Something went wrong');
        setWishlist([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, [userAuth.isAuthenticated, navigate]);

  /* ---------------------------------------------------------------------
   * Remove product from wishlist
   * ------------------------------------------------------------------ */
  const handleRemove = async (productId) => {
    if (!userAuth.isAuthenticated) return;

    setRemovingId(productId);
    try {
      const response = await removeFromWishlist(productId);
      if (response.success) {
        setWishlist(current => current.filter((it) => {
          const prod = normaliseItem(it);
          return prod._id !== productId;
        }));
        toast.success('Removed from wishlist');
      } else {
        if (response.requiresAuth) {
          navigate('/user/login', { state: { from: '/user/wishlist' } });
        }
        toast.error(response.message || 'Failed to remove');
      }
    } catch (err) {
      toast.error('Something went wrong');
    } finally {
      setRemovingId(null);
    }
  };

  /* --------------------------------------------------------------------- */
  return (
    <UserLayout>
      <UserHeader />
      <div className="min-h-screen bg-gray-50 pb-16">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-gray-900">
              Your Wishlist {wishlist.length > 0 && <span className="text-gray-400 font-normal text-base">({wishlist.length} items)</span>}
            </h1>
          </div>

          {loading ? (
            <ProductGridSkeleton count={8} cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" />
          ) : wishlist.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <Heart className="w-10 h-10 text-orange-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Your wishlist is empty</h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">Save items you love to revisit them later and never miss a deal.</p>
              <Link
                to="/user/home"
                className="inline-block bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-lg text-sm font-semibold transition-colors"
              >
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {wishlist.map((raw) => {
                const product = normaliseItem(raw);
                return (
                  <div key={product._id} className="relative">
                    <ProductCard product={product} onAddToCart={handleAddToCart} isAddingToCart={addingToCart[product._id]} />
                    {/* Remove overlay button */}
                    <button
                      onClick={() => handleRemove(product._id)}
                      disabled={removingId === product._id}
                      className="absolute top-2 left-2 z-30 bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-sm hover:bg-red-50 transition-colors"
                      title="Remove from wishlist"
                    >
                      {removingId === product._id ? (
                        <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
};

export default WishlistPage;
