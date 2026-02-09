import React, { useState, useEffect, useContext } from 'react';
import { addToWishlist, removeFromWishlist, checkWishlist } from '../../services/wishlistService';
import { AuthContext } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

const WishlistButton = ({ productId, className = '', size = 'md' }) => {
  const { userAuth } = useContext(AuthContext);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Check wishlist status on mount
  useEffect(() => {
    const checkStatus = async () => {
      if (!userAuth.isAuthenticated) {
        setIsChecking(false);
        return;
      }

      try {
        const response = await checkWishlist(productId);
        if (response.success) {
          setIsInWishlist(response.data.isInWishlist);
        }
      } catch (error) {
        console.error('Error checking wishlist status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkStatus();
  }, [productId, userAuth.isAuthenticated]);

  const handleWishlistToggle = async () => {
    if (!userAuth.isAuthenticated) {
      toast.error('Please login to manage your wishlist');
      return;
    }

    setIsLoading(true);
    try {
      if (isInWishlist) {
        // Remove from wishlist
        const response = await removeFromWishlist(productId);
        if (response.success) {
          setIsInWishlist(false);
          toast.success('Removed from wishlist');
        } else {
          toast.error(response.message || 'Failed to remove from wishlist');
        }
      } else {
        // Add to wishlist
        const response = await addToWishlist(productId);
        if (response.success) {
          setIsInWishlist(true);
          toast.success('Added to wishlist');
        } else {
          toast.error(response.message || 'Failed to add to wishlist');
        }
      }
    } catch (error) {
      console.error('Wishlist operation error:', error);
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  // Size classes
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  // Icon sizes
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  if (isChecking) {
    return (
      <button
        className={`${sizeClasses[size]} ${className} bg-red-500 rounded-full flex items-center justify-center animate-pulse border-2 border-white`}
        disabled
        style={{ zIndex: 9999 }}
      >
        <svg className={`${iconSizes[size]} text-white`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={handleWishlistToggle}
      disabled={isLoading}
      className={`
        ${sizeClasses[size]} 
        ${className} 
        rounded-full 
        flex items-center justify-center 
        transition-all duration-200 
        ${isInWishlist 
          ? 'bg-red-500 hover:bg-red-600 text-white' 
          : 'bg-white hover:bg-red-50 text-red-500 hover:text-red-600 border-2 border-red-500'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
        shadow-lg hover:shadow-xl
      `}
      style={{ zIndex: 9999 }}
      title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      {isLoading ? (
        <svg className={`${iconSizes[size]} animate-spin`} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <svg 
          className={`${iconSizes[size]} transition-colors duration-200`} 
          fill={isInWishlist ? 'currentColor' : 'none'} 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={isInWishlist ? 0 : 2} 
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
          />
        </svg>
      )}
    </button>
  );
};

export default WishlistButton;
