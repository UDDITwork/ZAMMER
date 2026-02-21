import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import cartService from '../../services/cartService';
import CategoryMegaMenu from './CategoryMegaMenu';
import {
  MapPin, Search, LayoutGrid, Compass, Heart, ShoppingCart, User, ChevronDown
} from 'lucide-react';

const UserHeader = ({ bgColor } = {}) => {
  const { userAuth } = useContext(AuthContext);
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTimeoutRef = useRef(null);

  // Fetch cart count
  useEffect(() => {
    let mounted = true;
    const fetchCartCount = async () => {
      if (!userAuth.isAuthenticated) return;
      try {
        const result = await cartService.getCartItemCount();
        if (mounted && result.success) {
          setCartCount(result.count);
        }
      } catch (_) { /* silent */ }
    };
    fetchCartCount();
    return () => { mounted = false; };
  }, [userAuth.isAuthenticated]);

  // Search submit
  const handleSearchSubmit = useCallback((e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/user/products?search=${encodeURIComponent(q)}`);
    }
  }, [searchQuery, navigate]);

  // Mega-menu hover with delay
  const openMenu = useCallback(() => {
    if (menuTimeoutRef.current) clearTimeout(menuTimeoutRef.current);
    setMenuOpen(true);
  }, []);

  const closeMenuWithDelay = useCallback(() => {
    menuTimeoutRef.current = setTimeout(() => setMenuOpen(false), 150);
  }, []);

  const closeMenu = useCallback(() => {
    if (menuTimeoutRef.current) clearTimeout(menuTimeoutRef.current);
    setMenuOpen(false);
  }, []);

  useEffect(() => {
    return () => {
      if (menuTimeoutRef.current) clearTimeout(menuTimeoutRef.current);
    };
  }, []);

  const address = userAuth.user?.location?.address;

  const navLinkClass = "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-black/5 transition-colors";

  return (
    <div
      className="sticky top-0 z-50"
      style={{ background: bgColor || '#fff', transition: 'background-color 500ms ease' }}
    >
      <div className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-14 gap-4">

            {/* Location */}
            <Link
              to="/user/profile"
              className="flex items-center gap-2 min-w-0 flex-shrink-0 group"
            >
              <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center flex-shrink-0 group-hover:bg-black/10 transition-colors">
                <MapPin className="w-4 h-4 text-gray-700" strokeWidth={2} />
              </div>
              <div className="hidden sm:block min-w-0 leading-tight">
                <p className="text-[11px] text-gray-500 font-medium">Deliver to</p>
                <p className="text-xs font-semibold text-gray-800 truncate max-w-[180px]">
                  {address || 'Set location'}
                </p>
              </div>
              <ChevronDown className="w-3 h-3 text-gray-400 hidden sm:block flex-shrink-0" />
            </Link>

            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" strokeWidth={1.8} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for products, brands or more"
                  className="w-full bg-white border border-gray-200 rounded-full pl-10 pr-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300 transition-all"
                />
              </div>
            </form>

            {/* Right nav */}
            <nav className="flex items-center gap-1">

              {/* Categories trigger */}
              <div
                className="relative"
                onMouseEnter={openMenu}
                onMouseLeave={closeMenuWithDelay}
              >
                <button
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    menuOpen
                      ? 'text-gray-900 bg-black/5'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-black/5'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" strokeWidth={1.8} />
                  <span className="hidden lg:inline">Categories</span>
                </button>
              </div>

              {/* Discover */}
              <Link to="/user/browse" className={navLinkClass}>
                <Compass className="w-4 h-4" strokeWidth={1.8} />
                <span className="hidden lg:inline">Discover</span>
              </Link>

              {/* Wishlist */}
              <Link to="/user/wishlist" className={navLinkClass}>
                <Heart className="w-4 h-4" strokeWidth={1.8} />
                <span className="hidden lg:inline">Wishlist</span>
              </Link>

              {/* Cart */}
              <Link
                to="/user/cart"
                className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-black/5 transition-colors"
              >
                <ShoppingCart className="w-4 h-4" strokeWidth={1.8} />
                <span className="hidden lg:inline">Cart</span>
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 left-6 lg:left-auto lg:-top-0.5 lg:-right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>

              {/* Profile / Sign In */}
              {userAuth.isAuthenticated ? (
                <Link to="/user/profile" className={navLinkClass}>
                  <User className="w-4 h-4" strokeWidth={1.8} />
                  <span className="hidden lg:inline truncate max-w-[80px]">
                    {userAuth.user?.name?.split(' ')[0] || 'Profile'}
                  </span>
                </Link>
              ) : (
                <Link to="/user/login" className={navLinkClass}>
                  <User className="w-4 h-4" strokeWidth={1.8} />
                  <span className="hidden lg:inline">Sign In</span>
                </Link>
              )}
            </nav>
          </div>
        </div>

        {/* Mega-menu portal (positioned absolutely relative to header) */}
        <div
          onMouseEnter={openMenu}
          onMouseLeave={closeMenuWithDelay}
        >
          <CategoryMegaMenu isOpen={menuOpen} onClose={closeMenu} />
        </div>
      </div>
    </div>
  );
};

export default UserHeader;
