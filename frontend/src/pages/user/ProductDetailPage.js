import React, { useEffect, useState, useContext } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import StarRating from '../../components/common/StarRating';
import { getProductById } from '../../services/productService';
import cartService from '../../services/cartService';
import { addToWishlist, removeFromWishlist, checkWishlist } from '../../services/wishlistService';
import { AuthContext } from '../../contexts/AuthContext';
import {
  getProductReviews,
  createReview,
  checkCanReview
} from '../../services/reviewService';
import VirtualTryOnModal from '../../components/common/VirtualTryOnModal';
import UserHeader from '../../components/header/UserHeader';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import { ShoppingCart, Heart, Share2, Check, ShieldCheck, Package, Repeat, Sparkles, ChevronLeft } from 'lucide-react';

const ProductDetailPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { userAuth } = useContext(AuthContext);
  const { addProduct: addToRecentlyViewed } = useRecentlyViewed();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [inWishlist, setInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, review: '' });
  const [submitingReview, setSubmitingReview] = useState(false);
  const [reviewEligibility, setReviewEligibility] = useState({
    canReview: false,
    hasPurchased: false,
    hasReviewed: false,
    reason: ''
  });
  
  // Virtual Try-On state
  const [showVirtualTryOn, setShowVirtualTryOn] = useState(false);

  // Enhanced debugging
  const debugLog = (message, data = null, type = 'info') => {
    if (process.env.NODE_ENV === 'development') {
      const colors = {
        info: '#2196F3',
        success: '#4CAF50', 
        warning: '#FF9800',
        error: '#F44336'
      };
      
      console.log(
        `%c[ProductDetail] ${message}`,
        `color: ${colors[type]}; font-weight: bold;`,
        data
      );
    }
  };

  useEffect(() => {
    fetchProductDetails();
    fetchReviews(); // Load reviews for the product
    // Only check wishlist if user is authenticated
    if (userAuth.isAuthenticated && userAuth.token) {
      checkProductWishlist();
      checkCanUserReview();
    }
    
    debugLog('Component mounted', {
      productId,
      userAuthenticated: userAuth.isAuthenticated,
      userName: userAuth.user?.name
    });
  }, [productId, userAuth.isAuthenticated]);

  const checkAuth = () => {
    debugLog('🔍 Checking authentication...', {
      isAuthenticated: userAuth.isAuthenticated,
      hasToken: !!userAuth.token,
      hasUser: !!userAuth.user,
      userName: userAuth.user?.name
    });

    if (!userAuth.isAuthenticated || !userAuth.token) {
      debugLog('❌ Authentication failed - redirecting to login', {
        reason: !userAuth.isAuthenticated ? 'Not authenticated' : 'No token',
        redirectFrom: `/user/product/${productId}`
      }, 'warning');
      
      toast.warning('Please login to continue');
      navigate('/user/login', { state: { from: `/user/product/${productId}` } });
      return false;
    }
    
    debugLog('✅ Authentication successful', {
      user: userAuth.user?.name,
      userId: userAuth.user?._id
    }, 'success');
    return true;
  };

  const fetchProductDetails = async () => {
    setLoading(true);
    try {
      debugLog('📦 Fetching product details...', { productId });
      
      const response = await getProductById(productId);
      if (response.success) {
        setProduct(response.data);
        addToRecentlyViewed(response.data);

        debugLog('✅ Product details fetched', {
          productName: response.data.name,
          hasVariants: response.data.variants?.length > 0,
          variantCount: response.data.variants?.length || 0
        }, 'success');
        
        // Set default selected size and color if available
        if (response.data.variants && response.data.variants.length > 0) {
          const firstVariant = response.data.variants[0];
          setSelectedSize(firstVariant.size || '');
          setSelectedColor(firstVariant.color || '');
          
          debugLog('🎨 Default variants set', {
            selectedSize: firstVariant.size || 'none',
            selectedColor: firstVariant.color || 'none'
          });
        }
      } else {
        debugLog('❌ Failed to fetch product', { response }, 'error');
        toast.error(response.message || 'Failed to fetch product details');
        navigate('/user/dashboard');
      }
    } catch (error) {
      debugLog('💥 Product fetch error', { error }, 'error');
      console.error('Error fetching product details:', error);
      toast.error('Something went wrong while loading product');
      navigate('/user/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const checkProductWishlist = async () => {
    // Only check if user is authenticated with valid token
    if (!userAuth.isAuthenticated || !userAuth.token) {
      setInWishlist(false);
      return;
    }

    setWishlistLoading(true);
    try {
      const response = await checkWishlist(productId);
      if (response.success) {
        setInWishlist(response.data.isInWishlist);
      } else {
        console.log('Wishlist check failed:', response.message);
        setInWishlist(false);
      }
    } catch (error) {
      console.error('Error checking wishlist status:', error);
      setInWishlist(false);
    } finally {
      setWishlistLoading(false);
    }
  };

  const checkCanUserReview = async () => {
    try {
      const response = await checkCanReview(productId);
      if (response.success) {
        setCanReview(response.data.canReview);
        setReviewEligibility({
          canReview: response.data.canReview,
          hasPurchased: response.data.hasPurchased,
          hasReviewed: response.data.hasReviewed,
          reason: response.data.reason
        });
        debugLog('Review eligibility checked', response.data, 'success');
      }
    } catch (error) {
      console.error('Error checking review eligibility:', error);
      setReviewEligibility({
        canReview: false,
        hasPurchased: false,
        hasReviewed: false,
        reason: 'Unable to check review eligibility'
      });
    }
  };

  const handleAddToCart = async () => {
    debugLog('🛒 ADD TO CART - Starting...', {
      productId,
      selectedSize,
      selectedColor,
      userAuth: {
        isAuthenticated: userAuth.isAuthenticated,
        hasToken: !!userAuth.token,
        userName: userAuth.user?.name
      }
    });

    if (!checkAuth()) return;
    
    // Validate selections for products with variants
    if (product.variants && product.variants.length > 0) {
      const hasSize = product.variants.some(v => v.size);
      const hasColor = product.variants.some(v => v.color);
      
      debugLog('🎨 Validating variant selections...', {
        hasSize,
        hasColor,
        selectedSize,
        selectedColor,
        variants: product.variants
      });
      
      if (hasSize && !selectedSize) {
        toast.warning('Please select a size');
        debugLog('❌ Size validation failed', null, 'warning');
        return;
      }
      
      if (hasColor && !selectedColor) {
        toast.warning('Please select a color');
        debugLog('❌ Color validation failed', null, 'warning');
        return;
      }
    }

    setCartLoading(true);
    
    try {
      debugLog('🚀 Calling cartService.addToCart...', {
        productId,
        quantity: 1,
        options: {
          size: selectedSize,
          color: selectedColor
        }
      });
      
      const response = await cartService.addToCart(productId, 1, {
        size: selectedSize,
        color: selectedColor
      });
      
      debugLog('📊 Cart service response:', response);
      
      if (response.success) {
        debugLog('✅ ADD TO CART SUCCESS', {
          message: response.message,
          cartData: response.data
        }, 'success');
        
        toast.success('Product added to cart');
      } else {
        debugLog('❌ ADD TO CART FAILED', {
          message: response.message,
          requiresAuth: response.requiresAuth,
          details: response.details
        }, 'error');
        
        if (response.requiresAuth) {
          debugLog('🔑 Re-authentication required', null, 'warning');
          checkAuth(); // This will redirect to login
        } else {
          toast.error(response.message || 'Failed to add to cart');
        }
      }
    } catch (error) {
      debugLog('💥 ADD TO CART ERROR', {
        error: error,
        message: error.message,
        stack: error.stack
      }, 'error');
      
      console.error('Error adding to cart:', error);
      toast.error('Something went wrong while adding to cart');
    } finally {
      setCartLoading(false);
      debugLog('🏁 ADD TO CART COMPLETED', null, 'info');
    }
  };

  const handleBuyNow = async () => {
    debugLog('💰 BUY NOW - Starting...', {
      productId,
      selectedSize,
      selectedColor
    });

    if (!checkAuth()) return;
    
    // Validate selections for products with variants
    if (product.variants && product.variants.length > 0) {
      const hasSize = product.variants.some(v => v.size);
      const hasColor = product.variants.some(v => v.color);
      
      if (hasSize && !selectedSize) {
        toast.warning('Please select a size');
        return;
      }
      
      if (hasColor && !selectedColor) {
        toast.warning('Please select a color');
        return;
      }
    }

    setCartLoading(true);

    try {
      debugLog('🚀 Adding to cart for buy now...');
      
      const response = await cartService.addToCart(productId, 1, {
        size: selectedSize,
        color: selectedColor
      });
      
      if (response.success) {
        debugLog('✅ BUY NOW - Product added, navigating to cart', null, 'success');
        navigate('/user/cart');
      } else {
        debugLog('❌ BUY NOW FAILED', response, 'error');
        
        if (response.requiresAuth) {
          checkAuth(); // This will redirect to login
        } else {
          toast.error(response.message || 'Failed to add to cart');
        }
      }
    } catch (error) {
      debugLog('💥 BUY NOW ERROR', error, 'error');
      console.error('Error with buy now:', error);
      toast.error('Something went wrong');
    } finally {
      setCartLoading(false);
    }
  };

  const toggleWishlist = async () => {
    if (!checkAuth()) return;
    
    setWishlistLoading(true);
    try {
      if (inWishlist) {
        const response = await removeFromWishlist(productId);
        if (response.success) {
          setInWishlist(false);
          toast.success('Removed from wishlist');
        } else {
          toast.error(response.message || 'Failed to remove from wishlist');
        }
      } else {
        const response = await addToWishlist(productId);
        if (response.success) {
          setInWishlist(true);
          toast.success('Added to wishlist');
        } else {
          toast.error(response.message || 'Failed to add to wishlist');
        }
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      toast.error('Failed to update wishlist');
    } finally {
      setWishlistLoading(false);
    }
  };

  const shareProduct = (platform) => {
    const productUrl = window.location.href;
    const shareText = `Check out ${product.name} on Zammer!`;
    
    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + productUrl)}`);
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`);
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(productUrl)}`);
        break;
      default:
        if (navigator.clipboard) {
          navigator.clipboard.writeText(productUrl);
          toast.success('Link copied to clipboard!');
        } else {
          // Fallback for browsers without clipboard API
          const textArea = document.createElement('textarea');
          textArea.value = productUrl;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          toast.success('Link copied to clipboard!');
        }
    }
    setShowShareOptions(false);
  };

  // Debug function for testing
  const debugCartState = () => {
    debugLog('🔧 MANUAL CART DEBUG', {
      userAuth,
      localStorage: {
        userToken: localStorage.getItem('userToken') ? 'present' : 'missing',
        userData: localStorage.getItem('userData') ? 'present' : 'missing'
      }
    });
    
    // Run cart debug function if available
    if (window.debugCartAuth) {
      window.debugCartAuth();
    }
  };

  const debugVirtualTryOn = () => {
    debugLog('🔧 MANUAL VIRTUAL TRY-ON DEBUG', {
      showVirtualTryOn,
      productId,
      userAuth: {
        isAuthenticated: userAuth.isAuthenticated,
        hasToken: !!userAuth.token,
        userName: userAuth.user?.name
      }
    });

    if (window.debugVirtualTryOn) {
      window.debugVirtualTryOn();
    }
  };

  const fetchReviews = async () => {
    setReviewsLoading(true);
    try {
      const response = await getProductReviews(productId);
      if (response.success) {
        setReviews(response.data);
      } else {
        toast.error(response.message || 'Failed to fetch reviews');
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Something went wrong while loading reviews');
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!checkAuth()) return;

    setSubmitingReview(true);
    try {
      const response = await createReview(productId, reviewForm.rating, reviewForm.review);

      if (response.success) {
        toast.success('Review submitted successfully');
        setShowReviewForm(false);
        setReviewForm({ rating: 5, review: '' });
        fetchReviews(); // Refresh reviews
        checkCanUserReview(); // Update review eligibility
      } else {
        toast.error(response.message || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Something went wrong while submitting review');
    } finally {
      setSubmitingReview(false);
    }
  };

  const handleReviewChange = (e) => {
    const { name, value } = e.target;
    setReviewForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRatingChange = (rating) => {
    setReviewForm(prev => ({
      ...prev,
      rating
    }));
  };

  if (loading) {
    return (
      <>
        <UserHeader />
        <div className="flex justify-center items-center min-h-screen bg-gray-50">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-3 border-gray-200 border-t-orange-500"></div>
            </div>
            <p className="text-sm text-gray-500">Loading product...</p>
          </div>
        </div>
      </>
    );
  }

  if (!product) {
    return (
      <>
        <UserHeader />
        <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Product Not Found</h2>
            <p className="text-sm text-gray-500 mb-6">This product doesn't exist or has been removed.</p>
            <Link to="/user/home" className="inline-block bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
              Return to Home
            </Link>
          </div>
        </div>
      </>
    );
  }

  // Define available sizes and colors from variants
  const availableSizes = product.variants && product.variants.length > 0
    ? Array.from(new Set(product.variants.map(v => v.size).filter(Boolean)))
    : [];
  const availableColors = product.variants && product.variants.length > 0
    ? product.variants.filter(v => v.color).map(v => ({ name: v.color, code: v.colorCode || '#000000' }))
    : [];

  const discount = product.mrp && product.zammerPrice < product.mrp
    ? Math.round(((product.mrp - product.zammerPrice) / product.mrp) * 100)
    : 0;

  return (
    <>
      <UserHeader />
      <div className="min-h-screen bg-white pb-20 lg:pb-0">

        {/* Desktop: Two-column layout | Mobile: Stack */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="lg:grid lg:grid-cols-2 lg:gap-12">

            {/* LEFT COLUMN - Image Gallery */}
            <div className="mb-8 lg:mb-0">
              <div className="lg:flex lg:gap-4">

                {/* Thumbnails - Desktop: Vertical strip | Mobile: Hidden (dots used instead) */}
                {product.images && product.images.length > 1 && (
                  <div className="hidden lg:flex lg:flex-col lg:gap-3 lg:w-20">
                    {product.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImage(idx)}
                        className={`w-full aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          activeImage === idx ? 'border-black' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Main Image */}
                <div className="flex-1">
                  <div className="relative aspect-square bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[activeImage]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = '/placeholder-product.jpg'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingCart className="w-16 h-16 text-gray-300" strokeWidth={1} />
                      </div>
                    )}
                  </div>

                  {/* Dot indicators - Mobile only */}
                  {product.images && product.images.length > 1 && (
                    <div className="flex justify-center gap-2 mt-4 lg:hidden">
                      {product.images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveImage(idx)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            activeImage === idx ? 'bg-black w-6' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN - Product Details */}
            <div>
              {/* Brand / Category + Wishlist */}
              <div className="flex items-start justify-between mb-2">
                <p className="text-sm text-gray-500 uppercase tracking-wider">
                  {product.brand || product.category || 'ZAMMER'}
                </p>
                <button
                  onClick={toggleWishlist}
                  disabled={wishlistLoading}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  {wishlistLoading ? (
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
                  ) : (
                    <Heart
                      className={`w-5 h-5 ${inWishlist ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
                      strokeWidth={1.8}
                    />
                  )}
                </button>
              </div>

              {/* Product Name */}
              <h1 className="text-2xl font-bold text-gray-900 mb-3">{product.name}</h1>

              {/* Rating + Reviews */}
              {product.averageRating > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <StarRating rating={product.averageRating} />
                  <span className="text-sm text-gray-500">({product.numReviews || 0})</span>
                </div>
              )}

              {/* Price Section */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-1">
                  <p className="text-3xl font-bold text-gray-900">₹{product.zammerPrice}</p>
                  {product.mrp && product.mrp > product.zammerPrice && (
                    <>
                      <p className="text-lg text-gray-400 line-through">MRP: ₹{product.mrp}</p>
                      <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded">
                        {discount}% OFF
                      </span>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-500">(Inclusive of all taxes)</p>
              </div>

              {/* Color Selector */}
              {availableColors.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-900">
                      COLOR: <span className="font-normal text-gray-600">{selectedColor || 'Select'}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {availableColors.map((colorObj, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedColor(colorObj.name)}
                        className={`w-10 h-10 rounded-full border-2 transition-all ${
                          selectedColor === colorObj.name ? 'border-black scale-110' : 'border-gray-200 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: colorObj.code }}
                        title={colorObj.name}
                      >
                        {selectedColor === colorObj.name && (
                          <Check className="w-5 h-5 text-white mx-auto drop-shadow" strokeWidth={3} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size Selector */}
              {availableSizes.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-900">
                      SIZE: <span className="font-normal text-gray-600">{selectedSize || 'Select'}</span>
                    </p>
                    <a href="#" className="text-xs font-medium text-gray-600 hover:text-black underline">
                      SIZE CHART
                    </a>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableSizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`px-5 py-2.5 border rounded-lg text-sm font-medium transition-all ${
                          selectedSize === size
                            ? 'bg-black text-white border-black'
                            : 'bg-white text-gray-900 border-gray-300 hover:border-black'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA Buttons */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <button
                  onClick={handleBuyNow}
                  disabled={cartLoading}
                  className="bg-white border border-black text-black py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cartLoading ? 'Processing...' : 'Buy Now'}
                </button>
                <button
                  onClick={handleAddToCart}
                  disabled={cartLoading}
                  className="bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cartLoading ? 'Adding...' : 'Add to Bag'}
                </button>
              </div>
              <button
                onClick={() => setShowVirtualTryOn(true)}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 rounded-lg font-semibold transition-all mb-6 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Try & Buy — Virtual Try-On
              </button>

              {/* Trust Badges */}
              <div className="grid grid-cols-4 gap-4 mb-8 py-6 border-y border-gray-200">
                <div className="text-center">
                  <ShieldCheck className="w-6 h-6 text-gray-700 mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-xs text-gray-600">Secure Payments</p>
                </div>
                <div className="text-center">
                  <Package className="w-6 h-6 text-gray-700 mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-xs text-gray-600">Genuine Product</p>
                </div>
                <div className="text-center">
                  <Sparkles className="w-6 h-6 text-gray-700 mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-xs text-gray-600">Try & Buy</p>
                </div>
                <div className="text-center">
                  <Repeat className="w-6 h-6 text-gray-700 mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-xs text-gray-600">7 Day Return</p>
                </div>
              </div>

              {/* Specifications Tabs */}
              <div className="mb-8">
                <div className="border-b border-gray-200 mb-4">
                  <div className="flex gap-6">
                    <button className="pb-3 border-b-2 border-black text-sm font-semibold">
                      Specifications
                    </button>
                    <button className="pb-3 text-sm text-gray-500">
                      Description
                    </button>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  {product.category && (
                    <div className="flex">
                      <span className="w-32 text-gray-500">Category</span>
                      <span className="text-gray-900">{product.categoryPath || product.category}</span>
                    </div>
                  )}
                  {product.fabricType && (
                    <div className="flex">
                      <span className="w-32 text-gray-500">Fabric</span>
                      <span className="text-gray-900">{product.fabricType}</span>
                    </div>
                  )}
                  {product.material && (
                    <div className="flex">
                      <span className="w-32 text-gray-500">Material</span>
                      <span className="text-gray-900">{product.material}</span>
                    </div>
                  )}
                  {product.composition && (
                    <div className="flex">
                      <span className="w-32 text-gray-500">Composition</span>
                      <span className="text-gray-900">{product.composition}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {product.description && (
                <div className="mb-8">
                  <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Reviews Section (Full Width Below) */}
          <div className="mt-12 pt-12 border-t border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Customer Reviews</h2>
                {reviews.length > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    <StarRating rating={product.averageRating || 0} />
                    <span className="text-sm text-gray-500">
                      {product.averageRating?.toFixed(1)} out of 5 ({reviews.length} reviews)
                    </span>
                  </div>
                )}
              </div>

              {userAuth.isAuthenticated && reviewEligibility.canReview && (
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Write a Review
                </button>
              )}
            </div>

            {/* Review Form Modal */}
            {showReviewForm && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl max-w-md w-full p-6">
                  <h3 className="text-lg font-bold mb-4">Write a Review</h3>
                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleRatingChange(star)}
                            className="text-2xl"
                          >
                            {star <= reviewForm.rating ? '⭐' : '☆'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Your Review</label>
                      <textarea
                        value={reviewForm.review}
                        onChange={handleReviewChange}
                        placeholder="Share your experience with this product"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
                        rows="4"
                        required
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowReviewForm(false)}
                        className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitingReview}
                        className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        {submitingReview ? 'Submitting...' : 'Submit Review'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Reviews List */}
            {reviewsLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-500">Loading reviews...</p>
              </div>
            ) : reviews.length > 0 ? (
              <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review._id} className="border-b border-gray-100 pb-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-sm font-semibold text-gray-600">
                            {review.user?.name?.[0]?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{review.user?.name || 'Anonymous'}</p>
                          <StarRating rating={review.rating} />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{review.review}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-sm text-gray-500">No reviews yet. Be the first to review this product!</p>
              </div>
            )}
          </div>
        </div>

        {/* Share Modal */}
        {showShareOptions && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center lg:justify-center p-4">
            <div className="bg-white rounded-t-2xl lg:rounded-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Share Product</h3>
                <button onClick={() => setShowShareOptions(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => shareProduct('whatsapp')}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium">Share on WhatsApp</span>
                </button>
                <button
                  onClick={() => shareProduct('facebook')}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium">Share on Facebook</span>
                </button>
                <button
                  onClick={() => shareProduct('twitter')}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium">Share on Twitter</span>
                </button>
                <button
                  onClick={() => shareProduct('copy')}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium">Copy Link</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Virtual Try-On Modal */}
        <VirtualTryOnModal
          isOpen={showVirtualTryOn}
          onClose={() => setShowVirtualTryOn(false)}
          product={product}
          onTryOnComplete={(result) => {
            console.log('Virtual try-on completed:', result);
          }}
        />

        {/* Bottom Navigation - Mobile Only */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 lg:hidden">
          <div className="flex justify-between items-center max-w-screen-xl mx-auto">
            <Link to="/user/home" className="flex flex-col items-center justify-center py-2 px-4 text-xs text-gray-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Home</span>
            </Link>
            <Link to="/user/shop" className="flex flex-col items-center justify-center py-2 px-4 text-xs text-gray-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span>Shop</span>
            </Link>
            <Link to="/user/cart" className="flex flex-col items-center justify-center py-2 px-4 text-xs text-orange-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Cart</span>
            </Link>
            <Link to="/user/trending" className="flex flex-col items-center justify-center py-2 px-4 text-xs text-gray-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span>Trending</span>
            </Link>
            <Link to="/user/limited-edition" className="flex flex-col items-center justify-center py-2 px-4 text-xs text-gray-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <span>Limited</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductDetailPage;