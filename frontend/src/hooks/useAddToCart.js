import { useState, useCallback, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../contexts/AuthContext';
import cartService from '../services/cartService';

export const useAddToCart = () => {
  const { userAuth } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [addingToCart, setAddingToCart] = useState({});

  const handleAddToCart = useCallback(async (productId, productName) => {
    if (!userAuth.isAuthenticated || !userAuth.token) {
      toast.warning('Please login to add items to cart');
      navigate('/user/login', {
        state: {
          from: location.pathname + location.search,
          action: 'add-to-cart',
          productName,
        },
      });
      return;
    }

    setAddingToCart((prev) => ({ ...prev, [productId]: true }));

    try {
      const response = await cartService.addToCart(productId, 1);

      if (response.success) {
        toast.success(`${productName} added to cart!`);
      } else if (response.requiresAuth) {
        navigate('/user/login', {
          state: {
            from: location.pathname + location.search,
            action: 'add-to-cart',
            productName,
          },
        });
      } else {
        toast.error(response.message || 'Failed to add to cart');
      }
    } catch (error) {
      toast.error('Something went wrong while adding to cart');
    } finally {
      setAddingToCart((prev) => ({ ...prev, [productId]: false }));
    }
  }, [userAuth, navigate, location]);

  return { addingToCart, handleAddToCart };
};
