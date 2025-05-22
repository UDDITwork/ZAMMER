import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import StarRating from '../../components/common/StarRating';
import { getProductById } from '../../services/productService';
import { addToCart } from '../../services/cartService';
import { addToWishlist, removeFromWishlist, checkWishlist } from '../../services/wishlistService';

const ProductDetailPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [inWishlist, setInWishlist] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);

  useEffect(() => {
    fetchProductDetails();
    checkProductWishlist();
  }, [productId]);

  const fetchProductDetails = async () => {
    setLoading(true);
    try {
      const response = await getProductById(productId);
      if (response.success) {
        setProduct(response.data);
        // Set default selected size and color if available
        if (response.data.variants && response.data.variants.length > 0) {
          setSelectedSize(response.data.variants[0].size || '');
          setSelectedColor(response.data.variants[0].color || '');
        }
      } else {
        toast.error(response.message || 'Failed to fetch product details');
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const checkProductWishlist = async () => {
    try {
      const response = await checkWishlist(productId);
      if (response.success) {
        setInWishlist(response.data.isInWishlist);
      }
    } catch (error) {
      console.error('Error checking wishlist status:', error);
    }
  };

  const handleAddToCart = async () => {
    if (!selectedSize || !selectedColor) {
      toast.warning('Please select size and color');
      return;
    }

    try {
      const response = await addToCart(productId, 1, {
        size: selectedSize,
        color: selectedColor
      });
      if (response.success) {
        toast.success('Product added to cart');
      } else {
        toast.error(response.message || 'Failed to add to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Something went wrong');
    }
  };

  const handleBuyNow = async () => {
    if (!selectedSize || !selectedColor) {
      toast.warning('Please select size and color');
      return;
    }

    try {
      await addToCart(productId, 1, {
        size: selectedSize,
        color: selectedColor
      });
      navigate('/user/cart');
    } catch (error) {
      console.error('Error with buy now:', error);
      toast.error('Something went wrong');
    }
  };

  const toggleWishlist = async () => {
    try {
      if (inWishlist) {
        await removeFromWishlist(productId);
        setInWishlist(false);
        toast.success('Removed from wishlist');
      } else {
        await addToWishlist(productId);
        setInWishlist(true);
        toast.success('Added to wishlist');
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      toast.error('Failed to update wishlist');
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
        navigator.clipboard.writeText(productUrl);
        toast.success('Link copied to clipboard!');
    }
    setShowShareOptions(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Product not found.</p>
        <Link to="/user/dashboard" className="text-orange-500 block mt-4">Return to Home</Link>
      </div>
    );
  }

  return (
    <div className="product-detail-page pb-20">
      {/* Product Images Carousel */}
      <div className="relative">
        <div className="h-96 bg-gray-100">
          {product.images && product.images.length > 0 ? (
            <img 
              src={product.images[activeImage]} 
              alt={product.name} 
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-gray-400">No image</div>
          )}
          
          {/* Back button */}
          <button 
            onClick={() => navigate(-1)} 
            className="absolute top-4 left-4 bg-white p-2 rounded-full shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {/* Share button */}
          <button 
            onClick={() => setShowShareOptions(true)} 
            className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
          
          {/* Wishlist button */}
          <button 
            onClick={toggleWishlist} 
            className="absolute top-4 right-16 bg-white p-2 rounded-full shadow-md"
          >
            {inWishlist ? (
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
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                  activeImage === index ? 'border-orange-500' : 'border-transparent'
                }`}
              >
                <img 
                  src={image} 
                  alt={`${product.name} - ${index + 1}`} 
                  className="w-full h-full object-cover"
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
                  className={`h-2 w-2 rounded-full ${activeImage === index ? 'bg-orange-500' : 'bg-gray-300'}`}
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
              {Array.from(new Set(product.variants.map(v => v.size))).map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs ${
                    selectedSize === size 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-gray-100 text-gray-800'
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
              {Array.from(new Set(product.variants.map(v => v.color))).map((color, index) => {
                const variant = product.variants.find(v => v.color === color);
                const colorCode = variant?.colorCode || '#000000';
                
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedColor(color)}
                    className={`h-8 w-8 rounded-full ${selectedColor === color ? 'ring-2 ring-orange-500' : ''}`}
                    style={{ backgroundColor: colorCode }}
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
            className="bg-white border border-orange-500 text-orange-500 py-2 rounded-md text-sm font-medium"
          >
            Add To Cart
          </button>
          <button
            onClick={handleBuyNow}
            className="bg-orange-500 text-white py-2 rounded-md text-sm font-medium"
          >
            Buy Now
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
              <button onClick={() => shareProduct('WhatsApp')} className="flex flex-col items-center">
                <div className="bg-white rounded-full p-3 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                </div>
                <span className="text-white text-xs">WhatsApp</span>
              </button>
              
              <button onClick={() => shareProduct('Facebook')} className="flex flex-col items-center">
                <div className="bg-white rounded-full p-3 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <span className="text-white text-xs">Facebook</span>
              </button>
              
              <button onClick={() => shareProduct('Messenger')} className="flex flex-col items-center">
                <div className="bg-white rounded-full p-3 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.652V24l4.088-2.242c1.092.3 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z"/>
                  </svg>
                </div>
                <span className="text-white text-xs">Messenger</span>
              </button>
              
              <button onClick={() => shareProduct('Message')} className="flex flex-col items-center">
                <div className="bg-white rounded-full p-3 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 2H4c-1.103 0-2 .897-2 2v18l4-4h14c1.103 0 2-.897 2-2V4c0-1.103-.897-2-2-2zm0 2v.511l-8 6.223-8-6.222V6h16zM4 18V9.044l7.386 5.745a.994.994 0 0 0 1.228 0L20 9.044 20.002 18H4z"/>
                  </svg>
                </div>
                <span className="text-white text-xs">Message</span>
              </button>
              
              <button onClick={() => shareProduct('Email')} className="flex flex-col items-center">
                <div className="bg-white rounded-full p-3 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4H4c-1.103 0-2 .897-2 2v12c0 1.103.897 2 2 2h16c1.103 0 2-.897 2-2V6c0-1.103-.897-2-2-2zm0 2v.511l-8 6.223-8-6.222V6h16zM4 18V9.044l7.386 5.745a.994.994 0 0 0 1.228 0L20 9.044 20.002 18H4z"/>
                  </svg>
                </div>
                <span className="text-white text-xs">Email</span>
              </button>
              
              <button onClick={() => shareProduct('Pinterest')} className="flex flex-col items-center">
                <div className="bg-white rounded-full p-3 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
                  </svg>
                </div>
                <span className="text-white text-xs">Pinterest</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
        <div className="flex justify-between items-center">
          <Link to="/user/dashboard" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs">Home</span>
          </Link>
          
          <Link to="/user/shop" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span className="text-xs">Shop</span>
          </Link>
          
          <Link to="/user/cart" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-xs">Cart</span>
          </Link>
          
          <Link to="/user/trending" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-xs">Trending</span>
          </Link>
          
          <Link to="/user/limited-edition" className="flex flex-col items-center justify-center py-2 flex-1 text-gray-500">
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