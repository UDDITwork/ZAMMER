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

const ProductDetailPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { userAuth } = useContext(AuthContext);
  
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
      }
    } catch (error) {
      console.error('Error checking review eligibility:', error);
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
      const response = await createReview({
        product: productId,
        rating: reviewForm.rating,
        review: reviewForm.review
      });

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
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 via-orange-25 to-pink-25">
        <div className="text-center bg-white p-8 rounded-3xl shadow-2xl border border-orange-100">
          <div className="w-16 h-16 mx-auto mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-200 border-t-orange-500"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading product details...</p>
          <div className="mt-4 w-32 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12 px-4 bg-gradient-to-br from-gray-50 via-orange-25 to-pink-25 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 shadow-2xl border border-gray-100 max-w-md mx-auto">
          <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full p-6 mx-auto mb-6 flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-3">Product Not Found</h2>
          <p className="text-gray-600 mb-6">The product you're looking for doesn't exist or has been removed.</p>
          <Link to="/user/dashboard" className="inline-block bg-gradient-to-r from-orange-500 to-pink-500 text-white px-6 py-3 rounded-full font-semibold hover:from-orange-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 shadow-lg">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="product-detail-page pb-24 bg-gradient-to-br from-gray-50 via-orange-25 to-pink-25 min-h-screen">
      {/* Debug Panel - Development Only */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 z-50 bg-gradient-to-r from-yellow-100 to-yellow-200 p-3 rounded-xl shadow-lg border border-yellow-300 text-xs max-w-xs">
          <button
            onClick={debugCartState}
            className="block w-full bg-gradient-to-r from-yellow-200 to-yellow-300 px-3 py-2 rounded-lg mb-2 hover:from-yellow-300 hover:to-yellow-400 transition-all duration-300 font-medium"
          >
            🔧 Debug Cart
          </button>
          <div className="text-yellow-800 font-medium">
            Auth: {userAuth.isAuthenticated ? '✅' : '❌'} |
            Token: {userAuth.token ? '✅' : '❌'}
          </div>
        </div>
      )}

      {/* Enhanced Product Images Carousel */}
      <div className="relative bg-white shadow-lg">
        <div className="h-96 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
          {product.images && product.images.length > 0 ? (
            <img 
              src={product.images[activeImage]} 
              alt={product.name} 
              className="h-full w-full object-contain transition-all duration-500 hover:scale-105"
              onError={(e) => {
                e.target.src = '/placeholder-product.jpg'; // Fallback image
              }}
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-gray-400 bg-gradient-to-br from-gray-100 to-gray-200">
              <div className="text-center">
                <div className="w-20 h-20 bg-white/80 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="font-medium">No image available</p>
              </div>
            </div>
          )}
          
          {/* Enhanced Back button */}
          <button 
            onClick={() => navigate(-1)} 
            className="absolute top-6 left-6 bg-white/95 backdrop-blur-sm p-3 rounded-2xl shadow-lg hover:bg-white hover:shadow-xl transition-all duration-300 border border-gray-200 group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 group-hover:text-orange-500 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {/* Enhanced Share button */}
          <button 
            onClick={() => setShowShareOptions(true)} 
            className="absolute top-6 right-6 bg-white/95 backdrop-blur-sm p-3 rounded-2xl shadow-lg hover:bg-white hover:shadow-xl transition-all duration-300 border border-gray-200 group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 group-hover:text-blue-500 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
          
          {/* Enhanced Wishlist button */}
          <button 
            onClick={toggleWishlist} 
            disabled={wishlistLoading}
            className="absolute top-6 right-20 bg-white/95 backdrop-blur-sm p-3 rounded-2xl shadow-lg disabled:opacity-50 hover:bg-white hover:shadow-xl transition-all duration-300 border border-gray-200 group"
          >
            {wishlistLoading ? (
              <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-orange-500 rounded-full"></div>
            ) : inWishlist ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 group-hover:text-red-500 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            )}
          </button>
        </div>

        {/* Enhanced Thumbnail Navigation */}
        {product.images && product.images.length > 1 && (
          <div className="flex space-x-3 p-6 overflow-x-auto bg-white">
            {product.images.map((image, index) => (
              <button
                key={index}
                onClick={() => setActiveImage(index)}
                className={`flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all duration-300 shadow-md hover:shadow-lg ${
                  activeImage === index 
                    ? 'border-orange-500 shadow-orange-200' 
                    : 'border-transparent hover:border-gray-300'
                }`}
              >
                <img 
                  src={image} 
                  alt={`${product.name} - ${index + 1}`} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = '/placeholder-product.jpg';
                  }}
                />
              </button>
            ))}
          </div>
        )}

        {/* Enhanced Image dots indicator */}
        {product.images && product.images.length > 1 && (
          <div className="absolute bottom-6 left-0 right-0 flex justify-center">
            <div className="flex space-x-2 bg-black/20 backdrop-blur-sm rounded-full px-4 py-2">
              {product.images.map((_, index) => (
                <button 
                  key={index} 
                  onClick={() => setActiveImage(index)}
                  className={`h-2 w-2 rounded-full transition-all duration-300 ${
                    activeImage === index ? 'bg-white w-6' : 'bg-white/60 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Product Info */}
      <div className="p-6 bg-white mt-4 mx-4 rounded-3xl shadow-lg border border-gray-100">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">{product.name}</h1>
            <div className="inline-block bg-gradient-to-r from-orange-100 to-pink-100 text-orange-700 text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wide">
              {product.category}
            </div>
          </div>
          <div className="flex items-center bg-gradient-to-r from-yellow-50 to-yellow-100 px-3 py-2 rounded-2xl border border-yellow-200">
            <StarRating rating={product.averageRating || 4.6} />
          </div>
        </div>
        
        <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-2xl border border-green-200">
          <div className="flex items-center space-x-3">
            <span className="text-3xl font-bold text-green-700">₹{product.zammerPrice}</span>
            {product.mrp > product.zammerPrice && (
              <>
                <span className="text-gray-500 text-lg line-through">₹{product.mrp}</span>
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm px-3 py-1 rounded-full font-bold">
                  {Math.round(((product.mrp - product.zammerPrice) / product.mrp) * 100)}% OFF
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
          <p className="text-gray-700 leading-relaxed">{product.description}</p>
        </div>
        
        {/* Enhanced Size Selection */}
        {product.variants && product.variants.some(v => v.size) && (
          <div className="mb-6">
            <p className="text-lg font-bold mb-4 text-gray-800">Select Size:</p>
            <div className="flex flex-wrap gap-3">
              {Array.from(new Set(product.variants.map(v => v.size).filter(Boolean))).map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`h-12 w-12 rounded-2xl flex items-center justify-center text-sm font-bold transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 ${
                    selectedSize === size 
                      ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-orange-200' 
                      : 'bg-white text-gray-800 hover:bg-gradient-to-r hover:from-orange-100 hover:to-pink-100 border border-gray-200'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Enhanced Color Selection */}
        {product.variants && product.variants.some(v => v.color) && (
          <div className="mb-6">
            <p className="text-lg font-bold mb-4 text-gray-800">Select Color:</p>
            <div className="flex flex-wrap gap-3">
              {Array.from(new Set(product.variants.map(v => v.color).filter(Boolean))).map((color, index) => {
                const variant = product.variants.find(v => v.color === color);
                const colorCode = variant?.colorCode || '#000000';
                
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedColor(color)}
                    className={`h-12 w-12 rounded-2xl transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 ${
                      selectedColor === color 
                        ? 'ring-4 ring-orange-500 ring-offset-2 shadow-orange-200' 
                        : 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-1'
                    }`}
                    style={{ backgroundColor: colorCode }}
                    title={color}
                  >
                    {selectedColor === color && (
                      <svg className="w-6 h-6 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Enhanced Composition */}
        <div className="mb-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-blue-800">Composition</p>
              <p className="text-blue-700">{product.composition || 'Cotton 100%'}</p>
            </div>
          </div>
        </div>
        
        {/* Enhanced Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleAddToCart}
            disabled={cartLoading}
            className={`bg-white border-2 border-orange-500 text-orange-500 py-4 rounded-2xl text-lg font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${
              cartLoading 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50'
            }`}
          >
            {cartLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-500 border-t-transparent mr-2"></div>
                Adding...
              </div>
            ) : (
              '🛒 Add To Cart'
            )}
          </button>
          <button
            onClick={handleBuyNow}
            disabled={cartLoading}
            className={`bg-gradient-to-r from-orange-500 to-pink-500 text-white py-4 rounded-2xl text-lg font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${
              cartLoading 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:from-orange-600 hover:to-pink-600'
            }`}
          >
            {cartLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                Processing...
              </div>
            ) : (
              '⚡ Buy Now'
            )}
          </button>
        </div>

        {/* 🎯 NEW: Reviews Section */}
        <div className="mt-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              Customer Reviews
            </h2>
            {canReview && (
              <button
                onClick={() => setShowReviewForm(true)}
                className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-6 py-2 rounded-xl font-semibold hover:from-orange-600 hover:to-pink-600 transition-all duration-300"
              >
                Write a Review
              </button>
            )}
          </div>

          {/* Review Form Modal */}
          {showReviewForm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl p-8 max-w-md w-full">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Write Your Review</h3>
                <form onSubmit={handleReviewSubmit}>
                  <div className="mb-6">
                    <label className="block text-gray-700 font-semibold mb-2">Rating</label>
                    <StarRating
                      rating={reviewForm.rating}
                      onRatingChange={handleRatingChange}
                      editable={true}
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block text-gray-700 font-semibold mb-2">Review</label>
                    <textarea
                      name="review"
                      value={reviewForm.review}
                      onChange={handleReviewChange}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all duration-200"
                      rows="4"
                      placeholder="Share your experience with this product..."
                      required
                    />
                  </div>
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => setShowReviewForm(false)}
                      className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitingReview}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-pink-600 transition-all duration-200 disabled:opacity-50"
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
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-orange-200 border-t-orange-500"></div>
            </div>
          ) : reviews.length > 0 ? (
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review._id} className="bg-gray-50 rounded-2xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h4 className="font-semibold text-gray-800">{review.user.name}</h4>
                        {review.isVerifiedPurchase && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                            Verified Purchase
                          </span>
                        )}
                      </div>
                      <div className="flex items-center mt-1">
                        <StarRating rating={review.rating} />
                        <span className="text-gray-500 text-sm ml-2">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-700">{review.review}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-2xl">
              <p className="text-gray-600">No reviews yet. Be the first to review this product!</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Enhanced Share Options Modal */}
      {showShareOptions && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowShareOptions(false)}></div>
          <div className="relative bg-gradient-to-r from-orange-500 to-pink-500 rounded-t-3xl p-8 w-full max-w-md shadow-2xl">
            <div className="absolute top-3 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-white/30 rounded-full"></div>
            <h2 className="text-center text-white font-bold text-xl mb-6">✨ Share Product</h2>
            <div className="grid grid-cols-4 gap-6">
              <button onClick={() => shareProduct('whatsapp')} className="flex flex-col items-center group">
                <div className="bg-white rounded-2xl p-4 mb-3 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                </div>
                <span className="text-white text-xs font-medium">WhatsApp</span>
              </button>
              
              <button onClick={() => shareProduct('facebook')} className="flex flex-col items-center group">
                <div className="bg-white rounded-2xl p-4 mb-3 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <span className="text-white text-xs font-medium">Facebook</span>
              </button>
              
              <button onClick={() => shareProduct('twitter')} className="flex flex-col items-center group">
                <div className="bg-white rounded-2xl p-4 mb-3 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </div>
                <span className="text-white text-xs font-medium">Twitter</span>
              </button>
              
              <button onClick={() => shareProduct('copy')} className="flex flex-col items-center group">
                <div className="bg-white rounded-2xl p-4 mb-3 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-white text-xs font-medium">Copy Link</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Enhanced Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 z-50 shadow-2xl">
        <div className="flex justify-between items-center px-2 py-3">
          <Link to="/user/dashboard" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500 hover:text-orange-500 transition-colors duration-300 group">
            <div className="w-8 h-8 bg-gray-100 group-hover:bg-gradient-to-br group-hover:from-orange-100 group-hover:to-pink-100 rounded-xl flex items-center justify-center mb-1 group-hover:scale-110 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <span className="text-xs font-medium">Home</span>
          </Link>
          
          <Link to="/user/shop" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500 hover:text-orange-500 transition-colors duration-300 group">
            <div className="w-8 h-8 bg-gray-100 group-hover:bg-gradient-to-br group-hover:from-orange-100 group-hover:to-pink-100 rounded-xl flex items-center justify-center mb-1 group-hover:scale-110 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <span className="text-xs font-medium">Shop</span>
          </Link>
          
          <Link to="/user/cart" className="flex flex-col items-center justify-center py-2 flex-1 text-orange-500 group">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-pink-100 rounded-xl flex items-center justify-center mb-1 group-hover:scale-110 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h14l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className="text-xs font-bold">Cart</span>
          </Link>
          
          <Link to="/user/trending" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500 hover:text-orange-500 transition-colors duration-300 group">
            <div className="w-8 h-8 bg-gray-100 group-hover:bg-gradient-to-br group-hover:from-orange-100 group-hover:to-pink-100 rounded-xl flex items-center justify-center mb-1 group-hover:scale-110 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="text-xs font-medium">Trending</span>
          </Link>
          
          <Link to="/user/limited-edition" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500 hover:text-orange-500 transition-colors duration-300 group">
            <div className="w-8 h-8 bg-gray-100 group-hover:bg-gradient-to-br group-hover:from-orange-100 group-hover:to-pink-100 rounded-xl flex items-center justify-center mb-1 group-hover:scale-110 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <span className="text-xs font-medium">Limited</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;