import React, { useEffect, useState, useContext } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import StarRating from '../../components/common/StarRating';
import { getProductById } from '../../services/productService';
import cartService from '../../services/cartService';
import { addToWishlist, removeFromWishlist, checkWishlist } from '../../services/wishlistService';
import { AuthContext } from '../../contexts/AuthContext';

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
          if (response.requiresAuth) {
            checkAuth(); // This will redirect to login
          } else {
            toast.error(response.message || 'Failed to remove from wishlist');
          }
        }
      } else {
        const response = await addToWishlist(productId);
        if (response.success) {
          setInWishlist(true);
          toast.success('Added to wishlist');
        } else {
          if (response.requiresAuth) {
            checkAuth(); // This will redirect to login
          } else {
            toast.error(response.message || 'Failed to add to wishlist');
          }
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-8">
        <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Product Not Found</h2>
        <p className="text-gray-600 mb-4">The product you're looking for doesn't exist or has been removed.</p>
        <Link to="/user/dashboard" className="text-orange-500 hover:text-orange-600 font-medium">
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="product-detail-page pb-20">
      {/* Debug Panel - Development Only */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 z-50 bg-yellow-100 p-2 rounded text-xs max-w-xs">
          <button
            onClick={debugCartState}
            className="block w-full bg-yellow-200 px-2 py-1 rounded mb-1 hover:bg-yellow-300"
          >
            🔧 Debug Cart
          </button>
          <div className="text-yellow-800">
            Auth: {userAuth.isAuthenticated ? '✅' : '❌'} |
            Token: {userAuth.token ? '✅' : '❌'}
          </div>
        </div>
      )}

      {/* Product Images Carousel */}
      <div className="relative">
        <div className="h-96 bg-gray-100">
          {product.images && product.images.length > 0 ? (
            <img 
              src={product.images[activeImage]} 
              alt={product.name} 
              className="h-full w-full object-contain"
              onError={(e) => {
                e.target.src = '/placeholder-product.jpg'; // Fallback image
              }}
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p>No image available</p>
              </div>
            </div>
          )}
          
          {/* Back button */}
          <button 
            onClick={() => navigate(-1)} 
            className="absolute top-4 left-4 bg-white p-2 rounded-full shadow-md hover:bg-gray-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {/* Share button */}
          <button 
            onClick={() => setShowShareOptions(true)} 
            className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-md hover:bg-gray-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
          
          {/* Wishlist button */}
          <button 
            onClick={toggleWishlist} 
            disabled={wishlistLoading}
            className="absolute top-4 right-16 bg-white p-2 rounded-full shadow-md disabled:opacity-50 hover:bg-gray-50 transition-colors"
          >
            {wishlistLoading ? (
              <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-orange-500 rounded-full"></div>
            ) : inWishlist ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            )}
          </button>
        </div>

        {/* Thumbnail Navigation */}
        {product.images && product.images.length > 1 && (
          <div className="flex space-x-2 p-4 overflow-x-auto">
            {product.images.map((image, index) => (
              <button
                key={index}
                onClick={() => setActiveImage(index)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                  activeImage === index ? 'border-orange-500' : 'border-transparent hover:border-gray-300'
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

        {/* Image dots indicator */}
        {product.images && product.images.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
            <div className="flex space-x-2">
              {product.images.map((_, index) => (
                <button 
                  key={index} 
                  onClick={() => setActiveImage(index)}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    activeImage === index ? 'bg-orange-500' : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4 bg-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{product.name}</h1>
            <p className="text-xs text-gray-500 uppercase mt-1">{product.category}</p>
          </div>
          <div className="flex items-center">
            <StarRating rating={product.averageRating || 4.6} />
          </div>
        </div>
        
        <div className="mt-3">
          <span className="text-xl font-bold">₹{product.zammerPrice}</span>
          {product.mrp > product.zammerPrice && (
            <>
              <span className="text-gray-500 text-sm line-through ml-2">₹{product.mrp}</span>
              <span className="text-green-600 text-sm ml-2">
                {Math.round(((product.mrp - product.zammerPrice) / product.mrp) * 100)}% off
              </span>
            </>
          )}
        </div>
        
        <div className="mt-4">
          <p className="text-sm text-gray-600">{product.description}</p>
        </div>
        
        {/* Size Selection */}
        {product.variants && product.variants.some(v => v.size) && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Size:</p>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(product.variants.map(v => v.size).filter(Boolean))).map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs transition-colors ${
                    selectedSize === size 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Color Selection */}
        {product.variants && product.variants.some(v => v.color) && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Color:</p>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(product.variants.map(v => v.color).filter(Boolean))).map((color, index) => {
                const variant = product.variants.find(v => v.color === color);
                const colorCode = variant?.colorCode || '#000000';
                
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedColor(color)}
                    className={`h-8 w-8 rounded-full transition-all ${
                      selectedColor === color ? 'ring-2 ring-orange-500 ring-offset-2' : 'hover:ring-2 hover:ring-gray-300'
                    }`}
                    style={{ backgroundColor: colorCode }}
                    title={color}
                  />
                );
              })}
            </div>
          </div>
        )}
        
        {/* Composition */}
        <div className="mt-4 border-t pt-4">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Composition:</span> {product.composition || 'Cotton 100%'}
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={handleAddToCart}
            disabled={cartLoading}
            className={`bg-white border border-orange-500 text-orange-500 py-2 rounded-md text-sm font-medium transition-colors ${
              cartLoading 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-orange-50'
            }`}
          >
            {cartLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500 mr-2"></div>
                Adding...
              </div>
            ) : (
              'Add To Cart'
            )}
          </button>
          <button
            onClick={handleBuyNow}
            disabled={cartLoading}
            className={`bg-orange-500 text-white py-2 rounded-md text-sm font-medium transition-colors ${
              cartLoading 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-orange-600'
            }`}
          >
            {cartLoading ? 'Processing...' : 'Buy Now'}
          </button>
        </div>
      </div>
      
      {/* Share Options Modal */}
      {showShareOptions && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowShareOptions(false)}></div>
          <div className="relative bg-orange-500 rounded-t-lg p-6 w-full max-w-md">
            <h2 className="text-center text-white font-bold mb-4">SHARE TO</h2>
            <div className="grid grid-cols-3 gap-4">
              <button onClick={() => shareProduct('whatsapp')} className="flex flex-col items-center">
                <div className="bg-white rounded-full p-3 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                </div>
                <span className="text-white text-xs">WhatsApp</span>
              </button>
              
              <button onClick={() => shareProduct('facebook')} className="flex flex-col items-center">
                <div className="bg-white rounded-full p-3 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <span className="text-white text-xs">Facebook</span>
              </button>
              
              <button onClick={() => shareProduct('twitter')} className="flex flex-col items-center">
                <div className="bg-white rounded-full p-3 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </div>
                <span className="text-white text-xs">Twitter</span>
              </button>
              
              <button onClick={() => shareProduct('copy')} className="flex flex-col items-center">
                <div className="bg-white rounded-full p-3 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-white text-xs">Copy Link</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
        <div className="flex justify-between items-center">
          <Link to="/user/dashboard" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs">Home</span>
          </Link>
          
          <Link to="/user/shop" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span className="text-xs">Shop</span>
          </Link>
          
          <Link to="/user/cart" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-xs">Cart</span>
          </Link>
          
          <Link to="/user/trending" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-xs">Trending</span>
          </Link>
          
          <Link to="/user/limited-edition" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <span className="text-xs">Limited Edition</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;