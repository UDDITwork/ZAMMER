// frontend/src/pages/WishlistPage.js
// -----------------------------------------------------------------------------
// Shows the logged‑in user’s wishlist.  Works with both data shapes:
//   1️⃣  [{ _id, name, images, zammerPrice … }] – when wishlist is stored directly
//   2️⃣  [{ product: { … } }]               – when using the new Wishlist model
// -----------------------------------------------------------------------------

import React, { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import UserLayout from '../../components/layouts/UserLayout';
import { getWishlist, removeFromWishlist } from '../../services/wishlistService';
import { AuthContext } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

const WishlistPage = () => {
  const { userAuth } = useContext(AuthContext);
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
      <div className="container mx-auto p-4 min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Your Wishlist</h1>

        {loading ? (
          <div className="flex justify-center items-center py-20 text-gray-500">
            Loading…
          </div>
        ) : wishlist.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600">Your wishlist is currently empty.</p>
            <Link
              to="/user/dashboard"
              className="inline-block mt-4 text-orange-500 hover:text-orange-600"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {wishlist.map((raw) => {
              const product = normaliseItem(raw);
              return (
                <div
                  key={product._id}
                  className="bg-white rounded-lg shadow group overflow-hidden relative"
                >
                  {/* Remove btn */}
                  <button
                    onClick={() => handleRemove(product._id)}
                    disabled={removingId === product._id}
                    className="absolute top-2 right-2 z-10 bg-white/80 backdrop-blur px-2 py-1 rounded hover:bg-red-50"
                    title="Remove"
                  >
                    {removingId === product._id ? (
                      <svg
                        className="animate-spin h-4 w-4 text-red-500"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v4m0 8v4m-4-4h4m0 0h4m-4 0V8"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-4 w-4 text-red-500 group-hover:text-red-600"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    )}
                  </button>

                  <Link to={`/user/product/${product._id}`}>
                    <img
                      src={product.images?.[0] || '/placeholder-product.jpg'}
                      alt={product.name}
                      className="h-40 w-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        e.target.src = '/placeholder-product.jpg';
                      }}
                    />
                    <div className="p-3">
                      <h2 className="text-sm font-semibold truncate" title={product.name}>
                        {product.name}
                      </h2>
                      <p className="text-gray-600 text-sm mt-1">
                        ₹{product.zammerPrice?.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default WishlistPage;
